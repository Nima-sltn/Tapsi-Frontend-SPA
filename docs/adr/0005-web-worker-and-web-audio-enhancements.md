# ADR 0005: Micro-Interaction Audio Synthesis & Multi-Tab Synchronization

## Status
Accepted

## Context
High-end consumer mobility apps feel responsive and tactile through deliberate micro-interactions. However, loading audio files (e.g., MP3/WAV assets) wastes bandwidth, slows initial load, and causes decode delays. Furthermore, users often open multiple tabs; out-of-sync theme or calculator state causes friction.

## Decision
1. **Zero-Asset Web Audio API Synthesis**: Micro-cues (slider ticks, toggle chimes, success tones) are synthesized dynamically on the fly with oscillators and exponential gain ramps (`AudioContext`).
2. **Accessibility First**: Audio cues are muted by default, respect `prefers-reduced-motion`, and can be toggled by the user in the header.
3. **Cross-Tab Synchronization**: State is mirrored across browser tabs via `BroadcastChannel` (with `storage` event fallback).

## Consequences
- **Positive**: Zero extra kilobyte overhead from audio media assets.
- **Positive**: Real-time cross-tab updates without any backend server.
