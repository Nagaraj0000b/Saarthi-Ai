/**
 * Earnings Optimization Nudge Evaluator — 12 Test Cases
 *
 * Tests platform switching logic, ML threshold comparison,
 * and edge cases.
 */

jest.mock("../../services/jobRecommendationService", () => ({
  recommendJobs: jest.fn(),
}));
jest.mock("../../services/nudgeDispatchService", () => ({
  dispatchNudge: jest.fn(),
}));
jest.mock("../../models/User", () => ({
  findById: jest.fn(),
}));

const { evaluate } = require("../../services/nudgeEvaluators/earningsNudgeEvaluator");
const { recommendJobs } = require("../../services/jobRecommendationService");
const { dispatchNudge } = require("../../services/nudgeDispatchService");
const User = require("../../models/User");

const USER_ID = "507f1f77bcf86cd799439011";

const mockUserLocation = () => {
  User.findById.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        lastKnownLocation: { lat: 12.97, lon: 77.59 },
      }),
    }),
  });
};

afterEach(() => jest.clearAllMocks());

test("1. Suggests switch when alternative is 20%+ better", async () => {
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "Zepto", isCompatible: true, predictedEarning: 250, reason: "Low traffic zone", finalScore: 250 },
      { job: "Swiggy", isCompatible: true, predictedEarning: 180, reason: "", finalScore: 180 },
    ],
  });

  await evaluate(USER_ID, "Swiggy", 180, 12.97, 77.59);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].type).toBe("earnings_optimization");
  expect(dispatchNudge.mock.calls[0][1].body).toMatch(/Zepto/);
});

test("2. No nudge when current platform is already best", async () => {
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "Swiggy", isCompatible: true, predictedEarning: 200, finalScore: 200 },
      { job: "Zomato", isCompatible: true, predictedEarning: 190, finalScore: 190 },
    ],
  });

  await evaluate(USER_ID, "Swiggy", 200, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("3. No nudge when improvement is below 20% threshold", async () => {
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "Zepto", isCompatible: true, predictedEarning: 210, finalScore: 210 },
      { job: "Swiggy", isCompatible: true, predictedEarning: 200, finalScore: 200 },
    ],
  });

  // Zepto 210 vs Swiggy 200 = only 5% better, below 20% threshold
  await evaluate(USER_ID, "Swiggy", 200, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("4. Skips incompatible jobs in comparison", async () => {
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "BluSmart", isCompatible: false, predictedEarning: 400, finalScore: 400 },
      { job: "Swiggy", isCompatible: true, predictedEarning: 200, finalScore: 200 },
      { job: "Zomato", isCompatible: true, predictedEarning: 195, finalScore: 195 },
    ],
  });

  // BluSmart is 100% better but incompatible, so ignored
  await evaluate(USER_ID, "Swiggy", 200, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("5. Falls back to stored location when lat/lon not provided", async () => {
  mockUserLocation();
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "Zepto", isCompatible: true, predictedEarning: 300, finalScore: 300 },
      { job: "Swiggy", isCompatible: true, predictedEarning: 180, finalScore: 180 },
    ],
  });

  await evaluate(USER_ID, "Swiggy", 180); // no lat/lon

  expect(User.findById).toHaveBeenCalledWith(USER_ID);
  expect(recommendJobs).toHaveBeenCalledWith(USER_ID, 12.97, 77.59);
  expect(dispatchNudge).toHaveBeenCalledTimes(1);
});

test("6. Skips when no location available at all", async () => {
  User.findById.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ lastKnownLocation: {} }),
    }),
  });

  await evaluate(USER_ID, "Swiggy", 200); // no lat/lon

  expect(recommendJobs).not.toHaveBeenCalled();
  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("7. Empty ranked jobs = no nudge", async () => {
  recommendJobs.mockResolvedValue({ rankedJobs: [] });

  await evaluate(USER_ID, "Swiggy", 200, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("8. Null ML response = no crash, no nudge", async () => {
  recommendJobs.mockResolvedValue(null);

  await evaluate(USER_ID, "Swiggy", 200, 12.97, 77.59);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("9. ML service failure = no crash, no nudge", async () => {
  recommendJobs.mockRejectedValue(new Error("ML engine down"));

  await expect(
    evaluate(USER_ID, "Swiggy", 200, 12.97, 77.59)
  ).resolves.toBeUndefined();
  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("10. Nudge body includes improvement percentage", async () => {
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "Blinkit", isCompatible: true, predictedEarning: 300, reason: "High demand zone", finalScore: 300 },
      { job: "Swiggy", isCompatible: true, predictedEarning: 200, finalScore: 200 },
    ],
  });

  await evaluate(USER_ID, "Swiggy", 200, 12.97, 77.59);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/₹300/);
  expect(body).toMatch(/₹200/);
});

test("11. Metadata includes current and suggested platforms", async () => {
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "Rapido", isCompatible: true, predictedEarning: 280, reason: "Less traffic", finalScore: 280 },
      { job: "Uber", isCompatible: true, predictedEarning: 200, finalScore: 200 },
    ],
  });

  await evaluate(USER_ID, "Uber", 200, 12.97, 77.59);

  const meta = dispatchNudge.mock.calls[0][1].metadata;
  expect(meta.currentPlatform).toBe("Uber");
  expect(meta.suggestedPlatform).toBe("Rapido");
  expect(meta.improvement).toBeGreaterThan(0);
});

test("12. Case-insensitive platform matching", async () => {
  recommendJobs.mockResolvedValue({
    rankedJobs: [
      { job: "Swiggy", isCompatible: true, predictedEarning: 200, finalScore: 200 },
      { job: "Zomato", isCompatible: true, predictedEarning: 190, finalScore: 190 },
    ],
  });

  // "swiggy" lowercase should match "Swiggy" in ranked jobs
  await evaluate(USER_ID, "swiggy", 200, 12.97, 77.59);

  // No alternative is 20%+ better than Swiggy, so no nudge
  expect(dispatchNudge).not.toHaveBeenCalled();
});
