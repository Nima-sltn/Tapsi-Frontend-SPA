# Tapsi Website Redesign Project 🚖

## [App Online Link](https://tapsi-redesign.netlify.app/)

## App Demo

<img src="./assets/images/tapsi-preview.gif">

---

## Description

A redesign of the user interface (UI) of the Tapsi website: a **responsive,
accessible, offline-capable static site** built with plain HTML, CSS and
vanilla JavaScript — zero runtime dependencies, no framework, no build step.

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
js/modules  ── UI domains: nav · tabs · theme · reveal · carousel ·
   │           form · feedback · progress · calculator
   │
js/modules/bus.js ── event bus: the only channel between domains
   │
js/modules/fare.js ── pure fare domain (DOM-free, unit-tested)
```

Rules:

1. **UI modules never import each other** — they publish and subscribe on the
   event bus instead (`theme:change`, `tabs:change`, `carousel:change`,
   `form:submit`, `app:ready`).
2. **Domain logic stays pure** — `fare.js` has no DOM access, so Node can
   `require()` it and test it directly.
3. **Boot is defensive** — one failing module is logged and skipped; the rest
   of the page still works.

Full details, the event catalogue and the Promise contracts live in
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Language features: lexical scoping & Promises

Both requested language features are first-class citizens of the codebase,
centred on [`js/modules/bus.js`](./js/modules/bus.js):

**Lexical scoping** — every bus instance keeps its subscriber registry inside
a factory closure. The registry is genuinely private: no code outside can
enumerate, replace or leak it, and two buses share no state.

```js
const bus = Tapsi.bus.createBus(); // its own private registry
const off = bus.on("topic", handler); // `off` closes over its own listener
```

**Promises** — asynchronous work is expressed as values you can chain:

```js
Tapsi.ready.then((status) => console.log(status.modules)); // boot status
await Tapsi.bus.once("app:ready", 2000); // wait for an event (rejects on timeout)
await Tapsi.bus.emit("theme:change", { theme: "dark" }); // settles after every handler
carousel.scrollByCard(rail, 1).then(sync); // resolves when the scroll settles
```

## Getting started

```bash
npm install        # dev tooling only (sharp for image optimization)
npm start          # local static server → http://localhost:8080
```

Node.js ≥ 18 is required. There is no build step: open the served page and it
is the artifact.

## Scripts

| Command                 | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `npm start`             | Serve the site locally (`scripts/serve.mjs`)              |
| `npm test`              | Unit tests with the Node built-in runner (`node --test`)  |
| `npm run audit`         | Static QA gate: links, `alt`/`width`, ARIA targets, no CDN |
| `npm run verify`        | Tests **and** audit — what CI runs                         |
| `npm run optimize:images` | Regenerate optimized WebP assets (`sharp`)              |

## Project structure

```
├── index.html            # single page, semantic landmarks, JSON-LD, RTL
├── manifest.webmanifest  # PWA manifest
├── sw.js                 # offline service worker (cache strategies)
├── css/
│   ├── fonts.css         # @font-face declarations
│   └── style.css         # tokens → BEM components → sections
├── js/
│   ├── main.js           # defensive boot + Promise-based readiness
│   └── modules/
│       ├── bus.js        # lexically scoped, Promise-based event bus
│       ├── fare.js       # pure fare domain (shared browser/Node)
│       ├── compare.js    # pure cross-service pricing domain
│       ├── calculator.js # fare form UI + chart + trip persistence
│       ├── accordion.js  # FAQ disclosure (arrow-key navigation)
│       ├── tabs.js       # WAI-ARIA tabs, deep-linked via location.hash
│       ├── carousel.js   # scroll-snap rail, Promise-based scrolling
│       ├── form.js       # contact form validation
│       ├── feedback.js   # accessible toast live region
│       ├── nav.js        # mobile drawer + backdrop + scroll-spy
│       ├── theme.js · reveal.js · progress.js
├── scripts/              # serve · audit · optimize-images
├── tests/                # fare, form and bus unit tests
└── docs/ARCHITECTURE.md  # layering, event catalogue, contracts
```

## Testing & CI

```bash
npm run verify     # unit tests + static audit (same as CI)
```

- **Unit tests** (`tests/*.test.js`) run with Node's built-in test runner —
  no test framework dependency. Covered domains: fare estimation, service
  comparison, form validation, accordion key map, event-bus
  scoping/Promises.
- **Static audit** (`scripts/audit.mjs`) fails the build on broken asset or
  fragment references, images without `alt`/`width`/`height`, dangling
  `aria-controls`, root-absolute CSS paths or any third-party request.
- **CI** (`.github/workflows/ci.yml`) runs both on every push/PR, plus a check
  that the optimized image assets exist.

## Accessibility

- Semantic landmarks: `<header>`, `<main>`, `<footer>`, labelled `<section>`
  elements (the carousel uses a real `<section>` with `aria-label`, so it
  exposes the region role natively instead of `role="region"`).
- Skip link, visible focus, `aria-live` status/toast regions.
- WAI-ARIA tabs and carousel patterns, keyboard operable in RTL.
- Inline form errors wired with `aria-invalid` + `aria-describedby`.
- Colour contrast and motion (`prefers-reduced-motion`) respected via tokens.

## Offline / PWA

`sw.js` precaches the app shell (including every JS module), serves
navigations network-first with an offline fallback, and keeps code fresh with
network-first + cache fallback. Bump `CACHE_VERSION` whenever a precached
asset changes.

## Coding guidelines

- ES5-style IIFE modules with `"use strict"`, `var`, and a
  `module.exports` guard so the same file runs in the browser and in Node.
- JSDoc on every exported function; document *why*, not only *what*.
- CSS follows BEM; colours/spacing come from CSS variables only.
- Cross-domain communication goes through `Tapsi.bus` — never import another
  UI module directly.
- Every non-trivial change ships with tests and passes `npm run verify`.

## License

MIT — see [LICENSE](./LICENSE).
