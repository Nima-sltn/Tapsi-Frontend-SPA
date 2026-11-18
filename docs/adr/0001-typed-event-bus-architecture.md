# ADR 0001: Typed Event Bus with Lexical Scoping and Promise Contracts

## Status
Accepted

## Context
In a modular vanilla TypeScript frontend with no framework (zero React/Vue/Angular runtime overhead), UI domains must communicate without circular dependencies or tight module coupling. Direct cross-domain imports (e.g. `form.ts` importing `feedback.ts` or `calculator.ts` importing `theme.ts`) violate the Single Responsibility Principle and make unit testing in Node.js impossible without DOM mocking.

## Decision
We implement a centralized, strictly-typed Event Bus (`src/modules/bus.ts`):
1. **Lexical Scoping Enclosure**: Subscriber registries are held in the factory function's lexical closure (`createBus()`), ensuring zero external tampering or registry inspection.
2. **Compile-time Topic & Payload Checking**: All events and payloads are constrained by a TypeScript `EventMap`.
3. **Promise-Based Delivery**: `emit()` returns a Promise that settles after all synchronous and asynchronous listeners finish, with error boundaries shielding subscribers from each other.
4. **Subscription Cleanup**: `on()` returns a dedicated `Unsubscribe` closure.

## Consequences
- **Positive**: Strict decoupling of UI domains. High testability in Node without DOM.
- **Positive**: Adding a new domain simply requires registering event types in `EventMap`.
- **Negative**: Traceability requires checking event topic subscriptions rather than direct call graphs.
