/**
 * Nudge Model — 10 Test Cases
 *
 * Tests schema validation, defaults, and enum constraints.
 * Uses Mongoose model directly (no DB connection needed for validation).
 */

// We need to mock mongoose.model to avoid actual DB connection
// but we can still test the schema validation logic

const mongoose = require("mongoose");

// Load the model (it registers the schema)
const Nudge = require("../../models/Nudge");

test("1. Valid nudge passes validation", () => {
  const nudge = new Nudge({
    userId: new mongoose.Types.ObjectId(),
    type: "surge",
    title: "Surge Alert",
    body: "Demand is high!",
  });

  const err = nudge.validateSync();
  expect(err).toBeUndefined();
});

test("2. Missing userId fails validation", () => {
  const nudge = new Nudge({
    type: "surge",
    title: "Test",
    body: "Test body",
  });

  const err = nudge.validateSync();
  expect(err).toBeDefined();
  expect(err.errors.userId).toBeDefined();
});

test("3. Missing type fails validation", () => {
  const nudge = new Nudge({
    userId: new mongoose.Types.ObjectId(),
    title: "Test",
    body: "Test body",
  });

  const err = nudge.validateSync();
  expect(err).toBeDefined();
  expect(err.errors.type).toBeDefined();
});

test("4. Invalid type enum fails validation", () => {
  const nudge = new Nudge({
    userId: new mongoose.Types.ObjectId(),
    type: "invalid_type",
    title: "Test",
    body: "Test",
  });

  const err = nudge.validateSync();
  expect(err).toBeDefined();
  expect(err.errors.type).toBeDefined();
});

test("5. All valid nudge types pass validation", () => {
  const types = ["environmental", "earnings_optimization", "burnout", "daily_target", "next_day_shift", "surge"];

  types.forEach((type) => {
    const nudge = new Nudge({
      userId: new mongoose.Types.ObjectId(),
      type,
      title: "Test",
      body: "Test body",
    });
    const err = nudge.validateSync();
    expect(err).toBeUndefined();
  });
});

test("6. Default status is 'pending'", () => {
  const nudge = new Nudge({
    userId: new mongoose.Types.ObjectId(),
    type: "surge",
    title: "Test",
    body: "Test",
  });

  expect(nudge.status).toBe("pending");
});

test("7. Default priority is 'normal'", () => {
  const nudge = new Nudge({
    userId: new mongoose.Types.ObjectId(),
    type: "environmental",
    title: "Test",
    body: "Test",
  });

  expect(nudge.priority).toBe("normal");
});

test("8. Default emoji is 🔔", () => {
  const nudge = new Nudge({
    userId: new mongoose.Types.ObjectId(),
    type: "surge",
    title: "Test",
    body: "Test",
  });

  expect(nudge.emoji).toBe("🔔");
});

test("9. expiresAt defaults to ~6 hours from now", () => {
  const before = Date.now();
  const nudge = new Nudge({
    userId: new mongoose.Types.ObjectId(),
    type: "surge",
    title: "Test",
    body: "Test",
  });
  const after = Date.now();

  const sixHoursMs = 6 * 60 * 60 * 1000;
  expect(nudge.expiresAt.getTime()).toBeGreaterThanOrEqual(before + sixHoursMs - 1000);
  expect(nudge.expiresAt.getTime()).toBeLessThanOrEqual(after + sixHoursMs + 1000);
});

test("10. Invalid priority enum fails validation", () => {
  const nudge = new Nudge({
    userId: new mongoose.Types.ObjectId(),
    type: "surge",
    title: "Test",
    body: "Test",
    priority: "super_high",
  });

  const err = nudge.validateSync();
  expect(err).toBeDefined();
  expect(err.errors.priority).toBeDefined();
});
