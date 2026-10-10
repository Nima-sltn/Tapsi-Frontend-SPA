/**
 * Offers carousel (scroll-snap rail with prev/next controls).
 *
 * Uses the container's native overflow scrolling, so touch and pointer users
 * get native behaviour. Keyboard users drive the rail through the prev/next
 * controls, which disable themselves at either end and work in both writing
 * directions.
 *
 * @namespace Tapsi.carousel
 */
(function (global) {
  "use strict";

  var STEP_RATIO = 0.85;
  var SCROLL_TIMEOUT_MS = 700;

  /**
   * @param {HTMLElement} container Scrollable rail.
   * @returns {{atStart: boolean, atEnd: boolean, step: number, rtl: boolean}} Position snapshot.
   */
  function metrics(container) {
    var max = Math.max(0, container.scrollWidth - container.clientWidth);
    var position = Math.abs(container.scrollLeft);
    var rtl = (document.documentElement.dir || "rtl") === "rtl";

    return {
      atStart: container.scrollLeft >= -1,
      atEnd: position >= max - 1,
      step: Math.max(180, Math.round(container.clientWidth * STEP_RATIO)),
      rtl: rtl
    };
  }

  /**
   * Resolves once the rail stops moving (native `scrollend`, with a timeout
   * fallback for browsers that never fire it).
   * @param {HTMLElement} container Scrollable rail.
   * @param {number} timeoutMs Maximum time to wait.
   * @returns {Promise<void>}
   */
  function waitForScroll(container, timeoutMs) {
    return new Promise(function (resolve) {
      var settled = false;
      var timer = null;

      var finish = function () {
        if (settled) return;
        settled = true;
        if (timer !== null) global.clearTimeout(timer);
        container.removeEventListener("scrollend", finish);
        resolve();
      };

      timer = global.setTimeout(finish, timeoutMs);
      container.addEventListener("scrollend", finish);
    });
  }

  /**
   * Scrolls the rail by one card.
   * @param {HTMLElement} container Scrollable rail.
   * @param {1|-1} direction +1 for "next", -1 for "previous".
   * @returns {Promise<void>} Resolves when the scroll animation settles, so
   *   callers can chain follow-up work (e.g. announcing the new slide) with `.then()`.
   */
  function scrollByCard(container, direction) {
    var info = metrics(container);
    if (info.rtl) direction = -direction;
    container.scrollBy({ left: info.step * direction, behavior: "smooth" });
    return waitForScroll(container, SCROLL_TIMEOUT_MS);
  }

  /**
   * Enables/disables the prev/next controls for the current position.
   * @param {HTMLElement} container Scrollable rail.
   * @param {HTMLButtonElement} prev
   * @param {HTMLButtonElement} next
   * @returns {{atStart: boolean, atEnd: boolean, step: number, rtl: boolean}}
   */
  function syncControls(container, prev, next) {
    var info = metrics(container);
    if (prev) prev.disabled = info.atStart;
    if (next) next.disabled = info.atEnd;
    return info;
  }

  function init() {
    var container = document.querySelector("[data-carousel]");
    if (!container) return;

    var section = container.closest("section") || document;
    var prev = section.querySelector("[data-carousel-prev]");
    var next = section.querySelector("[data-carousel-next]");

    // Re-syncs the controls and, whenever the edge state actually changes,
    // publishes `carousel:change` on the bus (Promise-based, fire-and-forget).
    var lastEdgeState = null;
    var sync = function () {
      var info = syncControls(container, prev, next);
      var signature = (info.atStart ? "1" : "0") + (info.atEnd ? "1" : "0");
      if (signature === lastEdgeState) return;
      lastEdgeState = signature;

      if (global.Tapsi && global.Tapsi.bus) {
        global.Tapsi.bus.emit("carousel:change", { atStart: info.atStart, atEnd: info.atEnd });
      }
    };

    if (prev) {
      prev.addEventListener("click", function () {
        scrollByCard(container, -1).then(sync);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        scrollByCard(container, 1).then(sync);
      });
    }

    var ticking = false;
    container.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        global.requestAnimationFrame(function () {
          ticking = false;
          sync();
        });
      },
      { passive: true }
    );

    global.addEventListener("resize", function () {
      sync();
    });

    sync();
  }

  var api = { init: init, scrollByCard: scrollByCard, waitForScroll: waitForScroll };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.carousel = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
