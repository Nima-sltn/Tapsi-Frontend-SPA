/**
 * Unit tests for the accordion's pure key-map (lexical module scope keeps
 * the DOM out of Node, so only the helper is exercised here).
 * Run with: npm test  (node --test tests/)
 */
import test from "node:test";
import assert from "node:assert/strict";

import * as accordion from "../dist/modules/accordion.js";

test("ArrowDown and ArrowUp cycle through the questions", () => {
  assert.equal(accordion.nextIndex(4, 0, "ArrowDown"), 1);
  assert.equal(accordion.nextIndex(4, 1, "ArrowUp"), 0);
  assert.equal(accordion.nextIndex(4, 3, "ArrowDown"), 0, "wraps past the end");
  assert.equal(accordion.nextIndex(4, 0, "ArrowUp"), 3, "wraps before the start");
});

test("Home and End jump to the extremes", () => {
  assert.equal(accordion.nextIndex(5, 3, "Home"), 0);
  assert.equal(accordion.nextIndex(5, 0, "End"), 4);
});

test("unhandled keys return null so the browser keeps its default", () => {
  assert.equal(accordion.nextIndex(3, 1, "Enter"), null);
  assert.equal(accordion.nextIndex(3, 1, "Space"), null);
  assert.equal(accordion.nextIndex(3, 1, "Tab"), null);
});

test("an empty group never produces an index", () => {
  assert.equal(accordion.nextIndex(0, 0, "ArrowDown"), null);
  assert.equal(accordion.nextIndex(0, 0, "Home"), null);
});

test("isOpen reads the aria-expanded state", () => {
  const stub = (value) => ({ getAttribute: () => value });
  assert.equal(accordion.isOpen(stub("true")), true);
  assert.equal(accordion.isOpen(stub("false")), false);
  assert.equal(accordion.isOpen(stub(null)), false, "missing attribute counts as closed");
});

test("module exposes the expected public API", () => {
  assert.equal(typeof accordion.init, "function");
  assert.equal(typeof accordion.setOpen, "function");
  assert.equal(typeof accordion.openExclusive, "function");
  assert.equal(typeof accordion.isOpen, "function");
  assert.equal(typeof accordion.nextIndex, "function");
});
