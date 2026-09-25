/**
 * Mobile navigation + scroll-spy.
 *
 * - Accessible disclosure toggler (`aria-expanded` / `aria-controls`)
 * - Closes on Escape, on link activation and when leaving the mobile breakpoint
 * - Marks the section currently in view with `aria-current="true"`
 *
 * @namespace Tapsi.nav
 */
(function (global) {
  "use strict";

  var MOBILE_QUERY = "(min-width: 769px)";
  var toggler = null;
  var nav = null;
  var menu = null;

  /**
   * @param {boolean} expanded Whether the menu is open.
   */
  function setExpanded(expanded) {
    if (!toggler || !nav) return;
    nav.classList.toggle("nav__expanded", expanded);
    toggler.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function isExpanded() {
    return !!nav && nav.classList.contains("nav__expanded");
  }

  /** Highlights the nav link of the section currently in the viewport. */
  function initScrollSpy() {
    if (typeof global.IntersectionObserver !== "function") return;

    var links = menu ? menu.querySelectorAll('a[href^="#"]') : [];
    var lookup = {};
    var targets = [];

    Array.prototype.forEach.call(links, function (link) {
      var id = link.getAttribute("href").slice(1);
      var section = id && document.getElementById(id);
      if (!section) return;
      lookup[id] = link;
      targets.push(section);
    });

    if (!targets.length) return;

    var observer = new global.IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          Object.keys(lookup).forEach(function (id) {
            var link = lookup[id];
            var active = id === entry.target.id;
            link.classList.toggle("is-active", active);
            if (active) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    targets.forEach(function (target) {
      observer.observe(target);
    });
  }

  function init() {
    toggler = document.getElementById("nav-toggler");
    nav = toggler ? toggler.closest(".nav") : null;
    menu = document.getElementById("nav-menu");

    if (!toggler || !nav || !menu) return;

    toggler.addEventListener("click", function () {
      setExpanded(!isExpanded());
    });

    // Close when a destination is chosen.
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setExpanded(false);
    });

    // Close on Escape and return focus to the toggler.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isExpanded()) {
        setExpanded(false);
        toggler.focus();
      }
    });

    // Leaving the mobile breakpoint must not leave the menu stuck open.
    var media = global.matchMedia(MOBILE_QUERY);
    var onBreakpoint = function (event) {
      if (event.matches) setExpanded(false);
    };
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onBreakpoint);
    } else if (typeof media.addListener === "function") {
      media.addListener(onBreakpoint);
    }

    initScrollSpy();
  }

  var api = { init: init, setExpanded: setExpanded };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.nav = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
