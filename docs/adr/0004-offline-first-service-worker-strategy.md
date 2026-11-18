# ADR 0004: Offline-First Service Worker Strategy

## Status
Accepted

## Context
Mobile riders and drivers often face unstable connectivity, elevator blackouts, and underground signal drops. The application must continue functioning offline, preserving past calculation parameters and serving essential UI elements.

## Decision
1. **Precached App Shell**: `install` precaches the complete static bundle (HTML, CSS, WebP banners, fonts, ES modules).
2. **Navigation Fallback**: Navigation requests use a network-first strategy, falling back seamlessly to cached `index.html`.
3. **Stale-While-Revalidate for Code**: Assets and compiled modules use network-first with cached fallback so active developers and users receive instant cache invalidation upon redeployment.
4. **Versioned Cache Pruning**: `activate` purges all legacy cache keys when `CACHE_VERSION` is incremented.

## Consequences
- **Positive**: App loads instantly even with zero network connectivity.
- **Positive**: No stale assets persist across releases.
