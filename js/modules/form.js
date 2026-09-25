/**
 * Contact form validation.
 *
 * Client-side validation with inline, screen-reader friendly messages
 * (`aria-invalid` + `aria-describedby`). The pure validators are exported
 * so they can be unit-tested outside the browser.
 *
 * @namespace Tapsi.form
 */
(function (global) {
  "use strict";

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /**
   * @typedef {{name: string, email: string, message: string, company?: string}} ContactValues
   * @typedef {{name?: string, email?: string, message?: string}} ContactErrors
   */

  var validators = {
    /**
     * @param {string} value
     * @returns {string|null} Error message, or null when valid.
     */
    name: function (value) {
      var text = String(value || "").trim();
      if (text.length < 3) return "لطفاً نام و نام خانوادگی خود را وارد کنید (حداقل ۳ حرف).";
      if (text.length > 80) return "نام واردشده بیش از حد طولانی است.";
      return null;
    },

    /**
     * @param {string} value
     * @returns {string|null}
     */
    email: function (value) {
      var text = String(value || "").trim();
      if (!text) return "لطفاً ایمیل خود را وارد کنید.";
      if (!EMAIL_PATTERN.test(text)) return "قالب ایمیل واردشده معتبر نیست.";
      return null;
    },

    /**
     * @param {string} value
     * @returns {string|null}
     */
    message: function (value) {
      var text = String(value || "").trim();
      if (text.length < 10) return "متن پیام باید حداقل ۱۰ کاراکتر باشد.";
      if (text.length > 2000) return "متن پیام بیش از حد طولانی است.";
      return null;
    }
  };

  /**
   * Runs every validator against a set of values.
   * @param {ContactValues} values
   * @returns {ContactErrors}
   */
  function validate(values) {
    var errors = {};
    ["name", "email", "message"].forEach(function (field) {
      var message = validators[field](values[field]);
      if (message) errors[field] = message;
    });
    return errors;
  }

  /**
   * Toggles the inline error UI for one field.
   * @param {HTMLInputElement|HTMLTextAreaElement} input
   * @param {string|null} message
   */
  function setFieldError(input, message) {
    var error = document.getElementById(input.id + "-error");
    if (!error) return;

    if (message) {
      input.setAttribute("aria-invalid", "true");
      error.textContent = message;
      error.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      error.textContent = "";
      error.hidden = true;
    }
  }

  function init() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var status = document.getElementById("contact-status");
    var fields = ["contact-name", "contact-email", "contact-message"]
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    var readValues = function () {
      return {
        name: form.elements.name.value,
        email: form.elements.email.value,
        message: form.elements.message.value,
        company: form.elements.company ? form.elements.company.value : ""
      };
    };

    // Clear (or refresh) a field's message as soon as the visitor edits it.
    fields.forEach(function (field) {
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") {
          setFieldError(field, validators[field.id.replace("contact-", "")](field.value));
        }
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var values = readValues();
      var errors = validate(values);

      // Honeypot tripped: pretend success, never process the payload.
      if (values.company) {
        if (status) status.textContent = "نظر شما با موفقیت ثبت شد.";
        form.reset();
        return;
      }

      fields.forEach(function (field) {
        setFieldError(field, errors[field.id.replace("contact-", "")] || null);
      });

      var invalid = Object.keys(errors);
      if (invalid.length) {
        if (status) status.textContent = "لطفاً خطاهای مشخص‌شده را برطرف کنید.";
        var first = document.getElementById("contact-" + invalid[0]);
        if (first) first.focus();
        return;
      }

      if (status) status.textContent = "نظر شما با موفقیت ثبت شد. (نسخه دمو)";
      if (global.Tapsi && global.Tapsi.feedback) {
        global.Tapsi.feedback.toast("نظر شما با موفقیت ثبت شد.", "success");
      }
      form.reset();
      fields.forEach(function (field) {
        setFieldError(field, null);
      });
    });
  }

  var api = { init: init, validate: validate, validators: validators };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.form = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
