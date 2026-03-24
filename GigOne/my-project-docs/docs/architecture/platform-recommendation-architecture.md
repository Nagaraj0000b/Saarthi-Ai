# Platform Recommendation Architecture

This document is the implementation blueprint for building the multi-platform recommendation module properly.

This is the version you should defend academically:

- time horizon: `next shift`
- output: `ranked list of platforms`
- model type: `earning estimate + context adjustment + wellbeing-aware safety layer`

## 1. Module Goal

The module should answer:

> Which platform is most suitable for the worker's next shift, given historical earning quality, current context, and short-term wellbeing state?

This module should not:

- promise exact future earnings
- recommend for an entire day as if conditions are constant
- hide every factor inside one unexplained score

## 2. Why This Scope Is Correct

### Why not `whole day`

- weather and traffic change during the day
- the current data model does not support full-day dynamic forecasting well

### Why not `next 2 hours`

- the current backend does not store detailed per-slot demand history
- hourly micro-optimization would be hard to justify with the current data

### Why `next shift`

- it fits the data you already collect
- it is realistic for workers
- it is easier to defend in review

## 3. Final Architecture

The recommendation flow should be split into four parts:

1. `Candidate platform discovery`
2. `Baseline earning estimation`
3. `Context adjustment`
4. `Wellbeing-aware safety adjustment`

Then:

5. `Confidence scoring`
6. `Ranking`
7. `Explanation generation`

## 4. Data Sources in Current Project

### Historical earnings

Use:

- `server/models/EarningsEntry.js`

Fields available:

- `platform`
- `amount`
- `hours`
- `date`

### Workload history

Use:

- `server/models/WorkLog.js`
- `EarningsEntry.hours` as fallback

### Context

Use:

- `server/services/weatherService.js`
- `server/services/trafficService.js`

### Wellbeing

Use:

- output of the new sentiment module
- output of the new wellbeing-risk module

## 5. Important Modeling Decision

Do **not** include live surge bonus as a core variable unless you can measure it reliably.

### Why

- no official backend API is available
- guessed surge values would weaken validity
- the professor can easily challenge an unmeasured variable

### What to do instead

Let some surge-like effects be indirectly reflected through:

- recent earnings history
- time of day
- weather
- traffic
- day of week

## 6. Output Schema

Return a ranked list, not only one hidden number.

| Field | Meaning |
| --- | --- |
| `recommendedPlatform` | top recommendation |
| `rankedPlatforms` | ordered platform list |
| `finalScore` | final combined score |
| `baseEarningScore` | baseline earnings estimate |
| `contextModifier` | weather / traffic / time effect |
| `wellbeingModifier` | safety penalty or filter |
| `confidence` | reliability of this platform score |
| `reason` | explanation for the result |

## 7. Recommended File Structure

### New files

- `server/services/platformBaselineService.js`
- `server/services/contextAdjustmentService.js`
- `server/services/wellbeingAdjustmentService.js`
- `server/services/platformRecommendationService.js`
- `server/controllers/recommendationController.js`
- `server/routes/recommendations.js`

### Existing files used

- `server/models/EarningsEntry.js`
- `server/models/WorkLog.js`
- `server/services/weatherService.js`
- `server/services/trafficService.js`
- new `wellbeingRiskService.js`

## 8. Candidate Platform Discovery

### Rule

Candidate platforms should come from:

1. the user's recent platform history
2. fallback platform list if history is sparse

### Default fallback list

- `Uber`
- `Swiggy`
- `Rapido`
- `Other`

## 9. Baseline Earnings Estimator

This is the foundation of the recommendation.

### Recommended baseline

Estimate recent hourly earning quality per platform.

### Basic calculation

For each past earning entry:

```text
hourlyRate = amount / hours
```

Then compute a recency-weighted platform average.

### Why hourly rate instead of raw earnings

Raw daily earnings can be misleading if shift lengths differ. Hourly earnings are a better quality measure for recommendation.

### Sparse-data fallback

If user-specific platform data is sparse, blend it with an aggregate fallback baseline.

### Practical fallback hierarchy

1. user-platform average
2. user overall average
3. app-wide platform average
4. fixed seed defaults if database is too small

### Why this matters

Without shrinkage/fallback:

- one lucky shift can distort the score
- new users will receive unstable recommendations

## 10. Context Adjustment Layer

This layer should adjust, not dominate, the baseline.

### Inputs

- weather condition
- traffic level
- optionally time of day and day of week

### Design rule

Context effects should be platform-specific and bounded.

