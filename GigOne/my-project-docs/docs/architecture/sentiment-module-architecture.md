# Sentiment Module Architecture

This document is the implementation blueprint for rebuilding the sentiment part of the project as a proper standalone module.

The goal is to stop treating sentiment as a side effect of the chatbot and instead treat it as a measurable, validated signal that can later feed the wellbeing-risk module.

## 1. Module Goal

The sentiment module should answer one question:

> What is the worker's emotional state in the mood-bearing part of today's check-in?

This module should not:

- diagnose mental health conditions
- score every user message
- mix emotional measurement with platform or earnings extraction

## 2. Why the Current Design Must Change

In the current backend, sentiment is produced inside the same LLM call that also:

- generates the chatbot reply
- extracts platform / earnings / hours
- advances the conversation step

This is convenient for a prototype, but weak for research and validation because:

- one prompt is solving too many tasks
- non-emotional messages like `Uber` or `1200` can still get a sentiment score
- parse failures currently collapse into a neutral-looking score
- the later burnout logic treats these scores as real evidence

## 3. Final Architecture

The new architecture should separate the modules clearly:

1. `Chatbot module`
   - handles dialogue flow
   - asks questions
   - extracts structured data

2. `Sentiment module`
   - reads only mood-bearing text
   - returns a validated emotional-state object

3. `Wellbeing-risk module`
   - uses the sentiment output plus workload/recovery signals

### Final rule

The chatbot talks.  
The sentiment module measures.  
The wellbeing module reasons about risk.

## 4. Scope of Sentiment Input

The sentiment module must only run on messages that actually contain emotional content.

### Allowed input

- the user's answer to the mood question
- long reflective user replies that clearly describe how the day felt

### Disallowed input

- platform-only messages
- earnings-only messages
- hours-only messages
- purely factual corrections

### Practical rule for V1

Only run sentiment scoring when `conversation.step === "mood"` at the time the user reply is received.

That is the easiest version to build and the easiest version to defend.

## 5. Output Schema

Create one standardized sentiment object.

| Field | Type | Meaning |
| --- | --- | --- |
| `moodLabel` | string | one of `happy`, `neutral`, `tired`, `stressed`, `frustrated`, `excited` |
| `moodScore` | number | continuous value in `[-1, 1]` |
| `summary` | string | one-sentence emotional summary |
| `suggestion` | string | short self-care or supportive suggestion |
| `confidence` | number | confidence in `[0, 1]` |
| `isValid` | boolean | whether the output passed validation |
| `sourceStep` | string | where the text came from, e.g. `mood` |
| `rawText` | string | optional audit field for debugging or research |

### Important design rule

If the model fails or returns malformed output, do **not** store `moodScore = 0` as if it were real.

Instead:

- set `isValid = false`
- set the unreliable fields to `null`
- exclude that record from downstream wellbeing calculations

## 6. Recommended File Structure

Keep the current chatbot flow, but split the measurement logic into new files.

### New or updated files

- `server/services/sentimentService.js`
  - main entry point for mood scoring
- `server/services/sentimentValidation.js`
  - validates parsed model output
- `server/models/Conversation.js`
  - add a top-level `dailyMood` field
- `server/controllers/chatController.js`
  - call the sentiment module only on the mood step
- `server/services/geminiService.js`
  - either retire it, or reduce it to a low-level Gemini helper

## 7. Recommended Data Model Changes

### 7.1 Keep message-level sentiment optional

You may keep `messages[].sentiment` if you want UI metadata, but it should no longer drive the wellbeing-risk calculation.

### 7.2 Add a conversation-level mood field

Add a new field to `Conversation`:

```js
dailyMood: {
  moodLabel: String,
  moodScore: Number,
  summary: String,
  suggestion: String,
  confidence: Number,
  isValid: Boolean,
  sourceStep: String,
}
```

### Why this matters

The wellbeing-risk module should consume one clean daily signal, not an average of mixed conversational turns.

## 8. Core Service Design

### 8.1 `sentimentService.js`

This service should expose one function:

```text
analyzeMoodText(text, { language, sourceStep })
```

### Input

- `text`: the worker's mood-bearing response
- `language`: optional language hint
- `sourceStep`: usually `mood`

### Output

- validated sentiment object following the schema above

### Internal steps

1. reject empty or extremely short text
2. build a dedicated sentiment prompt
3. call the LLM with deterministic settings
4. parse JSON response
5. validate and normalize fields
6. return a structured output object

## 9. Prompt Design

Use a dedicated prompt. Do not reuse the chatbot prompt.

### Prompt requirements

