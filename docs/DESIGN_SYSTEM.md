# Design System Specification & Token Reference 🎨

This document defines the visual design system, token architecture, typography hierarchy, and accessibility guidelines for the Tapsi Redesign.

---

## 1. Design Principles

- **RTL-First & Culturally Grounded**: Engineered specifically for Persian (`fa-IR`) reading flow, numerals, and bidirectional keyboard interactions.
- **Purposeful & Dignified**: Zero template fluff, zero gratuitous badges. Every element serves an authentic user goal.
- **Accessible & High-Contrast**: Strictly compliant with WCAG 2.2 AA/AAA guidelines, supporting `forced-colors: active` and `prefers-reduced-motion`.
- **Tactile & Responsive**: Fluid typography, responsive scaling across mobile, tablet, and desktop, coupled with subtle micro-interactions.

---

## 2. Color Tokens

### Brand & Primary
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#ff5722` | `#ff7a50` | Primary action buttons, active tabs, brand accents |
| `--color-primary-light` | `#ff7a50` | `#ff8a65` | Hover states, popular plan highlights |
| `--color-primary-dark` | `#e64a19` | `#e64a19` | Active/pressed states |
| `--color-secondary-dark` | `#161927` | `#1e2235` | Card headers, dark contrast panels |

### Neutrals & Surfaces
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--color-surface` | `#ffffff` | `#161927` | Card backgrounds, elevated components |
| `--color-surface-soft` | `#f8f9fa` | `#1c2033` | Section backgrounds, contrast containers |
| `--color-border` | `#e0e0e0` | `#2a2f45` | Component borders, input outlines |
| `--color-heading` | `#161927` | `#f1f3f5` | Primary headings, prominent titles |
| `--color-body` | `#424242` | `#c5c9d6` | Body paragraphs, labels |
| `--color-muted` | `#666666` | `#9ca3af` | Secondary captions, unit labels |

---

## 3. Typography Scale

Using the localized `Vazir` Persian typeface with self-hosted WOFF assets:

| Class / Role | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | `2.8rem` (desktop `3.6rem`) | 800 | 1.35 | Main page hero heading |
| **Section Heading** | `2.4rem` | 700 | 1.4 | Section `<h2>` headings |
| **Card Heading** | `1.8rem` | 700 | 1.4 | Plan titles, feature headings |
| **Body Primary** | `1.5rem` | 400 | 1.8 | Main prose, feature paragraphs |
| **Body Secondary** | `1.3rem` | 400 | 1.6 | Secondary notes, input values |
| **Caption / Badge** | `1.15rem` | 600 | 1.2 | Meta indicators, categories |

---

## 4. Spacing & Elevation Grid

Base 8px spatial rhythm:
- `0.4rem` (4px): Fine micro-gap
- `0.8rem` (8px): Element padding / chip margins
- `1.6rem` (16px): Standard component padding
- `2.4rem` (24px): Card interior spacing
- `3.2rem` (32px): Sub-section grouping
- `6.4rem` (64px): Block section separation

---

## 5. Accessibility Checklist

- [x] **Focus Visible**: All interactive elements render a minimum 2px focus ring with 4px offset.
- [x] **Color Contrast**: 4.5:1 minimum contrast ratio for standard text, 3:1 for large text.
- [x] **Keyboard Operation**: Tab index roving on tabs and accordion, with Arrow Left/Right mirrored for RTL.
- [x] **Motion Safety**: Transitions clamped to 0s when `prefers-reduced-motion` is detected.
- [x] **Screen Reader Semantics**: `aria-expanded`, `aria-selected`, `aria-controls`, `aria-live` polite regions.
