/**
 * Shared primitive types used across domains and UI modules.
 *
 * Keeping them in one small module avoids circular imports between the
 * typed event bus and the modules that publish on it.
 */

/** Visual theme of the document (`<html data-theme>`). */
export type Theme = "light" | "dark";

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
 * A trip as configured in the fare calculator. Mirrors the form state and
 * is the payload of `calculator:*` events plus the shareable-URL encoding.
 */
export interface Trip {
  service: string;
  distanceKm: number;
  durationMin: number;
  time: string;
}

/** Result of the defensive module boot in `main.ts`. */
export interface BootStatus {
  modules: string[];
  failed: string[];
  at: number;
}
