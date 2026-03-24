# Platform Recommendation Design

This document turns the general recommendation framework into a concrete design for this project.

It fixes three decisions up front:

- time horizon: `next shift`
- output: `ranked list of platforms`
- model family: `earnings prediction + context adjustment + safety layer`

## 1. Final Problem Statement

Use this as the project problem statement:

> The platform recommendation module ranks available gig platforms for the worker's next shift using recent earning history, current external context, and short-term wellbeing state. The system returns a ranked list with one primary recommendation and a short explanation of the main factors behind that ranking.

### Why this is the right scope

- `next shift` is easier to defend than `whole day` because traffic, weather, and demand change during the day
- `next shift` is easier to defend than `next 2 hours` because the current data model does not store rich time-slot history
- a `ranked list` is better than a single hidden answer because it is more transparent and easier to explain

## 2. Output Definition

The module should not return only one opaque score.

It should return:

| Field | Meaning |
| --- | --- |
| `recommendedPlatform` | Top platform for the next shift |
| `rankedPlatforms` | Ordered list of platform results |
| `score` | Final score for each platform |
| `expectedHourlyEarnings` | Baseline earning estimate |
| `contextAdjustment` | Weather/traffic/time effect |
| `wellbeingAdjustment` | Safety penalty or filter |
| `confidence` | How reliable the recommendation is |
| `reason` | Short explanation for the user |

### Report-ready paragraph

> The recommendation module returns a ranked list of candidate platforms rather than a single unexplained answer. This makes the system more transparent and allows the worker to view both the top recommendation and the reasoning behind the ranking.

## 3. Why Option B Is the Best Fit

The selected model structure is:

1. estimate expected earnings for each platform
2. adjust that estimate using live context
3. apply a wellbeing-aware safety adjustment
4. rank all platforms

### Why this is better than a single formula

- it separates prediction from safety
- it is easier to explain to a professor
- it fits the current project data better
- it avoids pretending that one equation magically solves everything

### Report-ready paragraph

> A modular recommendation design was selected because it separates three logically different tasks: earning estimation, context adaptation, and wellbeing-aware safety control. This is more transparent and academically defensible than collapsing all factors into a single unstructured score.

## 4. Data Available in the Current Project

These are the strongest signals already available in the codebase:

| Signal | Source |
| --- | --- |
| Past platform earnings | `server/models/EarningsEntry.js` |
| Hours worked | `server/models/EarningsEntry.js`, `server/models/WorkLog.js` |
| Work history | `server/models/WorkLog.js` |
| Weather | `server/services/weatherService.js` |
| Traffic | `server/services/trafficService.js` |
| Mood / wellbeing | `server/models/Conversation.js`, `server/services/burnoutService.js` |

### Important limitation

The project does **not** yet store detailed shift-slot history such as:

- exact shift start and end times
- per-hour demand curves
- live surge feed by platform

Because of that, the recommendation should be framed as `next shift` guidance, not a high-resolution hourly optimizer.

## 5. Baseline Model

Before the advanced model, define a very simple baseline.

### Baseline rule

> Recommend the platform with the highest recent average hourly earnings.

### Why this baseline matters

- it is simple
- it is easy to compute from existing data
- it gives the advanced model something concrete to improve upon

### Baseline computation

For each platform:

1. collect recent earning entries
2. compute `hourlyRate = amount / hours`
3. average those hourly rates over the recent window
4. rank platforms by that average

### Report-ready paragraph

> The baseline recommendation model selects the platform with the highest recent average hourly earnings. This baseline is intentionally simple and serves as a reference point against which the more context-aware and safety-aware recommendation model can be evaluated.

## 6. Recommended Algorithm

This is the algorithm to build first. It is practical, explainable, and fits the current project.

### Step-by-step algorithm

1. **Collect candidate platforms**
   - Use platforms from recent earnings/work logs.
   - If user history is sparse, fall back to the default platform set: `Uber`, `Swiggy`, `Rapido`, `Other`.

2. **Compute baseline earning estimate**
   - For each platform, compute recent hourly earnings from historical entries.
   - Prefer a recency-weighted average so newer shifts matter more than older ones.
   - If a platform has too little data, blend user history with a city/global fallback average.

3. **Compute context adjustment**
   - Read current weather and traffic.
   - Convert them into platform-specific modifiers.
   - Example logic:
     - rain may raise cab demand
     - heavy traffic may penalize bike/delivery efficiency
     - extreme heat may change delivery/cab demand differently

