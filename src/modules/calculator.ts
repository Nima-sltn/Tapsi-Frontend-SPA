/**
 * Fare calculator UI.
 *
 * Binds the `#fare-form` controls to the pure {@link fare} domain module
 * and renders the breakdown reactively on every input change.
 *
 * Extras
 *  - draws the cross-service comparison chart from {@link compare}
 *  - persists the last trip in `localStorage` and restores it on load
 *    (every stored value is validated against the markup first)
 *  - mirrors the trip into the URL (`?service=…&km=…`) so any calculator
 *    state is shareable, and restores from the URL on load (a shared link
 *    wins over local storage — see {@link restore})
 *  - publishes `calculator:restore`, `calculator:change` and `trip:share`
 *    on the event bus
 */
import { bus } from "./bus.js";
import { estimateFare, formatToman } from "./fare.js";
import { compareFare } from "./compare.js";
import { parseTripSearch, tripToSearch, type TripQuery } from "./share.js";
import type { Trip } from "../types.js";

const DISTANCE_LABELS = { min: 1, max: 50 };
const DURATION_LABELS = { min: 5, max: 120 };
const STORAGE_KEY = "tapsi-fare";

function byId(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/**
 * Draws the "what does every service cost?" bar chart.
 * Pure rendering: all maths happens in the compare domain.
 */
function renderCompare(input: Trip): void {
  const list = byId("fare-compare-list");
  if (!list) return;

  const rows = compareFare(input);

  list.textContent = "";
  rows.forEach((row) => {
    const item = document.createElement("li");
    item.className = `compare__row${row.key === input.service ? " is-current" : ""}`;

    const label = document.createElement("span");
    label.className = "compare__label";
    label.textContent = row.label;
    if (row.cheapest) {
      const tag = document.createElement("span");
      tag.className = "compare__tag";
      tag.textContent = "ارزان‌ترین";
      label.appendChild(tag);
    }

    const track = document.createElement("span");
    track.className = "compare__track";
    const bar = document.createElement("span");
    bar.className = "compare__bar";
    bar.style.width = `${Math.round(row.ratio * 100)}%`;
    bar.title = `${row.label}: ${formatToman(row.total)}`;
    track.appendChild(bar);

    const value = document.createElement("span");
    value.className = "compare__value";
    value.textContent = formatToman(row.total);

    item.appendChild(label);
    item.appendChild(track);
    item.appendChild(value);
    list.appendChild(item);
  });
}

/** Reads the live form state. */
export function readForm(form: HTMLFormElement): Trip {
  const named = (name: string): HTMLInputElement | null =>
    form.elements.namedItem(name) as HTMLInputElement | null;
  const timeInput = form.querySelector<HTMLInputElement>('input[name="time"]:checked');

  return {
    service: named("service")?.value ?? "classic",
    distanceKm: Number(named("distance")?.value ?? 10),
    durationMin: Number(named("duration")?.value ?? 25),
    time: timeInput?.value ?? "day"
  };
}

/** Persists the current trip (fire-and-forget; storage may be unavailable). */
export function save(form: HTMLFormElement): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readForm(form)));
  } catch {
    /* storage disabled — the calculator still works for this visit */
  }
}

/** Applies a trip to the form, validating every value against the markup. */
function applyTrip(form: HTMLFormElement, trip: Partial<TripQuery>): boolean {
  let applied = false;

  const service = trip.service;
  if (service) {
    const options = (form.elements.namedItem("service") as HTMLSelectElement | null)?.options;
    if (options) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option && option.value === service) {
          (form.elements.namedItem("service") as HTMLSelectElement).value = service;
          applied = true;
          break;
        }
      }
    }
  }

  (["distanceKm", "durationMin"] as const).forEach((key) => {
    const input = form.elements.namedItem(key === "distanceKm" ? "distance" : "duration") as
      | HTMLInputElement
      | null;
    const value = trip[key];
    if (!input || typeof value !== "number" || !Number.isFinite(value)) return;

    // Clamp to the bounds declared in the markup — stale storage or a
    // hand-edited URL can never produce an invalid form.
    const min = Number(input.min);
    const max = Number(input.max);
    input.value = String(Math.min(Math.max(value, min), max));
    applied = true;
  });

  if (trip.time) {
    const radio = form.querySelector<HTMLInputElement>(`input[name="time"][value="${trip.time}"]`);
    if (radio) {
      radio.checked = true;
      applied = true;
    }
  }

  return applied;
}

