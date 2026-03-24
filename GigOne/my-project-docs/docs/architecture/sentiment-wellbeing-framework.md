# Sentiment and Wellbeing Risk Research Framework

This document is a report-ready framework for rebuilding the `sentiment` and `wellbeing risk` parts of the project in a more defensible way.

The goal is not to start with a formula. The goal is to:

- define the exact claim for each module
- justify the variables using theory and project data
- choose a transparent model structure
- validate the behavior before writing the final equation

## 1. Research Positioning

Before writing any technical section, make the project claims safer and more precise.

| Use this claim | Avoid this claim | Why |
| --- | --- | --- |
| The system estimates short-term emotional state from daily check-in text. | The system accurately knows the worker's emotions. | The first is measurable and limited; the second is too strong. |
| The system estimates wellbeing risk using mood and work-pattern signals. | The system diagnoses burnout. | Burnout is a clinical concept; your app is not a medical diagnostic tool. |
| The module is a decision-support aid for nudges and platform recommendations. | The module decides what is medically best for the worker. | Your system should support, not replace, human judgment. |

### What to write

Write one short paragraph like this:

> This project does not attempt to diagnose clinical burnout. Instead, it provides a short-term wellbeing risk assessment using daily self-reported mood and work-pattern signals. The output is used as a decision-support signal for rest nudges and safer platform recommendations.

## 2. Sentiment Module Research Framework

### 2.1 Module Objective

The sentiment module should measure the worker's emotional state from the mood-bearing part of the check-in, not from every message.

### What to write

Write this section in 3 parts:

- what the module measures
- what input it uses
- why it is separated from the chatbot logic

Suggested draft:

> The sentiment module estimates the worker's short-term emotional state from the daily mood response captured during the conversational check-in. It is intentionally separated from the chatbot response-generation logic so that emotional measurement is not contaminated by fact-extraction tasks such as platform, earnings, or hours.

### 2.2 Research Questions

Use questions like these:

1. Can the worker's daily mood-bearing response be mapped into a stable emotional label and score?
2. Is a dedicated sentiment module more defensible than generating sentiment inside the main chatbot prompt?
3. Can the resulting mood signal serve as a reliable input to a later wellbeing-risk model?

### 2.3 Why the Current Design Is Weak

Use the current codebase as the motivation for redesign:

- sentiment is currently generated inside the same prompt that also handles reply generation and structured extraction
- every user turn is scored, including factual turns such as platform name and earnings
- parse failures currently collapse to a neutral value, which weakens later burnout calculations

### What to write

Write a short critique paragraph:

> In the current prototype, sentiment is generated inside the same LLM call that also handles conversational response generation and structured data extraction. This makes the sentiment output harder to validate and defend academically, because the model is solving multiple tasks at once. In addition, non-emotional user responses such as platform names and earnings values can dilute the quality of the mood signal.

### 2.4 Input Scope

The sentiment module should only use text that actually contains emotional content.

| Input type | Use? | Reason |
| --- | --- | --- |
| User reply to the mood question | Yes | This is the main emotional signal. |
| Long reflective user message | Optional | Can be included if it clearly expresses feelings. |
| Platform name only | No | This is factual, not emotional. |
| Earnings amount only | No | This is factual, not emotional. |
| Hours worked only | No | This is factual, not emotional. |

### What to write

State clearly:

> The sentiment module only evaluates the user's mood-bearing response and excludes purely factual responses such as platform name, earnings, and hours worked. This prevents non-emotional text from contaminating the emotional signal used later in the wellbeing-risk module.

### 2.5 Output Definition

Define the output schema before you discuss any model.

| Field | Meaning | Notes |
| --- | --- | --- |
| `moodLabel` | Categorical mood class | Example: `happy`, `neutral`, `tired`, `stressed`, `frustrated`, `excited` |
| `moodScore` | Continuous mood score | Range `-1` to `1` |
| `summary` | Short explanation | One sentence only |
| `suggestion` | Brief self-care suggestion | Optional but useful for UX |
| `confidence` | Confidence in the classification | Range `0` to `1` |
| `isValid` | Whether output passed validation | Use `false` for malformed or low-confidence output |
| `sourceStep` | Where the signal came from | Example: `mood_step` |