- tell the model it is doing only emotional-state estimation
- define the allowed labels exactly
- define the score range exactly
- ask for strict JSON only
- request confidence
- keep the task independent from chatbot reply generation

### Example prompt structure

```text
You are a sentiment analysis module for worker wellbeing check-ins.
Analyze only the emotional state expressed in the text below.

Return ONLY JSON:
{
  "moodLabel": "happy|neutral|tired|stressed|frustrated|excited",
  "moodScore": <number from -1 to 1>,
  "summary": "one short sentence",
  "suggestion": "one short supportive suggestion",
  "confidence": <number from 0 to 1>
}
```

### Model settings

For research consistency, use:

- low temperature, ideally `0`
- no creative sampling behavior
- strict post-parse validation

## 10. Validation Layer

Create `sentimentValidation.js` and run all model outputs through it.

### Validation checks

1. `moodLabel` must be in the allowed label set
2. `moodScore` must be numeric and finite
3. `moodScore` must be clamped or rejected outside `[-1, 1]`
4. `confidence` must be numeric and in `[0, 1]`
5. `summary` must be non-empty
6. malformed outputs must be flagged invalid

### Return policy

If valid:

- return normalized structured result

If invalid:

- return:

```js
{
  moodLabel: null,
  moodScore: null,
  summary: null,
  suggestion: null,
  confidence: 0,
  isValid: false,
  sourceStep: "mood"
}
```

## 11. Chat Controller Integration

### Current flow

Right now `chatController.reply` and `replyText` call the combined chatbot logic and store the returned sentiment directly.

### New flow

Change the logic in both:

1. identify `currentStep`
2. run the chatbot turn as usual for reply generation and extraction
3. if `currentStep === "mood"`:
   - call `sentimentService.analyzeMoodText(...)`
   - save result into `conversation.dailyMood`
4. if `currentStep !== "mood"`:
   - do not run sentiment scoring
5. do not let invalid outputs silently become neutral

### Build instruction

In `chatController.js`, the sentiment module should be called after transcription is available but before final persistence.

## 12. Build Steps in Exact Order

### Step 1

Create `server/services/sentimentValidation.js`.

Implement:

- allowed labels
- numeric checks
- score clamping or rejection
- confidence validation
- normalized return shape

### Step 2

Create `server/services/sentimentService.js`.

Implement:

- prompt builder
- Gemini call
- JSON parsing
- validation hook

### Step 3

Update `server/models/Conversation.js`.

Add:

- `dailyMood`

Optionally keep:

- `messages[].sentiment`

but stop using it for wellbeing math.

### Step 4

Update `server/controllers/chatController.js`.

Change:

- `reply`
- `replyText`

So that sentiment is only computed during the `mood` step.

### Step 5

Remove sentiment dependency from the combined chatbot prompt.

In `conversationService.js`, stop treating sentiment as a required output of `processChatTurn`.

That service should focus on:

- conversational reply
- extracted data
- step transitions

### Step 6

Update API responses.

Return `dailyMood` from the completed check-in response and history endpoints if the UI needs it.

### Step 7

Write tests for:

- valid mood text
- empty text
- malformed model JSON
- out-of-range scores
- platform-only input mistakenly passed into the module

## 13. Suggested Pseudocode

```text
if currentStep == "mood":
    moodResult = analyzeMoodText(userText)
    conversation.dailyMood = moodResult
else:
    moodResult = null

chatResult = processChatTurn(...)

save user message
save assistant reply
save extracted data
save dailyMood if present
```

## 14. Testing Strategy

### Unit tests

Test the validator separately:

- valid object
- invalid label
- non-numeric score
- missing fields

Test the service separately:

- clear positive mood
- clear negative mood
- mixed Hinglish text
- short ambiguous input

### Integration tests

Test chat flow:

- mood step triggers sentiment
- platform step does not trigger sentiment
- completed conversation stores one daily mood signal

### Manual test set

Create 30 to 50 mood texts:

- positive
- neutral
- tired
- frustrated
- stressed
- mixed-language

Review the outputs manually and store notes.

## 15. Validation for Research

To defend this module academically:

1. manually label a sample of worker-like mood responses
2. compare module output to human labels
3. record mismatches
4. analyze failure cases
5. explain that the output is a support signal, not emotional ground truth

## 16. Limitations

You should explicitly state:

- emotional state is inferred from self-expression, not directly measured
- very short text may be ambiguous
- mixed-language inputs require validation
- LLM output is probabilistic, not perfect

## 17. Final Implementation Rule

The sentiment module should produce **one clean daily mood signal** from the mood step.

That is the design choice that makes the rest of the wellbeing-risk system much easier to build, validate, and defend.

