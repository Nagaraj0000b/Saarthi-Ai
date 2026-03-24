# Wellbeing Risk Architecture

This document is the implementation blueprint for rebuilding the current burnout logic into a proper wellbeing-risk module.

Use the term `wellbeing risk` or `stress-risk` in the report. Do not claim clinical diagnosis.

## 1. Module Goal

The module should answer one question:

> Based on recent mood, workload, and recovery signals, is the worker at low, moderate, or high short-term wellbeing risk?

This module is meant for:

- rest nudges
- safer platform recommendations
- dashboard monitoring

This module is **not** meant for:

- clinical diagnosis
- medical decision-making
- claiming that the app detects burnout with certainty

## 2. Why the Current Logic Is Not Enough

The current `burnoutService.js` uses mainly:

- moving average of recent sentiment scores
- three consecutive negative days

That is a useful prototype signal, but too narrow because:

- it depends heavily on mood only
- it ignores actual workload intensity
- it ignores recovery gaps
- it assumes the current sentiment input is already clean, which it is not

## 3. Final Architecture

The wellbeing-risk module should combine three concept groups:

1. `Emotional strain`
2. `Workload intensity`
3. `Recovery deficiency`

Then it should map the result into:

- `low`
- `moderate`
- `high`

and produce:

- a numeric internal risk score
- top reasons
- recommended action

## 4. Input Signals

### 4.1 Emotional strain

Use only validated mood outputs from the new sentiment module.

Recommended features:

- `dailyMoodScore`
- `negativeMoodStreak`
- `moodTrend`
- `last3ValidMoodAverage`

### 4.2 Workload intensity

Use data from:

- `WorkLog`
- `EarningsEntry`

Recommended features:

- `hoursWorkedToday`
- `hoursWorkedLast3Days`
- `heavyShiftCountLast7Days`
- `consecutiveWorkDays`

### 4.3 Recovery deficiency

Recommended features:

- `restDaysLast7`
- `daysSinceLastRest`
- `recentLowWorkGap`

## 5. Practical Data Rule

You need one canonical workload source.

### Recommended choice

Use this priority:

1. `WorkLog` if a valid entry exists for that day
2. otherwise `EarningsEntry.hours`

### Why

The current codebase stores hours in both work and earnings-related collections. A single aggregation rule avoids double counting.

## 6. Output Schema

The module should return:

| Field | Meaning |
| --- | --- |
| `riskLevel` | `low`, `moderate`, or `high` |
| `riskScore` | internal continuous score |
| `emotionScore` | concept-level sub-score |
| `workloadScore` | concept-level sub-score |
| `recoveryScore` | concept-level sub-score |
| `reasons` | top drivers of current risk |
| `recommendedAction` | `normal`, `take it easy`, `suggest rest` |
| `isReliable` | whether there was enough recent data |

## 7. Recommended File Structure

### New or updated files

- `server/services/wellbeingRiskService.js`
  - main scoring logic
- `server/services/workloadAggregationService.js`
  - computes hours, streaks, rest days
- `server/models/Conversation.js`
  - replace or extend `burnoutStatus` into richer `wellbeingRisk`
- `server/controllers/chatController.js`
  - compute wellbeing risk when a check-in reaches `done`

### Optional future file

- `server/models/DailyWorkerState.js`
  - not required for V1
  - useful later if you want one clean daily snapshot collection

## 8. Recommended Data Model Changes

### 8.1 Update `Conversation`

Instead of relying only on `burnoutStatus`, add a richer object:

```js
wellbeingRisk: {
  riskLevel: String,
  riskScore: Number,
  emotionScore: Number,
  workloadScore: Number,
  recoveryScore: Number,
  reasons: [String],
  recommendedAction: String,
  isReliable: Boolean,
}
```

### 8.2 Backward compatibility

If you still need `burnoutStatus` for old UI code, either:

- keep both temporarily, or
- map `wellbeingRisk` into the old shape during response formatting

## 9. Core Service Design

### 9.1 `workloadAggregationService.js`

This service should gather all recent work-related features.

### Responsibilities

1. fetch `WorkLog` records in the lookback window
2. fetch `EarningsEntry` records if needed for missing days
3. build a day-level summary
4. calculate:
   - hours today
   - hours last 3 days
   - consecutive workdays
   - rest days last 7 days
   - heavy shift count

### Why this file should exist

Without a dedicated aggregation layer, workload logic will get duplicated inside controllers and risk scoring code.

