# Multi-Platform Recommendation Research Framework

This document is the research and design framework for rebuilding the platform recommendation module in a more defensible way.

The purpose of this framework is not to jump straight to a formula. The purpose is to:

- define the decision problem clearly
- turn criticism into design requirements
- identify variables and their roles
- choose a transparent model family
- define how the model will be validated
- prepare concise defense points for review or viva

This framework should be completed before writing the final scoring equation.

## 1. Problem Statement

### Core problem

The recommendation module must answer a practical worker-facing question:

> Given the worker's recent earning history, current context, and short-term wellbeing state, which platform is the most suitable option for the next shift?

### Why this needs to be precise

If the problem statement is vague, the formula will also become vague. Before designing any model, fix these choices:

| Design choice | Recommendation |
| --- | --- |
| Decision horizon | Next shift / next time block, not an undefined future |
| Output type | Ranked list of platforms, not only one hidden score |
| Primary objective | Maximize expected useful earnings |
| Secondary objective | Avoid unsafe or high-strain recommendations |
| Safety framing | Decision support, not automatic command |

### Report-ready paragraph

> The multi-platform recommendation module is designed as a decision-support system that ranks available gig platforms for the worker's next shift. The objective is not merely to maximize raw earnings, but to recommend the most suitable platform given the worker's earning history, current contextual conditions, and short-term wellbeing state.

## 2. Criticism-to-Requirement Mapping

This section converts the professor's criticism into concrete design requirements. Replace or extend the table below with the exact wording from the feedback you received.

| Likely criticism of old formula | Why it is weak | New requirement |
| --- | --- | --- |
| The weights look arbitrary. | If weights are not justified, the model appears hand-wavy. | Weights must be derived from data, bounded heuristics, or sensitivity analysis. |
| Too many unrelated variables are mixed together. | Mixing rupees, percentages, and mood scores directly creates unit inconsistency. | Inputs must be normalized or separated into concept-level components before combination. |
| This does not look like reinforcement learning. | Using RL language without sequential learning and reward updates is misleading. | Avoid RL claims unless a real RL setup exists; use a transparent decision model instead. |
| Burnout is buried as just one small multiplier. | This weakens the safety argument and looks ethically shallow. | Safety or wellbeing should be modeled explicitly, preferably as a separate constraint or strong penalty layer. |
| There is no evidence the recommendation is better than a simpler rule. | Without a baseline, improvement claims are weak. | Compare the final model against a simple earnings-only baseline. |
| The formula gives a score, but not an explanation. | Opaque scores are hard to defend. | The system should return a score breakdown and reasons for the recommendation. |

### Report-ready paragraph

> The initial recommendation formula was criticized for relying on insufficiently justified weights, combining heterogeneous variables without enough structure, and offering limited interpretability. In response, the redesigned framework treats each criticism as a design requirement: variables must be conceptually organized, model assumptions must be explicit, safety must be handled clearly, and the final recommendation must be explainable and testable against simpler baselines.

## 3. Variable Table

Do not write the final formula before this table is complete.

The cleanest design is to group variables into four roles:

- earning prediction variables
- context adjustment variables
- wellbeing and safety variables
- confidence / fallback variables

### 3.1 Candidate variables

