---
phase: 06-hours-extraction
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - ml_engine/voice_chat_v2/nodes.py
  - ml_engine/voice_chat_v2/graph.py
  - test_phase6.py
autonomous: true
requirements:
  - "strict extraction flow"
must_haves:
  truths:
    - "User can report hours worked and it gets correctly extracted."
    - "System generates a final summary or transitions to summarization step after successfully extracting hours."
    - "System asks user to retry if hours cannot be extracted."
  artifacts:
    - path: "ml_engine/voice_chat_v2/nodes.py"
      provides: "hours_node implementation"
      contains: "def hours_node"
    - path: "ml_engine/voice_chat_v2/graph.py"
      provides: "routing for hours_extraction"
      contains: "hours_node"
    - path: "test_phase6.py"
      provides: "Empirical verification for the 5-turn flow"
  key_links:
    - from: "ml_engine/voice_chat_v2/nodes.py"
      to: "/api/chat-v2/raw-extract"
      via: "requests.post"
      pattern: "raw-extract"
---

<objective>
Process user's response about hours worked, extract the numerical amount into state cleanly.

Purpose: Captures how many hours the user worked on the selected platform.
Output: `hours_worked` stored in state, transition to `final_summarization`.
</objective>

<context>
@.gsd/ROADMAP.md
@ml_engine/voice_chat_v2/nodes.py
@ml_engine/voice_chat_v2/graph.py
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add hours_node</name>
  <files>ml_engine/voice_chat_v2/nodes.py</files>
  <action>
    Create `hours_node(state)`:
    - Extract hours by calling `/api/chat-v2/raw-extract` with the `user_input`.
    - If `hours` is missing or invalid, route to `retry_node`.
    - If valid, set `hours_worked` in state to the numerical representation of hours.
    - Ask for final confirmation or acknowledge by calling `/api/chat-v2/raw-reply` with `state="final_summary"` and `extractedData` containing `platform`, `earnings`, and `hours`.
    - Set `final_summary` to the reply.
    - Set `current_step` to "final_summarization".
  </action>
  <verify>
    <automated>python -c "import sys; sys.path.append('ml_engine'); import voice_chat_v2.nodes; print(voice_chat_v2.nodes.hours_node)"</automated>
  </verify>
  <done>hours_node exists and handles extracting hours and advancing the conversation to final summarization.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Route hours in graph</name>
  <files>ml_engine/voice_chat_v2/graph.py</files>
  <action>
    - Update `start_router` to return "hours_node" when `step == "hours_extraction"`.
    - Update `create_graph` to `workflow.add_node("hours_node", hours_node)`.
    - Add `workflow.add_edge("hours_node", END)`.
  </action>
  <verify>
    <automated>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.graph import create_graph; create_graph()"</automated>
  </verify>
  <done>Graph correctly routes to hours_node when state is hours_extraction.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Empirical Validation</name>
  <files>test_phase6.py</files>
  <action>
    - Create `test_phase6.py` simulating a 5-turn conversation flow: Start -> Mood -> Platform -> Earnings -> Hours.
    - Mock or run against actual local backend.
    - Assert that after turn 5, `state["hours_worked"]` is set and `state["current_step"]` is "final_summarization".
  </action>
  <verify>
    <automated>python test_phase6.py</automated>
  </verify>
  <done>Multi-turn flow works up to hours extraction.</done>
</task>

</tasks>

<verification>
Run `python test_phase6.py` to verify the state transitions and extractions.
</verification>

<success_criteria>
- hours_node accurately extracts hours using the existing `/api/chat-v2/raw-extract` Node endpoint.
- Agent smoothly transitions from asking about hours to generating the final summary.
- Graph maintains conversation state correctly across 5 turns.
</success_criteria>

<output>
After completion, create `.gsd/phases/6/6-SUMMARY.md`
</output>