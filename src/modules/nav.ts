/**
 * Mobile navigation drawer + scroll-spy.
 *
 * Behaviour
 *  - Accessible disclosure toggler (`aria-expanded` / `aria-controls`)
 *  - Slide-in sidebar with a dimming backdrop; background scrolling is locked
 *    while open (`body.nav-open`)
 *  - Focus is trapped between the toggler and the menu links; Escape and
 *    backdrop clicks close the drawer and return focus to the toggler.
 *    APG disclosure pattern: opening keeps focus on the toggler, and Tab then
 *    walks into the menu because the list follows the toggler in DOM order.
 *  - Closes on link activation and when leaving the mobile breakpoint
 *  - Publishes `nav:toggle` on the event bus so other domains can react
 *  - Marks the section currently in view with `aria-current="true"`
 */
import { bus } from "./bus.js";

// Matches the CSS breakpoint (min-width: 768px) exactly.
const MOBILE_QUERY = "(min-width: 768px)";

let toggler: HTMLButtonElement | null = null;
let nav: HTMLElement | null = null;
let menu: HTMLElement | null = null;
let backdrop: HTMLDivElement | null = null;

function isExpanded(): boolean {
  return Boolean(nav?.classList.contains("nav__expanded"));
}

/**
 * Opens or closes the drawer.
 * @param refocus `true` returns focus to the toggler (Escape/backdrop); link
 *   clicks skip it so the page scroll is not fought by the browser.
 */
function setExpanded(expanded: boolean, options?: { refocus?: boolean }): void {
  if (!toggler || !nav) return;
  const next = Boolean(expanded);
  if (next === isExpanded()) return;

  nav.classList.toggle("nav__expanded", next);
  toggler.setAttribute("aria-expanded", String(next));
  document.body.classList.toggle("nav-open", next);
  backdrop?.classList.toggle("is-open", next);

  if (options?.refocus) toggler.focus();
  void bus.emit("nav:toggle", { open: next });
}

/** Toggler + every menu link, in DOM order. */
function focusables(): HTMLElement[] {
  const links = menu ? Array.from(menu.querySelectorAll<HTMLAnchorElement>("a[href]")) : [];
  const items: HTMLElement[] = links;
  if (toggler) items.unshift(toggler);
  return items;
}

/** Cycles Tab/Shift+Tab inside the drawer (toggler ↔ links) while open. */
function trapFocus(event: KeyboardEvent): void {
  const items = focusables();
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const inside = items.indexOf(active as HTMLElement) !== -1;

  if (event.shiftKey) {
    if (!inside || active === first) {
      event.preventDefault();
      last?.focus();
    }
  } else if (!inside || active === last) {
    event.preventDefault();
    first?.focus();
  }
}

/** Creates the click-catcher used on mobile only. */
function createBackdrop(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "nav-backdrop";
  element.setAttribute("aria-hidden", "true");
  element.addEventListener("click", () => setExpanded(false, { refocus: true }));
  document.body.appendChild(element);
  return element;
}

/** Highlights the nav link of the section currently in the viewport. */
function initScrollSpy(): void {
  if (typeof IntersectionObserver !== "function") return;

  const links = menu?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [];
  const lookup = new Map<string, HTMLAnchorElement>();
  const targets: HTMLElement[] = [];

  links.forEach((link) => {
    const id = link.getAttribute("href")?.slice(1) ?? "";
    const section = id ? document.getElementById(id) : null;
    if (!section) return;
    lookup.set(id, link);
    targets.push(section);
  });

  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        lookup.forEach((link, id) => {
          const active = id === entry.target.id;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  targets.forEach((target) => observer.observe(target));
}

export function init(): void {
  toggler = document.getElementById("nav-toggler") as HTMLButtonElement | null;
  nav = toggler?.closest<HTMLElement>(".nav") ?? null;
  menu = document.getElementById("nav-menu");

  if (!toggler || !nav || !menu) return;

  backdrop = createBackdrop();

  toggler.addEventListener("click", () => setExpanded(!isExpanded()));

  // Close when a destination is chosen (no refocus: the page scrolls there).
  menu.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (target?.closest("a")) setExpanded(false);
  });

  document.addEventListener("keydown", (event) => {
    if (!isExpanded()) return;

    if (event.key === "Escape") {
      setExpanded(false, { refocus: true });
      return;
    }
    if (event.key === "Tab") trapFocus(event);
  });

  // Leaving the mobile breakpoint must not leave the menu stuck open.
  const media = window.matchMedia(MOBILE_QUERY);
  const onBreakpoint = (event: MediaQueryListEvent) => {
    if (event.matches) setExpanded(false);
  };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onBreakpoint);
  } else if (typeof media.addListener === "function") {
    // Safari ≤13
    (media as unknown as { addListener(cb: typeof onBreakpoint): void }).addListener(onBreakpoint);
  }

  initScrollSpy();
}

export { setExpanded, isExpanded };
