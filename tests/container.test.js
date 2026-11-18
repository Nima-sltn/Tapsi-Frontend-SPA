/**
 * Unit tests for the IoC Container.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { Container } from "../dist/core/container.js";

test("registers and resolves singleton instances", () => {
  const container = new Container();
  const serviceInstance = { name: "TestService", compute: () => 42 };

  container.registerSingleton("testService", serviceInstance);
  assert.equal(container.has("testService"), true);

  const resolved = container.resolve("testService");
  assert.equal(resolved, serviceInstance);
  assert.equal(resolved.compute(), 42);
});

test("factory creates a fresh instance per resolution", () => {
  const container = new Container();
  let count = 0;
  container.registerFactory("counter", () => {
    count++;
    return { id: count };
  });

  const first = container.resolve("counter");
  const second = container.resolve("counter");

  assert.equal(first.id, 1);
  assert.equal(second.id, 2);
  assert.notEqual(first, second);
});

test("throws error when resolving unregistered service", () => {
  const container = new Container();
  assert.throws(() => {
    container.resolve("missing");
  }, /No provider registered/);
});
