/**
 * Toast notifications.
 *
 * Provides lightweight, accessible feedback (an `<output>` live region,
 * whose implicit role is `status`), wires up every declarative `[data-toast]`
 * trigger in the document, and subscribes to `form:submit` on the bus so the
 * form domain never has to import this one.
 */
import { bus } from "./bus.js";

const TOAST_DURATION = 4000;
const MAX_VISIBLE = 3;

export type ToastType = "info" | "success" | "error";

/** Show a toast message. Returns the created element, if a region exists. */
export function toast(message: string, type: ToastType = "info"): HTMLDivElement | null {
  const host = document.getElementById("toast-region");
  if (!host || !message) return null;

  while (host.children.length >= MAX_VISIBLE) {
    host.removeChild(host.firstElementChild as Node);
  }

  const element = document.createElement("div");
  element.className = `toast toast--${type}`;
  element.textContent = message;
  host.appendChild(element);

  requestAnimationFrame(() => element.classList.add("is-visible"));

  setTimeout(() => {
    element.classList.remove("is-visible");
    setTimeout(() => element.remove(), 300);
  }, TOAST_DURATION);

  return element;
}

/** Binds every `[data-toast]` element declared in the markup. */
function bindDeclarativeTriggers(): void {
  document.querySelectorAll<HTMLElement>("[data-toast]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const message = trigger.getAttribute("data-toast");
      if (message) toast(message);
    });
  });
}

export function init(): void {
  bindDeclarativeTriggers();

  // Success feedback for the contact form, decoupled via the bus: the form
  // domain publishes outcomes, this domain decides how (and whether) to
  // surface them to the visitor.
  bus.on("form:submit", ({ outcome }) => {
    if (outcome === "valid") toast("نظر شما با موفقیت ثبت شد.", "success");
  });

  bus.on("trip:share", ({ ok, via }) => {
    if (ok) {
      toast(via === "clipboard" ? "لینک سفر کپی شد." : "لینک سفر در نوار آدرس آماده کپی است.", "success");
    } else {
      toast("متاسفانه کپی لینک ممکن نشد.", "error");
    }
  });
}
