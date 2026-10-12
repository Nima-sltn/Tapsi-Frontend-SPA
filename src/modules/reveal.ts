/**
 * Reveal-on-scroll animations.
 *
 * A dependency-free replacement for AOS: IntersectionObserver adds
 * `.is-visible` once, then unobserves. Users who prefer reduced motion
 * get the final state immediately.
 */

const SELECTOR = "[data-reveal]";

export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function showAll(elements: HTMLElement[]): void {
  elements.forEach((element) => element.classList.add("is-visible"));
}

export function init(): void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
  if (!elements.length) return;

  if (prefersReducedMotion() || typeof IntersectionObserver !== "function") {
    showAll(elements);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -60px 0px" }
  );

  elements.forEach((element) => observer.observe(element));
}
