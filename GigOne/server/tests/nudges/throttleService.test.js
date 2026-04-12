/**
 * Nudge Throttle Service — 15 Test Cases
 *
 * Tests quiet hours, global spacing, per-type cooldowns, and daily cap.
 * All DB calls are mocked — no real MongoDB connection needed.
 */

const throttle = require("../../services/nudgeThrottleService");

// ── Mock the Nudge model ──────────────────────────────────────────────────────
jest.mock("../../models/Nudge", () => {
  return {
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };
});
const Nudge = require("../../models/Nudge");

const USER_ID = "507f1f77bcf86cd799439011";

// Helper to set fake IST hour by mocking Date.now
const setISTHour = (hour) => {
  // IST = UTC + 5:30, so UTC hour = IST hour - 5.5
  const utcHour = ((hour - 5.5 + 24) % 24);
  const now = new Date();
  now.setUTCHours(Math.floor(utcHour), (utcHour % 1) * 60, 0, 0);
  jest.spyOn(Date, "now").mockReturnValue(now.getTime());
};

const mockLean = (val) => ({ lean: jest.fn().mockResolvedValue(val) });

beforeEach(() => {
  Nudge.findOne.mockReturnValue(mockLean(null));
  Nudge.countDocuments.mockResolvedValue(0);
});

afterEach(() => {
  jest.restoreAllMocks();
  Nudge.findOne.mockReset();
  Nudge.countDocuments.mockReset();
});

// ── QUIET HOURS TESTS ─────────────────────────────────────────────────────────

test("1. Block nudge at 11 PM IST (quiet hours)", async () => {
  setISTHour(23);
  const result = await throttle.canSendNudge(USER_ID, "environmental");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Quiet hours/);
});

test("2. Block nudge at 3 AM IST (quiet hours)", async () => {
  setISTHour(3);
  const result = await throttle.canSendNudge(USER_ID, "surge");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Quiet hours/);
});

test("3. Block nudge at 7:59 AM IST (still quiet)", async () => {
  setISTHour(7);
  const result = await throttle.canSendNudge(USER_ID, "daily_target");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Quiet hours/);
});

test("4. Allow next_day_shift nudge during quiet hours (exception)", async () => {
  setISTHour(21); // 9 PM — technically within shift nudge window
  Nudge.findOne.mockReturnValue(mockLean(null));
  Nudge.countDocuments.mockResolvedValue(0);
  const result = await throttle.canSendNudge(USER_ID, "next_day_shift");
  expect(result.allowed).toBe(true);
});

test("5. Allow nudge at 8 AM IST (quiet hours end)", async () => {
  setISTHour(8);
  Nudge.findOne.mockReturnValue(mockLean(null));
  Nudge.countDocuments.mockResolvedValue(0);
  const result = await throttle.canSendNudge(USER_ID, "environmental");
  expect(result.allowed).toBe(true);
});

test("6. Allow nudge at 9:55 PM IST (just before cutoff)", async () => {
  setISTHour(21);
  Nudge.findOne.mockReturnValue(mockLean(null));
  Nudge.countDocuments.mockResolvedValue(0);
  const result = await throttle.canSendNudge(USER_ID, "surge");
  expect(result.allowed).toBe(true);
});

// ── GLOBAL SPACING TESTS ─────────────────────────────────────────────────────

test("7. Block if another nudge was sent 5 min ago (15-min spacing)", async () => {
  setISTHour(12);
  Nudge.findOne.mockReturnValueOnce(mockLean({
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
  }));
  const result = await throttle.canSendNudge(USER_ID, "environmental");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Global spacing/);
});

test("8. Allow if last nudge was 20 min ago (past 15-min spacing)", async () => {
  setISTHour(14);
  Nudge.findOne
    .mockReturnValueOnce(mockLean(null))  // global spacing check = nothing recent
    .mockReturnValueOnce(mockLean(null)); // per-type cooldown check
  Nudge.countDocuments.mockResolvedValue(2);
  const result = await throttle.canSendNudge(USER_ID, "environmental");
  expect(result.allowed).toBe(true);
});

test("9. Block if nudge was sent exactly 14 min ago", async () => {
  setISTHour(10);
  Nudge.findOne.mockReturnValueOnce(mockLean({
    createdAt: new Date(Date.now() - 14 * 60 * 1000),
  }));
  const result = await throttle.canSendNudge(USER_ID, "daily_target");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Global spacing/);
});

// ── PER-TYPE COOLDOWN TESTS ──────────────────────────────────────────────────

test("10. Block burnout nudge if one was sent 12 hours ago (24h cooldown)", async () => {
  setISTHour(15);
  Nudge.findOne
    .mockReturnValueOnce(mockLean(null)) // global spacing OK
    .mockReturnValueOnce(mockLean({      // per-type: burnout sent 12h ago
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    }));
  const result = await throttle.canSendNudge(USER_ID, "burnout");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Per-type cooldown.*burnout/);
});

test("11. Allow surge nudge if last surge was 90 min ago (1h cooldown)", async () => {
  setISTHour(19);
  Nudge.findOne
    .mockReturnValueOnce(mockLean(null))  // global spacing OK
    .mockReturnValueOnce(mockLean(null)); // per-type: no surge within 1h
  Nudge.countDocuments.mockResolvedValue(3);
  const result = await throttle.canSendNudge(USER_ID, "surge");
  expect(result.allowed).toBe(true);
});

test("12. Block surge nudge if one was sent 30 min ago (1h cooldown)", async () => {
  setISTHour(18);
  Nudge.findOne
    .mockReturnValueOnce(mockLean(null)) // global spacing OK
    .mockReturnValueOnce(mockLean({      // per-type: surge sent 30m ago
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    }));
  const result = await throttle.canSendNudge(USER_ID, "surge");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Per-type cooldown.*surge/);
});

test("13. Block environmental if one was sent 1 hour ago (2h cooldown)", async () => {
  setISTHour(11);
  Nudge.findOne
    .mockReturnValueOnce(mockLean(null)) // global spacing OK
    .mockReturnValueOnce(mockLean({      // per-type: env sent 1h ago
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    }));
  const result = await throttle.canSendNudge(USER_ID, "environmental");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Per-type cooldown/);
});

// ── DAILY CAP TESTS ──────────────────────────────────────────────────────────

test("14. Block if daily cap (8) is reached", async () => {
  setISTHour(16);
  Nudge.findOne
    .mockReturnValueOnce(mockLean(null))  // global spacing OK
    .mockReturnValueOnce(mockLean(null)); // per-type OK
  Nudge.countDocuments.mockResolvedValue(8); // cap hit
  const result = await throttle.canSendNudge(USER_ID, "environmental");
  expect(result.allowed).toBe(false);
  expect(result.reason).toMatch(/Daily cap/);
});

test("15. Allow if daily count is 7 (below cap of 8)", async () => {
  setISTHour(13);
  Nudge.findOne
    .mockReturnValueOnce(mockLean(null))
    .mockReturnValueOnce(mockLean(null));
  Nudge.countDocuments.mockResolvedValue(7);
  const result = await throttle.canSendNudge(USER_ID, "daily_target");
  expect(result.allowed).toBe(true);
});
