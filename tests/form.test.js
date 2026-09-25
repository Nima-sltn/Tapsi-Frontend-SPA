/**
 * Unit tests for the contact form validators.
 * Run with: npm test  (node --test tests/)
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const form = require("../js/modules/form.js");

const VALID = {
  name: "نیما سلطان",
  email: "hello@example.com",
  message: "این یک پیام آزمایشی به اندازه کافی بلند است."
};

test("a complete payload produces no errors", () => {
  assert.deepEqual(form.validate(VALID), {});
});

test("an empty payload reports every field", () => {
  const errors = form.validate({ name: "", email: "", message: "" });

  assert.deepEqual(Object.keys(errors).sort(), ["email", "message", "name"]);
  Object.values(errors).forEach((message) => {
    assert.equal(typeof message, "string");
    assert.ok(message.length > 0);
  });
});

test("name must contain at least three characters", () => {
  assert.ok(form.validators.name("ab"));
  assert.ok(form.validators.name("   "));
  assert.equal(form.validators.name("نیما"), null);
  assert.equal(form.validators.name("  نیما  "), null);
});

test("email must look like an address", () => {
  assert.ok(form.validators.email(""));
  assert.ok(form.validators.email("not-an-email"));
  assert.ok(form.validators.email("missing@tld"));
  assert.ok(form.validators.email("spaces in@example.com"));
  assert.equal(form.validators.email("user@tapsi.ir"), null);
  assert.equal(form.validators.email("  user+tag@example.co.uk  "), null);
});

test("message enforces a minimum and maximum length", () => {
  assert.ok(form.validators.message("کوتاه"));
  assert.ok(form.validators.message("x".repeat(2001)));
  assert.equal(form.validators.message("x".repeat(10)), null);
  assert.equal(form.validators.message(VALID.message), null);
});

test("non-string input never throws", () => {
  assert.ok(form.validators.name(null));
  assert.ok(form.validators.email(undefined));
  assert.ok(form.validators.message(12345));
});
