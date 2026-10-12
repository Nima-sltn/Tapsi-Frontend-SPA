/**
 * Fare estimation domain logic.
 *
 * Pure and DOM-free on purpose: the browser loads it as an ES module,
 * Node imports it for unit tests.
 *
 * Pricing model (all amounts in Iranian Toman):
 *   fare = round1000((base + perKm × km + perMin × min) × timeMultiplier)
 */

/** Per-service tariffs. */
export const SERVICES = {
  classic: { label: "تپسی کلاسیک", base: 25000, perKm: 6500, perMin: 600 },
  plus: { label: "تپسی پلاس", base: 45000, perKm: 9000, perMin: 900 },
  moto: { label: "موتوپیک", base: 18000, perKm: 5000, perMin: 700 },
  autopeyk: { label: "اتوپیک", base: 30000, perKm: 7000, perMin: 500 },
  line: { label: "تپسی لاین", base: 20000, perKm: 4500, perMin: 400 }
} as const;

export type ServiceKey = keyof typeof SERVICES;

/** Demand-based surcharge by request time. */
export const TIME_MULTIPLIERS = { day: 1, night: 1.2, peak: 1.45 } as const;

export type TimeKey = keyof typeof TIME_MULTIPLIERS;

export const ROUNDING_UNIT = 1000;
const RANGE_RATIO = 0.1;
const MAX_DISTANCE_KM = 500;
const MAX_DURATION_MIN = 600;

/** Raw caller input — strings/null are tolerated (form controls, storage). */
export interface FareInput {
  service: string;
  distanceKm: number | string | null | undefined;
  durationMin: number | string | null | undefined;
  time?: string;
}

export interface FareEstimate {
  service: string;
  distanceKm: number;
  durationMin: number;
  timeMultiplier: number;
  /** Itemised cost, pre-multiplier except `base`. */
  breakdown: { base: number; distance: number; time: number };
  total: number;
  /** Realistic price range around the total. */
  range: { min: number; max: number };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Rounds to the nearest `unit` so fares stay on realistic price points. */
export function roundTo(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

export function isServiceKey(value: string): value is ServiceKey {
  return Object.prototype.hasOwnProperty.call(SERVICES, value);
}

export function isTimeKey(value: string): value is TimeKey {
  return Object.prototype.hasOwnProperty.call(TIME_MULTIPLIERS, value);
}

/**
 * Estimates a fare for a trip.
 * @throws {RangeError} When the service or time window is unknown.
 */
export function estimateFare(input: FareInput): FareEstimate {
  if (!isServiceKey(input.service)) throw new RangeError(`Unknown service: ${input.service}`);

  const timeKey = input.time || "day";
  if (!isTimeKey(timeKey)) throw new RangeError(`Unknown time window: ${timeKey}`);

  const service = SERVICES[input.service];
  const multiplier = TIME_MULTIPLIERS[timeKey];

  const distance = clamp(Number(input.distanceKm) || 0, 0, MAX_DISTANCE_KM);
  const duration = clamp(Number(input.durationMin) || 0, 0, MAX_DURATION_MIN);

  const base = service.base;
  const distanceCost = distance * service.perKm;
  const timeCost = duration * service.perMin;
  const subtotal = base + distanceCost + timeCost;
  const total = roundTo(subtotal * multiplier, ROUNDING_UNIT);

  return {
    service: input.service,
    distanceKm: distance,
    durationMin: duration,
    timeMultiplier: multiplier,
    breakdown: { base, distance: distanceCost, time: timeCost },
    total,
    range: {
      min: roundTo(total * (1 - RANGE_RATIO), ROUNDING_UNIT),
      max: roundTo(total * (1 + RANGE_RATIO), ROUNDING_UNIT)
    }
  };
}

/** Formats an amount for display (`fa-IR` renders Persian digits). */
export function formatToman(value: number, locale = "fa-IR"): string {
  const amount = Math.round(Number(value) || 0);
  try {
    return amount.toLocaleString(locale);
  } catch {
    return String(amount);
  }
}
