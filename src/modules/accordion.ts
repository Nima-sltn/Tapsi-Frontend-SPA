/**
 * Accessible accordion (WAI-ARIA disclosure pattern) for the FAQ section.
 *
 * - Each question is a `<button>` controlling an answer panel via
 *   `aria-expanded` / `aria-controls`.
 * - Panels are toggled with the `.is-open` class, which drives the CSS
 *   `grid-template-rows: 0fr → 1fr` transition — the open/close animation
 *   is pure CSS, no JS measurement. Collapsed panels are `visibility:
 *   hidden`, so they leave the accessibility tree just like `hidden`.
 * - The static `hidden` attribute on each panel is only the no-JS
 *   fallback; `init()` removes it so the CSS animation can run.
 * - One-at-a-time: opening a question closes every other open question
 *   in the same `[data-accordion]` group.
 * - Arrow Up/Down, Home and End move between questions (APG optional
 *   enhancement) — the key map is a pure function so it is unit-testable.
 * - Every toggle publishes `accordion:change` on the event bus.
 */
import { bus } from "./bus.js";

/**
 * Maps a navigation key to a question index.
 * @returns Target index, or null when the key is not handled.
 */
export function nextIndex(length: number, current: number, key: string): number | null {
  if (!length) return null;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  if (key === "ArrowDown") return (current + 1) % length;
  if (key === "ArrowUp") return (current - 1 + length) % length;
  return null;
}

/** Resolves the answer panel controlled by a question button. */
function panelFor(button: HTMLButtonElement): HTMLElement | null {
  const panelId = button.getAttribute("aria-controls");
  return panelId ? document.getElementById(panelId) : null;
}

/** Whether a question is currently expanded. */
export function isOpen(button: HTMLButtonElement): boolean {
  return button.getAttribute("aria-expanded") === "true";
}

/** Opens or closes one question. */
export function setOpen(button: HTMLButtonElement, expanded: boolean): void {
  const panel = panelFor(button);
  button.setAttribute("aria-expanded", String(expanded));
  if (panel) {
    panel.hidden = false;
    panel.classList.toggle("is-open", expanded);
  }

  void bus.emit("accordion:change", { id: button.id, expanded: Boolean(expanded) });
}

/**
 * Opens `button` and closes every other open question in its group —
 * the "one at a time" policy. Closing happens first so the group never
 * shows two expanded panels in the same frame.
 */
export function openExclusive(button: HTMLButtonElement, group: HTMLElement): void {
  group.querySelectorAll<HTMLButtonElement>('.faq__question[aria-expanded="true"]').forEach((other) => {
    if (other !== button) setOpen(other, false);
  });
  setOpen(button, true);
}

export function init(): void {
  document.querySelectorAll<HTMLElement>("[data-accordion]").forEach((group) => {
    const questions = Array.from(group.querySelectorAll<HTMLButtonElement>(".faq__question"));
    if (!questions.length) return;

    // The `hidden` attribute is a no-JS fallback; with JS running we drive
    // visibility via `.is-open` so open/close can animate.
    group.querySelectorAll<HTMLElement>(".faq__answer").forEach((panel) => {
      panel.hidden = false;
      panel.classList.toggle("is-open", panel.getAttribute("data-initial-open") === "true");
    });

    group.addEventListener("click", (event) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>(".faq__question") ?? null;
      if (!button || !group.contains(button)) return;

      const willOpen = !isOpen(button);
      if (willOpen) openExclusive(button, group);
      else setOpen(button, false);
    });

    group.addEventListener("keydown", (event) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>(".faq__question") ?? null;
      if (!button) return;

      const index = questions.indexOf(button);
      const destination = nextIndex(questions.length, index, event.key);
      if (destination === null) return;

      event.preventDefault();
      questions[destination]?.focus();
    });
  });
}
