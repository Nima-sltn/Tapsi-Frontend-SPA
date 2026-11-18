/**
 * Light/dark theme switch with cross-tab sync and View Transitions API.
 *
 * The initial theme is applied pre-paint by the inline snippet in `<head>`;
 * this module handles the toggle, persistence, system-preference changes,
 * audio haptic cue, and multi-tab synchronization.
 */

import { bus } from "./bus.js";
import { defaultStorage } from "../infrastructure/storage.js";
import { crossTabSync } from "../services/cross-tab.js";
import { haptics } from "../services/haptics.js";
import type { Theme } from "../types.js";

const STORAGE_KEY = "tapsi-theme";
const DARK_LABEL = "فعال کردن حالت روشن";
const LIGHT_LABEL = "فعال کردن حالت تاریک";

let button: HTMLButtonElement | null = null;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Applies and persists a theme. */
export function applyTheme(theme: Theme, notifyTabs: boolean = true): void {
  const previous = document.documentElement.dataset.theme;
  const dark = theme === "dark";

  const executeThemeChange = () => {
    document.documentElement.dataset.theme = theme;
    if (button) {
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? DARK_LABEL : LIGHT_LABEL);
    }
  };

  // Progressive enhancement: View Transitions API for buttery smooth crossfade
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (document as unknown as { startViewTransition: (fn: () => void) => void }).startViewTransition(executeThemeChange);
  } else {
    executeThemeChange();
  }

  defaultStorage.set(STORAGE_KEY, theme);

  if (notifyTabs) {
    crossTabSync.publish("theme:sync", theme);
  }

  if (previous !== theme) {
    void bus.emit("theme:change", { theme, previous: previous || null });
  }
}

export function init(): void {
  button = document.getElementById("theme-toggle") as HTMLButtonElement | null;
  applyTheme(currentTheme(), false);

  button?.addEventListener("click", () => {
    haptics.play("toggle");
    applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
  });

  // Multi-tab synchronization
  crossTabSync.subscribe<Theme>("theme:sync", (incomingTheme) => {
    if (incomingTheme === "light" || incomingTheme === "dark") {
      if (incomingTheme !== currentTheme()) {
        applyTheme(incomingTheme, false);
      }
    }
  });

  // Follow system preference changes if user hasn't explicitly set a preference
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = (event: MediaQueryListEvent) => {
    const stored = defaultStorage.get<string>(STORAGE_KEY);
    if (stored !== "light" && stored !== "dark") {
      applyTheme(event.matches ? "dark" : "light", true);
    }
  };
  media.addEventListener("change", onSystemChange);
}