### What to write

Explain why this schema exists:

> The module returns both a categorical and a continuous representation of emotional state. The label improves interpretability, while the score supports downstream trend analysis. Additional fields such as confidence and validity are included so that uncertain outputs can be excluded from later wellbeing calculations.

### 2.6 Model Choice

For the first defensible version, do not rush into full machine learning.

Recommended position:

- use a dedicated LLM call as the initial sentiment scorer
- keep it separate from the main chatbot prompt
- set deterministic generation settings
- validate every output before storing it

### Why this is defensible

- the app handles mixed-language text such as Hinglish
- you may not yet have a labeled sentiment dataset
- a dedicated prompt is still much cleaner than a combined chatbot prompt
- the module can later be benchmarked against human labels

### What to write

Suggested paragraph:

> A dedicated LLM-based sentiment scorer was chosen as the initial baseline because the project involves mixed-language worker responses and does not yet have a sufficiently large labeled dataset for supervised model training. However, unlike the prototype, the sentiment scorer is treated as an independent measurement module with deterministic prompting, output validation, and explicit uncertainty handling.

### 2.7 Validation Rules

Every output should be validated before saving it.

| Check | Rule |
| --- | --- |
| Label validation | Accept only labels from the allowed set |
| Score validation | Must be numeric and finite |
| Score bounds | Clamp or reject values outside `[-1, 1]` |
| Confidence validation | Must be numeric and within `[0, 1]` |
| Low-confidence behavior | Mark output invalid or exclude from risk model |
| Parse failure behavior | Store `null` or `isValid: false`, not `0` |

### What to write

Say this explicitly:

> Invalid or low-confidence outputs are excluded from downstream wellbeing calculations. This is necessary because treating model failure as neutral emotion would introduce systematic bias into the risk estimation process.

### 2.8 Validation Plan

Do not stop at “the model gives a score.” Validate it.

| Validation check | Method | Evidence produced |
| --- | --- | --- |
| Face validity | Read random examples and inspect whether labels make sense | Qualitative sanity check |
| Human agreement | Manually label a sample of responses and compare with the module output | Agreement percentage / confusion table |
| Stability | Re-run the same input or near-identical inputs and inspect output changes | Robustness evidence |
| Error analysis | Review false positives and false negatives | Clear failure modes |

### What to write

Suggested paragraph:

> The sentiment module will be validated using a manually reviewed sample of worker mood responses. The objective is not to claim perfect emotional understanding, but to show that the module produces stable and interpretable mood signals that are suitable for use in a downstream wellbeing-risk pipeline.

### 2.9 Limitations

Include this section. It will make the work stronger.

| Limitation | Why it matters |
| --- | --- |
| Mood is self-expressed, not directly observed | The worker may hide or soften feelings |
| LLM judgments may vary | Sentiment is probabilistic, not exact |
| Short text may be ambiguous | Confidence should be lower for weak inputs |
| Language mixing may affect labels | Validation is especially important for Hinglish |

### What to write

State:

> The sentiment module is designed as a practical emotional-state estimator, not a perfect psychological instrument. Its outputs should therefore be interpreted as approximate signals for trend analysis and support interventions, rather than as definitive emotional ground truth.

## 3. Wellbeing Risk Module Research Framework

### 3.1 Module Objective

This module should estimate short-term wellbeing risk using recent emotional and work-pattern signals.

### What to write

Suggested paragraph:

> The wellbeing-risk module estimates whether the worker may be entering a period of elevated stress or reduced recovery. It combines recent mood signals with workload and recovery indicators to support rest nudges and safer platform recommendations.

### 3.2 Safe Academic Claim

Use wording like this:

- `wellbeing risk`
- `stress-risk level`
- `fatigue and recovery risk`

Avoid:

- `burnout diagnosis`
- `clinical detection`
- `medical prediction`

### What to write

> The module is framed as a short-term wellbeing risk estimator rather than a clinical burnout detector. This positioning is more appropriate because the model relies on app-level behavioral signals rather than validated medical screening instruments.

### 3.3 Core Research Questions

Use questions like:

1. Can recent mood and work-pattern signals be combined into a transparent short-term wellbeing-risk estimate?
2. Does a multi-factor risk model behave more sensibly than a mood-only rule?
3. Can the resulting risk level support safer recommendations without making medical claims?

### 3.4 Conceptual Design

Build the risk model around three concepts.

| Concept | Meaning | Why it matters |
| --- | --- | --- |
| Emotional strain | Recent negative mood and downward emotional trend | Persistent negative affect may indicate stress accumulation |
| Workload intensity | Long hours, heavy recent shifts, consecutive workdays | Sustained workload raises fatigue pressure |
| Recovery deficiency | Lack of rest days or poor recovery gaps | High strain with poor recovery is more risky |

This is stronger than using only one average mood score.

### What to write

Explain the model in words before any formula:

> The wellbeing-risk module is conceptually organized around three dimensions: emotional strain, workload intensity, and recovery deficiency. Risk rises not merely when one mood score is negative, but when negative mood persists under sustained workload and insufficient recovery.

### 3.5 Candidate Variables

Use a variable table like this.

| Variable | Module concept | Source in app | Unit | Expected effect |
| --- | --- | --- | --- | --- |
| `dailyMoodScore` | Emotional strain | Sentiment module | `-1` to `1` | Lower score increases risk |
| `negativeMoodStreak` | Emotional strain | Recent daily mood history | days | Longer streak increases risk |
| `moodTrend` | Emotional strain | Recent daily mood history | slope / delta | Downward trend increases risk |
| `hoursWorkedToday` | Workload intensity | Work log / earnings data | hours | Higher value increases risk |
| `heavyShiftCount` | Workload intensity | Work history window | count | More heavy shifts increase risk |
| `consecutiveWorkDays` | Workload intensity | Work history | days | Longer streak increases risk |
| `restDaysLast7` | Recovery deficiency | Work history | count | More rest days decrease risk |
| `hoursWorkedLast3Days` | Recovery deficiency | Work history | hours | Higher cumulative load increases risk |

### What to write

This is where you justify each variable using theory and app data:

- why the variable belongs to that concept
- how it is measured in your system
- what direction of effect you expect

### 3.6 Recommended Output

Keep the output interpretable.

| Output field | Meaning |
| --- | --- |
| `riskLevel` | `low`, `moderate`, or `high` |
| `riskScore` | Continuous score, if you want internal ranking |
| `reasons` | Main drivers of the risk label |
| `recommendedAction` | Example: `normal`, `take it easy`, `suggest rest` |

### Why this is better

- easier to explain than a raw number alone
- easier to connect to nudges and recommendations
- safer than a hard medical-sounding label

### 3.7 Model Choice

For your first strong academic version, choose a transparent model.

Recommended options:

- rule-based model with thresholds
- weighted scoring model with normalized inputs
- simple additive model with separate concept scores

Recommended current direction:

- compute sub-scores for `emotional strain`, `workload intensity`, and `recovery deficiency`
- combine them into an overall risk score
- map the score into `low`, `moderate`, `high`

Do not start with a black-box ML model unless you have good training data.

### What to write

Suggested paragraph:

> A transparent multi-factor scoring model was selected because the project prioritizes interpretability, limited available training data, and academic defensibility. Rather than relying on a black-box predictor, the module combines concept-level sub-scores for emotional strain, workload intensity, and recovery deficiency, making the final risk assessment easier to justify and audit.

### 3.8 Why the Existing Burnout Logic Is Not Enough

Use this as your motivation for redesign:

- current logic depends mostly on mood scores
- current logic ignores hours worked and recovery pattern
- current logic treats short-term conversation sentiment as if it were a stable wellbeing measure

### What to write

> The current prototype uses a simplified rule based primarily on recent mood scores. While useful as an early warning signal, this approach does not fully capture the interaction between emotional strain, workload, and recovery. The redesigned wellbeing-risk model therefore broadens the input space while retaining interpretability.

### 3.9 Validation Plan

You probably do not have clinical ground-truth burnout labels. That is normal. Validate behavior instead.

| Validation check | Method | Evidence produced |
| --- | --- | --- |
| Scenario validity | Construct realistic worker scenarios and inspect whether the risk level behaves sensibly | Behavioral sanity evidence |
| Sensitivity testing | Change one variable at a time and inspect whether the score changes in the expected direction | Monotonicity evidence |
| Baseline comparison | Compare with the old mood-only rule | Improvement argument |
| Stability | Check whether small input changes produce stable outputs | Robustness evidence |

### Suggested scenario cases

| Scenario | Expected risk |
| --- | --- |
| Positive mood, moderate hours, one rest day | Low |
| Slightly negative mood, high hours, no recent rest | Moderate |
| Strongly negative mood, long shifts, multiple consecutive days, no recovery | High |
| Neutral mood, one unusually long day but recent rest present | Moderate or low, not automatically high |

### What to write

> Because the module is not trained on clinical diagnostic labels, validation focuses on behavioral validity rather than diagnostic accuracy. The central question is whether the system responds consistently and sensibly to realistic combinations of emotional strain, workload, and recovery patterns.

### 3.10 Limitations and Ethics

| Limitation | Why it matters |
| --- | --- |
| No clinical diagnosis | The module should not be presented as medical truth |
| Limited data history | Risk estimates may be less reliable for new users |
| Self-report bias | Mood responses may not fully reflect actual distress |
| App-level signals are incomplete | External life stressors are not observed |

### What to write

Use a paragraph like:

> The wellbeing-risk module should be interpreted as a support signal rather than a definitive assessment of worker health. Its outputs are intended to improve recommendation safety and encourage self-reflection, not to replace professional psychological or medical evaluation.

## 4. How to Build the Final Formula Later

Do this only after the previous sections are complete.

### Step order

1. finalize the claim of each module
2. complete the variable tables
3. justify each variable with theory and project data
4. choose the transparent model family
5. define outputs and validation rules
6. run validation scenarios
7. write the final scoring equations last

### Rule for the final equation

The final equation should summarize the reasoning, not replace it.

If your report jumps directly to a formula before defining:

- the problem
- the variables
- the output
- the limitations
- the validation

then the professor will likely criticize it again.

## 5. Deliverables Checklist

Complete these before finalizing the module design:

- criticism-to-requirement map for the old sentiment and burnout logic
- sentiment variable and output schema table
- wellbeing-risk variable table
- statement of non-clinical scope
- model choice justification
- validation plan for both modules
- scenario test set
- only after that, a final scoring rule

## 6. Defense Points for Viva or Review

Use short, direct answers.

| Likely question | Suggested answer |
| --- | --- |
| Why not use one chatbot prompt for everything? | Because measurement and conversation are different tasks. Separating them improves validity and interpretability. |
| Why not call it burnout detection? | Because the app does not use clinical instruments; it estimates short-term wellbeing risk using app-level signals. |
| Why not build a full ML model? | The current project prioritizes transparency, limited data conditions, and explainability over black-box complexity. |
| Why include work history in addition to mood? | Mood alone is too narrow; wellbeing risk is better understood as a combination of strain, workload, and recovery. |
| Why add confidence and validity fields? | To prevent uncertain model outputs from being treated as reliable evidence. |

## 7. Recommended Next Work

In this order:

1. write the criticism-to-requirement map
2. write the sentiment variable table
3. write the wellbeing-risk variable table
4. define the exact outputs
5. design the validation scenarios
6. only then draft the final equations

