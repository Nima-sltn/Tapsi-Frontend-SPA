/**
 * Light/dark theme switch.
 *
 * The initial theme is applied pre-paint by the inline snippet in `<head>`;
 * this module handles the toggle, persistence and system-preference changes.
 *
 * @namespace Tapsi.theme
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "tapsi-theme";
  var DARK_LABEL = "فعال کردن حالت روشن";
  var LIGHT_LABEL = "فعال کردن حالت تاریک";
  var button = null;

  /** @returns {"light"|"dark"} */
  function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  /**
   * Applies and persists a theme.
   * @param {"light"|"dark"} theme Theme to apply.
   */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    var dark = theme === "dark";

    if (button) {
      button.setAttribute("aria-pressed", dark ? "true" : "false");
      button.setAttribute("aria-label", dark ? DARK_LABEL : LIGHT_LABEL);
    }

    try {
      global.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      /* storage disabled (private mode) — theme still applies for this visit */
    }
  }

  function init() {
    button = document.getElementById("theme-toggle");
    applyTheme(currentTheme());

    if (button) {
      button.addEventListener("click", function () {
        applyTheme(currentTheme() === "dark" ? "light" : "dark");
      });
    }

    // Follow the OS only while the visitor has not chosen a theme manually.
    var media = global.matchMedia("(prefers-color-scheme: dark)");
    var onSystemChange = function (event) {
      var stored = null;
      try {
        stored = global.localStorage.getItem(STORAGE_KEY);
      } catch (error) {
        stored = null;
      }
      if (stored !== "light" && stored !== "dark") {
        applyTheme(event.matches ? "dark" : "light");
      }
    };
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onSystemChange);
    } else if (typeof media.addListener === "function") {
      media.addListener(onSystemChange);
    }
  }

  var api = { init: init, applyTheme: applyTheme, currentTheme: currentTheme };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.theme = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
