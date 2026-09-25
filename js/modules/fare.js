/**
 * Fare estimation domain logic.
 *
 * Pure and DOM-free on purpose: the browser loads it as a classic script,
 * Node `require()`s it for unit tests.
 *
 * Pricing model (all amounts in Iranian Toman):
 *   fare = round1000((base + perKm × km + perMin × min) × timeMultiplier)
 *
 * @namespace Tapsi.fare
 */
(function (global) {
  "use strict";

  /** Per-service tariffs. */
  var SERVICES = {
    classic: { label: "تپسی کلاسیک", base: 25000, perKm: 6500, perMin: 600 },
    plus: { label: "تپسی پلاس", base: 45000, perKm: 9000, perMin: 900 },
    moto: { label: "موتوپیک", base: 18000, perKm: 5000, perMin: 700 },
    autopeyk: { label: "اتوپیک", base: 30000, perKm: 7000, perMin: 500 },
    line: { label: "تپسی لاین", base: 20000, perKm: 4500, perMin: 400 }
  };

  /** Demand-based surcharge by request time. */
  var TIME_MULTIPLIERS = { day: 1, night: 1.2, peak: 1.45 };

  var ROUNDING_UNIT = 1000;
  var RANGE_RATIO = 0.1;
  var MAX_DISTANCE_KM = 500;
  var MAX_DURATION_MIN = 600;

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Rounds to the nearest `unit` so fares stay on realistic price points.
   * @param {number} value
   * @param {number} unit
   * @returns {number}
   */
  function roundTo(value, unit) {
    return Math.round(value / unit) * unit;
  }

  /**
   * @typedef {Object} FareEstimate
   * @property {string} service Service key.
   * @property {number} distanceKm Normalised distance in kilometres.
   * @property {number} durationMin Normalised duration in minutes.
   * @property {number} timeMultiplier Applied time-of-day multiplier.
   * @property {{base: number, distance: number, time: number}} breakdown Itemised cost.
   * @property {number} total Estimated fare, rounded.
   * @property {{min: number, max: number}} range Realistic price range.
   */

  /**
   * Estimates a fare for a trip.
   * @param {{service: string, distanceKm: number|string, durationMin: number|string, time?: string}} input
   * @returns {FareEstimate}
   * @throws {RangeError} When the service or time window is unknown.
   */
  function estimateFare(input) {
    var service = SERVICES[input.service];
    if (!service) throw new RangeError("Unknown service: " + input.service);

    var timeKey = input.time || "day";
    var multiplier = TIME_MULTIPLIERS[timeKey];
    if (typeof multiplier !== "number") throw new RangeError("Unknown time window: " + timeKey);

    var distance = clamp(Number(input.distanceKm) || 0, 0, MAX_DISTANCE_KM);
    var duration = clamp(Number(input.durationMin) || 0, 0, MAX_DURATION_MIN);

    var base = service.base;
    var distanceCost = distance * service.perKm;
    var timeCost = duration * service.perMin;
    var subtotal = base + distanceCost + timeCost;
    var total = roundTo(subtotal * multiplier, ROUNDING_UNIT);

    return {
      service: input.service,
      distanceKm: distance,
      durationMin: duration,
      timeMultiplier: multiplier,
      breakdown: { base: base, distance: distanceCost, time: timeCost },
      total: total,
      range: {
        min: roundTo(total * (1 - RANGE_RATIO), ROUNDING_UNIT),
        max: roundTo(total * (1 + RANGE_RATIO), ROUNDING_UNIT)
      }
    };
  }

  /**
   * Formats an amount for display.
   * @param {number} value
   * @param {string} [locale] BCP-47 locale (`fa-IR` renders Persian digits).
   * @returns {string}
   */
  function formatToman(value, locale) {
    var amount = Math.round(Number(value) || 0);
    try {
      return amount.toLocaleString(locale || "fa-IR");
    } catch (error) {
      return String(amount);
    }
  }

  var api = {
    SERVICES: SERVICES,
    TIME_MULTIPLIERS: TIME_MULTIPLIERS,
    ROUNDING_UNIT: ROUNDING_UNIT,
    estimateFare: estimateFare,
    formatToman: formatToman,
    roundTo: roundTo,
    clamp: clamp
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.fare = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
