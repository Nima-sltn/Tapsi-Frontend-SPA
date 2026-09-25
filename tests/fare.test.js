/**
 * Unit tests for the fare estimation domain logic.
 * Run with: npm test  (node --test tests/)
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const fare = require("../js/modules/fare.js");

test("estimates a fare with an itemised breakdown", () => {
  const result = fare.estimateFare({
    service: "classic",
    distanceKm: 10,
    durationMin: 25,
    time: "day"
  });

  assert.equal(result.breakdown.base, 25000);
  assert.equal(result.breakdown.distance, 65000);
  assert.equal(result.breakdown.time, 15000);
  assert.equal(result.total, 105000);
  assert.equal(result.timeMultiplier, 1);
  assert.deepEqual(result.range, { min: 95000, max: 116000 });
});

test("breakdown components sum up to the pre-multiplier subtotal", () => {
  const result = fare.estimateFare({
    service: "plus",
    distanceKm: 7.5,
    durationMin: 40,
    time: "night"
  });

  const subtotal =
    result.breakdown.base + result.breakdown.distance + result.breakdown.time;
  const expected = fare.roundTo(subtotal * fare.TIME_MULTIPLIERS.night, fare.ROUNDING_UNIT);

  assert.equal(result.total, expected);
});

test("fare grows monotonically with distance", () => {
  let previous = 0;
  for (let km = 1; km <= 50; km += 5) {
    const { total } = fare.estimateFare({
      service: "classic",
      distanceKm: km,
      durationMin: 20
    });
    assert.ok(total > previous, `total for ${km}km (${total}) must exceed ${previous}`);
    previous = total;
  }
});

test("fare grows monotonically with duration", () => {
  let previous = 0;
  for (let minutes = 5; minutes <= 120; minutes += 15) {
    const { total } = fare.estimateFare({
      service: "classic",
      distanceKm: 10,
      durationMin: minutes
    });
    assert.ok(total > previous, `total for ${minutes}min (${total}) must exceed ${previous}`);
    previous = total;
  }
});

test("demand windows apply in the expected order: peak > night > day", () => {
  const base = { service: "classic", distanceKm: 10, durationMin: 25 };
  const day = fare.estimateFare({ ...base, time: "day" });
  const night = fare.estimateFare({ ...base, time: "night" });
  const peak = fare.estimateFare({ ...base, time: "peak" });

  assert.ok(day.total < night.total);
  assert.ok(night.total < peak.total);
  assert.equal(fare.estimateFare({ ...base, time: "peak" }).total, 152000);
});

test("totals are always rounded to the pricing unit", () => {
  const odd = fare.estimateFare({
    service: "classic",
    distanceKm: 1.5,
    durationMin: 5
  });

  assert.equal(odd.total, 38000);
  assert.equal(odd.total % fare.ROUNDING_UNIT, 0);
  assert.equal(odd.range.min % fare.ROUNDING_UNIT, 0);
  assert.equal(odd.range.max % fare.ROUNDING_UNIT, 0);
});

test("estimate range always brackets the total", () => {
  for (const service of Object.keys(fare.SERVICES)) {
    for (const time of Object.keys(fare.TIME_MULTIPLIERS)) {
      const result = fare.estimateFare({
        service,
        time,
        distanceKm: 13.7,
        durationMin: 33
      });
      assert.ok(result.range.min <= result.total, `${service}/${time}: min must be <= total`);
      assert.ok(result.range.max >= result.total, `${service}/${time}: max must be >= total`);
    }
  }
});

test("every configured service yields a positive fare", () => {
  Object.keys(fare.SERVICES).forEach((service) => {
    const result = fare.estimateFare({ service, distanceKm: 5, durationMin: 15 });
    assert.ok(result.total > 0, `${service} must cost something`);
    assert.equal(result.service, service);
  });
});

test("invalid service and time window are rejected", () => {
  assert.throws(
    () => fare.estimateFare({ service: "teleport", distanceKm: 1, durationMin: 1 }),
    RangeError
  );
  assert.throws(
    () => fare.estimateFare({ service: "classic", distanceKm: 1, durationMin: 1, time: "lunch" }),
    RangeError
  );
});

test("hostile or missing numeric input is clamped, not NaN", () => {
  const negative = fare.estimateFare({ service: "classic", distanceKm: -50, durationMin: -10 });
  const missing = fare.estimateFare({ service: "classic", distanceKm: null, durationMin: undefined });
  const huge = fare.estimateFare({ service: "classic", distanceKm: 1e9, durationMin: 1e9 });

  assert.equal(negative.breakdown.distance, 0);
  assert.equal(negative.breakdown.time, 0);
  assert.ok(Number.isFinite(negative.total));
  assert.ok(Number.isFinite(missing.total));
  assert.ok(Number.isFinite(huge.total));
  assert.ok(huge.distanceKm <= 500);
  assert.ok(huge.durationMin <= 600);
});

test("formatToman renders a human readable amount", () => {
  const formatted = fare.formatToman(105000, "fa-IR");

  assert.equal(typeof formatted, "string");
  assert.ok(formatted.length > 0);
  assert.ok(!/NaN/.test(formatted));
  assert.match(fare.formatToman(105000, "en-US"), /^105,000$/);
  assert.equal(fare.formatToman(undefined), (0).toLocaleString("fa-IR"));
});
