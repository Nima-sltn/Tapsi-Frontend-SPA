/**
 * Fare calculator UI and reactive presentation layer.
 *
 * Binds the `#fare-form` controls to the pure {@link fare} and {@link calculateEcoImpact}
 * domain modules and renders the breakdown, comparison bars, and environmental impact
 * reactively on every input change.
 *
 * Architecture enhancements:
 *  - Trip state machine driving deterministic UI lifecycle states
 *  - Multi-tab synchronization via BroadcastChannel (crossTabSync)
 *  - Micro-haptic audio cues via Web Audio API (haptics)
 *  - Modern Web Share API with graceful clipboard fallback
 *  - Real-time environmental CO2 savings analysis
 */

import { bus } from "./bus.js";
import { estimateFare, formatToman } from "./fare.js";
import { compareFare } from "./compare.js";
import { parseTripSearch, tripToSearch, type TripQuery } from "./share.js";
import { calculateEcoImpact } from "../domain/eco/carbon.js";
import { TripStateMachine } from "../domain/trip/state-machine.js";
import { defaultStorage } from "../infrastructure/storage.js";
import { crossTabSync } from "../services/cross-tab.js";
import { haptics } from "../services/haptics.js";
import type { Trip } from "../types.js";

const DISTANCE_LABELS = { min: 1, max: 50 };
const DURATION_LABELS = { min: 5, max: 120 };
const STORAGE_KEY = "fare_trip";

const stateMachine = new TripStateMachine();

function byId(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/**
 * Draws the cross-service comparative pricing chart.
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
    bar.title = `${row.label}: ${formatToman(row.total)} تومان`;
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

/** Reads the current form values into a typed Trip model. */
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

/** Persists the trip state using the resilient storage repository. */
export function save(form: HTMLFormElement): void {
  defaultStorage.set(STORAGE_KEY, readForm(form));
}

/** Applies a trip object to the form controls with boundary clamping. */
function applyTrip(form: HTMLFormElement, trip: Partial<TripQuery>): boolean {
  let applied = false;

  const service = trip.service;
  if (service) {
    const options = (form.elements.namedItem("service") as HTMLSelectElement | null)?.options;
    if (options) {
      for (const option of options) {
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

/** Restores saved trip configuration from persistent repository. */
export function restore(form: HTMLFormElement): boolean {
  const saved = defaultStorage.get<Partial<Trip>>(STORAGE_KEY);
  if (!saved || typeof saved !== "object") return false;
  return applyTrip(form, saved);
}

/** Mirrors the trip into the URL query parameters without creating history pollution. */
function syncUrl(trip: Trip): void {
  try {
    const query = tripToSearch(trip);
    window.history.replaceState(null, "", `${window.location.pathname}${query}${window.location.hash}`);
  } catch {
    // Degrades gracefully on sandbox environments
  }
}

/** Writes a formatted Toman value into a designated DOM element. */
function writeAmount(id: string, value: number): void {
  const element = byId(id);
  if (element) element.textContent = formatToman(value);
}

/**
 * Main reactive render cycle.
 */
function render(form: HTMLFormElement): void {
  const input = readForm(form);
  stateMachine.send({ type: "BEGIN_CALCULATION" });

  const estimate = estimateFare(input);
  const eco = calculateEcoImpact(input.service, input.distanceKm, input.time);

  // Slider read-outs with localized Persian numbers
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

  // Cost breakdown
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

  // Eco impact indicators
  const carbonSaved = byId("fare-carbon-saved");
  if (carbonSaved) {
    carbonSaved.textContent = `${formatToman(eco.savedCarbonGrams)} گرم CO₂ (${eco.treeDaysEquivalent} روز جذب درخت)`;
  }
  const trafficStatus = byId("fare-traffic-status");
  if (trafficStatus) {
    trafficStatus.textContent = eco.trafficLabel;
    trafficStatus.setAttribute("data-level", eco.trafficLevel);
  }

  renderCompare(input);
  save(form);
  syncUrl(input);

  // Sync to other open tabs
  crossTabSync.publish("calculator:sync", input);

  stateMachine.send({ type: "CALCULATION_SUCCESS", trip: input });

  void bus.emit("calculator:change", { service: input.service, total: estimate.total });
  void bus.emit("eco:calculate", {
    service: input.service,
    carbonGrams: eco.carbonGrams,
    savedCarbonGrams: eco.savedCarbonGrams
  });
}

/**
 * Shares the configured trip via the native Web Share API where supported,
 * falling back cleanly to the Clipboard API.
 */
async function shareTrip(form: HTMLFormElement): Promise<void> {
  const trip = readForm(form);
  const estimate = estimateFare(trip);
  const url = `${window.location.origin}${window.location.pathname}${tripToSearch(trip)}`;
  const shareTitle = "برآورد کرایه سفر با تپسی";
  const shareText = `سفر ${trip.distanceKm} کیلومتری با تپسی: ${formatToman(estimate.total)} تومان`;

  haptics.play("success");

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url
      });
      stateMachine.send({ type: "TRIP_SHARED", via: "share_api" });
      void bus.emit("trip:share", { ok: true, via: "clipboard" });
      return;
    } catch {
      // User cancelled share or aborted; fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    stateMachine.send({ type: "TRIP_SHARED", via: "clipboard" });
    void bus.emit("trip:share", { ok: true, via: "clipboard" });
  } catch {
    stateMachine.send({ type: "TRIP_SHARED", via: "clipboard" });
    void bus.emit("trip:share", { ok: true, via: "fallback" });
  }
}

export function init(): void {
  const form = document.getElementById("fare-form") as HTMLFormElement | null;
  if (!form) return;

  // Precedence: shared URL query string overrides saved storage
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
  const schedule = (playCue = false) => {
    if (playCue) {
      haptics.play("tick");
    }
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      try {
        render(form);
      } catch (error) {
        console.error("[calculator] render failed", error);
      }
    });
  };

  form.addEventListener("input", (e) => {
    const target = e.target as HTMLElement;
    const isSlider = target instanceof HTMLInputElement && target.type === "range";
    schedule(isSlider);
  });

  form.addEventListener("change", () => schedule(false));

  // Listen to remote changes from other browser tabs
  crossTabSync.subscribe<Trip>("calculator:sync", (incomingTrip) => {
    if (incomingTrip && typeof incomingTrip === "object") {
      applyTrip(form, incomingTrip);
      schedule(false);
    }
  });

  render(form);

  if (restored) {
    void bus.emit("calculator:restore", readForm(form));
  }
}