### 9.2 `wellbeingRiskService.js`

This service should:

1. read recent valid mood signals
2. read workload features from `workloadAggregationService`
3. compute concept sub-scores
4. combine them into overall risk
5. map the score to `low / moderate / high`
6. generate reasons and recommended action

## 10. Concept Score Design

Do not jump to the final formula first. Build concept scores.

### 10.1 Emotional strain score

Inputs:

- recent average mood
- negative mood streak
- downward mood trend

Expected behavior:

- lower mood increases strain
- repeated negative days increase strain
- a downward trend increases strain

### 10.2 Workload intensity score

Inputs:

- hours today
- hours last 3 days
- heavy shift count
- consecutive workdays

Expected behavior:

- longer hours increase strain
- several heavy days increase strain
- more consecutive days increase strain

### 10.3 Recovery deficiency score

Inputs:

- rest days last 7
- days since last rest

Expected behavior:

- fewer rest days increases deficiency
- longer uninterrupted work streaks increase deficiency

## 11. Risk Mapping

After combining the concept scores, map them into categories.

### Recommended output behavior

- `low`
  - normal recommendation behavior
- `moderate`
  - cautionary suggestions
  - reduce weight of high-strain platform options
- `high`
  - strong caution
  - suggest rest
  - penalize or filter high-strain options

## 12. Build Steps in Exact Order

### Step 1

Finish the new sentiment module first.

Reason:

The wellbeing module depends on a clean daily mood signal.

### Step 2

Create `server/services/workloadAggregationService.js`.

Implement:

- date-window fetch
- per-day hours summary
- workday streak computation
- rest-day count

### Step 3

Create `server/services/wellbeingRiskService.js`.

Implement:

- feature loading
- concept score calculators
- overall score builder
- risk level mapping
- reason generation

### Step 4

Update `Conversation` schema to include `wellbeingRisk`.

### Step 5

Update `chatController.js`.

When conversation moves to `done`:

1. load `dailyMood`
2. aggregate workload history
3. compute `wellbeingRisk`
4. save it into the conversation

### Step 6

Update `/api/chat/burnout` endpoint.

Either:

- rename it later to `/wellbeing`

or:

- keep the old route but return the new structure

### Step 7

Update frontend views to read `wellbeingRisk` instead of assuming old burnout fields.

## 13. Suggested Pseudocode

```text
dailyMood = getCurrentConversationDailyMood()
workloadFeatures = aggregateWorkload(userId, lookbackWindow)
moodFeatures = getRecentValidMoodFeatures(userId, lookbackWindow)

emotionScore = computeEmotionScore(moodFeatures)
workloadScore = computeWorkloadScore(workloadFeatures)
recoveryScore = computeRecoveryScore(workloadFeatures)

riskScore = combineConceptScores(emotionScore, workloadScore, recoveryScore)
riskLevel = mapRiskLevel(riskScore)
reasons = buildReasonList(...)
recommendedAction = mapAction(riskLevel)

save wellbeingRisk
```

## 14. Reliability Rules

You must explicitly handle sparse data.

### If mood data is sparse

- lower reliability
- do not overclaim risk certainty

### If workload history is sparse

- compute with what exists
- mark `isReliable = false` if minimum history is missing

### Final rule

The module should still produce a result when possible, but must expose whether the result is reliable.

## 15. Validation Strategy

### 15.1 Scenario validation

Create realistic cases:

- low mood + long shifts + no rest -> high risk
- neutral mood + one long day + recent rest -> moderate or low
- positive mood + moderate work + recent rest -> low risk

### 15.2 Sensitivity validation

Change one factor at a time:

- increase hours only
- worsen mood only
- remove rest days only

Risk should move in the expected direction.

### 15.3 Baseline comparison

Compare against the current simple mood-only rule.

Goal:

- show that the new design is more behaviorally sensible
- show that it does not overreact to one single bad day

## 16. UI / Product Behavior

The UI should not just show `high risk`.

It should show:

- risk level
- short explanation
- action suggestion

Example:

- `High wellbeing risk`
- `Reason: low mood for 3 days and long recent work streak`
- `Action: suggest a lighter shift or a rest day`

## 17. Final Implementation Rule

The wellbeing-risk module must combine:

- one clean daily mood signal
- recent workload intensity
- recent recovery pattern

That is the architecture that makes it much more defensible than the current burnout prototype.