### Example logic

- rain may improve cab-friendly demand
- heavy traffic may penalize certain mobility or delivery patterns
- extreme heat may influence customer behavior and worker strain

### Important rule

The context modifier must stay moderate. It should not completely override the earning baseline unless the situation is extreme.

## 11. Wellbeing-Aware Safety Layer

This layer uses the wellbeing-risk output.

### Rule

If the worker's wellbeing risk is higher, high-strain platform options should become less suitable.

### Suggested behavior

- `low risk`
  - no significant penalty
- `moderate risk`
  - apply a moderate penalty to high-strain options
- `high risk`
  - strong penalty or filtering of the most stressful options

### Why this should be separate

Profit and worker safety are different objectives. Keeping them separate makes the system easier to justify and audit.

## 12. Confidence Layer

Do not return recommendations as if they are equally reliable.

### Confidence should depend on

- number of user records for the platform
- recency of records
- whether fallback baseline had to be used

### Behavior

- more data -> higher confidence
- mostly fallback -> lower confidence

This is especially important for new users.

## 13. Main Recommendation Service

### `platformRecommendationService.js`

This service should:

1. discover candidate platforms
2. compute baseline earning quality for each
3. compute context adjustment for each
4. compute wellbeing adjustment for each
5. compute confidence
6. compute final score
7. build a reason string
8. rank all candidates

## 14. Controller and Route Design

### Route

Create:

- `GET /api/recommendations/next-shift`

### Request input

- authenticated user
- location / lat / lon
- optionally time context if needed

### Response output

- ranked platform list
- top recommendation
- breakdown fields

### Controller responsibilities

`recommendationController.js` should:

1. read user ID
2. fetch context
3. call `platformRecommendationService`
4. return final ranked result

## 15. Build Steps in Exact Order

### Step 1

Build the baseline first.

Create `platformBaselineService.js` and implement:

- candidate platform discovery
- hourly rate computation
- recency weighting
- sparse-data fallback blending

### Step 2

Create `contextAdjustmentService.js`.

Implement:

- weather-to-platform rules
- traffic-to-platform rules
- bounded platform modifiers

### Step 3

Finish the wellbeing-risk module first, then create `wellbeingAdjustmentService.js`.

Implement:

- mapping from `low/moderate/high` risk to platform penalties
- optional platform stress-profile mapping

### Step 4

Create `platformRecommendationService.js`.

Implement the orchestration layer that combines:

- baseline
- context adjustment
- wellbeing adjustment
- confidence
- ranking

### Step 5

Create `recommendationController.js` and `routes/recommendations.js`.

### Step 6

Add frontend integration later:

- new dashboard card
- recommendation breakdown view

## 16. Suggested Algorithm

```text
INPUT:
  userId
  current weather
  current traffic
  current wellbeing risk

OUTPUT:
  ranked list of platforms for the next shift

ALGORITHM:
  1. get candidate platforms
  2. for each platform p:
       a. compute user historical hourly earning estimate
       b. if data is sparse, blend with fallback platform baseline
       c. compute bounded context adjustment
       d. compute wellbeing penalty
       e. compute confidence
       f. compute final score
       g. build explanation breakdown
  3. sort platforms by final score descending
  4. return ranked list and top recommendation
```

## 17. Suggested Internal Breakdown

For each platform, keep an explanation object like:

```js
{
  platform: "Uber",
  baseEarningScore: 185,
  contextModifier: 1.08,
  wellbeingModifier: 0.92,
  confidence: 0.73,
  finalScore: 183.8,
  reason: "Strong recent hourly earnings, favorable weather context, slight wellbeing penalty."
}
```

This makes viva defense and debugging much easier.

## 18. Testing Strategy

### Unit tests

Test:

- hourly-rate baseline computation
- sparse-data fallback logic
- context modifiers stay bounded
- wellbeing penalties behave correctly

### Integration tests

Test scenarios like:

- strong Uber history, low risk, normal traffic
- strong delivery history, severe traffic
- high wellbeing risk after heavy recent work
- new user with almost no history

### Validation against baseline

Always compare the advanced design to:

- simple highest-average-hourly-earnings recommendation

## 19. UI Behavior

The UI should show:

- top recommended platform
- ranked alternatives
- explanation
- confidence

Do not show only:

- one mysterious final number

## 20. Final Implementation Rule

This module should be built as:

`baseline earnings estimate -> context adjustment -> wellbeing safety layer -> ranking`

That is the cleanest architecture for your current data, and the easiest version to justify academically.

