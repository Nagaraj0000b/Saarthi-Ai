---
phase: 05-earning-extraction
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - ml_engine/voice_chat_v2/nodes.py
  - ml_engine/voice_chat_v2/graph.py
  - test_phase5.py
autonomous: true
requirements:
  - "strict extraction flow"
must_haves:
  truths:
    - "User can report earnings and it gets correctly extracted."
    - "System asks for hours worked after successfully extracting earnings."
    - "System asks user to retry if earnings cannot be extracted."
  artifacts:
    - path: "ml_engine/voice_chat_v2/nodes.py"
      provides: "earnings_node implementation"
      contains: "def earnings_node"
    - path: "ml_engine/voice_chat_v2/graph.py"
      provides: "routing for earnings_extraction"
      contains: "earnings_node"
    - path: "test_phase5.py"
      provides: "Empirical verification for the 4-turn flow"
  key_links:
    - from: "ml_engine/voice_chat_v2/nodes.py"
      to: "/api/chat-v2/raw-extract"
      via: "requests.post"
      pattern: "raw-extract"
---

<objective>
Process user's response about platform, request earning amount, and extract earnings into state cleanly.

Purpose: Captures how much the user earned on the selected platform.
Output: `expected_earnings` stored in state, transition to `hours_extraction`.
</objective>

<context>
@.gsd/ROADMAP.md
@ml_engine/voice_chat_v2/nodes.py
@ml_engine/voice_chat_v2/graph.py
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add earnings_node</name>
  <files>ml_engine/voice_chat_v2/nodes.py</files>
  <action>
    Create `earnings_node(state)`:
    - Extract earnings by calling `/api/chat-v2/raw-extract` with the `user_input`.
    - If `earnings` is missing or invalid, route to `retry_node`.
    - If valid, set `expected_earnings` in state to the string representation of earnings.
    - Ask for hours by calling `/api/chat-v2/raw-reply` with `state="ask_hours"` and `extractedData` containing `platform` and `earnings`.
    - Set `final_summary` to the reply.
    - Set `current_step` to "hours_extraction".
  </action>
  <verify>
    <automated>python -c "import sys; sys.path.append('ml_engine'); import voice_chat_v2.nodes; print(voice_chat_v2.nodes.earnings_node)"</automated>
  </verify>
  <done>earnings_node exists and handles extracting earnings and advancing the conversation to hours.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Route earnings in graph</name>
  <files>ml_engine/voice_chat_v2/graph.py</files>
  <action>
    - Update `start_router` to return "earnings_node" when `step == "earnings_extraction"`.
    - Update `create_graph` to `workflow.add_node("earnings_node", earnings_node)`.
    - Add `workflow.add_edge("earnings_node", END)`.
  </action>
  <verify>
    <automated>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.graph import create_graph; create_graph()"</automated>
  </verify>
  <done>Graph correctly routes to earnings_node when state is earnings_extraction.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Empirical Validation</name>
  <files>test_phase5.py</files>
  <action>
    - Create `test_phase5.py` simulating a 4-turn conversation flow: Start -> Mood -> Platform -> Earnings.
    - Mock or run against actual local backend.
    - Assert that after turn 4, `state["expected_earnings"]` is set and `state["current_step"]` is "hours_extraction".
  </action>
  <verify>
    <automated>python test_phase5.py</automated>
  </verify>
  <done>Multi-turn flow works up to earnings extraction.</done>
</task>

</tasks>

<verification>
Run `python test_phase5.py` to verify the state transitions and extractions.
</verification>

<success_criteria>
- earnings_node accurately extracts earnings using the existing `/api/chat-v2/raw-extract` Node endpoint.
- Agent smoothly transitions from asking about platform earnings to asking about hours worked.
- Graph maintains conversation state correctly across 4 turns.
</success_criteria>

<output>
After completion, create `.gsd/phases/5/5-SUMMARY.md`
</output>