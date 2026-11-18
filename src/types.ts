/**
 * Shared primitive types, domain models, and branded types used across
 * architecture layers and UI domains.
 *
 * Keeping these definitions centralized avoids circular dependencies between
 * the typed event bus, domain strategies, and presentation modules.
 */

declare const __brand: unique symbol;

/** Nominal type for Iranian Toman to avoid unit mixups in calculations. */
export type Toman = number & { readonly [__brand]: "Toman" };

/** Nominal type for distance in kilometers. */
export type DistanceKm = number & { readonly [__brand]: "DistanceKm" };

/** Nominal type for duration in minutes. */
export type DurationMinutes = number & { readonly [__brand]: "DurationMinutes" };

export const toToman = (value: number): Toman => Math.round(value) as Toman;
export const toDistanceKm = (value: number): DistanceKm => Math.max(0, value) as DistanceKm;
export const toDurationMinutes = (value: number): DurationMinutes => Math.max(0, value) as DurationMinutes;

/** Service identifier keys supported by the pricing domain. */
export type ServiceKey = "classic" | "plus" | "moto" | "autopeyk" | "line";

/** Demand surcharge time window keys. */
export type TimeKey = "day" | "night" | "peak";

/** Visual theme of the document (`<html data-theme>`). */
export type Theme = "light" | "dark";

/** Audio micro-interaction preference. */
export type AudioPreference = "enabled" | "disabled";

/** Contact form fields with validators. */
export type ContactField = "name" | "email" | "message";

export interface ContactValues {
  name: string;
  email: string;
  message: string;
  /** Honeypot field — must stay empty for humans. */
  company?: string;
}

/** Per-field validation messages; absent key = valid. */
export type ContactErrors = Partial<Record<ContactField, string>>;

/** Outcome of a contact form submission attempt. */
export type SubmitOutcome = "valid" | "invalid" | "ignored";

/**
 * A trip configuration as specified in the fare calculator. Mirrors the form state and
 * is the payload of `calculator:*` events plus the shareable-URL encoding.
 */
export interface Trip {
  service: string;
  distanceKm: number;
  durationMin: number;
  time: string;
}

/** Environmental and sustainability metrics for an estimated trip. */
export interface EcoImpact {
  /** CO2 emissions in grams for this trip under the selected service. */
  carbonGrams: number;
  /** Estimated CO2 emitted if the same trip were made in a private combustion car. */
  baselineCarbonGrams: number;
  /** Net CO2 saved in grams (positive means lower carbon than baseline). */
  savedCarbonGrams: number;
  /** Estimated tree absorption equivalent in tree-days (1 mature tree absorbs ~55g CO2/day). */
  treeDaysEquivalent: number;
  /** Traffic status indicator derived from time window. */
  trafficLevel: "light" | "moderate" | "heavy";
  /** Human-readable status in Persian. */
  trafficLabel: string;
}

/** Deterministic lifecycle states for the trip estimation state machine. */
export type TripState = "idle" | "configuring" | "calculating" | "estimated" | "shared" | "error";

/** State machine transition event. */
export interface TripStateTransition {
  from: TripState;
  to: TripState;
  timestamp: number;
  context?: Partial<Trip>;
}

/** Result of the defensive module boot in `main.ts`. */
export interface BootStatus {
  modules: string[];
  failed: string[];
  at: number;
}
