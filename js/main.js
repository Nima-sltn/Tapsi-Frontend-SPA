/**
 * Application entry point.
 *
 * Loads every feature module defensively: one failing module never takes
 * the rest of the page down. Order matters only where a module consumes
 * another (`calculator` needs `fare`, success toasts need `feedback`); the
 * `bus` loads first because it is the decoupling layer every other module
 * publishes to.
 *
 * Boot completes asynchronously: `Tapsi.ready` is a Promise resolving with
 * the initialised registry, and an `app:ready` event is published on the
 * bus for code that needs to wait for a fully booted page.
 *
 * @namespace Tapsi
 */
(function (global) {
  "use strict";

  var MODULES = [
    "bus",
    "feedback",
    "nav",
    "accordion",
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
    var started = [];
    var failed = [];

    MODULES.forEach(function (name) {
      var module = tapsi[name];
      if (!module || typeof module.init !== "function") return;
      try {
        module.init();
        started.push(name);
      } catch (error) {
        failed.push(name);
        if (global.console && console.error) {
          console.error("[tapsi] module \"" + name + "\" failed to initialise", error);
        }
      }
    });

    registerServiceWorker();

    // Promise-based readiness contract: consumers can chain
    // `Tapsi.ready.then(...)` or await `Tapsi.bus.once("app:ready")`.
    var status = { modules: started, failed: failed, at: Date.now() };
    tapsi.ready = Promise.resolve(status);
    if (tapsi.bus) tapsi.bus.emit("app:ready", status);
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
