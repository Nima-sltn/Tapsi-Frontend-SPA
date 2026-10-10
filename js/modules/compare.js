/**
 * Service comparison domain logic.
 *
 * Answers one question: *for this trip, what would every service cost?*
 *
 * Pure and DOM-free on purpose — the browser loads it as a classic script
 * (after `fare.js`), Node `require()`s it for unit tests. All ordering,
 * ranking and normalisation happens here so the UI only draws bars.
 *
 * @namespace Tapsi.compare
 */
(function (global) {
  "use strict";

  /** The fare domain is a global in the browser and a dependency in Node. */
  var fare =
    typeof module !== "undefined" && module.exports ? require("./fare.js") : global.Tapsi && global.Tapsi.fare;

  /**
   * @typedef {Object} CompareRow
   * @property {string} key Service key.
   * @property {string} label Localised service name.
   * @property {number} total Estimated fare for the input trip.
   * @property {number} rank 1 = cheapest.
   * @property {number} ratio Share of the most expensive service (0..1].
   * @property {boolean} cheapest Whether this row is the cheapest option.
   */

  /**
   * Estimates every service for a single trip, cheapest first.
   * @param {{distanceKm: number|string, durationMin: number|string, time?: string}} input
   * @returns {CompareRow[]}
   * @throws {RangeError} Propagated from the fare domain on unknown inputs.
   */
  function compareFare(input) {
    if (!fare) throw new Error("compare: fare domain unavailable");

    var rows = Object.keys(fare.SERVICES).map(function (key) {
      var estimate = fare.estimateFare({
        service: key,
        distanceKm: input.distanceKm,
        durationMin: input.durationMin,
        time: input.time
      });
      return { key: key, label: fare.SERVICES[key].label, total: estimate.total };
    });

    rows.sort(function (a, b) {
      return a.total - b.total;
    });

    var max = rows.length ? rows[rows.length - 1].total : 0;
    rows.forEach(function (row, index) {
      row.rank = index + 1;
      row.ratio = max > 0 ? row.total / max : 1;
      row.cheapest = index === 0;
    });

    return rows;
  }

  var api = { compareFare: compareFare };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.compare = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
