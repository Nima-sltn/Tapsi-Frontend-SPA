/**
 * Offers carousel (scroll-snap rail with prev/next controls).
 *
 * Uses the container's native overflow scrolling, so touch, trackpad and
 * keyboard users all get the same behaviour. Controls disable themselves
 * at either end of the rail and work in both writing directions.
 *
 * @namespace Tapsi.carousel
 */
(function (global) {
  "use strict";

  var STEP_RATIO = 0.85;

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
   * Scrolls the rail by one card.
   * @param {HTMLElement} container Scrollable rail.
   * @param {1|-1} direction +1 for "next", -1 for "previous".
   */
  function scrollByCard(container, direction) {
    var info = metrics(container);
    if (info.rtl) direction = -direction;
    container.scrollBy({ left: info.step * direction, behavior: "smooth" });
  }

  /**
   * @param {HTMLElement} container Scrollable rail.
   * @param {HTMLButtonElement} prev
   * @param {HTMLButtonElement} next
   */
  function syncControls(container, prev, next) {
    var info = metrics(container);
    if (prev) prev.disabled = info.atStart;
    if (next) next.disabled = info.atEnd;
  }

  function init() {
    var container = document.querySelector("[data-carousel]");
    if (!container) return;

    var section = container.closest("section") || document;
    var prev = section.querySelector("[data-carousel-prev]");
    var next = section.querySelector("[data-carousel-next]");

    if (prev) {
      prev.addEventListener("click", function () {
        scrollByCard(container, -1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        scrollByCard(container, 1);
      });
    }

    // Keyboard scrolling for the focusable rail.
    container.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollByCard(container, 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollByCard(container, -1);
      }
    });

    var ticking = false;
    container.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        global.requestAnimationFrame(function () {
          ticking = false;
          syncControls(container, prev, next);
        });
      },
      { passive: true }
    );

    global.addEventListener("resize", function () {
      syncControls(container, prev, next);
    });

    syncControls(container, prev, next);
  }

  var api = { init: init, scrollByCard: scrollByCard };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.carousel = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
