# Changelog 📋

All notable changes to this project are documented here.

## [3.1.0] - 2026-11-18

### Architecture
- Introduced pure domain layer with Strategy Pattern for pricing tariffs (`src/domain/pricing/strategy.ts`).
- Added deterministic Finite State Machine (`src/domain/trip/state-machine.ts`) for trip lifecycle management.
- Implemented Storage Repository pattern (`src/infrastructure/storage.ts`) with safe in-memory fallback.
- Added Inversion of Control service container (`src/core/container.ts`).

### Innovation
- Added real-time Carbon Offset & Environmental Impact modeling (`src/domain/eco/carbon.ts`).
- Synthesized Web Audio API acoustic micro-cues (`src/services/haptics.ts`) with zero media asset downloads.
- Introduced real-time multi-tab state synchronization via `BroadcastChannel` (`src/services/cross-tab.ts`).
- Added native Web Share API integration with Clipboard API fallback.

### Cross-Domain & DevOps
- Enforced strict Content Security Policy (CSP) and Referrer-Policy headers.
- Enhanced CI workflow with multi-node matrix (18, 20, 22), test coverage reporting, and automated security scans.
- Expanded automated unit test suite from 49 to 68 tests with zero regressions.

### UI/UX Redesign
- Redesigned Hero section with high-contrast, modern typography and clean CTA hierarchy.
- Eliminated redundant badges and placeholder pricing tiers; introduced 3 authentic mobility packages (Commuter, Tapsi Pro, Enterprise).
- Upgraded carousel slides with genuine Tapsi Club and community features, removing duplicate placeholders.
- Added accessible audio feedback toggle in the header navigation.
