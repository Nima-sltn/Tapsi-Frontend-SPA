/**
 * Accessible audio micro-interaction controller module.
 *
 * Provides a user toggle in the header for synthesized Web Audio API micro-cues,
 * respecting user preferences and accessibility settings.
 */

import { bus } from "./bus.js";
import { haptics } from "../services/haptics.js";

const SOUND_ON_LABEL = "غیرفعال کردن بازخورد صوتی";
const SOUND_OFF_LABEL = "فعال کردن بازخورد صوتی";

let button: HTMLButtonElement | null = null;

export function updateAudioButtonState(): void {
  if (!button) return;
  const isEnabled = haptics.isEnabled();
  button.setAttribute("aria-pressed", String(isEnabled));
  button.setAttribute("aria-label", isEnabled ? SOUND_ON_LABEL : SOUND_OFF_LABEL);
  button.classList.toggle("is-active", isEnabled);
}

export function init(): void {
  button = document.getElementById("audio-toggle") as HTMLButtonElement | null;
  if (!button) return;

  updateAudioButtonState();

  button.addEventListener("click", () => {
    const nextState = haptics.toggle();
    updateAudioButtonState();
    void bus.emit("audio:toggle", { enabled: nextState });
  });
}
