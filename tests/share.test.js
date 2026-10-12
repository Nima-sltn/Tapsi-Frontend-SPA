/**
 * Unit tests for the shareable-trip-link domain.
 * Run with: npm test  (node --test tests/)
 */
import test from "node:test";
import assert from "node:assert/strict";

import * as share from "../dist/modules/share.js";
import * as fare from "../dist/modules/fare.js";

const TRIP = { service: "plus", distanceKm: 12, durationMin: 30, time: "peak" };

test("a trip round-trips through the URL encoding unchanged", () => {
  const search = share.tripToSearch(TRIP);
  assert.ok(search.startsWith("?"), "encoded search must carry a leading ?");

  const parsed = share.parseTripSearch(search);
  assert.deepEqual(parsed, TRIP);
});

test("parsing tolerates a missing leading ?", () => {
  const parsed = share.parseTripSearch("service=moto&km=5&min=15&time=night");
  assert.deepEqual(parsed, { service: "moto", distanceKm: 5, durationMin: 15, time: "night" });
});

test("hostile URLs are clamped into the slider ranges, not NaN", () => {
  const parsed = share.parseTripSearch("?service=classic&km=99999&min=-40&time=day");

  assert.equal(parsed.distanceKm, share.TRIP_BOUNDS.distanceKm.max);
  assert.equal(parsed.durationMin, share.TRIP_BOUNDS.durationMin.min);
  assert.ok(Number.isFinite(parsed.distanceKm));
  assert.ok(Number.isFinite(parsed.durationMin));
});

test("off-step values snap to the nearest slider step", () => {
  const parsed = share.parseTripSearch("?service=classic&km=12.4&min=27");

  assert.equal(parsed.distanceKm, 12);
  assert.equal(parsed.durationMin, 25);
});

test("unknown service and time window fall back to defaults", () => {
  const parsed = share.parseTripSearch("?service=teleport&time=lunch&km=8&min=20");

  assert.equal(parsed.service, "classic");
  assert.equal(parsed.time, "day");
  assert.equal(parsed.distanceKm, 8, "valid numeric params survive");
  assert.equal(parsed.durationMin, 20);
});

test("an empty query yields the default trip", () => {
  const parsed = share.parseTripSearch("");

  assert.equal(parsed.service, "classic");
  assert.equal(parsed.time, "day");
  assert.ok(Number.isFinite(parsed.distanceKm));
  assert.ok(Number.isFinite(parsed.durationMin));

  // The default trip must be estimable by the fare domain.
  assert.ok(fare.estimateFare(share.toFareInput(parsed)).total > 0);
});

test("encoding rejects invalid values instead of emitting them", () => {
  assert.equal(share.tripToSearch({ service: "teleport" }), "");
  assert.equal(share.tripToSearch({ time: "lunch" }), "");
  assert.equal(share.tripToSearch({ distanceKm: NaN }), "");
  assert.equal(share.tripToSearch({}), "");
});

test("encoding keeps every emitted value inside the markup bounds", () => {
  const search = share.tripToSearch({ service: "line", distanceKm: 123, durationMin: 9999, time: "night" });
  const parsed = share.parseTripSearch(search);

  assert.ok(parsed.distanceKm <= share.TRIP_BOUNDS.distanceKm.max);
  assert.ok(parsed.durationMin <= share.TRIP_BOUNDS.durationMin.max);
  assert.equal(parsed.service, "line");
  assert.equal(parsed.time, "night");
});

test("clampToRange snaps to the declared step grid", () => {
  const range = { min: 5, max: 120, step: 5 };

  assert.equal(share.clampToRange(7, range), 5);
  assert.equal(share.clampToRange(8, range), 10);
  assert.equal(share.clampToRange(1000, range), 120);
  assert.equal(share.clampToRange(-3, range), 5);
});

test("catalogue keys match the fare domain exactly", () => {
  assert.deepEqual([...share.SERVICE_KEYS].sort(), Object.keys(fare.SERVICES).sort());
  assert.deepEqual([...share.TIME_KEYS].sort(), Object.keys(fare.TIME_MULTIPLIERS).sort());
});
