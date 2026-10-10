/**
 * Fare calculator UI.
 *
 * Binds the `#fare-form` controls to the pure {@link Tapsi.fare} domain
 * module and renders the breakdown reactively on every input change.
 *
 * Extras
 *  - draws the cross-service comparison chart from {@link Tapsi.compare}
 *  - persists the last trip in `localStorage` and restores it on load
 *    (every stored value is validated against the markup first)
 *  - publishes `calculator:restore` and `calculator:change` on the event bus
 *
 * @namespace Tapsi.calculator
 */
(function (global) {
  "use strict";

  var DISTANCE_LABELS = { min: 1, max: 50 };
  var DURATION_LABELS = { min: 5, max: 120 };
  var STORAGE_KEY = "tapsi-fare";
  var PERSISTED_FIELDS = { distance: "distanceKm", duration: "durationMin" };

  /**
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  function byId(id) {
    return document.getElementById(id);
  }

  /**
   * Draws the "what does every service cost?" bar chart.
   * Pure rendering: all maths happens in {@link Tapsi.compare}.
   * @param {{service: string, distanceKm: number, durationMin: number, time: string}} input
   */
  function renderCompare(input) {
    var list = byId("fare-compare-list");
    if (!list || !global.Tapsi || !global.Tapsi.compare) return;

    var rows = global.Tapsi.compare.compareFare(input);
    var fare = global.Tapsi.fare;

    list.textContent = "";
    rows.forEach(function (row) {
      var item = document.createElement("li");
      item.className = "compare__row" + (row.key === input.service ? " is-current" : "");

      var label = document.createElement("span");
      label.className = "compare__label";
      label.textContent = row.label;
      if (row.cheapest) {
        var tag = document.createElement("span");
        tag.className = "compare__tag";
        tag.textContent = "ارزان‌ترین";
        label.appendChild(tag);
      }

      var track = document.createElement("span");
      track.className = "compare__track";
      var bar = document.createElement("span");
      bar.className = "compare__bar";
      bar.style.width = Math.round(row.ratio * 100) + "%";
      bar.title = row.label + ": " + fare.formatToman(row.total, "fa-IR");
      track.appendChild(bar);

      var value = document.createElement("span");
      value.className = "compare__value";
      value.textContent = fare.formatToman(row.total, "fa-IR");

      item.appendChild(label);
      item.appendChild(track);
      item.appendChild(value);
      list.appendChild(item);
    });
  }

  /**
   * Persists the current trip (fire-and-forget; storage may be unavailable).
   * @param {HTMLFormElement} form
   */
  function save(form) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(readForm(form)));
    } catch (error) {
      /* storage disabled — the calculator still works for this visit */
    }
  }

  /**
   * Applies a previously stored trip to the form.
   * Every value is validated against the actual markup first, so stale or
   * hand-edited storage can never put the form in an invalid state.
   * @param {HTMLFormElement} form
   * @returns {boolean} Whether anything was restored.
   */
  function restore(form) {
    var raw = null;
    try {
      raw = global.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return false;
    }
    if (!raw) return false;

    var saved;
    try {
      saved = JSON.parse(raw);
    } catch (error) {
      return false;
    }
    if (!saved || typeof saved !== "object") return false;

    var applied = false;

    if (saved.service) {
      var options = form.elements.service.options;
      for (var i = 0; i < options.length; i++) {
        if (options[i].value === saved.service) {
          form.elements.service.value = saved.service;
          applied = true;
          break;
        }
      }
    }

    Object.keys(PERSISTED_FIELDS).forEach(function (name) {
      var input = form.elements[name];
      var savedValue = saved[PERSISTED_FIELDS[name]];
      if (!input || savedValue === undefined || savedValue === null || savedValue === "") return;

      var value = Number(savedValue);
      if (!isFinite(value)) return;

      // Clamp to the bounds declared in the markup — stale storage from an
      // older version of the page can never produce an invalid form.
      input.value = String(Math.min(Math.max(value, Number(input.min)), Number(input.max)));
      applied = true;
    });

    if (saved.time) {
      var radio = form.querySelector('input[name="time"][value="' + saved.time + '"]');
      if (radio) {
        radio.checked = true;
        applied = true;
      }
    }

    return applied;
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

    renderCompare(input);
    save(form);

    if (global.Tapsi && global.Tapsi.bus) {
      global.Tapsi.bus.emit("calculator:change", {
        service: input.service,
        total: estimate.total
      });
    }
  }

  function init() {
    var form = document.getElementById("fare-form");
    if (!form || !global.Tapsi || !global.Tapsi.fare) return;

    var restored = restore(form);

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

    if (restored && global.Tapsi.bus) {
      global.Tapsi.bus.emit("calculator:restore", readForm(form));
    }
  }

  var api = { init: init, render: render, readForm: readForm, save: save, restore: restore };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.calculator = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
