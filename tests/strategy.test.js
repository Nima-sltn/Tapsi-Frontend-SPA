/**
 * Unit tests for the Strategy Pattern pricing domain.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  PricingStrategyRegistry,
  ClassicPricingStrategy,
  PlusPricingStrategy,
  MotoPricingStrategy,
  AutopeykPricingStrategy,
  LinePricingStrategy
} from "../dist/domain/pricing/strategy.js";

test("PricingStrategyRegistry provides instances for all 5 core services", () => {
  const registry = new PricingStrategyRegistry();
  assert.equal(registry.getAll().length, 5);
  assert.ok(registry.has("classic"));
  assert.ok(registry.has("plus"));
  assert.ok(registry.has("moto"));
  assert.ok(registry.has("autopeyk"));
  assert.ok(registry.has("line"));
});

test("ClassicPricingStrategy calculates deterministic breakdown and total", () => {
  const strategy = new ClassicPricingStrategy();
  const breakdown = strategy.calculate(10, 25, 1.0);

  assert.equal(breakdown.base, 25000);
  assert.equal(breakdown.distance, 65000);
  assert.equal(breakdown.time, 15000);
  assert.equal(breakdown.total, 105000);
});

test("LinePricingStrategy provides lower tariffs for shared rides", () => {
  const classic = new ClassicPricingStrategy();
  const line = new LinePricingStrategy();

  const classicTotal = classic.calculate(15, 30, 1.2).total;
  const lineTotal = line.calculate(15, 30, 1.2).total;

  assert.ok(lineTotal < classicTotal, "Tapsi Line must cost less than Tapsi Classic");
});

test("PlusPricingStrategy reflects premium service rates", () => {
  const classic = new ClassicPricingStrategy();
  const plus = new PlusPricingStrategy();

  const classicTotal = classic.calculate(10, 20, 1.0).total;
  const plusTotal = plus.calculate(10, 20, 1.0).total;

  assert.ok(plusTotal > classicTotal, "Tapsi Plus must cost more than Classic");
});
