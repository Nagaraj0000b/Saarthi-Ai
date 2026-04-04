# ROADMAP.md

> **Current Milestone**: Milestone 3: LangGraph Voice Chat Rebuild
> **Goal**: Rebuild the voice chat AI from scratch using LangGraph in a parallel module to eliminate hallucinations. Test and integrate side-by-side with the old chat, removing the old chat only after validation.

## Must-Haves
- [ ] Build a new folder containing the LangGraph pipeline standalone.
- [ ] Implement hallucination guardrails via explicit state graphs.
- [ ] Support language matching with Android frontend choice.
- [ ] Context fetching for job/skill options and weather/traffic.
- [ ] strict extraction flow (Greeting -> Mood -> Platform -> Earnings -> Hours -> Summary).
- [ ] Parallel integration without deleting old files first.

## Phases

### Phase 1: Foundation & Context Management
**Status**: ✅ Complete
**Objective**: Set up LangGraph State, configure LLM logic, Context Loaders (mock profile/weather data), and System prompts to enforce frontend language selection.

### Phase 2: Conversation Step 1 - Greeting & Check-in
**Status**: ✅ Complete
**Objective**: Implement the initial trigger: localized greeting and request for the user's mood.

### Phase 3: Conversation Step 2 - Mood & Sentiment Analysis
**Status**: ✅ Complete
**Objective**: Integrate the sentiment analysis module. Analyze the user's mood response to determine score/summary and update state.

### Phase 4: Conversation Step 3 - Platform / Job Selection
**Status**: ⬜ Not Started
**Objective**: Agent acknowledges mood appropriately and asks which platform they worked on today (verifying against registered list).

### Phase 5: Conversation Step 4 - Earning Extraction
**Status**: ⬜ Not Started
**Objective**: Process user's response about platform, request earning amount, and extract earnings into state cleanly.

### Phase 6: Conversation Step 5 - Hours Extraction
**Status**: ⬜ Not Started
**Objective**: Agent asks for hours worked and strictly extracts the numeric value into the state.

### Phase 7: Conversation Step 6 - Final Summarization
**Status**: ⬜ Not Started
**Objective**: Agent generates final summary of the recorded shift data, incorporating the weather and traffic context for the *next* shift.

### Phase 8: Parallel Integration & Live Testing
**Status**: ⬜ Not Started
**Objective**: Hook up the new module to the Kotlin app frontend parameters, tested side-by-side with old chatbot.

### Phase 9: Sync to Backend Database & Legacy Cleanup
**Status**: ⬜ Not Started
**Objective**: Ensure shift and earning history updates reflect in the database properly, then safely delete old voice chat files.

---

## Milestone 2: ML Recommendation Engine (V1)
**Status**: ✅ Complete
