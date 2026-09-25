/**
 * Application entry point.
 *
 * Loads every feature module defensively: one failing module never takes
 * the rest of the page down. Order matters only where a module consumes
 * another (`calculator` needs `fare`, success toasts need `feedback`).
 *
 * @namespace Tapsi
 */
(function (global) {
  "use strict";

  var MODULES = [
    "feedback",
    "nav",
    "tabs",
    "theme",
    "reveal",
    "carousel",
    "form",
    "calculator",
    "progress"
  ];

  function boot() {
    var tapsi = global.Tapsi || {};

    MODULES.forEach(function (name) {
      var module = tapsi[name];
      if (!module || typeof module.init !== "function") return;
      try {
        module.init();
      } catch (error) {
        if (global.console && console.error) {
          console.error("[tapsi] module \"" + name + "\" failed to initialise", error);
        }
      }
    });

    registerServiceWorker();
  }

  /**
   * Registers the offline service worker (HTTP(S) only — `file://` has no
   * service worker support and registration would simply reject).
   */
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!/^https?:$/.test(global.location.protocol)) return;

    navigator.serviceWorker
      .register("sw.js")
      .then(function (registration) {
        if (global.console && console.info) {
          console.info("[tapsi] service worker registered", registration.scope);
        }
      })
      .catch(function (error) {
        if (global.console && console.warn) {
          console.warn("[tapsi] service worker unavailable", error);
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
