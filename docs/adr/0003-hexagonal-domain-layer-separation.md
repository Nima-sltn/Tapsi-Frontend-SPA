# ADR 0003: Hexagonal Layer Separation & Domain-Driven Modeling

## Status
Accepted

## Context
Complex applications frequently suffer from presentation leaks where business arithmetic (tariffs, surge multiples, CO2 modeling) is intertwined with DOM manipulation (updating text nodes, reading inputs). This leads to code smells, difficult test coverage, and regression risks.

## Decision
We enforce a strict Hexagonal / Layered Architecture:
1. **Pure Domain Layer (`src/domain/`)**:
   - `pricing/strategy.ts`: Strategy Pattern encapsulating tariff rules for Classic, Plus, Moto, Autopeyk, and Line.
   - `eco/carbon.ts`: Carbon emission and environmental savings computation model.
   - `trip/state-machine.ts`: Deterministic finite state machine governing the trip estimation lifecycle.
2. **Infrastructure Layer (`src/infrastructure/`)**:
   - `storage.ts`: Resilient Storage Repository with in-memory fallback.
3. **Application & Services Layer (`src/services/`, `src/core/`)**:
   - `cross-tab.ts`: Multi-tab synchronization via `BroadcastChannel`.
   - `haptics.ts`: Web Audio API acoustic synthesis.
   - `container.ts`: Lightweight Inversion of Control service container.
4. **Presentation Layer (`src/modules/`)**:
   - UI controllers that read user inputs, trigger domain strategies, and render pixels.

## Consequences
- **Positive**: 100% of domain and infrastructure logic is unit tested in Node.js without any headless browser overhead.
- **Positive**: Impossible states are eliminated via the finite state machine.
