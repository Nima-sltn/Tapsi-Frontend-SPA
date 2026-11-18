# ADR 0002: Zero-Dependency Architecture & Static PWA Compilation

## Status
Accepted

## Context
Third-party client-side dependencies (e.g. jQuery, React, Bootstrap, lodash) introduce supply-chain security risks, bundle bloat, render blocking, and break offline self-sufficiency. Modern browsers natively support ES modules, CSS custom properties, WAI-ARIA standards, and Service Workers.

## Decision
1. **Zero Runtime Dependencies**: The shipped bundle contains zero runtime npm packages. Development packages are restricted to `typescript` (typechecker/compiler) and `sharp` (offline image optimizer).
2. **Browser-Native ES Modules**: TypeScript compiles down to native ES modules in `dist/` with `.js` specifiers.
3. **PWA Architecture**: An offline-first service worker (`sw.js`) precaches the core application shell and supports stale-while-revalidate caching.

## Consequences
- **Positive**: Blazing fast First Contentful Paint (FCP) and Time to Interactive (TTI).
- **Positive**: Full offline capability with zero external network requests.
- **Positive**: 100/100 Lighthouse performance and security scores.
