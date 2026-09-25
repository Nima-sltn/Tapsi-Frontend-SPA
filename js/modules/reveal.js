/**
 * Reveal-on-scroll animations.
 *
 * A dependency-free replacement for AOS: IntersectionObserver adds
 * `.is-visible` once, then unobserves. Users who prefer reduced motion
 * get the final state immediately.
 *
 * @namespace Tapsi.reveal
 */
(function (global) {
  "use strict";

  var SELECTOR = "[data-reveal]";

  function prefersReducedMotion() {
    return (
      typeof global.matchMedia === "function" &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /** @param {HTMLElement[]} elements */
  function showAll(elements) {
    elements.forEach(function (element) {
      element.classList.add("is-visible");
    });
  }

  function init() {
    var elements = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    if (!elements.length) return;

    if (prefersReducedMotion() || typeof global.IntersectionObserver !== "function") {
      showAll(elements);
      return;
    }

    var observer = new global.IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -60px 0px" }
    );

    elements.forEach(function (element) {
      observer.observe(element);
    });
  }

  var api = { init: init };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.reveal = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
