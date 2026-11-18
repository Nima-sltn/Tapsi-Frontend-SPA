# Contributing to Tapsi Redesign 🤝

Thank you for your interest in contributing to the Tapsi Redesign project! We welcome improvements, bug fixes, and architectural enhancements.

---

## 1. Development Workflow

### Prerequisites
- Node.js ≥ 18.0.0
- npm ≥ 9.0.0

### Setup
```bash
# Clone the repository
git clone https://github.com/nimasltn/tapsi-redesign.git
cd tapsi-redesign

# Install dev tooling
npm install

# Build TypeScript to dist/
npm run build

# Start local dev server
npm start
```

---

## 2. Coding Standards & Architectural Invariants

1. **Strict TypeScript in `src/`**: Edit files in `src/`, never directly in `dist/`. The `dist/` directory is generated on build.
2. **Domain Purity**: Domain logic (`src/domain/`) must remain 100% pure and DOM-free.
3. **Decoupled UI Modules**: UI modules must never directly import other UI modules. Cross-domain communication is mediated exclusively via the typed event bus (`src/modules/bus.ts`).
4. **BEM Architecture**: CSS must adhere to BEM syntax and consume design tokens (CSS variables) from `:root`.
5. **No AI Slop / Generic Boilerplate**: Avoid repetitive badges, placeholder copy, or unneeded controls. Design must be tailored, clean, and professional.

---

## 3. Verification Gates

Before submitting a Pull Request, ensure all automated gates pass:

```bash
# Runs build + typecheck + unit tests + QA audit
npm run verify

# Verify test coverage
npm run test:coverage
```

---

## 4. Commit Message Guidelines

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) standard:

- `feat:` Introduces a new feature or domain capability
- `fix:` Fixes a bug or regression
- `refactor:` Code restructuring without behavioral alterations
- `docs:` Documentation additions or updates
- `test:` Adding or updating unit tests
- `chore:` Tooling, CI/CD, or build script updates
