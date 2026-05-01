/**
 * Surge Detection Service — 15 Test Cases
 *
 * Tests the heuristic surge scoring engine with various
 * weather, traffic, time, and day combinations.
 * Pure logic — no mocks needed.
 */

const { calculateSurge } = require("../../services/surgeDetectionService");

// ── INDIVIDUAL FACTOR TESTS ─────────────────────────────────────────────────

test("1. Rain + dinner rush = high surge (score ≥ 50)", () => {
  const result = calculateSurge(
    { condition: "Rain", temp: 28 },
    { congestion_percent: 20 },
    19, // 7 PM
    3   // Wednesday
  );
  expect(result.isSurge).toBe(true);
  expect(result.surgeScore).toBeGreaterThanOrEqual(50);
  expect(result.reason).toMatch(/Rain/i);
});

test("2. Thunderstorm alone = surge (score ≥ 30)", () => {
  const result = calculateSurge(
    { condition: "Thunderstorm", temp: 25 },
    { congestion_percent: 10 },
    15, // 3 PM (non-peak)
    2   // Tuesday
  );
  expect(result.isSurge).toBe(true);
  expect(result.surgeScore).toBeGreaterThanOrEqual(30);
});

test("3. Clear weather + off-peak = no surge", () => {
  const result = calculateSurge(
    { condition: "Clear", temp: 30 },
    { congestion_percent: 15 },
    15, // 3 PM
    2   // Tuesday
  );
  expect(result.isSurge).toBe(false);
  expect(result.surgeScore).toBeLessThan(25);
});

test("4. Lunch rush alone = 20 pts (below threshold)", () => {
  const result = calculateSurge(
    { condition: "Clear", temp: 32 },
    { congestion_percent: 10 },
    12, // Noon lunch rush
    1   // Monday
  );
  expect(result.surgeScore).toBe(20);
  expect(result.isSurge).toBe(false);
});

test("5. Dinner rush + weekend evening = surge (20+15=35)", () => {
  const result = calculateSurge(
    { condition: "Clear", temp: 28 },
    { congestion_percent: 10 },
    20, // 8 PM dinner rush
    6   // Saturday
  );
  expect(result.isSurge).toBe(true);
  expect(result.surgeScore).toBeGreaterThanOrEqual(35);
});

test("6. Heavy congestion alone = 15 pts (below threshold)", () => {
  const result = calculateSurge(
    { condition: "Clear", temp: 28 },
    { congestion_percent: 55 },
    15, // 3 PM off-peak
    3   // Wednesday
  );
  expect(result.surgeScore).toBe(15);
  expect(result.isSurge).toBe(false);
});

test("7. Drizzle + lunch rush = surge (15+20=35)", () => {
  const result = calculateSurge(
    { condition: "Drizzle", temp: 26 },
    { congestion_percent: 10 },
    13, // 1 PM lunch
    4   // Thursday
  );
  expect(result.isSurge).toBe(true);
  expect(result.surgeScore).toBeGreaterThanOrEqual(35);
});

test("8. Extreme heat adds 10 pts", () => {
  const result = calculateSurge(
    { condition: "Clear", temp: 44 },
    { congestion_percent: 10 },
    12, // Lunch rush
    1   // Monday
  );
  // lunch(20) + heat(10) = 30
  expect(result.surgeScore).toBeGreaterThanOrEqual(30);
  expect(result.isSurge).toBe(true);
});

test("9. Late night adds 10 pts", () => {
  const result = calculateSurge(
    { condition: "Clear", temp: 25 },
    { congestion_percent: 10 },
    23, // 11 PM
    3   // Wednesday
  );
  expect(result.surgeScore).toBe(10);
  expect(result.isSurge).toBe(false);
});

// ── COMBINATION TESTS ───────────────────────────────────────────────────────

test("10. Perfect storm: Rain + dinner rush + weekend + congestion = max surge", () => {
  const result = calculateSurge(
    { condition: "Rain", temp: 28 },
    { congestion_percent: 60 },
    19, // 7 PM dinner
    6   // Saturday
  );
  // rain(30) + dinner(20) + weekend(15) + congestion(15) = 80
  expect(result.surgeScore).toBeGreaterThanOrEqual(80);
  expect(result.isSurge).toBe(true);
  expect(result.estimatedWindow).toBe("60-90 min");
});

test("11. Friday dinner rush = surge (20+10=30)", () => {
  const result = calculateSurge(
    { condition: "Clear", temp: 30 },
    { congestion_percent: 10 },
    19, // Dinner
    5   // Friday
  );
  // dinner(20) + friday(10) = 30
  expect(result.surgeScore).toBeGreaterThanOrEqual(30);
  expect(result.isSurge).toBe(true);
});

test("12. Sunday late night + rain = surge (30+10+15=55)", () => {
  const result = calculateSurge(
    { condition: "Rain", temp: 22 },
    { congestion_percent: 10 },
    23, // 11 PM
    0   // Sunday
  );
  expect(result.isSurge).toBe(true);
  expect(result.surgeScore).toBeGreaterThanOrEqual(40);
});

// ── PLATFORM RECOMMENDATION TESTS ───────────────────────────────────────────

test("13. Rain + meal time recommends instant delivery", () => {
  const result = calculateSurge(
    { condition: "Rain", temp: 28 },
    { congestion_percent: 20 },
    12, // Lunch
    3
  );
  expect(result.bestPlatformType).toMatch(/Instant Delivery/i);
});

test("14. Rain + non-meal time recommends ride hailing", () => {
  const result = calculateSurge(
    { condition: "Rain", temp: 28 },
    { congestion_percent: 20 },
    15, // 3 PM non-peak
    3
  );
  expect(result.bestPlatformType).toMatch(/Ride Hailing/i);
});

test("15. Null weather/traffic doesn't crash", () => {
  const result = calculateSurge(null, null, 12, 3);
  expect(result).toBeDefined();
  expect(result.surgeScore).toBeGreaterThanOrEqual(0);
  expect(result.isSurge).toBeDefined();
});
