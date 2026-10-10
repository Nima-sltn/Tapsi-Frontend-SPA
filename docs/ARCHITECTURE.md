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
│ js/modules/*    UI domains: nav (drawer) · accordion · tabs · │
│                 theme · reveal · carousel · form · feedback · │
│                 progress · calculator                         │
├──────────────────────────────────────────────────────────────┤
│ js/modules/bus.js   event bus — the only channel between     │
│                     UI domains (lexical scoping + Promises)  │
├──────────────────────────────────────────────────────────────┤
│ js/modules/fare.js     pure fare domain (DOM-free)           │
│ js/modules/compare.js  pure cross-service pricing domain     │
├──────────────────────────────────────────────────────────────┤
│ sw.js           offline shell, cache strategies              │
└──────────────────────────────────────────────────────────────┘
```

### Dependency rules

1. **UI modules never import each other.** They publish and subscribe through
   `Tapsi.bus`; a module may *read* another's public API only through the
   existing `Tapsi.<name>` namespace (as `calculator` reads `Tapsi.fare`).
2. **Domain code stays pure.** `fare.js` performs no DOM access and touches no
   globals, so Node can `require()` it for unit tests.
3. **One file = one namespace.** Every file is an ES5-style IIFE with
   `"use strict"`, exporting via `module.exports` when loaded in Node and via
   `global.Tapsi.<name>` in the browser.
4. **Boot is defensive.** `main.js` initialises each module inside
   `try/catch`; a failure is logged and recorded in the boot status instead of
   taking the page down.

## 2. The event bus (lexical scoping + Promises)

[`js/modules/bus.js`](../js/modules/bus.js) is the cross-domain layer.

- **Lexical scoping:** `createBus()` keeps its subscriber registry
  (`topics`) in the function's lexical scope. The registry is unreachable from
  outside — callers only ever touch it through `on`, `once`, `emit`, `has`,
  `clear` — and two buses created from the factory share zero state. Listeners
  are returned as closures (`unsubscribe` captures its own entry), so removing
  one subscription can never affect another.
- **Promises:** `emit()` returns a Promise that settles after *every* handler
  has finished (async handlers included); handler errors are logged and
  skipped, so a faulty subscriber cannot block the others. `once()` returns a
  Promise that resolves with the next payload — or rejects after an optional
  timeout — and cleans up its subscription either way.

### Event catalogue

| Topic               | Publisher            | Payload                                          | Intended subscribers                     |
| ------------------- | -------------------- | ------------------------------------------------ | ---------------------------------------- |
| `app:ready`         | `main.js` after boot | `{ modules, failed, at }`                         | deferred/progressive enhancements        |
| `nav:toggle`        | `nav.js`             | `{ open }`                                        | scroll locking, focus hand-off, analytics |
| `theme:change`      | `theme.js`           | `{ theme, previous }`                             | any module reacting to palette changes   |
| `tabs:change`       | `tabs.js`            | `{ id, panel }`                                   | analytics, deep-linking, future panels   |
| `accordion:change`  | `accordion.js`       | `{ id, expanded }`                                | analytics, "open one at a time" policies |
| `carousel:change`   | `carousel.js`        | `{ atStart, atEnd }`                              | controls, indicators, analytics          |
| `calculator:restore`| `calculator.js`      | the restored trip                                 | first-visit hints, analytics             |
| `calculator:change` | `calculator.js`      | `{ service, total }`                              | comparison chart, analytics              |
| `form:submit`       | `form.js`            | `{ outcome: "valid"\|"invalid"\|"ignored", errors }` | toasts, future API/analytics layer    |

Publishers are fire-and-forget (`bus.emit(...)` without `await`) whenever the
caller has nothing to chain; subscribers that need sequencing use the returned
Promise.

## 3. Promise contracts

| API                                          | Resolves with                     | Rejects / notes                          |
| -------------------------------------------- | --------------------------------- | ---------------------------------------- |
| `Tapsi.ready`                                | boot status `{ modules, failed, at }` | never rejects                        |
| `Tapsi.bus.emit(topic, payload)`             | the payload, after all handlers   | never rejects (handler errors logged)    |
| `Tapsi.bus.once(topic[, timeoutMs])`         | first payload                     | `Error` on timeout                       |
| `Tapsi.carousel.scrollByCard(el, dir)`       | when the scroll settles (`scrollend` + timeout fallback) | never rejects |
| `Tapsi.carousel.waitForScroll(el[, ms])`     | when the rail is idle             | never rejects                            |

## 4. Data flow — fare calculator

```
user input (form)
   → calculator.readForm()        pure read of the DOM values
   → fare.estimateFare(input)     pure pricing domain, throws RangeError
                                  on unknown service/time window
   → compare.compareFare(input)   every service priced + ranked (pure)
   → calculator.render()          writes breakdown, total, range,
                                  comparison bars, then persists to storage
   → bus: calculator:change       other domains react without imports
   → (rAF-batched)                many input events collapse into one paint

page load
   → calculator.restore(form)     validated localStorage trip → form values
   → bus: calculator:restore
```

The domain owns *numbers*; the UI owns *pixels*. `fare.js` and `compare.js`
are therefore shared unchanged between the browser (global scripts) and Node
(unit tests). Restored values are always re-validated against the markup, so
stale storage can never put the form in an invalid state.

## 5. Offline strategy

- **Install:** precache the app shell (HTML, CSS, every JS module, fonts, hero
  images) under a versioned cache; bump `CACHE_VERSION` on every change.
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
  live region), form errors (`aria-invalid` + `aria-describedby`).
- Focus management: skip link, `tabindex="-1"` on `<main>`, focus moved to the
  first invalid field on failed submission.

## 7. Testing strategy

| Layer            | Tool                        | Examples                                  |
| ---------------- | --------------------------- | ----------------------------------------- |
| Pure domain      | `node --test`               | `tests/fare.test.js`, `tests/compare.test.js` |
| Pure UI logic    | `node --test`               | `tests/form.test.js` validators, `tests/accordion.test.js` key map |
| Language features| `node --test`               | `tests/bus.test.js` (scoping + Promises)  |
| Static integrity | `scripts/audit.mjs`         | refs, `alt`/`width`, ARIA targets, no CDN  |
| CI               | GitHub Actions              | `npm run verify` + asset presence         |

## 8. Adding a new module — checklist

1. Create `js/modules/<name>.js` as an IIFE with a `Tapsi.<name>` namespace,
   a `module.exports` guard and JSDoc.
2. Expose `init()`; make it idempotent and null-safe (the markup may not be
   present on every page).
3. Add it to `MODULES` in `js/main.js` and to the `<script defer>` list in
   `index.html`.
4. Precache it in `sw.js` and bump `CACHE_VERSION`.
5. Communicate with other domains through `Tapsi.bus` only.
6. Ship unit tests for any pure logic and run `npm run verify`.
