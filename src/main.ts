/**
 * Application entry point.
 *
 * Loads every feature module defensively: one failing module never takes
 * the rest of the page down. Modules are ES module imports (static, so the
 * bundler-free browser can fetch them in parallel), but their `init()` is
 * invoked inside `try/catch` — order matters only where a module consumes
 * another (`feedback` subscribes to `form:submit`, `progress` reads
 * `reveal`'s motion preference); everything else communicates through the
 * typed event bus.
 *
 * Boot completes asynchronously: `ready` is a Promise resolving with the
 * initialised module list, and an `app:ready` event is published on the
 * bus for code that needs to wait for a fully booted page.
 */
import { bus } from "./modules/bus.js";
import * as feedback from "./modules/feedback.js";
import * as nav from "./modules/nav.js";
import * as accordion from "./modules/accordion.js";
import * as tabs from "./modules/tabs.js";
import * as theme from "./modules/theme.js";
import * as reveal from "./modules/reveal.js";
import * as carousel from "./modules/carousel.js";
import * as form from "./modules/form.js";
import * as calculator from "./modules/calculator.js";
import * as progress from "./modules/progress.js";
import type { BootStatus } from "./types.js";

interface FeatureModule {
  init: () => void;
}

const MODULES: Array<[string, FeatureModule]> = [
  ["feedback", feedback],
  ["nav", nav],
  ["accordion", accordion],
  ["tabs", tabs],
  ["theme", theme],
  ["reveal", reveal],
  ["carousel", carousel],
  ["form", form],
  ["calculator", calculator],
  ["progress", progress]
];

/**
 * Resolves with the boot status once every module has been initialised.
 * Never rejects: failures are recorded in `failed` instead, mirroring the
 * module registry pattern.
 */
export const ready: Promise<BootStatus> = new Promise((resolve) => {
  const started: string[] = [];
  const failed: string[] = [];

  const boot = () => {
    MODULES.forEach(([name, module]) => {
      try {
        module.init();
        started.push(name);
      } catch (error) {
        failed.push(name);
        console.error(`[tapsi] module "${name}" failed to initialise`, error);
      }
    });

    registerServiceWorker();

    const status: BootStatus = { modules: started, failed, at: Date.now() };
    void bus.emit("app:ready", status);
    resolve(status);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
});

/**
 * Registers the offline service worker (HTTP(S) only — `file://` has no
 * service worker support and registration would simply reject).
 */
function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  if (!/^https?:$/.test(window.location.protocol)) return;

  navigator.serviceWorker
    .register("sw.js")
    .then((registration) => console.info("[tapsi] service worker registered", registration.scope))
    .catch((error) => console.warn("[tapsi] service worker unavailable", error));
}
