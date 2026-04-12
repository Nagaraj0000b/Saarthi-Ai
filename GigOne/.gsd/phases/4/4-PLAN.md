---
phase: 4
plan: 1
wave: 1
---

# Phase 4 Plan: Conversation Step 3 - Platform / Job Selection

## Objective
Implement the platform selection step in the LangGraph voice chat. The agent will acknowledge the user's mood, ask which platform they worked on, and verify the response against the user's registered jobs.

## Context
- `ml_engine/voice_chat_v2/nodes.py`
- `ml_engine/voice_chat_v2/graph.py`
- `server/controllers/chatV2Controller.js`
- `server/services/geminiService.js` (extractGigData)

## Tasks

### 1. Node Backend: Expose Extraction API
<task type="auto">
  <name>Expose Raw Extraction Endpoint</name>
  <files>
    - server/controllers/chatV2Controller.js
    - server/routes/chatV2.js
  </files>
  <action>
    - Add `extractRawData` controller in `chatV2Controller.js` that calls `geminiService.extractGigData`.
    - It should accept `text`, `language`, and `platforms` (valid list) in the body.
    - It should return the extracted JSON (platform, earnings, hours).
    - Register `router.post("/raw-extract", auth, extractRawData)` in `chatV2.js`.
  </action>
  <verify>grep "extractRawData" server/controllers/chatV2Controller.js</verify>
  <done>The Node backend provides an extraction service for the ML engine.</done>
</task>

### 2. ML Engine: Update Nodes for Platform Flow
<task type="auto">
  <name>Update Mood Node & Implement Platform Node</name>
  <files>ml_engine/voice_chat_v2/nodes.py</files>
  <action>
    - **Update `mood_node`**: After extracting mood, call Node `/api/chat-v2/raw-reply` with `state='ask_platform'` to get the acknowledgement + next question. Set this to `final_summary`.
    - **Implement `platform_node`**:
        - Read `user_input`.
        - Call Node `/api/chat-v2/raw-extract` to identify the platform mentioned.
        - Check if the extracted platform is in `state['jobs_list']` (case-insensitive fuzzy match if needed, but `extractGigData` already does some mapping).
        - If valid:
            - Set `selected_platform`.
            - Call Node `/api/chat-v2/raw-reply` with `state='ask_earnings'` to get acknowledgement + next question.
            - Set `current_step = 'earnings_extraction'`.
            - Set `final_summary` to the reply.
        - If invalid:
            - Call Node `/api/chat-v2/raw-reply` with `state='retry_platform'`.
            - Set `final_summary` to the retry text.
  </action>
  <verify>python -c "import sys; sys.path.append('ml_engine'); import voice_chat_v2.nodes; print(voice_chat_v2.nodes.platform_node)"</verify>
  <done>Nodes handle the transition from mood to platform selection.</done>
</task>

### 3. ML Engine: Refactor Graph for Stateful Resumption
<task type="auto">
  <name>Update Graph Workflow & Routing</name>
  <files>ml_engine/voice_chat_v2/graph.py</files>
  <action>
    - Add `start_router(state)` function that checks `state.get('current_step')`.
        - 'greeting' or None -> `greeting_node`
        - 'waiting_for_mood' -> `mood_node`
        - 'platform_selection' -> `platform_node`
    - Update `create_graph`:
        - Use `workflow.add_conditional_edges(START, start_router)`.
        - Connect `greeting_node -> END`.
        - Connect `mood_node -> END`.
        - Connect `platform_node -> END`.
        - Connect `retry_node -> END`.
  </action>
  <verify>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.graph import create_graph; create_graph()"</verify>
  <done>Graph correctly routes to the appropriate node based on the current conversation step.</done>
</task>

### 4. Empirical Validation
<task type="auto">
  <name>Verify Multi-Turn Flow</name>
  <files>test_phase4.py</files>
  <action>
    - Create `test_phase4.py` (copy from `test_phase2.py` and enhance).
    - Simulate a 3-turn flow:
        1. Start (Greeting).
        2. Input mood (extract mood, ask platform).
        3. Input platform (extract platform, ask earnings).
    - Verify that the state is preserved and updated correctly at each step.
  </action>
  <verify>python test_phase4.py</verify>
  <done>The conversational flow through platform selection is verified.</done>
</task>

## Success Criteria
- [ ] Agent acknowledges mood (e.g., "I'm sorry to hear you're stressed") before asking for the platform.
- [ ] Agent recognizes the platform from user speech (e.g., "I worked on Uber").
- [ ] Agent rejects platforms not in the user's registered list.
- [ ] Graph state updates `selected_platform` and moves to `earnings_extraction`.
