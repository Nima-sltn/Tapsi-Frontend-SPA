/**
 * Fare calculator UI.
 *
 * Binds the `#fare-form` controls to the pure {@link Tapsi.fare} domain
 * module and renders the breakdown reactively on every input change.
 *
 * @namespace Tapsi.calculator
 */
(function (global) {
  "use strict";

  var DISTANCE_LABELS = { min: 1, max: 50 };
  var DURATION_LABELS = { min: 5, max: 120 };

  /**
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  function byId(id) {
    return document.getElementById(id);
  }

  /**
   * Writes a Toman amount into an element.
   * @param {string} id
   * @param {number} value
   */
  function writeAmount(id, value) {
    var element = byId(id);
    if (element) element.textContent = global.Tapsi.fare.formatToman(value, "fa-IR");
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {{service: string, distanceKm: number, durationMin: number, time: string}}
   */
  function readForm(form) {
    var timeInput = form.querySelector('input[name="time"]:checked');
    return {
      service: form.elements.service.value,
      distanceKm: Number(form.elements.distance.value),
      durationMin: Number(form.elements.duration.value),
      time: timeInput ? timeInput.value : "day"
    };
  }

  /**
   * @param {HTMLFormElement} form
   */
  function render(form) {
    var fare = global.Tapsi.fare;
    var input = readForm(form);
    var estimate = fare.estimateFare(input);

    // Slider read-outs (Persian numerals).
    var distanceOut = byId("fare-distance-out");
    if (distanceOut) {
      distanceOut.textContent =
        fare.formatToman(input.distanceKm, "fa-IR") + " کیلومتر" +
        (input.distanceKm === DISTANCE_LABELS.max ? " یا بیشتر" : "");
    }
    var durationOut = byId("fare-duration-out");
    if (durationOut) {
      durationOut.textContent =
        fare.formatToman(input.durationMin, "fa-IR") + " دقیقه" +
        (input.durationMin === DURATION_LABELS.max ? " یا بیشتر" : "");
    }

    // Breakdown.
    writeAmount("fare-base", estimate.breakdown.base);
    writeAmount("fare-distance-cost", estimate.breakdown.distance);
    writeAmount("fare-time-cost", estimate.breakdown.time);

    var surge = byId("fare-surge");
    if (surge) {
      surge.textContent =
        "×" +
        estimate.timeMultiplier.toLocaleString("fa-IR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
    }

    writeAmount("fare-total", estimate.total);

    var range = byId("fare-range");
    if (range) {
      range.textContent =
        fare.formatToman(estimate.range.min, "fa-IR") + " تا " + fare.formatToman(estimate.range.max, "fa-IR");
    }
  }

  function init() {
    var form = document.getElementById("fare-form");
    if (!form || !global.Tapsi || !global.Tapsi.fare) return;

    var frame = null;
    var schedule = function () {
      if (frame) return;
      frame = global.requestAnimationFrame(function () {
        frame = null;
        try {
          render(form);
        } catch (error) {
          if (global.console && console.error) console.error("calculator render failed", error);
        }
      });
    };

    form.addEventListener("input", schedule);
    form.addEventListener("change", schedule);
    render(form);
  }

  var api = { init: init, render: render, readForm: readForm };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.calculator = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
