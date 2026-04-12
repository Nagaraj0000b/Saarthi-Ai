/**
 * Nudge Dispatch Service — 12 Test Cases
 *
 * Tests central dispatch logic: throttle integration, field validation,
 * emoji mapping, expiry, and edge cases.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────
jest.mock("../../services/nudgeThrottleService", () => ({
  canSendNudge: jest.fn(),
}));

jest.mock("../../models/Nudge", () => ({
  create: jest.fn(),
}));

const { dispatchNudge } = require("../../services/nudgeDispatchService");
const { canSendNudge } = require("../../services/nudgeThrottleService");
const Nudge = require("../../models/Nudge");

const USER_ID = "507f1f77bcf86cd799439011";

afterEach(() => {
  jest.clearAllMocks();
});

test("1. Successfully creates nudge when throttle allows", async () => {
  canSendNudge.mockResolvedValue({ allowed: true, reason: "OK" });
  Nudge.create.mockResolvedValue({ _id: "n1", type: "surge", status: "pending" });

  const result = await dispatchNudge(USER_ID, {
    type: "surge",
    title: "Surge Alert",
    body: "Demand is 40% above normal!",
  });

  expect(result).toBeTruthy();
  expect(Nudge.create).toHaveBeenCalledTimes(1);
  expect(Nudge.create).toHaveBeenCalledWith(expect.objectContaining({
    userId: USER_ID,
    type: "surge",
    status: "pending",
  }));
});

test("2. Returns null when throttled", async () => {
  canSendNudge.mockResolvedValue({ allowed: false, reason: "Quiet hours" });

  const result = await dispatchNudge(USER_ID, {
    type: "environmental",
    title: "Rain Alert",
    body: "Rain incoming!",
  });

  expect(result).toBeNull();
  expect(Nudge.create).not.toHaveBeenCalled();
});

test("3. Returns null when missing required fields (no title)", async () => {
  const result = await dispatchNudge(USER_ID, {
    type: "surge",
    title: "",
    body: "Some body",
  });

  expect(result).toBeNull();
  expect(canSendNudge).not.toHaveBeenCalled();
});

test("4. Returns null when missing userId", async () => {
  const result = await dispatchNudge(null, {
    type: "surge",
    title: "Title",
    body: "Body",
  });

  expect(result).toBeNull();
});

test("5. Returns null when missing type", async () => {
  const result = await dispatchNudge(USER_ID, {
    title: "Title",
    body: "Body",
  });

  expect(result).toBeNull();
});

test("6. Uses correct emoji for each type", async () => {
  canSendNudge.mockResolvedValue({ allowed: true, reason: "OK" });
  Nudge.create.mockImplementation((data) => data);

  await dispatchNudge(USER_ID, { type: "environmental", title: "T", body: "B" });
  expect(Nudge.create).toHaveBeenCalledWith(expect.objectContaining({ emoji: "🌦️" }));

  await dispatchNudge(USER_ID, { type: "surge", title: "T", body: "B" });
  expect(Nudge.create).toHaveBeenCalledWith(expect.objectContaining({ emoji: "⚡" }));

  await dispatchNudge(USER_ID, { type: "daily_target", title: "T", body: "B" });
  expect(Nudge.create).toHaveBeenCalledWith(expect.objectContaining({ emoji: "🎯" }));

  await dispatchNudge(USER_ID, { type: "burnout", title: "T", body: "B" });
  expect(Nudge.create).toHaveBeenCalledWith(expect.objectContaining({ emoji: "😓" }));
});

test("7. Allows custom emoji override", async () => {
  canSendNudge.mockResolvedValue({ allowed: true, reason: "OK" });
  Nudge.create.mockImplementation((data) => data);

  await dispatchNudge(USER_ID, { type: "surge", title: "T", body: "B", emoji: "🚀" });
  expect(Nudge.create).toHaveBeenCalledWith(expect.objectContaining({ emoji: "🚀" }));
});

test("8. Sets default priority to 'normal'", async () => {
  canSendNudge.mockResolvedValue({ allowed: true, reason: "OK" });
  Nudge.create.mockImplementation((data) => data);

  await dispatchNudge(USER_ID, { type: "environmental", title: "T", body: "B" });
  expect(Nudge.create).toHaveBeenCalledWith(expect.objectContaining({ priority: "normal" }));
});

test("9. Respects custom priority", async () => {
  canSendNudge.mockResolvedValue({ allowed: true, reason: "OK" });
  Nudge.create.mockImplementation((data) => data);

  await dispatchNudge(USER_ID, { type: "surge", title: "T", body: "B", priority: "urgent" });
  expect(Nudge.create).toHaveBeenCalledWith(expect.objectContaining({ priority: "urgent" }));
});

test("10. Sets expiresAt approximately 6 hours from now by default", async () => {
  canSendNudge.mockResolvedValue({ allowed: true, reason: "OK" });
  Nudge.create.mockImplementation((data) => data);

  const before = Date.now();
  await dispatchNudge(USER_ID, { type: "environmental", title: "T", body: "B" });
  const after = Date.now();

  const call = Nudge.create.mock.calls[0][0];
  const expiresMs = call.expiresAt.getTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sixHoursMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sixHoursMs + 1000);
});

test("11. Supports custom expiresInMs", async () => {
  canSendNudge.mockResolvedValue({ allowed: true, reason: "OK" });
  Nudge.create.mockImplementation((data) => data);

  const customMs = 90 * 60 * 1000; // 90 min
  await dispatchNudge(USER_ID, { type: "surge", title: "T", body: "B", expiresInMs: customMs });

  const call = Nudge.create.mock.calls[0][0];
  const diff = call.expiresAt.getTime() - Date.now();
  expect(diff).toBeGreaterThan(customMs - 2000);
  expect(diff).toBeLessThan(customMs + 2000);
});

test("12. Returns null gracefully if Nudge.create throws", async () => {
  canSendNudge.mockResolvedValue({ allowed: true, reason: "OK" });
  Nudge.create.mockRejectedValue(new Error("DB write failed"));

  const result = await dispatchNudge(USER_ID, {
    type: "surge",
    title: "T",
    body: "B",
  });

  expect(result).toBeNull();
});
