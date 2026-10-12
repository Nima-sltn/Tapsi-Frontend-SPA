# Architecture

This document describes how the Tapsi redesign is structured, how the pieces
communicate, and what contracts they rely on. It is the reference for
contributors and for any automated review of the project.

## 1. Layering

```
┌──────────────────────────────────────────────────────────────┐
│ index.html      semantic markup, ARIA, declarative hooks     │
│                 (data-toast, data-carousel, data-tab-target) │
├──────────────────────────────────────────────────────────────┤
│ css/            tokens (CSS variables) → BEM components →    │
│                 section layouts                              │
├──────────────────────────────────────────────────────────────┤
│ src/modules/*   UI domains (TypeScript): nav (drawer) ·      │
│                 accordion · tabs · theme · reveal · carousel ·│
│                 form · feedback · progress · calculator      │
├──────────────────────────────────────────────────────────────┤
│ src/modules/bus.ts    typed event bus — the only channel     │
│                       between UI domains (lexical scoping +  │
│                       Promises, EventMap-checked payloads)   │
├──────────────────────────────────────────────────────────────┤
│ src/modules/fare.ts     pure fare domain (DOM-free)          │
│ src/modules/compare.ts  pure cross-service pricing domain    │
│ src/modules/share.ts    pure shareable-trip-URL domain       │
├──────────────────────────────────────────────────────────────┤
│ src/main.ts      defensive boot + Promise readiness          │
├──────────────────────────────────────────────────────────────┤
│ tsc ──▶ dist/      generated ES modules — the artifact that    │
│                  ships; never edited by hand                 │
├──────────────────────────────────────────────────────────────┤
│ sw.js           offline shell, cache strategies              │
└──────────────────────────────────────────────────────────────┘
```

### Dependency rules

1. **UI modules never import each other.** They publish and subscribe through
   the typed bus (`EventMap` in `bus.ts`). Pure domains (`fare`, `compare`,
   `share`) may be imported directly — they are DOM-free libraries, not
   stateful domains.
2. **Domain code stays pure.** `fare.ts`, `compare.ts` and `share.ts` perform
   no DOM access and touch no globals, so Node imports them for unit tests
   (the tests exercise the exact compiled artifacts the browser loads).