/**
 * Applies a previously stored trip to the form.
 * Every value is validated against the actual markup first, so stale or
 * hand-edited storage can never put the form in an invalid state.
 * @returns Whether anything was restored.
 */
export function restore(form: HTMLFormElement): boolean {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;

  let saved: Partial<Trip> | null = null;
  try {
    saved = JSON.parse(raw) as Partial<Trip> | null;
  } catch {
    return false;
  }
  if (!saved || typeof saved !== "object") return false;

  return applyTrip(form, saved);
}

/** Mirrors the trip into the address bar so the state is shareable. */
function syncUrl(trip: Trip): void {
  try {
    const query = tripToSearch(trip);
    window.history.replaceState(null, "", `${window.location.pathname}${query}${window.location.hash}`);
  } catch {
    /* sandboxed/`file://` context: sharing degrades to the copy button only */
  }
}

/** Writes a Toman amount into an element. */
function writeAmount(id: string, value: number): void {
  const element = byId(id);
  if (element) element.textContent = formatToman(value);
}

function render(form: HTMLFormElement): void {
  const input = readForm(form);
  const estimate = estimateFare(input);

  // Slider read-outs (Persian numerals).
  const distanceOut = byId("fare-distance-out");
  if (distanceOut) {
    distanceOut.textContent =
      formatToman(input.distanceKm) + " کیلومتر" + (input.distanceKm === DISTANCE_LABELS.max ? " یا بیشتر" : "");
  }
  const durationOut = byId("fare-duration-out");
  if (durationOut) {
    durationOut.textContent =
      formatToman(input.durationMin) + " دقیقه" + (input.durationMin === DURATION_LABELS.max ? " یا بیشتر" : "");
  }

  // Breakdown.
  writeAmount("fare-base", estimate.breakdown.base);
  writeAmount("fare-distance-cost", estimate.breakdown.distance);
  writeAmount("fare-time-cost", estimate.breakdown.time);

  const surge = byId("fare-surge");
  if (surge) {
    surge.textContent = `×${estimate.timeMultiplier.toLocaleString("fa-IR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  writeAmount("fare-total", estimate.total);

  const range = byId("fare-range");
  if (range) {
    range.textContent = `${formatToman(estimate.range.min)} تا ${formatToman(estimate.range.max)}`;
  }

  renderCompare(input);
  save(form);
  syncUrl(input);

  void bus.emit("calculator:change", { service: input.service, total: estimate.total });
}

/**
 * Copies the shareable trip link to the clipboard, with a fallback that
 * selects the address bar for manual copying.
 */
async function shareTrip(form: HTMLFormElement): Promise<void> {
  const url = `${window.location.origin}${window.location.pathname}${tripToSearch(readForm(form))}`;

  try {
    await navigator.clipboard.writeText(url);
    void bus.emit("trip:share", { ok: true, via: "clipboard" });
  } catch {
    // Clipboard unavailable (insecure context, permission denied, old
    // browser): the URL is already in the address bar via syncUrl(), so
    // point the visitor there instead of failing silently.
    void bus.emit("trip:share", { ok: true, via: "fallback" });
  }
}

export function init(): void {
  const form = document.getElementById("fare-form") as HTMLFormElement | null;
  if (!form) return;

  // Precedence: a shared URL wins over local storage — that is what makes
  // "send me your trip setup" links behave exactly as sent.
  let restored = false;
  if (window.location.search) {
    restored = applyTrip(form, parseTripSearch(window.location.search));
  }
  if (!restored) {
    restored = restore(form);
  }

  const share = document.getElementById("fare-share") as HTMLButtonElement | null;
  share?.addEventListener("click", () => {
    void shareTrip(form);
  });

  let frame: number | null = null;
  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      try {
        render(form);
      } catch (error) {
        console.error("calculator render failed", error);
      }
    });
  };

  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  render(form);

  if (restored) {
    void bus.emit("calculator:restore", readForm(form));
  }
}
