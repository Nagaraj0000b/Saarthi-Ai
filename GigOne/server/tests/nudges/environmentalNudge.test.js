/**
 * Environmental Nudge Evaluator — 12 Test Cases
 *
 * Tests weather/traffic condition detection and nudge dispatch logic.
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

const { evaluate } = require("../../services/nudgeEvaluators/environmentalNudgeEvaluator");
const { getWeatherContext } = require("../../services/weatherService");
const { getTraffic } = require("../../services/trafficService");
const { dispatchNudge } = require("../../services/nudgeDispatchService");

const USER_ID = "507f1f77bcf86cd799439011";

afterEach(() => jest.clearAllMocks());

test("1. Rain triggers environmental nudge", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28, description: "Moderate rain" } });
  getTraffic.mockResolvedValue({ congestion_percent: 20, traffic_level: "moderate" });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge).toHaveBeenCalledWith(USER_ID, expect.objectContaining({
    type: "environmental",
    priority: "normal",
  }));
});

test("2. Thunderstorm triggers HIGH priority nudge", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Thunderstorm", temp: 25 } });
  getTraffic.mockResolvedValue({ congestion_percent: 10 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledWith(USER_ID, expect.objectContaining({
    type: "environmental",
    priority: "high",
  }));
});

test("3. Drizzle triggers light rain nudge", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Drizzle", temp: 26 } });
  getTraffic.mockResolvedValue({ congestion_percent: 10 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].body).toMatch(/Drizzle/i);
});

test("4. Extreme heat (>42°C) triggers heat warning", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 44 } });
  getTraffic.mockResolvedValue({ congestion_percent: 10 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].title).toMatch(/Extreme Heat/i);
  expect(dispatchNudge.mock.calls[0][1].priority).toBe("high");
});

test("5. High temperature 38-42°C triggers advisory (not emergency)", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 39 } });
  getTraffic.mockResolvedValue({ congestion_percent: 10 });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].title).toMatch(/High Temperature/i);
});

test("6. Normal temperature (30°C) and clear sky = no weather nudge, checks traffic", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 30 } });
  getTraffic.mockResolvedValue({ congestion_percent: 20, traffic_level: "light" });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("7. Heavy traffic (>50% congestion) triggers traffic nudge", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 30 } });
  getTraffic.mockResolvedValue({ congestion_percent: 55, traffic_level: "heavy" });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].title).toMatch(/Heavy Traffic/i);
});

test("8. Rain takes priority over traffic (only 1 nudge per cycle)", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 28 } });
  getTraffic.mockResolvedValue({ congestion_percent: 60, traffic_level: "heavy" });

  await evaluate(USER_ID, 12.97, 77.59);

  // Weather nudge fires and returns early — traffic is skipped
  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].metadata.trigger).toBe("weather");
});

test("9. Weather API failure falls through to traffic check", async () => {
  getWeatherContext.mockRejectedValue(new Error("API down"));
  getTraffic.mockResolvedValue({ congestion_percent: 60, traffic_level: "heavy" });

  await evaluate(USER_ID, 12.97, 77.59);

  // Weather failed (returns null), traffic check should still run
  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].title).toMatch(/Heavy Traffic/i);
});

test("10. Traffic API failure = no crash, no nudge", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 30 } });
  getTraffic.mockRejectedValue(new Error("Traffic API down"));

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("11. Both APIs fail = graceful no-op", async () => {
  getWeatherContext.mockRejectedValue(new Error("fail"));
  getTraffic.mockRejectedValue(new Error("fail"));

  // Should not throw
  await expect(evaluate(USER_ID, 12.97, 77.59)).resolves.toBeUndefined();
  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("12. Metadata includes trigger source and temperature", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Rain", temp: 27 } });
  getTraffic.mockResolvedValue({ congestion_percent: 10 });

  await evaluate(USER_ID, 12.97, 77.59);

  const meta = dispatchNudge.mock.calls[0][1].metadata;
  expect(meta.trigger).toBe("weather");
  expect(meta.condition).toBe("rain");
  expect(meta.temp).toBe(27);
});
