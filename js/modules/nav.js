/**
 * Mobile navigation drawer + scroll-spy.
 *
 * Behaviour
 *  - Accessible disclosure toggler (`aria-expanded` / `aria-controls`)
 *  - Slide-in sidebar with a dimming backdrop; background scrolling is locked
 *    while open (`body.nav-open`)
 *  - Focus is trapped between the toggler and the menu links; Escape and
 *    backdrop clicks close the drawer and return focus to the toggler.
 *    APG disclosure pattern: opening keeps focus on the toggler, and Tab then
 *    walks into the menu because the list follows the toggler in DOM order.
 *  - Closes on link activation and when leaving the mobile breakpoint
 *  - Publishes `nav:toggle` on the event bus so other domains can react
 *  - Marks the section currently in view with `aria-current="true"`
 *
 * @namespace Tapsi.nav
 */
(function (global) {
  "use strict";

  // Matches the CSS breakpoint (min-width: 768px) exactly.
  var MOBILE_QUERY = "(min-width: 768px)";
  var toggler = null;
  var nav = null;
  var menu = null;
  var backdrop = null;

  /**
   * Publishes a state change on the bus (fire-and-forget Promise).
   * @param {string} topic
   * @param {Object} payload
   */
  function publish(topic, payload) {
    if (global.Tapsi && global.Tapsi.bus) global.Tapsi.bus.emit(topic, payload);
  }

  function isExpanded() {
    return !!nav && nav.classList.contains("nav__expanded");
  }

  /**
   * Opens or closes the drawer.
   * @param {boolean} expanded Whether the menu should be open.
   * @param {{refocus?: boolean}} [options] `refocus` returns focus to the
   *   toggler (Escape/backdrop); link clicks skip it so the page scroll is
   *   not fought by the browser.
   */
  function setExpanded(expanded, options) {
    if (!toggler || !nav) return;
    expanded = !!expanded;
    if (expanded === isExpanded()) return;

    nav.classList.toggle("nav__expanded", expanded);
    toggler.setAttribute("aria-expanded", expanded ? "true" : "false");
    document.body.classList.toggle("nav-open", expanded);

    if (backdrop) backdrop.classList.toggle("is-open", expanded);

    if (options && options.refocus) toggler.focus();
    publish("nav:toggle", { open: expanded });
  }

  /** @returns {Element[]} Toggler + every menu link, in DOM order. */
  function focusables() {
    var links = menu ? Array.prototype.slice.call(menu.querySelectorAll("a[href]")) : [];
    return [toggler].concat(links);
  }

  /**
   * Cycles Tab/Shift+Tab inside the drawer (toggler ↔ links) while open.
   * @param {KeyboardEvent} event
   */
  function trapFocus(event) {
    var items = focusables();
    var first = items[0];
    var last = items[items.length - 1];
    var active = document.activeElement;
    var inside = items.indexOf(active) !== -1;

    if (event.shiftKey) {
      if (!inside || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (!inside || active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Creates the click-catcher used on mobile only. */
  function createBackdrop() {
    var element = document.createElement("div");
    element.className = "nav-backdrop";
    element.setAttribute("aria-hidden", "true");
    element.addEventListener("click", function () {
      setExpanded(false, { refocus: true });
    });
    document.body.appendChild(element);
    return element;
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

    backdrop = createBackdrop();

    toggler.addEventListener("click", function () {
      setExpanded(!isExpanded());
    });

    // Close when a destination is chosen (no refocus: the page scrolls there).
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setExpanded(false);
    });

    document.addEventListener("keydown", function (event) {
      if (!isExpanded()) return;

      if (event.key === "Escape") {
        setExpanded(false, { refocus: true });
        return;
      }
      if (event.key === "Tab") trapFocus(event);
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

  var api = { init: init, setExpanded: setExpanded, isExpanded: isExpanded };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.nav = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
