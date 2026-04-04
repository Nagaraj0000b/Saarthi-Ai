---
phase: 2
plan: 2
wave: 2
---

# Plan 2.2: Implement LangGraph Greeting & Mood Nodes

## Objective
Connect the isolated LangGraph brain to the newly exposed Node backend functions and process the first two steps of the conversational flow.

## Context
- `ml_engine/voice_chat_v2/graph.py`
- `ml_engine/voice_chat_v2/state.py`

## Tasks

<task type="auto">
  <name>Update State with User Input Buffer</name>
  <files>ml_engine/voice_chat_v2/state.py</files>
  <action>
    - Add `user_input: str` to `VoiceChatState` so speech transcriptions can be passed into the graph.
  </action>
  <verify>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.state import VoiceChatState"</verify>
  <done>State allows incoming text injections.</done>
</task>

<task type="auto">
  <name>Create Nodes Module</name>
  <files>ml_engine/voice_chat_v2/nodes.py</files>
  <action>
    - Create `nodes.py`.
    - Implement `greeting_node(state)`: Fetches greeting from Node `/api/chat/raw-greeting` via requests, saves to `final_summary` buffer, sets `current_step = 'waiting_for_mood'`.
    - Implement `mood_node(state)`: Reads `user_input` from state, requests Node `/api/chat/raw-sentiment`, updates `mood` and `sentiment_score` in state, sets `current_step = 'platform_selection'`.
  </action>
  <verify>python -c "import sys; sys.path.append('ml_engine'); import voice_chat_v2.nodes"</verify>
  <done>Nodes compile and contain request logic.</done>
</task>

<task type="auto">
  <name>Update Graph Workflow</name>
  <files>ml_engine/voice_chat_v2/graph.py</files>
  <action>
    - Import `greeting_node` and `mood_node`.
    - Modify StateGraph: `START -> greeting_node -> mood_node -> END`.
  </action>
  <verify>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.graph import create_graph; create_graph()"</verify>
  <done>Graph schema is updated with the new nodes.</done>
</task>

## Success Criteria
- [ ] Nodes are written in Python.
- [ ] LangGraph structurally links greeting to mood analysis.
