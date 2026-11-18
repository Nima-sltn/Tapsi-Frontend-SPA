/**
 * Unit tests for the carbon footprint & eco impact calculations.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { calculateEcoImpact } from "../dist/domain/eco/carbon.js";

test("calculates carbon emissions and savings against baseline personal vehicle", () => {
  const result = calculateEcoImpact("classic", 10, "day");

  // 10km * 135g = 1350g CO2
  assert.equal(result.carbonGrams, 1350);
  // 10km * 170g baseline = 1700g CO2
  assert.equal(result.baselineCarbonGrams, 1700);
  // Saved = 1700 - 1350 = 350g
  assert.equal(result.savedCarbonGrams, 350);
  assert.ok(result.treeDaysEquivalent > 0);
  assert.equal(result.trafficLevel, "moderate");
});

test("Tapsi Line yields superior carbon savings due to shared occupancy", () => {
  const classic = calculateEcoImpact("classic", 20, "peak");
  const line = calculateEcoImpact("line", 20, "peak");

  assert.ok(
    line.savedCarbonGrams > classic.savedCarbonGrams,
    "Shared carpooling must save significantly more carbon than standard private ride"
  );
  assert.equal(line.trafficLevel, "heavy");
});

test("handles zero and negative distances safely without NaN", () => {
  const zero = calculateEcoImpact("classic", 0, "night");
  assert.equal(zero.carbonGrams, 0);
  assert.equal(zero.savedCarbonGrams, 0);
  assert.equal(zero.treeDaysEquivalent, 0);
  assert.equal(zero.trafficLevel, "light");

  const negative = calculateEcoImpact("classic", -5, "day");
  assert.equal(negative.carbonGrams, 0);
});
