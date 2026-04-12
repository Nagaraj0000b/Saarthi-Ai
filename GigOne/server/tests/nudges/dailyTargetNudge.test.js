/**
 * Daily Target Nudge Evaluator — 13 Test Cases
 *
 * Tests target hit detection, streak calculation, celebration messages,
 * and edge cases around earnings aggregation.
 */

jest.mock("../../models/EarningsEntry", () => ({
  find: jest.fn(),
}));
jest.mock("../../models/User", () => ({
  findById: jest.fn(),
}));
jest.mock("../../services/nudgeDispatchService", () => ({
  dispatchNudge: jest.fn(),
}));

const { evaluate } = require("../../services/nudgeEvaluators/dailyTargetNudgeEvaluator");
const EarningsEntry = require("../../models/EarningsEntry");
const User = require("../../models/User");
const { dispatchNudge } = require("../../services/nudgeDispatchService");

const USER_ID = "507f1f77bcf86cd799439011";

// Helper: mock chain for findById().select().lean()
const mockUser = (dailyTarget) => {
  User.findById.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ dailyTarget }),
    }),
  });
};

// Helper: mock today's earnings entries
const mockTodayEarnings = (amounts) => {
  const entries = amounts.map((amount) => ({ amount, date: new Date() }));
  EarningsEntry.find.mockImplementation((query) => {
    return {
      lean: jest.fn().mockImplementation(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        if (query && query.date && query.date.$gte && query.date.$gte.getTime() === today.getTime()) {
           return Promise.resolve(entries);
        }
        return Promise.resolve([]);
      })
    };
  });
};

afterEach(() => jest.clearAllMocks());

test("1. Target hit triggers celebration nudge", async () => {
  mockUser(800);
  mockTodayEarnings([500, 350]); // Total: 850 >= 800

  await evaluate(USER_ID);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].type).toBe("daily_target");
  expect(dispatchNudge.mock.calls[0][1].priority).toBe("high");
});

test("2. Below target = no nudge", async () => {
  mockUser(1000);
  mockTodayEarnings([300, 200]); // Total: 500 < 1000

  await evaluate(USER_ID);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("3. Exactly hits target = nudge fires", async () => {
  mockUser(500);
  mockTodayEarnings([500]); // Total: 500 == 500

  await evaluate(USER_ID);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
});

test("4. Surplus amount appears in nudge body", async () => {
  mockUser(800);
  mockTodayEarnings([600, 350]); // Total: 950, surplus: 150

  await evaluate(USER_ID);

  const body = dispatchNudge.mock.calls[0][1].body;
  expect(body).toMatch(/₹950/);
});

test("5. Default target (1000) used when user has no custom target", async () => {
  User.findById.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null), // User not found
    }),
  });
  mockTodayEarnings([600, 500]); // Total: 1100 >= 1000 default

  await evaluate(USER_ID);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
});

test("6. Zero earnings today = no nudge", async () => {
  mockUser(800);
  mockTodayEarnings([]); // No entries

  await evaluate(USER_ID);

  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("7. Single large earning hits target", async () => {
  mockUser(500);
  mockTodayEarnings([750]); // Single entry exceeds target

  await evaluate(USER_ID);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].body).toMatch(/₹750/);
});

test("8. Many small entries summed correctly", async () => {
  mockUser(500);
  mockTodayEarnings([100, 80, 120, 90, 60, 70]); // Total: 520

  await evaluate(USER_ID);

  expect(dispatchNudge).toHaveBeenCalledTimes(1);
  expect(dispatchNudge.mock.calls[0][1].body).toMatch(/₹520/);
});

test("9. Metadata includes totals and surplus", async () => {
  mockUser(800);
  mockTodayEarnings([500, 400]); // 900 total

  await evaluate(USER_ID);

  const meta = dispatchNudge.mock.calls[0][1].metadata;
  expect(meta.todayTotal).toBe(900);
  expect(meta.target).toBe(800);
  expect(meta.surplus).toBe(100);
  expect(meta.entriesCount).toBe(2);
});

test("10. Nudge data includes screen deep-link", async () => {
  mockUser(500);
  mockTodayEarnings([600]);

  await evaluate(USER_ID);

  const data = dispatchNudge.mock.calls[0][1].data;
  expect(data.screen).toBe("earnings");
  expect(data.todayTotal).toBe(600);
  expect(data.target).toBe(500);
});

test("11. DB error doesn't crash the evaluator", async () => {
  User.findById.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error("DB down")),
    }),
  });

  await expect(evaluate(USER_ID)).resolves.toBeUndefined();
  expect(dispatchNudge).not.toHaveBeenCalled();
});

test("12. Earnings with null/undefined amounts are treated as 0", async () => {
  mockUser(500);
  // Entries with weird amounts
  EarningsEntry.find.mockImplementation((query) => {
    return {
      lean: jest.fn().mockImplementation(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        if (query && query.date && query.date.$gte && query.date.$gte.getTime() === today.getTime()) {
           return Promise.resolve([
             { amount: 300 },
             { amount: null },
             { amount: undefined },
             { amount: 250 },
           ]);
        }
        return Promise.resolve([]);
      })
    };
  });

  await evaluate(USER_ID);

  // 300 + 0 + 0 + 250 = 550 >= 500
  expect(dispatchNudge).toHaveBeenCalledTimes(1);
});

test("13. Very high target (10000) not hit with normal earnings", async () => {
  mockUser(10000);
  mockTodayEarnings([500, 400, 300]); // 1200 < 10000

  await evaluate(USER_ID);

  expect(dispatchNudge).not.toHaveBeenCalled();
});
