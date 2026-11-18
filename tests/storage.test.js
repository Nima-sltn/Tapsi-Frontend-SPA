/**
 * Unit tests for the Storage Repository and fallback mechanisms.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { StorageRepository } from "../dist/infrastructure/storage.js";

test("storage repository stores and parses JSON objects correctly", () => {
  const store = new StorageRepository("test:");
  store.set("trip", { service: "plus", km: 15 });

  const retrieved = store.get("trip");
  assert.deepEqual(retrieved, { service: "plus", km: 15 });
});

test("returns null for non-existent keys", () => {
  const store = new StorageRepository("test:");
  assert.equal(store.get("unknown_key"), null);
});

test("validates schema with optional validator predicate", () => {
  const store = new StorageRepository("test:");
  store.set("number_val", "not_a_number");

  const isNumber = (val) => typeof val === "number";
  const result = store.get("number_val", isNumber);

  assert.equal(result, null);
  // Stored corrupted key must be wiped
  assert.equal(store.get("number_val"), null);
});

test("removes items cleanly", () => {
  const store = new StorageRepository("test:");
  store.set("temp", "hello");
  assert.equal(store.get("temp"), "hello");

  store.remove("temp");
  assert.equal(store.get("temp"), null);
});
