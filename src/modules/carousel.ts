/**
 * Offers carousel (scroll-snap rail with prev/next controls).
 *
 * Uses the container's native overflow scrolling, so touch and pointer users
 * get native behaviour. Keyboard users drive the rail through the prev/next
 * controls, which disable themselves at either end and work in both writing
 * directions.
 */
import { bus } from "./bus.js";

const STEP_RATIO = 0.85;
const SCROLL_TIMEOUT_MS = 700;

export interface RailMetrics {
  atStart: boolean;
  atEnd: boolean;
  step: number;
  rtl: boolean;
}

/** Position snapshot of a scrollable rail. */
export function metrics(container: HTMLElement): RailMetrics {
  const max = Math.max(0, container.scrollWidth - container.clientWidth);
  const position = Math.abs(container.scrollLeft);
  const rtl = (document.documentElement.dir || "rtl") === "rtl";

  return {
    atStart: container.scrollLeft >= -1,
    atEnd: position >= max - 1,
    step: Math.max(180, Math.round(container.clientWidth * STEP_RATIO)),
    rtl
  };
}

/**
 * Resolves once the rail stops moving (native `scrollend`, with a timeout
 * fallback for browsers that never fire it).
 */
export function waitForScroll(container: HTMLElement, timeoutMs = SCROLL_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      container.removeEventListener("scrollend", finish);
      resolve();
    };

    timer = setTimeout(finish, timeoutMs);
    container.addEventListener("scrollend", finish);
  });
}

/**
 * Scrolls the rail by one card.
 * @param direction +1 for "next", -1 for "previous".
 * @returns Resolves when the scroll animation settles, so callers can chain
 *   follow-up work (e.g. announcing the new slide) with `.then()`.
 */
export function scrollByCard(container: HTMLElement, direction: 1 | -1): Promise<void> {
  const info = metrics(container);
  const signed = info.rtl ? -direction : direction;
  container.scrollBy({ left: info.step * signed, behavior: "smooth" });
  return waitForScroll(container);
}

/** Enables/disables the prev/next controls for the current position. */
export function syncControls(
  container: HTMLElement,
  prev: HTMLButtonElement | null,
  next: HTMLButtonElement | null
): RailMetrics {
  const info = metrics(container);
  if (prev) prev.disabled = info.atStart;
  if (next) next.disabled = info.atEnd;
  return info;
}

export function init(): void {
  const container = document.querySelector<HTMLElement>("[data-carousel]");
  if (!container) return;

  const section = container.closest<HTMLElement>("section") ?? document.body;
  const prev = section.querySelector<HTMLButtonElement>("[data-carousel-prev]");
  const next = section.querySelector<HTMLButtonElement>("[data-carousel-next]");

  // Re-syncs the controls and, whenever the edge state actually changes,
  // publishes `carousel:change` on the bus (Promise-based, fire-and-forget).
  let lastEdgeState: string | null = null;
  const sync = () => {
    const info = syncControls(container, prev, next);
    const signature = `${info.atStart ? "1" : "0"}${info.atEnd ? "1" : "0"}`;
    if (signature === lastEdgeState) return;
    lastEdgeState = signature;

    void bus.emit("carousel:change", { atStart: info.atStart, atEnd: info.atEnd });
  };

  prev?.addEventListener("click", () => {
    void scrollByCard(container, -1).then(sync);
  });
  next?.addEventListener("click", () => {
    void scrollByCard(container, 1).then(sync);
  });

  let ticking = false;
  container.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        sync();
      });
    },
    { passive: true }
  );

  window.addEventListener("resize", sync);

  sync();
}
