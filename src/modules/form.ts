/**
 * Contact form validation.
 *
 * Client-side validation with inline, screen-reader friendly messages
 * (`aria-invalid` + `aria-describedby`). The pure validators are exported
 * so they can be unit-tested outside the browser.
 */
import { bus } from "./bus.js";
import type { ContactErrors, ContactField, ContactValues } from "../types.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Validator = (value: string) => string | null;

export const validators: Record<ContactField, Validator> = {
  name(value) {
    const text = String(value || "").trim();
    if (text.length < 3) return "لطفاً نام و نام خانوادگی خود را وارد کنید (حداقل ۳ حرف).";
    if (text.length > 80) return "نام واردشده بیش از حد طولانی است.";
    return null;
  },

  email(value) {
    const text = String(value || "").trim();
    if (!text) return "لطفاً ایمیل خود را وارد کنید.";
    if (!EMAIL_PATTERN.test(text)) return "قالب ایمیل واردشده معتبر نیست.";
    return null;
  },

  message(value) {
    const text = String(value || "").trim();
    if (text.length < 10) return "متن پیام باید حداقل ۱۰ کاراکتر باشد.";
    if (text.length > 2000) return "متن پیام بیش از حد طولانی است.";
    return null;
  }
};

/** Runs every validator against a set of values. */
export function validate(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  (Object.keys(validators) as ContactField[]).forEach((field) => {
    const message = validators[field](values[field]);
    if (message) errors[field] = message;
  });
  return errors;
}

/** Toggles the inline error UI for one field. */
function setFieldError(input: HTMLInputElement | HTMLTextAreaElement, message: string | null): void {
  const error = document.getElementById(`${input.id}-error`);
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

export function init(): void {
  const form = document.getElementById("contact-form") as HTMLFormElement | null;
  if (!form) return;

  const status = document.getElementById("contact-status");
  const fields = (Object.keys(validators) as ContactField[])
    .map((field) => document.getElementById(`contact-${field}`))
    .filter((el): el is HTMLInputElement | HTMLTextAreaElement => el !== null);

  const readValues = (): ContactValues => {
    const element = (name: string): HTMLInputElement =>
      form.elements.namedItem(name) as HTMLInputElement;
    return {
      name: element("name")?.value ?? "",
      email: element("email")?.value ?? "",
      message: element("message")?.value ?? "",
      company: element("company")?.value ?? ""
    };
  };

  // Clear (or refresh) a field's message as soon as the visitor edits it.
  fields.forEach((field) => {
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") {
        const key = field.id.replace("contact-", "") as ContactField;
        setFieldError(field, validators[key]?.(field.value) ?? null);
      }
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const values = readValues();
    const errors = validate(values);

    // Honeypot tripped: pretend success, never process the payload.
    if (values.company) {
      if (status) status.textContent = "نظر شما با موفقیت ثبت شد.";
      void bus.emit("form:submit", { outcome: "ignored" });
      form.reset();
      return;
    }

    fields.forEach((field) => {
      const key = field.id.replace("contact-", "") as ContactField;
      setFieldError(field, errors[key] ?? null);
    });

    const invalid = Object.keys(errors) as ContactField[];
    if (invalid.length) {
      if (status) status.textContent = "لطفاً خطاهای مشخص‌شده را برطرف کنید.";
      void bus.emit("form:submit", { outcome: "invalid", errors });
      document.getElementById(`contact-${invalid[0]}`)?.focus();
      return;
    }

    void bus.emit("form:submit", { outcome: "valid" });

    if (status) status.textContent = "نظر شما با موفقیت ثبت شد. (نسخه دمو)";
    form.reset();
    fields.forEach((field) => setFieldError(field, null));
  });
}
