/**
 * Environmental impact and carbon footprint calculation domain.
 *
 * Models CO2 emissions per kilometer based on fleet transport benchmarks:
 *  - Baseline private combustion vehicle: ~170g CO2 / km
 *  - Tapsi Classic / Plus: ~135g CO2 / km (higher occupancy factor)
 *  - Tapsi Line (shared carpooling): ~75g CO2 / km per passenger
 *  - Moto Courier: ~60g CO2 / km
 *  - Autopeyk (cargo van/compact): ~150g CO2 / km
 *
 * Daily carbon absorption of an average mature urban tree is benchmarked at ~55g CO2/day.
 */

import type { EcoImpact, TimeKey } from "../../types.js";

const BASELINE_CAR_GRAMS_PER_KM = 170;
const TREE_DAILY_ABSORPTION_GRAMS = 55;

const FLEET_EMISSION_FACTORS: Record<string, number> = {
  classic: 135,
  plus: 140,
  line: 75,
  moto: 60,
  autopeyk: 150
};

const TRAFFIC_LABELS: Record<string, { level: "light" | "moderate" | "heavy"; label: string }> = {
  day: { level: "moderate", label: "ترافیک روان و عادی" },
  night: { level: "light", label: "ترافیک خلوت شبانه" },
  peak: { level: "heavy", label: "ساعات اوج شلوغی و ترافیک سنگین" }
};

/**
 * Computes environmental savings and carbon metrics for a specific trip.
 */
export function calculateEcoImpact(
  service: string,
  distanceKm: number,
  timeKey: string = "day"
): EcoImpact {
  const km = Math.max(0, distanceKm);
  const factor = FLEET_EMISSION_FACTORS[service] ?? 135;
  const carbonGrams = Math.round(km * factor);
  const baselineCarbonGrams = Math.round(km * BASELINE_CAR_GRAMS_PER_KM);
  const savedCarbonGrams = Math.max(0, baselineCarbonGrams - carbonGrams);
  const treeDaysEquivalent = Number((savedCarbonGrams / TREE_DAILY_ABSORPTION_GRAMS).toFixed(1));

  const trafficInfo = TRAFFIC_LABELS[timeKey] ?? {
    level: "moderate",
    label: "ترافیک روزمره"
  };

  return {
    carbonGrams,
    baselineCarbonGrams,
    savedCarbonGrams,
    treeDaysEquivalent,
    trafficLevel: trafficInfo.level,
    trafficLabel: trafficInfo.label
  };
}
