/**
 * WAI-ARIA tabs for the services section.
 *
 * Implements the APG tabs pattern: roving tabindex, `aria-selected`,
 * arrow-key navigation (mirrored for RTL) and Home/End support.
 *
 * Deep linking: activating a tab mirrors its id into the URL hash
 * (`#tab-plus`) with `history.replaceState` — no history spam, but every
 * tab state is shareable — and a matching hash selects its tab on load and
 * on `hashchange` (back/forward between anchors keeps working).
 *
 * @namespace Tapsi.tabs
 */
(function (global) {
  "use strict";

  var tabs = [];

  /**
   * Writes the active tab id into the URL hash without adding an entry.
   * @param {HTMLElement} tab
   */
  function syncHash(tab) {
    if (!global.history || !global.history.replaceState) return;
    var next = "#" + tab.id;
    if (global.location.hash === next) return;
    try {
      global.history.replaceState(null, "", next);
    } catch (error) {
      /* sandboxed/`file://` context: deep linking degrades to nothing */
    }
  }

  /**
   * Activates a tab and its panel.
   * @param {HTMLElement} tab Tab button to activate.
   * @param {boolean} [focus] Whether to move focus to the tab.
   * @param {boolean} [updateUrl] Whether to mirror the choice into the hash.
   */
  function activate(tab, focus, updateUrl) {
    if (!tab) return;

    var previous = tabs.filter(function (candidate) {
      return candidate.getAttribute("aria-selected") === "true";
    })[0];

    tabs.forEach(function (candidate) {
      var selected = candidate === tab;
      var panel = document.getElementById(candidate.getAttribute("aria-controls"));

      candidate.classList.toggle("active", selected);
      candidate.setAttribute("aria-selected", selected ? "true" : "false");
      candidate.tabIndex = selected ? 0 : -1;

      if (panel) panel.classList.toggle("active", selected);
    });

    if (focus) tab.focus();
    if (updateUrl) syncHash(tab);

    if (previous !== tab && global.Tapsi && global.Tapsi.bus) {
      global.Tapsi.bus.emit("tabs:change", {
        id: tab.id,
        panel: tab.getAttribute("aria-controls")
      });
    }
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
      activate(tabs[0], true, true);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      activate(tabs[tabs.length - 1], true, true);
      return;
    }
    if (forward === null) return;

    event.preventDefault();
    var next = (index + (forward ? 1 : -1) + tabs.length) % tabs.length;
    activate(tabs[next], true, true);
  }

  function init() {
    tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activate(tab, false, true);
      });

      tab.addEventListener("keydown", function (event) {
        handleArrowKeys(event, tab);
      });
    });

    // Guarantee a coherent initial state (single selected tab, matching panel).
    var initial = tabs.filter(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    })[0];

    // Deep link wins over the markup default: `#tab-tel` opens that tab.
    var hash = global.location ? global.location.hash.slice(1) : "";
    var fromHash = hash && document.getElementById(hash);
    var startIndex = fromHash && fromHash.getAttribute("role") === "tab" ? fromHash : initial || tabs[0];
    activate(startIndex, false, false);

    // Back/forward between anchors (and shared URLs) re-syncs the tabs.
    global.addEventListener("hashchange", function () {
      var id = global.location.hash.slice(1);
      var target = id && document.getElementById(id);
      if (target && target.getAttribute("role") === "tab" && target !== document.querySelector('[role="tab"][aria-selected="true"]')) {
        activate(target, false, false);
      }
    });
  }

  var api = { init: init, activate: activate };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.tabs = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
