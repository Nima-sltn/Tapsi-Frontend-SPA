/**
 * Unit tests for the event bus — the two requested language features are
 * exercised directly: lexical scoping (private, per-instance state) and
 * Promises (async emit, once(), timeouts, error isolation).
 *
 * Run with: npm test  (node --test tests/)
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const bus = require("../js/modules/bus.js");

test("the subscriber registry is unreachable from outside (lexical scoping)", () => {
  assert.equal(bus.topics, undefined, "registry must stay in the factory closure");
  assert.equal(typeof bus.on, "function");
  assert.equal(typeof bus.emit, "function");
  assert.equal(typeof bus.once, "function");

  // Classic scripts must not leak a global in Node either.
  assert.equal(globalThis.Tapsi, undefined);
});

test("two buses created from the same factory share no state", async () => {
  const a = bus.createBus();
  const b = bus.createBus();
  const seen = [];

  a.on("ping", (payload) => seen.push("a:" + payload));
  b.on("ping", (payload) => seen.push("b:" + payload));

  await a.emit("ping", "one");

  assert.deepEqual(seen, ["a:one"], "the sibling bus must not receive events");
  assert.equal(b.has("ping"), true);
});

test("emit resolves after async handlers finish and delivers the payload", async () => {
  const local = bus.createBus();
  const order = [];

  local.on("job", async (payload) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    order.push("async:" + payload);
  });
  local.on("job", (payload) => order.push("sync:" + payload));

  await local.emit("job", "x");
  order.push("after-await");

  assert.deepEqual(order, ["sync:x", "async:x", "after-await"]);
});

test("emit settles even when a handler throws, protecting the others", async () => {
  const local = bus.createBus();
  const survivors = [];

  local.on("boom", () => {
    throw new Error("handler exploded");
  });
  local.on("boom", () => survivors.push("ran"));

  const payload = await local.emit("boom");

  assert.deepEqual(survivors, ["ran"], "later handlers still run");
  assert.equal(payload, undefined, "payload is echoed back to the emitter");
});

test("once() resolves with the next payload", async () => {
  const local = bus.createBus();
  const pending = local.once("answer", 1000);

  setTimeout(() => local.emit("answer", 42), 5);

  assert.equal(await pending, 42);
  assert.equal(local.has("answer"), false, "the one-shot listener unsubscribes");
});

test("once() rejects with a timeout error when nothing is emitted", async () => {
  const local = bus.createBus();
  const pending = local.once("never", 10);

  await assert.rejects(pending, /Timed out .* "never"/);
  assert.equal(local.has("never"), false, "the timed-out listener unsubscribes");
});

test("unsubscribe removes exactly one listener and is idempotent", async () => {
  const local = bus.createBus();
  const seen = [];

  const off = local.on("t", () => seen.push("first"));
  local.on("t", () => seen.push("second"));

  off();
  off(); // second call must not remove anything else

  await local.emit("t");
  assert.deepEqual(seen, ["second"]);
  assert.equal(local.has("t"), true);
});

test("on() rejects non-function handlers", () => {
  assert.throws(() => bus.on("bad", "not-a-function"), TypeError);
});
