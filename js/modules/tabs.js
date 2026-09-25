/**
 * WAI-ARIA tabs for the services section.
 *
 * Implements the APG tabs pattern: roving tabindex, `aria-selected`,
 * arrow-key navigation (mirrored for RTL) and Home/End support.
 *
 * @namespace Tapsi.tabs
 */
(function (global) {
  "use strict";

  var tabs = [];

  /**
   * Activates a tab and its panel.
   * @param {HTMLElement} tab Tab button to activate.
   * @param {boolean} [focus] Whether to move focus to the tab.
   */
  function activate(tab, focus) {
    if (!tab) return;

    tabs.forEach(function (candidate) {
      var selected = candidate === tab;
      var panel = document.getElementById(candidate.getAttribute("aria-controls"));

      candidate.classList.toggle("active", selected);
      candidate.setAttribute("aria-selected", selected ? "true" : "false");
      candidate.tabIndex = selected ? 0 : -1;

      if (panel) panel.classList.toggle("active", selected);
    });

    if (focus) tab.focus();
  }

  /**
   * @param {KeyboardEvent} event
   * @param {HTMLElement} current Currently focused tab.
   */
  function handleArrowKeys(event, current) {
    var index = tabs.indexOf(current);
    if (index === -1) return;

    var forward = null;

    // The document is RTL, so the visual order is mirrored:
    // ArrowLeft moves to the next tab in DOM order, ArrowRight to the previous.
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") forward = true;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") forward = false;

    if (event.key === "Home") {
      event.preventDefault();
      activate(tabs[0], true);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      activate(tabs[tabs.length - 1], true);
      return;
    }
    if (forward === null) return;

    event.preventDefault();
    var next = (index + (forward ? 1 : -1) + tabs.length) % tabs.length;
    activate(tabs[next], true);
  }

  function init() {
    tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activate(tab, false);
      });

      tab.addEventListener("keydown", function (event) {
        handleArrowKeys(event, tab);
      });
    });

    // Guarantee a coherent initial state (single selected tab, matching panel).
    var initial = tabs.filter(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    })[0];
    activate(initial || tabs[0], false);
  }

  var api = { init: init, activate: activate };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.tabs = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
