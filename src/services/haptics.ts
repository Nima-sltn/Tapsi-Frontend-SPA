/**
 * Subtle Micro-Interaction Audio & Haptic Feedback Service.
 *
 * Synthesizes ultra-short, pleasant acoustic micro-cues using the native
 * Web Audio API (oscillators with exponential gain decay) — zero external
 * MP3/WAV asset downloads required.
 *
 * Adheres strictly to accessibility standards:
 *  - Disabled by default or when user prefers reduced motion
 *  - Fully muteable with persistent state
 *  - Unlocks only after explicit user interaction to comply with browser autoplay policies
 */

import { defaultStorage } from "../infrastructure/storage.js";

export type SoundCue = "tap" | "toggle" | "success" | "tick";

class HapticsService {
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = false;
  private isUnlocked: boolean = false;

  constructor() {
    this.checkPreference();
  }

  private checkPreference(): void {
    if (typeof window === "undefined") return;

    // Default to false unless explicitly enabled by user
    const saved = defaultStorage.get<string>("audio_cue");
    this.enabled = saved === "enabled";

    // Auto-disable if prefers-reduced-motion is active
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.enabled = false;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx && (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enable: boolean): void {
    this.enabled = enable;
    defaultStorage.set("audio_cue", enable ? "enabled" : "disabled");
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.play("toggle");
    }
    return this.enabled;
  }

  /**
   * Plays an acoustic micro-cue.
   */
  play(cue: SoundCue): void {
    if (!this.enabled || typeof window === "undefined") return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (cue) {
        case "tick":
          // Subtle soft click for slider steps
          osc.type = "sine";
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.03);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.start(now);
          osc.stop(now + 0.03);
          break;

        case "toggle":
          // Two-tone warm chime
          osc.type = "triangle";
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;

        case "tap":
          // Soft tactile tap
          osc.type = "sine";
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
          break;

        case "success":
          // Harmonious soft arpeggio
          osc.type = "sine";
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
      }
    } catch {
      // Audio playback suspended or disallowed
    }
  }
}

export const haptics = new HapticsService();
