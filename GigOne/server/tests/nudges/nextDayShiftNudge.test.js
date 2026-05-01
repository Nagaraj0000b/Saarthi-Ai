/**
 * Next Day Shift Nudge Evaluator — 12 Test Cases
 *
 * Tests tomorrow's shift plan generation: weather forecast,
 * ML platform recommendations, burnout advice, and composition.
 */

jest.mock("../../services/weatherService", () => ({
  getWeatherContext: jest.fn(),
}));
jest.mock("../../services/jobRecommendationService", () => ({
  recommendJobs: jest.fn(),
}));
jest.mock("../../services/wellbeingRiskService", () => ({
  evaluateWellbeingRisk: jest.fn(),
}));
jest.mock("../../services/nudgeDispatchService", () => ({
  dispatchNudge: jest.fn(),
}));

const { evaluate } = require("../../services/nudgeEvaluators/nextDayShiftNudgeEvaluator");
const { getWeatherContext } = require("../../services/weatherService");
const { recommendJobs } = require("../../services/jobRecommendationService");
const { evaluateWellbeingRisk } = require("../../services/wellbeingRiskService");
const { dispatchNudge } = require("../../services/nudgeDispatchService");

const USER_ID = "507f1f77bcf86cd799439011";

afterEach(() => jest.clearAllMocks());

const setupDefaults = () => {
  getWeatherContext.mockResolvedValue({
    current: { condition: "Clear", temp: 30, description: "Clear sky" },
    nextShift: { condition: "Clear", temp: 32, description: "Sunny" },
  });
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "Swiggy", isCompatible: true, predictedEarning: 210, finalScore: 210 },
    ],
    recommendedJob: "Swiggy",
  });
  evaluateWellbeingRisk.mockResolvedValue({ riskLevel: "low", riskScore: 15 });
};

test("1. Sends next_day_shift nudge with full plan", async () => {
  setupDefaults();

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].type).toBe("next_day_shift");
});

test("2. Nudge body includes weather forecast", async () => {
  setupDefaults();

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/32°C/);
});

test("3. Nudge body includes best platform recommendation", async () => {
  setupDefaults();

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/Swiggy/);
  expect(body).toMatch(/₹210/);
});

test("4. High burnout risk includes strong rest advice", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 30 } });
  recommendJobs.mockResolvedValue({ rankedJobs: [] });
  evaluateWellbeingRisk.mockResolvedValue({ riskLevel: "high", riskScore: 80 });

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/rest day/i);
});

test("5. Moderate burnout risk includes lighter shift advice", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 30 } });
  recommendJobs.mockResolvedValue({ rankedJobs: [] });
  evaluateWellbeingRisk.mockResolvedValue({ riskLevel: "moderate", riskScore: 50 });

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/starting late|shorter shift/i);
});

test("6. Low burnout shows positive message", async () => {
  setupDefaults();

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/good shape/i);
});

test("7. Rain forecast includes rain gear reminder", async () => {
  getWeatherContext.mockResolvedValue({
    current: { condition: "Clear", temp: 30 },
    nextShift: { condition: "Rain", temp: 26, description: "Rainy" },
  });
  recommendJobs.mockResolvedValue({ rankedJobs: [] });
  evaluateWellbeingRisk.mockResolvedValue({ riskLevel: "low" });

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/rain gear/i);
});

test("8. Nudge expires in 14 hours", async () => {
  setupDefaults();

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge.mock.calls[0][1].expiresInMs).toBe(14 * 60 * 60 * 1000);
});

test("9. Weather API failure = nudge still sent (without weather)", async () => {
  getWeatherContext.mockRejectedValue(new Error("API timeout"));
  recommendJobs.mockResolvedValue({
    rankedJobs: [{ job: "Uber", isCompatible: true, predictedEarning: 180, finalScore: 180 }],
  });
  evaluateWellbeingRisk.mockResolvedValue({ riskLevel: "low" });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/Tomorrow/);
});

test("10. ML service failure = nudge still sent (without platform)", async () => {
  getWeatherContext.mockResolvedValue({ current: { condition: "Clear", temp: 30 } });
  recommendJobs.mockRejectedValue(new Error("ML down"));
  evaluateWellbeingRisk.mockResolvedValue({ riskLevel: "low" });

  await evaluate(USER_ID, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
});

test("11. All services fail = still sends basic nudge", async () => {
  getWeatherContext.mockRejectedValue(new Error("fail"));
  recommendJobs.mockRejectedValue(new Error("fail"));
  evaluateWellbeingRisk.mockRejectedValue(new Error("fail"));

  await evaluate(USER_ID, 12.97, 77.59);

  // Should still dispatch a basic plan nudge
  expect(dispatchNudge).toHaveBeenCalledTimes(1);
});

test("12. Nudge body ends with rest message", async () => {
  setupDefaults();

  await evaluate(USER_ID, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/Rest well tonight/i);
});