| Variable | Role | Source in project | Unit | Expected effect | Notes |
| --- | --- | --- | --- | --- | --- |
| `recentHourlyEarnings_p` | Earning prediction | `EarningsEntry` history | currency/hour | Higher value improves recommendation for platform `p` | Strong baseline signal |
| `recentDailyEarnings_p` | Earning prediction | `EarningsEntry` history | currency/day | Higher value improves recommendation | Use only if shift lengths are comparable |
| `shiftHours_p` | Earning prediction | `WorkLog` / `EarningsEntry` | hours | Helps convert raw earnings into hourly quality | Useful for normalization |
| `timeOfDay` | Context adjustment | current system time | category | Platform suitability changes by peak/off-peak windows | Example: cabs may improve in commute hours |
| `dayOfWeek` | Context adjustment | current date | category | Weekends/festivals may shift demand | Can be rule-based initially |
| `weatherCondition` | Context adjustment | `weatherService` | category | Rain/heat may raise or lower demand depending on platform | Must be platform-specific |
| `trafficLevel` | Context adjustment | `trafficService` | category / percent | Heavy traffic may penalize some platforms more than others | Strongly relevant to mobility work |
| `liveBonus_p` | Context adjustment | surge / external bonus feed | currency or multiplier | Higher bonus improves recommendation | Can be additive or multiplicative |
| `dailyMoodScore` | Wellbeing / safety | sentiment module | `-1` to `1` | Lower mood should reduce risky recommendations | Prefer mood-step-only measurement |
| `wellbeingRiskLevel` | Wellbeing / safety | wellbeing-risk module | ordinal | Higher risk should reduce or filter stressful choices | Better than weak hidden multiplier |
| `consecutiveHeavyDays` | Wellbeing / safety | work history | count | More heavy days increases caution | Connects recommendation to recovery logic |
| `dataCoverage_p` | Confidence / fallback | historical records count | count | Low data should reduce confidence | Needed for cold start handling |
| `cityBaselineEarnings_p` | Confidence / fallback | aggregate baseline | currency/hour | Used when user data is sparse | Helps new-user recommendations |

### 3.2 What to write in the report

For each variable, explain:

- what it measures
- why it belongs in the model
- how it is available in your system
- whether it acts as a predictor, modifier, or safety constraint

### Report-ready paragraph

> Variables were selected only after separating the recommendation problem into prediction, context adjustment, safety, and fallback roles. This prevents the model from mixing unrelated signals without structure. Historical earnings are treated as the primary predictive component, contextual features such as weather and traffic act as situational modifiers, and wellbeing indicators act as safety-aware constraints on the recommendation.

## 4. Model Options

This section should show that you considered multiple model families and selected one for good reasons.

### Option A: Simple weighted score

**Structure**
- Combine normalized factors into one score with fixed weights.

**Strengths**
- easy to implement
- easy to explain

**Weaknesses**
- often criticized for arbitrary weights
- weaker theoretical defense unless weights are carefully justified

### Option B: Earnings prediction + context modifiers + safety layer

**Structure**
- first estimate expected earnings for each platform
- then adjust using contextual modifiers
- then apply a wellbeing/safety constraint
- finally rank platforms

**Strengths**
- transparent
- modular
- easy to defend academically
- separates profit logic from safety logic

**Weaknesses**
- requires more design effort than one formula
- still needs justified normalization and tuning

### Option C: Black-box ML model

**Structure**
- feed all variables into a predictive model and output recommendation

**Strengths**
- can capture more complex patterns if enough data exists

**Weaknesses**
- low interpretability
- hard to defend with small data
- weak fit for your current project maturity

### Recommended option

For this project, the strongest path is **Option B**.

### Why Option B is the best choice here

- your current data volume is likely limited
- your professor is already criticizing theoretical weakness
- interpretability matters more than complexity
- safety should be visible, not hidden inside one opaque score

### Report-ready paragraph

> A modular decision model was selected instead of a single opaque formula or a black-box machine learning predictor. The model first estimates expected earning potential, then adjusts it for situational context such as weather and traffic, and finally applies a wellbeing-aware safety layer before ranking platforms. This structure improves interpretability, aligns more closely with the available data, and makes the recommendation process easier to justify academically.

## 5. Validation Plan

You should validate both correctness and usefulness.

### 5.1 Baseline model

Create at least one simple baseline such as:

- recommend the platform with the highest recent average hourly earnings

This gives you something concrete to beat.

### 5.2 Evaluation questions

Use questions like:

1. Does the new model outperform a simple earnings-only baseline?
2. Does the recommendation react sensibly to weather, traffic, and wellbeing changes?
3. Does the system remain stable under small input changes?
4. Does the model avoid obviously unsafe recommendations when wellbeing risk is high?

### 5.3 Validation methods

| Validation method | What you do | Why it matters |
| --- | --- | --- |
| Backtesting | Run the model on historical windows and compare recommendations with observed earnings | Tests whether the model would have been useful in past conditions |
| Scenario testing | Build realistic worker scenarios and inspect outputs | Good when real-world data is still limited |
| Sensitivity analysis | Change one variable at a time and inspect score movement | Shows whether the model behaves logically |
| Baseline comparison | Compare against simple earnings-only recommendation | Strengthens the improvement claim |
| Explanation audit | Inspect whether the breakdown matches the winning platform | Improves interpretability defense |

