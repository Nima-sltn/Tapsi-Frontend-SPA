/**
 * Shareable trip links — pure URL <-> trip conversion.
 *
 * Answers two questions without touching the DOM:
 *  - "encode this trip as query parameters" (so the calculator can mirror
 *    its state into the address bar and offer a copyable link)
 *  - "read a trip back out of a query string" (so a shared link restores
 *    exactly what the sender configured)
 *
 * The encoded values are deliberately validated against the fare domain:
 * a hand-edited URL can never put the calculator in an invalid state —
 * unknown services/windows are dropped, numbers are clamped.
 */
import { SERVICES, TIME_MULTIPLIERS, isServiceKey, isTimeKey, type FareInput } from "./fare.js";

/** Slider bounds as declared in the calculator markup. */
export const TRIP_BOUNDS = {
  distanceKm: { min: 1, max: 50, step: 1 },
  durationMin: { min: 5, max: 120, step: 5 }
} as const;

export interface TripQuery {
  service: string;
  distanceKm: number;
  durationMin: number;
  time: string;
}

/** Clamps a raw value into a slider range, snapping to its step. */
export function clampToRange(
  value: number,
  range: { min: number; max: number; step: number }
): number {
  const clamped = Math.min(Math.max(value, range.min), range.max);
  const steps = Math.round((clamped - range.min) / range.step);
  return range.min + steps * range.step;
}

/**
 * Encodes a trip as URL search parameters (leading `?` included, or an
 * empty string when nothing is encodable).
 */
export function tripToSearch(trip: Partial<TripQuery>): string {
  const params = new URLSearchParams();

  if (typeof trip.service === "string" && isServiceKey(trip.service)) {
    params.set("service", trip.service);
  }
  if (Number.isFinite(trip.distanceKm)) {
    params.set("km", String(clampToRange(Number(trip.distanceKm), TRIP_BOUNDS.distanceKm)));
  }
  if (Number.isFinite(trip.durationMin)) {
    params.set("min", String(clampToRange(Number(trip.durationMin), TRIP_BOUNDS.durationMin)));
  }
  if (typeof trip.time === "string" && isTimeKey(trip.time)) {
    params.set("time", trip.time);
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

/**
 * Reads a trip out of a query string (with or without leading `?`).
 * Invalid or missing entries fall back to sensible defaults; the result is
 * always a complete, in-range {@link TripQuery}.
 */
export function parseTripSearch(search: string): TripQuery {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const rawService = params.get("service") ?? "";
  const service = isServiceKey(rawService) ? rawService : "classic";

  const rawTime = params.get("time") ?? "";
  const time = isTimeKey(rawTime) ? rawTime : "day";

  const distance = Number(params.get("km"));
  const duration = Number(params.get("min"));

  return {
    service,
    distanceKm: clampToRange(Number.isFinite(distance) ? distance : 10, TRIP_BOUNDS.distanceKm),
    durationMin: clampToRange(Number.isFinite(duration) ? duration : 25, TRIP_BOUNDS.durationMin),
    time
  };
}

/** Narrows a trip to the shape the fare domain consumes. */
export function toFareInput(trip: TripQuery): FareInput {
  return {
    service: trip.service,
    distanceKm: trip.distanceKm,
    durationMin: trip.durationMin,
    time: trip.time
  };
}

/** Every service key, for UIs that enumerate the catalogue. */
export const SERVICE_KEYS = Object.keys(SERVICES);

/** Every demand window key, for UIs that enumerate the catalogue. */
export const TIME_KEYS = Object.keys(TIME_MULTIPLIERS);
