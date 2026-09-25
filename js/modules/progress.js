/**
 * Scroll progress indicator + back-to-top button.
 *
 * Uses a passive scroll listener with `requestAnimationFrame` coalescing
 * so scrolling never triggers layout work inside the event handler.
 *
 * @namespace Tapsi.progress
 */
(function (global) {
  "use strict";

  var BACK_TO_TOP_THRESHOLD = 600;

  function prefersReducedMotion() {
    return (
      typeof global.matchMedia === "function" &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function init() {
    var bar = document.getElementById("scroll-progress-bar");
    var button = document.getElementById("back-to-top");
    var ticking = false;

    var update = function () {
      ticking = false;

      var scrollTop = global.scrollY || document.documentElement.scrollTop || 0;
      var height = document.documentElement.scrollHeight - global.innerHeight;
      var ratio = height > 0 ? Math.min(1, Math.max(0, scrollTop / height)) : 0;

      if (bar) bar.style.width = (ratio * 100).toFixed(2) + "%";
      if (button) button.hidden = scrollTop < BACK_TO_TOP_THRESHOLD;
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(update);
    };

    global.addEventListener("scroll", onScroll, { passive: true });
    global.addEventListener("resize", onScroll);

    if (button) {
      button.addEventListener("click", function () {
        global.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
        // preventScroll is essential: a plain focus() scrolls the brand into
        // view, which cancels the smooth scroll above and leaves the page
        // stranded near the bottom.
        var brand = document.querySelector(".nav__brand");
        if (brand && typeof brand.focus === "function") {
          brand.focus({ preventScroll: true });
        }
      });
    }

    update();
  }

  var api = { init: init };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.progress = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