4. **Compute wellbeing adjustment**
   - Read the user's wellbeing risk signal.
   - If risk is `high`, penalize or filter high-strain platforms.
   - If risk is `moderate`, apply a smaller penalty.
   - If risk is `low`, no penalty or minimal penalty.

5. **Compute confidence**
   - Confidence should depend on how much platform history the user has.
   - Low-data platforms should still appear in ranking, but with lower confidence.

6. **Build final platform scores**
   - Combine:
     - earning estimate
     - context adjustment
     - wellbeing adjustment
   - Keep a breakdown for explanation.

7. **Rank platforms**
   - Sort descending by final score.
   - Return:
     - the ranked list
     - the top platform
     - the explanation breakdown

## 7. Pseudocode

Use this as your algorithm description in the report or viva:

```text
INPUT:
  user earnings history
  user worklog history
  current weather
  current traffic
  current wellbeing risk

OUTPUT:
  ranked list of platforms for the next shift

ALGORITHM:
  1. determine candidate platforms
  2. for each platform p:
       a. estimate base earning rate from recent historical hourly earnings
       b. if data is sparse, blend with fallback baseline
       c. compute context modifier from weather and traffic
       d. compute wellbeing penalty from risk level
       e. compute final score for p
       f. store explanation breakdown and confidence
  3. sort platforms by final score descending
  4. return ranked list and top recommendation
```

## 8. Practical Sub-Algorithms

### 8.1 Base earnings estimator

Start simple:

- compute hourly earnings per past entry: `amount / hours`
- use the last `N` entries for that platform
- apply recency weighting

This is easier to defend than a complicated forecasting model at this stage.

### 8.2 Context adjustment

Do not overengineer this at first.

Use bounded rules such as:

- rain can benefit cab-heavy platforms
- heavy traffic can penalize delivery or two-wheeler work
- context adjustment should stay within a safe range such as a modest bonus or penalty, not a massive swing

The key idea is that context should **adjust**, not completely dominate, the baseline.

### 8.3 Wellbeing adjustment

This should be visible and explicit.

Example logic:

- `low risk` -> no meaningful penalty
- `moderate risk` -> reduce suitability of high-strain options
- `high risk` -> strongly penalize or suppress high-strain recommendations

This is easier to defend than hiding wellbeing inside a tiny multiplier with no interpretation.

## 9. Validation Plan for This Specific Design

### Check 1: Baseline comparison

Compare the advanced model against:

- `highest recent hourly earnings` baseline

### Check 2: Scenario testing

Build scenario cards like:

| Scenario | Expected result |
| --- | --- |
| User usually earns best on Uber, normal context, low risk | Uber stays rank 1 |
| User usually earns best on delivery, but traffic is severe | Delivery platform drops slightly |
| Cab demand likely rises due to rain | Cab-friendly platform improves |
| User has high wellbeing risk after heavy recent work | High-strain options receive strong penalty |
| New user with sparse data | Ranking falls back to default/city baseline with low confidence |

### Check 3: Sensitivity

Change one variable at a time:

- only weather changes
- only traffic changes
- only wellbeing risk changes

Then check whether the ranking changes in the expected direction.

### Report-ready paragraph

> The recommendation model will be validated by comparing it against a simple earnings-only baseline, testing it under realistic context scenarios, and checking whether changes in context or wellbeing produce sensible directional changes in ranking. This validation strategy prioritizes transparency and behavioral correctness over premature claims of predictive perfection.

## 10. Defense Points for Professor Questions

| Likely question | Suggested answer |
| --- | --- |
| Why did you choose `next shift` instead of `whole day`? | Because context changes within the day and the current data model does not yet support reliable full-day dynamic forecasting. |
| Why did you choose a ranked list? | A ranked list is more transparent, shows alternatives, and avoids overclaiming that there is always one perfect platform. |
| Why not use a full ML model? | The project currently has stronger needs for interpretability and limited historical data, so a transparent modular model is more defensible. |
| Why separate baseline, context, and wellbeing? | Because these are conceptually different roles: one predicts earning potential, one adjusts for current conditions, and one protects worker wellbeing. |
| How will you prove this model is better? | By comparing it with an earnings-only baseline and testing it across realistic scenarios and stability checks. |

## 11. Final Recommendation

For this project, the strongest academic choice is:

- **time horizon:** `next shift`
- **output:** `ranked list of platforms with one top recommendation`
- **model:** `baseline earning estimate + context adjustment + wellbeing-aware safety layer`

This is the easiest version to justify, the cleanest version to explain, and the version that best matches the data currently available in your system.

