/**
 * Accessible accordion (WAI-ARIA disclosure pattern) for the FAQ section.
 *
 * - Each question is a `<button>` controlling an answer panel via
 *   `aria-expanded` / `aria-controls`; panels are toggled with `hidden`
 *   so collapsed answers leave the accessibility tree entirely.
 * - Arrow Up/Down, Home and End move between questions (APG optional
 *   enhancement) — the key map is a pure function so it is unit-testable.
 * - Every toggle publishes `accordion:change` on the event bus.
 *
 * @namespace Tapsi.accordion
 */
(function (global) {
  "use strict";

  /**
   * Maps a navigation key to a question index.
   * @param {number} length Number of questions in the group.
   * @param {number} current Index of the focused question.
   * @param {string} key Keyboard key.
   * @returns {number|null} Target index, or null when the key is not handled.
   */
  function nextIndex(length, current, key) {
    if (!length) return null;
    if (key === "Home") return 0;
    if (key === "End") return length - 1;
    if (key === "ArrowDown") return (current + 1) % length;
    if (key === "ArrowUp") return (current - 1 + length) % length;
    return null;
  }

  /**
   * Opens or closes one question.
   * @param {HTMLButtonElement} button
   * @param {boolean} expanded
   */
  function setOpen(button, expanded) {
    var panel = document.getElementById(button.getAttribute("aria-controls"));
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (panel) panel.hidden = !expanded;

    if (global.Tapsi && global.Tapsi.bus) {
      global.Tapsi.bus.emit("accordion:change", { id: button.id, expanded: !!expanded });
    }
  }

  function init() {
    var groups = document.querySelectorAll("[data-accordion]");

    Array.prototype.forEach.call(groups, function (group) {
      var questions = Array.prototype.slice.call(group.querySelectorAll(".faq__question"));
      if (!questions.length) return;

      group.addEventListener("click", function (event) {
        var button = event.target.closest ? event.target.closest(".faq__question") : null;
        if (!button || !group.contains(button)) return;
        setOpen(button, button.getAttribute("aria-expanded") !== "true");
      });

      group.addEventListener("keydown", function (event) {
        var button = event.target.closest ? event.target.closest(".faq__question") : null;
        if (!button) return;

        var index = questions.indexOf(button);
        var target = nextIndex(questions.length, index, event.key);
        if (target === null) return;

        event.preventDefault();
        questions[target].focus();
      });
    });
  }

  var api = { init: init, setOpen: setOpen, nextIndex: nextIndex };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.accordion = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