### 5.4 Suggested scenario set

| Scenario | Expected output behavior |
| --- | --- |
| Clear weather, normal traffic, strong recent Uber earnings | Uber should rank high |
| Heavy rain, low wellbeing risk, cab demand likely high | Cab-friendly platform may rise |
| Heavy traffic, bike-delivery penalty, weak recent bike earnings | Bike-heavy option should drop |
| High wellbeing risk after multiple heavy workdays | High-strain platforms should be penalized or filtered |
| New user with little history | Model should fall back to city baseline rather than pretending confidence |

### Report-ready paragraph

> The recommendation model will be evaluated using a combination of baseline comparison, scenario testing, and backtesting on historical records. Because the project prioritizes interpretability and currently operates under limited data conditions, validation focuses not only on predicted earning quality but also on behavioral sanity, stability, and safety-aware recommendation quality.

## 6. Defense Points for Professor Questions

Use direct, compact answers.

| Likely question | Suggested answer |
| --- | --- |
| Why did you not use reinforcement learning? | Because the current project does not yet have the sequential data volume and reward-loop structure needed to defend a real RL setup. A transparent decision model is more appropriate. |
| Why did you separate earning prediction from safety? | Because profit and worker wellbeing are different objectives. Separating them makes the recommendation both safer and easier to justify. |
| Why not use a single weighted formula? | A single score can hide weak assumptions. The modular design makes each component explicit and testable. |
| How are your weights justified? | Weights are not treated as arbitrary constants; they are bounded by normalization choices, sensitivity analysis, and comparison against baselines. |
| What if the user has little historical data? | The model uses fallback confidence logic and aggregate baseline values instead of overclaiming precision. |
| How do you know the recommendation is reasonable? | We validate it with backtesting, scenario checks, and explanation audits rather than only reporting one final score. |

## 7. Build Order

Do the work in this order:

1. finalize the problem statement
2. replace the generic criticism table with the professor's exact feedback
3. complete the variable table
4. choose the model family
5. define the baseline model
6. design the scenario tests
7. run validation
8. only then write the final formula

## 8. Final Rule

The final formula should be the **last** step, not the first one.

If you build the theory, variables, validation plan, and defense first, the formula will be much easier to justify. If you start from the formula, the same criticism will come back again.


 For your current project, the easiest and most defensible choice is:

  - time horizon: next shift or next working session
  - output: ranked list of platforms with one top recommendation highlighted
  - model family: Option B (earnings prediction + context adjustment + safety layer)

  Why this is the best choice

  - A few-hour micro recommendation is harder to defend because your current stored data is
    not truly hourly. In server/models/EarningsEntry.js:30 and server/models/WorkLog.js:30,
    you store date, hours, platform, and earnings, but not shift start/end time or time-slot
    history.
  - A full-day recommendation is also weaker because weather, traffic, and demand change
    during the day, so a full-day suggestion can look too broad and unrealistic.
  - Next shift is the right middle ground. It matches your current data better and is easier
    to justify.

  What I suggest you write
  Use this decision statement:

  > The system ranks available platforms for the worker's next shift using recent earning
  > history, current context, and short-term wellbeing state. It returns a ranked list with
  > one recommended platform and an explanation of why it was selected.

  Why ranked list is better than only one answer

  - It looks more transparent
  - It shows alternatives
  - It is easier to defend when scores are close
  - It reduces the criticism of “the system is pretending to know one perfect answer”

  So the UI/report can show:

  - Rank 1: Uber
  - Rank 2: Swiggy
  - Rank 3: Rapido

  and also show:

  - expected earnings
  - weather effect
  - traffic effect
  - wellbeing effect

  Best final academic framing
  Do not say:

  - “The model predicts the best platform for the whole day”
  - “The model suggests the best platform for the next few hours”

  Say:

  - “The model supports platform selection for the worker’s next shift/session”

  That wording is safer and fits your current system.