/**
 * Toast notifications.
 *
 * Provides lightweight, accessible feedback (`role="status"` live region)
 * and wires up every declarative `[data-toast]` trigger in the document.
 *
 * @namespace Tapsi.feedback
 */
(function (global) {
  "use strict";

  var TOAST_DURATION = 4000;
  var MAX_VISIBLE = 3;

  /**
   * Show a toast message.
   * @param {string} message Text to display.
   * @param {"info"|"success"|"error"} [type] Visual variant.
   * @returns {HTMLElement|null} The created element, if a region exists.
   */
  function toast(message, type) {
    var host = document.getElementById("toast-region");
    if (!host || !message) return null;

    while (host.children.length >= MAX_VISIBLE) {
      host.removeChild(host.firstElementChild);
    }

    var element = document.createElement("div");
    element.className = "toast toast--" + (type || "info");
    element.textContent = message;
    host.appendChild(element);

    global.requestAnimationFrame(function () {
      element.classList.add("is-visible");
    });

    global.setTimeout(function () {
      element.classList.remove("is-visible");
      global.setTimeout(function () {
        if (element.parentNode) element.parentNode.removeChild(element);
      }, 300);
    }, TOAST_DURATION);

    return element;
  }

  /** Binds every `[data-toast]` element declared in the markup. */
  function bindDeclarativeTriggers() {
    var triggers = document.querySelectorAll("[data-toast]");
    Array.prototype.forEach.call(triggers, function (trigger) {
      if (trigger.__toastBound) return;
      trigger.__toastBound = true;
      trigger.addEventListener("click", function () {
        toast(trigger.getAttribute("data-toast"));
      });
    });
  }

  function init() {
    bindDeclarativeTriggers();
  }

  var api = { init: init, toast: toast };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.feedback = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
