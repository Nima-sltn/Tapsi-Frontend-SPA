# Tapsi Website Redesign Project 🚖

## [App Online Link](https://tapsi-redesign.netlify.app/)

## App Demo

<img src="./assets/images/tapsi-preview.gif">

---

## Description

A redesign of the user interface (UI) of the Tapsi website: a **responsive,
accessible, offline-capable static site** built with HTML, CSS and
**strict TypeScript** — zero runtime dependencies, no framework. TypeScript
compiles to plain ES modules in `dist/`, so the deployable artifact is still
static files with no server and no bundler.

## Table of contents

- [Tips](#tips-)
- [Architecture at a glance](#architecture-at-a-glance)
- [Language features: lexical scoping & Promises](#language-features-lexical-scoping--promises)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Testing & CI](#testing--ci)
- [Accessibility](#accessibility)
- [Offline / PWA](#offline--pwa)
- [Coding guidelines](#coding-guidelines)

## Tips 📌

- Fully Responsive for Mobile, Tablet, Laptop and Desktop.
- BEM Convention
- Object-Oriented-CSS
- CSS Variables
- RTL-first layout (Persian/`fa-IR`) with mirrored keyboard navigation
- Light/dark theme applied pre-paint (no flash of the wrong theme)
- Slide-in mobile sidebar: backdrop, scroll lock, focus trap, Escape to close
- Deep-linkable service tabs (`#tab-plus` in the URL, shareable)
- **Shareable trip links**: the fare calculator mirrors its state into the
  URL (`?service=plus&km=12&min=30&time=peak`) with a one-click copy button;
  a shared link restores exactly what the sender configured
- Accessible FAQ accordion + cross-service fare comparison chart
- Calculator persists your last trip in `localStorage` and restores it
- Zero third-party requests — enforced by `npm run audit`

## Architecture at a glance

The page is layered so that each layer only talks to the one below it:

```
index.html  ── markup + ARIA semantics + declarative hooks (data-*)
   │
css/        ── design tokens (CSS variables) → BEM components → sections
   │
src/modules ── UI domains (TypeScript): nav · tabs · theme · reveal ·
   │           carousel · form · feedback · progress · calculator · share
   │
src/modules/bus.ts ── typed event bus: the only channel between domains
   │
src/modules/fare.ts · compare.ts · share.ts ── pure domains (DOM-free)
   │
   └── tsc ──▶ dist/ (compiled ES modules — the deployable artifact)
```

Rules:

1. **UI modules never import each other** — they publish and subscribe on the
   typed event bus instead (`theme:change`, `tabs:change`, `form:submit`,
   `trip:share`, `app:ready`). The bus's `EventMap` makes every topic and
   payload compile-time checked.
2. **Domain logic stays pure** — `fare.ts`, `compare.ts` and `share.ts`
   have no DOM access, so Node imports them and tests them directly.
3. **Boot is defensive** — one failing module is logged and skipped; the rest
   of the page still works. `ready` is a Promise resolving with the boot
   status.
4. **`dist/` is generated** — never edit it by hand; `npm run build` rewrites
   it from `src/` (clean + `tsc`), so a renamed module can never leave a
   stale file in the shipped tree.

Full details, the event catalogue and the Promise contracts live in
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Language features: lexical scoping & Promises

Both language features are first-class citizens of the codebase, centred on
[`src/modules/bus.ts`](./src/modules/bus.ts):

**Lexical scoping** — every bus instance keeps its subscriber registry inside
a factory closure. The registry is genuinely private: no code outside can
enumerate, replace or leak it, and two buses share no state. TypeScript's
structural typing reinforces the enclosure: the public `Bus` interface never
exposes the registry's type.

```ts
import { createBus } from "./modules/bus.js";

const bus = createBus(); // its own private registry
const off = bus.on("app:ready", (status) => console.log(status.modules));
```

**Promises** — asynchronous work is expressed as values you can chain:

```ts
import { ready } from "./main.js";
import { bus } from "./modules/bus.js";

ready.then((status) => console.log(status.modules)); // boot status
await bus.once("theme:change", 2000); // wait for an event (rejects on timeout)
await bus.emit("theme:change", { theme: "dark", previous: "light" });
// settles after every handler
scrollByCard(rail, 1).then(sync); // resolves when the scroll settles
```

## Getting started

```bash
npm install        # dev tooling only (typescript + sharp)
npm run build      # compile src/ → dist/
npm start          # local static server → http://localhost:4173
```

Node.js ≥ 18 is required. The deployable artifact is static: `index.html`,
`css/`, compiled `dist/` and `assets/` — open the served page and it works.

> Editing code? Change files under `src/`, then `npm run build`. The `dist/`
> directory is generated output — never edit it by hand.

## Scripts

| Command                    | What it does                                             |
| -------------------------- | -------------------------------------------------------- |
| `npm run build`            | Clean-compile `src/**/*.ts` → `dist/` (TypeScript)          |
| `npm run typecheck`        | Strict type check without emitting (`tsc --noEmit`)       |
| `npm start`                | Serve the site locally (`scripts/serve.mjs`)              |
| `npm test`                 | Build, then unit tests (`node --test tests/`)             |
| `npm run audit`            | Static QA gate: links, `alt`/`width`, ARIA targets, no CDN|
| `npm run verify`           | Build + typecheck + tests + audit — what CI runs          |
| `npm run optimize:images`  | Regenerate optimized WebP assets (`sharp`)                |

## Project structure

```
├── index.html            # single page, semantic landmarks, JSON-LD, RTL
├── manifest.webmanifest  # PWA manifest
├── sw.js                 # offline service worker (cache strategies)
├── css/
│   ├── fonts.css         # @font-face declarations
│   └── style.css         # tokens → BEM components → sections
├── src/                  # TypeScript source (the only place to edit code)
│   ├── main.ts           # defensive boot + Promise-based readiness
│   ├── types.ts          # shared primitive types
│   └── modules/
│       ├── bus.ts        # lexically scoped, Promise-based, typed event bus
│       ├── fare.ts       # pure fare domain (shared browser/Node)
│       ├── compare.ts    # pure cross-service pricing domain
│       ├── share.ts      # pure shareable-trip-URL domain
│       ├── calculator.ts # fare form UI + chart + persistence + URL sync
│       ├── accordion.ts  # FAQ disclosure (animated, one-at-a-time, arrow keys)
│       ├── tabs.ts       # WAI-ARIA tabs, deep-linked via location.hash
│       ├── carousel.ts   # scroll-snap rail, Promise-based scrolling
│       ├── form.ts       # contact form validation
│       ├── feedback.ts   # accessible toast live region (bus-driven)
│       ├── nav.ts        # mobile drawer + backdrop + scroll-spy
│       └── theme.ts · reveal.ts · progress.ts
├── dist/                  # GENERATED by `npm run build` (gitignored) — do not edit
├── scripts/              # build · serve · audit · optimize-images
├── tests/                # fare, compare, share, form, accordion, bus
└── docs/ARCHITECTURE.md  # layering, event catalogue, contracts
```

## Testing & CI

```bash
npm run verify     # build + typecheck + unit tests + static audit
```

- **Type checking** (`tsc --noEmit`) runs under `strict` mode with
  `noUncheckedIndexedAccess` — the typed event bus means a mistyped topic or
  payload is a build failure, not a runtime surprise.
- **Unit tests** (`tests/*.test.js`) run with Node's built-in test runner —
  no test framework dependency. They import the compiled ES modules, i.e.
  the exact artifacts the browser loads. Covered domains: fare estimation,
  service comparison, shareable trip links, form validation, accordion key
  map, event-bus scoping/Promises.
- **Static audit** (`scripts/audit.mjs`) fails the build on broken asset or
  fragment references, images without `alt`/`width`/`height`, dangling
  `aria-controls`, root-absolute CSS paths or any third-party request.
- **CI** (`.github/workflows/ci.yml`) runs everything on every push/PR, plus
  a check that the optimized image assets exist.

## Accessibility

- Semantic landmarks: `<header>`, `<main>`, `<footer>`, labelled `<section>`
  elements (the carousel uses a real `<section>` with `aria-label`, so it
  exposes the region role natively instead of `role="region"`).
- Skip link, visible focus, `aria-live` status/toast regions.
- WAI-ARIA tabs and carousel patterns, keyboard operable in RTL.
- Inline form errors wired with `aria-invalid` + `aria-describedby`.
- Colour contrast and motion (`prefers-reduced-motion`) respected via tokens.

## Offline / PWA

`sw.js` precaches the app shell (including every compiled JS module), serves
navigations network-first with an offline fallback, and keeps code fresh with
network-first + cache fallback. Bump `CACHE_VERSION` whenever a precached
asset changes — after `npm run build`, the file list under `dist/` must match
the precache list.

## Coding guidelines

- **Strict TypeScript ES modules** under `src/`; `tsc` emits to `dist/`.
  `strict` + `noUncheckedIndexedAccess` are always on.
- JSDoc on exported functions; document *why*, not only *what*.
- Cross-domain communication goes through the typed bus (`EventMap` in
  `bus.ts`) — never import another UI module directly. Adding a topic means
  extending `EventMap`, which type-checks every publisher and subscriber.
- Pure domains (`fare`, `compare`, `share`) stay DOM-free so Node can test
  them directly.
- CSS follows BEM; colours/spacing come from CSS variables only.
- Every non-trivial change ships with tests and passes `npm run verify`.

## License

MIT — see [LICENSE](./LICENSE).