3. **Strict TypeScript only.** Every module is a `strict`-mode ES module with
   named exports; there are no globals and no `this` coupling. The compiler
   settings (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`) are part of
   the contract.
4. **Boot is defensive.** `main.ts` initialises each module inside
   `try/catch`; a failure is logged and recorded in the boot status instead
   of taking the page down.
5. **`dist/` is generated.** `npm run build` cleans and recompiles, so the
   shipped tree can never contain a stale module from a renamed source file
   (the service worker precaches every path in `dist/`).

## 2. The event bus (lexical scoping + Promises)

[`src/modules/bus.ts`](../src/modules/bus.ts) is the cross-domain layer.

- **Typed topics:** `EventMap` declares every topic and its exact payload.
  `bus.emit("tabs:change", { id, panel })` is compile-time checked; a
  mistyped topic or payload is a build failure, not a runtime surprise.
  Extending the application means extending `EventMap` — every publisher and
  subscriber is re-checked by `npm run typecheck`.
- **Lexical scoping:** `createBus()` keeps its subscriber registry
  (`topics`) in the function's lexical scope. The registry is unreachable
  from outside — callers only ever touch it through `on`, `once`, `emit`,
  `has`, `clear` — and two buses created from the factory share zero state.
  Listeners are returned as closures (`unsubscribe` captures its own entry),
  so removing one subscription can never affect another. The public `Bus`
  interface never exposes the registry's type, so the type system reinforces
  the enclosure.
- **Promises:** `emit()` returns a Promise that settles after *every* handler
  has finished (async handlers included); handler errors are logged and
  skipped, so a faulty subscriber cannot block the others. `once()` returns
  a Promise that resolves with the next payload — or rejects after an
  optional timeout — and cleans up its subscription either way.

### Event catalogue

| Topic                | Publisher           | Payload                                          | Intended subscribers                     |
| -------------------- | ------------------- | ------------------------------------------------ | ---------------------------------------- |
| `app:ready`          | `main.ts` after boot | `{ modules, failed, at }`                        | deferred/progressive enhancements        |
| `nav:toggle`         | `nav.ts`            | `{ open }`                                       | scroll locking, focus hand-off, analytics |
| `theme:change`       | `theme.ts`          | `{ theme, previous }`                            | any module reacting to palette changes   |
| `tabs:change`        | `tabs.ts`           | `{ id, panel }`                                  | analytics, deep-linking, future panels   |
| `accordion:change`   | `accordion.ts`      | `{ id, expanded }`                               | analytics, deep-linking                  |
| `carousel:change`    | `carousel.ts`       | `{ atStart, atEnd }`                             | controls, indicators, analytics          |
| `calculator:restore` | `calculator.ts`     | the restored trip                                | first-visit hints, analytics             |
| `calculator:change`  | `calculator.ts`     | `{ service, total }`                             | comparison chart, analytics              |
| `trip:share`         | `calculator.ts`     | `{ ok, via: "clipboard" \| "fallback" }`         | toasts (`feedback.ts`), analytics        |
| `form:submit`        | `form.ts`           | `{ outcome: "valid"\|"invalid"\|"ignored", errors }` | toasts (`feedback.ts`), future API layer |

Publishers are fire-and-forget (`void bus.emit(...)` without `await`)
whenever the caller has nothing to chain; subscribers that need sequencing
use the returned Promise.

Note the decoupling direction: `form.ts` never imports `feedback.ts` — it
publishes `form:submit`, and the toast domain subscribes. Adding a new
surface (analytics, an API layer) means subscribing, not editing the
publisher.

## 3. Promise contracts

| API                                          | Resolves with                     | Rejects / notes                          |
| -------------------------------------------- | --------------------------------- | ---------------------------------------- |
| `ready` (from `main.ts`)                     | boot status `{ modules, failed, at }` | never rejects                        |
| `bus.emit(topic, payload)`                   | the payload, after all handlers   | never rejects (handler errors logged)    |
| `bus.once(topic[, timeoutMs])`               | first payload                     | `Error` on timeout                       |
| `scrollByCard(el, dir)`                      | when the scroll settles (`scrollend` + timeout fallback) | never rejects |
| `waitForScroll(el[, ms])`                    | when the rail is idle             | never rejects                            |

## 4. Data flow — fare calculator

```
user input (form)
   → calculator.readForm()        pure read of the DOM values
   → fare.estimateFare(input)     pure pricing domain, throws RangeError
                                  on unknown service/time window
   → compare.compareFare(input)   every service priced + ranked (pure)
   → calculator.render()          writes breakdown, total, range,
                                  comparison bars, then persists to storage
   → calculator.syncUrl(trip)     trip mirrored into ?service=…&km=… so the
                                  address bar is always a shareable link
   → bus: calculator:change       other domains react without imports
   → (rAF-batched)                many input events collapse into one paint

page load (precedence: URL > storage > markup defaults)
   → calculator.parseTripSearch(location.search)  shared link wins
   → else calculator.restore(form)                validated localStorage
   → bus: calculator:restore

share button
   → share.tripToSearch(trip)     pure encode → absolute URL
   → navigator.clipboard.writeText (fallback: URL already in address bar)
   → bus: trip:share              feedback.ts surfaces the toast
```

The domain owns *numbers*; the UI owns *pixels*. `fare.ts`, `compare.ts` and
`share.ts` are therefore shared unchanged between the browser (ES modules)
and Node (unit tests). Restored values — from storage *or* URL — are always
re-validated/clamped against the markup, so stale storage or a hand-edited
link can never put the form in an invalid state.

## 5. Offline strategy

- **Install:** precache the app shell (HTML, CSS, every compiled JS module,
  fonts, hero images) under a versioned cache; bump `CACHE_VERSION` on every
  change. The precache list must match the `dist/` tree produced by
  `npm run build`.
- **Navigations:** network-first with a cached `index.html` fallback.
- **Code (CSS/JS/manifest):** network-first with a cache fallback, so an edit
  is never masked by a stale file.
- **Images & fonts:** stale-while-revalidate.
- Third-party requests are forbidden and enforced by the audit.

## 6. Accessibility architecture

- Landmarks: `<header>` / `<main>` / `<footer>`; every content block is a
  `<section>` labelled via `aria-labelledby` (the carousel uses a real
  `<section>` with `aria-label`, which exposes the region role natively —
  no explicit `role="region"` needed).
- Widgets follow the APG: tabs (roving tabindex, arrow/Home/End, RTL-aware),
  carousel (labelled region, `aria-roledescription`), toasts (`<output>`
  live region), form errors (`aria-invalid` + `aria-describedby`), mobile
  drawer (focus trap, Escape, backdrop, scroll lock).
- Focus management: skip link, `tabindex="-1"` on `<main>`, focus moved to the
  first invalid field on failed submission, drawer returns focus to the
  toggler on Escape/backdrop.

## 7. Testing strategy

| Layer                 | Tool                 | Examples                                              |
| --------------------- | -------------------- | ----------------------------------------------------- |
| Pure domain           | `node --test`        | `tests/fare.test.js`, `tests/compare.test.js`, `tests/share.test.js` |
| Pure UI logic         | `node --test`        | `tests/form.test.js` validators, `tests/accordion.test.js` key map + `isOpen` |
| Language features     | `node --test`        | `tests/bus.test.js` (scoping + Promises)              |
| Types                 | `tsc --noEmit`       | every `emit`/`on` against `EventMap`                  |
| Structure             | `scripts/audit.mjs`  | references, ARIA targets, no third-party requests     |

Tests import the **compiled** modules under `dist/`, i.e. the exact files the
browser executes, so a build-output regression fails CI just like a source
regression.
