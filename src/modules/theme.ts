/**
 * Light/dark theme switch.
 *
 * The initial theme is applied pre-paint by the inline snippet in `<head>`;
 * this module handles the toggle, persistence and system-preference changes.
 */
import { bus } from "./bus.js";
import type { Theme } from "../types.js";

const STORAGE_KEY = "tapsi-theme";
const DARK_LABEL = "فعال کردن حالت روشن";
const LIGHT_LABEL = "فعال کردن حالت تاریک";

let button: HTMLButtonElement | null = null;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Applies and persists a theme. */
export function applyTheme(theme: Theme): void {
  const previous = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";

  if (button) {
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? DARK_LABEL : LIGHT_LABEL);
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage disabled (private mode) — theme still applies for this visit */
  }

  // Announce the transition to any interested module (progress, reveal, …)
  // without importing any of them — the bus keeps the domains decoupled.
  if (previous !== theme) {
    void bus.emit("theme:change", { theme, previous: previous || null });
  }
}

export function init(): void {
  button = document.getElementById("theme-toggle") as HTMLButtonElement | null;
  applyTheme(currentTheme());

  button?.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  // Follow the OS only while the visitor has not chosen a theme manually.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = (event: MediaQueryListEvent) => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored !== "light" && stored !== "dark") {
      applyTheme(event.matches ? "dark" : "light");
    }
  };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onSystemChange);
  } else if (typeof media.addListener === "function") {
    // Safari ≤13
    (media as unknown as { addListener(cb: typeof onSystemChange): void }).addListener(onSystemChange);
  }
}
