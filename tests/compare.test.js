/**
 * Unit tests for the comparison domain (cross-service pricing).
 * Run with: npm test  (node --test tests/)
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const compare = require("../js/modules/compare.js");
const fare = require("../js/modules/fare.js");

const TRIP = { distanceKm: 12, durationMin: 30, time: "day" };

test("every service is ranked cheapest-first", () => {
  const rows = compare.compareFare(TRIP);

  assert.equal(rows.length, Object.keys(fare.SERVICES).length);
  assert.deepEqual(
    rows.map((row) => row.key).sort(),
    Object.keys(fare.SERVICES).sort()
  );

  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].total >= rows[i - 1].total, "rows must be sorted by total");
  }
  assert.deepEqual(
    rows.map((row) => row.rank),
    rows.map((_, index) => index + 1)
  );
});

test("exactly one row is the cheapest and the priciest normalises to 1", () => {
  const rows = compare.compareFare(TRIP);

  assert.equal(rows.filter((row) => row.cheapest).length, 1);
  assert.equal(rows[0].cheapest, true);
  assert.equal(rows[rows.length - 1].ratio, 1);
  rows.forEach((row) => {
    assert.ok(row.ratio > 0 && row.ratio <= 1, `ratio out of range: ${row.ratio}`);
  });
});

test("each row matches the fare domain's own estimate", () => {
  const rows = compare.compareFare(TRIP);

  rows.forEach((row) => {
    const estimate = fare.estimateFare(Object.assign({ service: row.key }, TRIP));
    assert.equal(row.total, estimate.total);
    assert.equal(row.label, fare.SERVICES[row.key].label);
  });
});

test("a peak-time trip costs more than the same day-time trip", () => {
  const day = compare.compareFare(TRIP);
  const peak = compare.compareFare(Object.assign({}, TRIP, { time: "peak" }));

  day.forEach((row, index) => {
    assert.ok(peak[index].total > row.total, `${row.key} should cost more at peak time`);
  });
});

test("an unknown time window propagates as a RangeError", () => {
  assert.throws(() => compare.compareFare(Object.assign({}, TRIP, { time: "noon" })), RangeError);
});

test("the calculation is pure: repeated calls return equal (not shared) rows", () => {
  const first = compare.compareFare(TRIP);
  const second = compare.compareFare(TRIP);

  assert.deepEqual(first, second);
  assert.notEqual(first, second, "each call must build a fresh array");
  assert.notEqual(first[0], second[0], "row objects must not be shared");
});
