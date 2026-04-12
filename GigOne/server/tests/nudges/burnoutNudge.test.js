/**
 * Burnout Nudge Evaluator — 12 Test Cases
 *
 * Tests wellbeing risk detection, consecutive work days,
 * heavy shift detection, and edge cases.
 */

jest.mock("../../services/wellbeingRiskService", () => ({
  evaluateWellbeingRisk: jest.fn(),
}));
jest.mock("../../services/workloadAggregationService", () => ({
  aggregateWorkload: jest.fn(),
}));
jest.mock("../../services/nudgeDispatchService", () => ({
  dispatchNudge: jest.fn(),
}));

const { evaluate } = require("../../services/nudgeEvaluators/burnoutNudgeEvaluator");
const { evaluateWellbeingRisk } = require("../../services/wellbeingRiskService");
const { aggregateWorkload } = require("../../services/workloadAggregationService");
const { dispatchNudge } = require("../../services/nudgeDispatchService");

const USER_ID = "507f1f77bcf86cd799439011";

afterEach(() => jest.clearAllMocks());

test("1. High risk level triggers burnout nudge with HIGH priority", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "high", riskScore: 82,
    emotionScore: 30, workloadScore: 35, recoveryScore: 17,
    reasons: ["Worked 6 consecutive days with high hours"],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 6, hoursToday: 8 });

  await evaluate(USER_ID);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].type).toBe("burnout");
  expect(dispatchNudge.mock.calls[0][1].priority).toBe("high");
});

test("2. High risk nudge contains risk score in body text", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "high", riskScore: 75, reasons: ["Overworked"],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 5, hoursToday: 9 });

  await evaluate(USER_ID);

  expect(dispatchNudge.mock.calls[0][1].body).toMatch(/75\/100/);
});

test("3. Moderate risk + 5 consecutive work days triggers suggestion nudge", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "moderate", riskScore: 55, reasons: [],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 5, hoursToday: 7 });

  await evaluate(USER_ID);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].body).toMatch(/5 days/);
});

test("4. Moderate risk + only 3 consecutive days = no nudge (threshold is >4)", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "moderate", riskScore: 45, reasons: [],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 3, hoursToday: 6 });

  await evaluate(USER_ID);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("5. Low risk + short workday = no nudge", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "low", riskScore: 20, reasons: [],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 2, hoursToday: 5 });

  await evaluate(USER_ID);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("6. Low risk but >10 hours today triggers long day nudge", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "low", riskScore: 25, reasons: [],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 1, hoursToday: 11 });

  await evaluate(USER_ID);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].body).toMatch(/11 hours/);
});

test("7. Exactly 10 hours = no nudge (threshold is >10)", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "low", riskScore: 30, reasons: [],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 2, hoursToday: 10 });

  await evaluate(USER_ID);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("8. High risk takes priority over long day (only 1 nudge)", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "high", riskScore: 85, reasons: ["Severe burnout"],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 7, hoursToday: 14 });

  await evaluate(USER_ID);

  // Only the high-risk nudge should fire, not the long-day one
  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].priority).toBe("high");
});

test("9. Metadata includes all risk components", async () => {
  evaluateWellbeingRisk.mockResolvedValue({
    riskLevel: "high", riskScore: 78,
    emotionScore: 25, workloadScore: 30, recoveryScore: 23,
    reasons: ["Exhaustion detected"],
  });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 4, hoursToday: 8 });

  await evaluate(USER_ID);

  const meta = dispatchNudge.mock.calls[0][1].metadata;
  expect(meta.riskLevel).toBe("high");
  expect(meta.riskScore).toBe(78);
  expect(meta.emotionScore).toBe(25);
  expect(meta.workloadScore).toBe(30);
  expect(meta.recoveryScore).toBe(23);
});

test("10. Wellbeing service failure = no crash, no nudge", async () => {
  evaluateWellbeingRisk.mockRejectedValue(new Error("Service unavailable"));
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 2, hoursToday: 5 });

  await expect(evaluate(USER_ID)).resolves.toBeUndefined();
  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("11. Workload aggregation failure = no crash, no nudge", async () => {
  evaluateWellbeingRisk.mockResolvedValue({ riskLevel: "low", riskScore: 20 });
  aggregateWorkload.mockRejectedValue(new Error("Aggregation failed"));

  await expect(evaluate(USER_ID)).resolves.toBeUndefined();
  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("12. DailyMood parameter is forwarded to evaluateWellbeingRisk", async () => {
  evaluateWellbeingRisk.mockResolvedValue({ riskLevel: "low", riskScore: 15 });
  aggregateWorkload.mockResolvedValue({ consecutiveWorkDays: 1, hoursToday: 3 });

  const mood = { moodLabel: "stressed", moodScore: -3 };
  await evaluate(USER_ID, mood);

  expect(evaluateWellbeingRisk).toHaveBeenCalledWith(USER_ID, mood);
});
