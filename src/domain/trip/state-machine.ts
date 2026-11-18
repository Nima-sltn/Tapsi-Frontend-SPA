/**
 * Deterministic Finite State Machine (FSM) governing the trip estimation lifecycle.
 *
 * Guarantees that the UI and data layer cannot transition into invalid states
 * (e.g. attempting to share an uncalculated trip, or rendering stale calculations).
 */

import type { Trip, TripState, TripStateTransition } from "../../types.js";

export type TripEvent =
  | { type: "START_CONFIGURE" }
  | { type: "INPUT_CHANGE"; trip: Partial<Trip> }
  | { type: "BEGIN_CALCULATION" }
  | { type: "CALCULATION_SUCCESS"; trip: Trip }
  | { type: "CALCULATION_FAILURE"; error: string }
  | { type: "TRIP_SHARED"; via: "clipboard" | "share_api" }
  | { type: "RESET" };

export type StateListener = (transition: TripStateTransition) => void;

export class TripStateMachine {
  private currentState: TripState = "idle";
  private currentTrip: Partial<Trip> = {};
  private readonly listeners = new Set<StateListener>();

  getState(): TripState {
    return this.currentState;
  }

  getTrip(): Readonly<Partial<Trip>> {
    return { ...this.currentTrip };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(event: TripEvent): boolean {
    const from = this.currentState;
    let to: TripState | null = null;

    switch (this.currentState) {
      case "idle":
        if (event.type === "START_CONFIGURE" || event.type === "INPUT_CHANGE") {
          to = "configuring";
        } else if (event.type === "BEGIN_CALCULATION") {
          to = "calculating";
        }
        break;

      case "configuring":
        if (event.type === "INPUT_CHANGE") {
          to = "configuring";
        } else if (event.type === "BEGIN_CALCULATION") {
          to = "calculating";
        } else if (event.type === "RESET") {
          to = "idle";
        }
        break;

      case "calculating":
        if (event.type === "CALCULATION_SUCCESS") {
          to = "estimated";
        } else if (event.type === "CALCULATION_FAILURE") {
          to = "error";
        } else if (event.type === "INPUT_CHANGE") {
          to = "configuring";
        }
        break;

      case "estimated":
        if (event.type === "INPUT_CHANGE" || event.type === "START_CONFIGURE") {
          to = "configuring";
        } else if (event.type === "TRIP_SHARED") {
          to = "shared";
        } else if (event.type === "RESET") {
          to = "idle";
        }
        break;

      case "shared":
        if (event.type === "INPUT_CHANGE" || event.type === "START_CONFIGURE") {
          to = "configuring";
        } else if (event.type === "RESET") {
          to = "idle";
        }
        break;

      case "error":
        if (event.type === "INPUT_CHANGE" || event.type === "START_CONFIGURE") {
          to = "configuring";
        } else if (event.type === "RESET") {
          to = "idle";
        }
        break;
    }

    if (event.type === "INPUT_CHANGE") {
      this.currentTrip = { ...this.currentTrip, ...event.trip };
    } else if (event.type === "CALCULATION_SUCCESS") {
      this.currentTrip = { ...event.trip };
    } else if (event.type === "RESET") {
      this.currentTrip = {};
    }

    if (to && to !== from) {
      this.currentState = to;
      const transition: TripStateTransition = {
        from,
        to,
        timestamp: Date.now(),
        context: { ...this.currentTrip }
      };
      this.listeners.forEach((listener) => {
        try {
          listener(transition);
        } catch (err) {
          console.error("[TripStateMachine] Listener failed", err);
        }
      });
      return true;
    }

    return false;
  }
}
