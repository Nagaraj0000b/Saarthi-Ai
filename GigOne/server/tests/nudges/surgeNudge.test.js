/**
 * Surge Nudge Evaluator — 12 Test Cases
 *
 * Tests the surge nudge creation flow: weather+traffic polling,
 * surge threshold, urgent priority, and personalization.
 */

jest.mock("../../services/weatherService", () => ({
  getWeatherContext: jest.fn(),
}));
jest.mock("../../services/trafficService", () => ({
  getTraffic: jest.fn(),
}));
jest.mock("../../services/nudgeDispatchService", () => ({
  dispatchNudge: jest.fn(),
}));
jest.mock("../../models/User", () => ({
  find: jest.fn(),
}));

const { evaluate } = require("../../services/nudgeEvaluators/surgeNudgeEvaluator");
const { getWeatherContext } = require("../../services/weatherService");
const { getTraffic } = require("../../services/trafficService");
const { dispatchNudge } = require("../../services/nudgeDispatchService");

const USER_ID = "507f1f77bcf86cd799439011";

// Helper to mock Date for testing hour/day
const mockDateTime = (hour, dayOfWeek) => {
  const now = new Date(2026, 3, 9); // April 9, 2026
  now.setHours(hour, 0, 0, 0);
  // Adjust to target day of week
  const currentDay = now.getDay();
  const diff = dayOfWeek - currentDay;
  now.setDate(now.getDate() + diff);
  jest.spyOn(Date.prototype, "getHours").mockReturnValue(hour);
  jest.spyOn(Date.prototype, "getDay").mockReturnValue(dayOfWeek);
};

beforeEach(() => {
  dispatchNudge.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test("1. Rain + dinner rush = surge nudge fires", async () => {
  mockDateTime(19, 3); // 7 PM Wednesday
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockResolvedValue({ congestion_percent: 20 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].type).toBe("surge");
  expect(dispatchNudge.mock.calls[0][1].priority).toBe("urgent");
});

test("2. Clear + off-peak = no surge, no nudge", async () => {
  mockDateTime(15, 2); // 3 PM Tuesday
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 30 } });
  getTraffic.mockResolvedValue({ congestion_percent: 10 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("3. Thunderstorm adds storm warning text", async () => {
  mockDateTime(19, 3);
  getWeatherContext.mockResolvedValue({ current: { condition: "Thunderstorm", temp: 24 } });
  getTraffic.mockResolvedValue({ congestion_percent: 30 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/Storm warning/i);
});

test("4. Surge nudge expires in 90 minutes", async () => {
  mockDateTime(19, 6); // Sat dinner
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockResolvedValue({ congestion_percent: 50 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge.mock.calls[0][1].expiresInMs).toBe(90 * 60 * 1000);
});

test("5. Nudge body includes surge percentage", async () => {
  mockDateTime(19, 3);
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockResolvedValue({ congestion_percent: 20 });

  await evaluate(USER_ID, 12.97, 77.59);

  const title = dispatchNudge.mock.calls[0][1].title;
  expect(title).toMatch(/\d+%/);
});

test("6. Nudge body includes recommended platform type", async () => {
  mockDateTime(12, 3); // Lunch Wed
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockResolvedValue({ congestion_percent: 20 });

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/Best for:/i);
});

test("7. Nudge body includes estimated time window", async () => {
  mockDateTime(19, 3);
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockResolvedValue({ congestion_percent: 20 });

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/Estimated window/i);
});

test("8. Metadata includes full surge analysis", async () => {
  mockDateTime(19, 6);
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockResolvedValue({ congestion_percent: 50 });

  await evaluate(USER_ID, 12.97, 77.59);

  const meta = dispatchNudge.mock.calls[0][1].metadata;
  expect(meta.surgeScore).toBeGreaterThanOrEqual(25);
  expect(meta.surgePercent).toBeDefined();
  expect(meta.bestPlatformType).toBeDefined();
  expect(meta.reason).toBeDefined();
  expect(meta.components).toBeDefined();
});

test("9. Weather API failure = no nudge, no crash", async () => {
  mockDateTime(19, 3);
  getWeatherContext.mockRejectedValue(new Error("API down"));
  getTraffic.mockResolvedValue({ congestion_percent: 50 });

  await expect(evaluate(USER_ID, 12.97, 77.59)).resolves.toBeUndefined();
  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("10. Traffic API failure still works if weather triggers surge", async () => {
  mockDateTime(19, 3);
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockRejectedValue(new Error("Traffic API down"));

  await evaluate(USER_ID, 12.97, 77.59);

  // Rain(30) + dinner(20) = 50, enough for surge even without traffic
  expect(dispatchNudge).toHaveBeenCalledTimes(1);
});

test("11. Null weather current = early return, no nudge", async () => {
  mockDateTime(19, 3);
  getWeatherContext.mockResolvedValue({ current: null });
  getTraffic.mockResolvedValue({ congestion_percent: 50 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("12. Data payload includes screen deep-link and surge percent", async () => {
  mockDateTime(19, 6);
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockResolvedValue({ congestion_percent: 50 });

  await evaluate(USER_ID, 12.97, 77.59);

  const data = dispatchNudge.mock.calls[0][1].data;
  expect(data.screen).toBe("dashboard");
  expect(data.surgePercent).toBeGreaterThan(0);
});
