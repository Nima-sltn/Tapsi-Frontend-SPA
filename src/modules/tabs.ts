/**
 * WAI-ARIA tabs for the services section.
 *
 * Implements the APG tabs pattern: roving tabindex, `aria-selected`,
 * arrow-key navigation (mirrored for RTL) and Home/End support.
 *
 * Deep linking: activating a tab mirrors its id into the URL hash
 * (`#tab-plus`) with `history.replaceState` — no history spam, but every
 * tab state is shareable — and a matching hash selects its tab on load and
 * on `hashchange` (back/forward between anchors keeps working).
 */
import { bus } from "./bus.js";

let tabs: HTMLButtonElement[] = [];

/** Writes the active tab id into the URL hash without adding an entry. */
function syncHash(tab: HTMLButtonElement): void {
  const next = `#${tab.id}`;
  if (window.location.hash === next) return;
  try {
    window.history.replaceState(null, "", next);
  } catch {
    /* sandboxed/`file://` context: deep linking degrades to nothing */
  }
}

/**
 * Activates a tab and its panel.
 * @param focus Whether to move focus to the tab.
 * @param updateUrl Whether to mirror the choice into the hash.
 */
export function activate(tab: HTMLButtonElement | undefined, focus?: boolean, updateUrl?: boolean): void {
  if (!tab) return;

  const previous = tabs.find((candidate) => candidate.getAttribute("aria-selected") === "true");

  tabs.forEach((candidate) => {
    const selected = candidate === tab;
    const panelId = candidate.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;

    candidate.classList.toggle("active", selected);
    candidate.setAttribute("aria-selected", String(selected));
    candidate.tabIndex = selected ? 0 : -1;

    panel?.classList.toggle("active", selected);
  });

  if (focus) tab.focus();
  if (updateUrl) syncHash(tab);

  if (previous !== tab) {
    void bus.emit("tabs:change", {
      id: tab.id,
      panel: tab.getAttribute("aria-controls")
    });
  }
}

/** Handles the roving-tabindex keyboard model. RTL mirrors left/right. */
function handleArrowKeys(event: KeyboardEvent, current: HTMLButtonElement): void {
  const index = tabs.indexOf(current);
  if (index === -1) return;

  let forward: boolean | null = null;

  // The document is RTL, so the visual order is mirrored:
  // ArrowLeft moves to the next tab in DOM order, ArrowRight to the previous.
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") forward = true;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") forward = false;

  if (event.key === "Home") {
    event.preventDefault();
    activate(tabs[0], true, true);
    return;
  }
  if (event.key === "End") {
    event.preventDefault();
    activate(tabs[tabs.length - 1], true, true);
    return;
  }
  if (forward === null) return;

  event.preventDefault();
  const next = (index + (forward ? 1 : -1) + tabs.length) % tabs.length;
  activate(tabs[next], true, true);
}

export function init(): void {
  tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab, false, true));
    tab.addEventListener("keydown", (event) => handleArrowKeys(event, tab));
  });

  // Guarantee a coherent initial state (single selected tab, matching panel).
  const initial = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");

  // Deep link wins over the markup default: `#tab-tel` opens that tab.
  const hash = window.location.hash.slice(1);
  const fromHash = hash ? document.getElementById(hash) : null;
  const startIndex =
    fromHash && fromHash.getAttribute("role") === "tab" ? (fromHash as HTMLButtonElement) : initial || tabs[0];
  activate(startIndex, false, false);

  // Back/forward between anchors (and shared URLs) re-syncs the tabs.
  window.addEventListener("hashchange", () => {
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    const selected = document.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    if (target && target.getAttribute("role") === "tab" && target !== selected) {
      activate(target as HTMLButtonElement, false, false);
    }
  });
}
