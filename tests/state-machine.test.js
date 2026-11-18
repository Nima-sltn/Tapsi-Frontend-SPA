/**
 * Unit tests for the Trip Finite State Machine.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { TripStateMachine } from "../dist/domain/trip/state-machine.js";

test("state machine starts in idle state", () => {
  const fsm = new TripStateMachine();
  assert.equal(fsm.getState(), "idle");
});

test("transitions from idle to configuring on user input change", () => {
  const fsm = new TripStateMachine();
  const transitions = [];
  fsm.subscribe((t) => transitions.push(t));

  const changed = fsm.send({ type: "INPUT_CHANGE", trip: { distanceKm: 12 } });
  assert.equal(changed, true);
  assert.equal(fsm.getState(), "configuring");
  assert.equal(transitions.length, 1);
  assert.equal(transitions[0].from, "idle");
  assert.equal(transitions[0].to, "configuring");
  assert.equal(fsm.getTrip().distanceKm, 12);
});

test("calculating leads to estimated on success", () => {
  const fsm = new TripStateMachine();
  fsm.send({ type: "START_CONFIGURE" });
  fsm.send({ type: "BEGIN_CALCULATION" });
  assert.equal(fsm.getState(), "calculating");

  fsm.send({
    type: "CALCULATION_SUCCESS",
    trip: { service: "classic", distanceKm: 10, durationMin: 20, time: "day" }
  });
  assert.equal(fsm.getState(), "estimated");
  assert.equal(fsm.getTrip().service, "classic");
});

test("sharing moves state from estimated to shared", () => {
  const fsm = new TripStateMachine();
  fsm.send({ type: "BEGIN_CALCULATION" });
  fsm.send({
    type: "CALCULATION_SUCCESS",
    trip: { service: "classic", distanceKm: 5, durationMin: 15, time: "day" }
  });
  assert.equal(fsm.getState(), "estimated");

  const shared = fsm.send({ type: "TRIP_SHARED", via: "clipboard" });
  assert.equal(shared, true);
  assert.equal(fsm.getState(), "shared");
});

test("reset returns state to idle and clears trip data", () => {
  const fsm = new TripStateMachine();
  fsm.send({ type: "START_CONFIGURE" });
  fsm.send({ type: "INPUT_CHANGE", trip: { distanceKm: 30 } });
  assert.equal(fsm.getTrip().distanceKm, 30);

  fsm.send({ type: "RESET" });
  assert.equal(fsm.getState(), "idle");
  assert.deepEqual(fsm.getTrip(), {});
});
