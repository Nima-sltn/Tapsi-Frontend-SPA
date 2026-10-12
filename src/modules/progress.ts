/**
 * Scroll progress indicator + back-to-top button.
 *
 * Uses a passive scroll listener with `requestAnimationFrame` coalescing
 * so scrolling never triggers layout work inside the event handler.
 */
import { prefersReducedMotion } from "./reveal.js";

const BACK_TO_TOP_THRESHOLD = 600;

export function init(): void {
  const bar = document.getElementById("scroll-progress-bar");
  const button = document.getElementById("back-to-top") as HTMLButtonElement | null;
  let ticking = false;

  const update = () => {
    ticking = false;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = height > 0 ? Math.min(1, Math.max(0, scrollTop / height)) : 0;

    if (bar) bar.style.width = `${(ratio * 100).toFixed(2)}%`;
    if (button) button.hidden = scrollTop < BACK_TO_TOP_THRESHOLD;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  button?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth"
    });
    // preventScroll is essential: a plain focus() scrolls the brand into
    // view, which cancels the smooth scroll above and leaves the page
    // stranded near the bottom.
    document.querySelector<HTMLElement>(".nav__brand")?.focus({ preventScroll: true });
  });

  update();
}
