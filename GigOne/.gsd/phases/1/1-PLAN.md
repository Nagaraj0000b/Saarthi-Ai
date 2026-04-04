---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Foundation & Context Setup

## Objective
Set up the standalone LangGraph State structure and basic mock context loaders for the new voice chat module.

## Context
- .gsd/ROADMAP.md (Phase 1)
- New module `voice_chat_v2` in `ml_engine`

## Tasks

<task type="auto">
  <name>Create Directory & State Definition</name>
  <files>ml_engine/voice_chat_v2/state.py</files>
  <action>
    - Create `ml_engine/voice_chat_v2` directory.
    - Create `__init__.py`.
    - Create `state.py` defining the `VoiceChatState` TypedDict tracking the required state for the conversation flow: language, jobs_list, skills_list, weather_condition, traffic_condition, current_step, mood, sentiment_score, selected_platform, expected_earnings, hours_worked, final_summary.
  </action>
  <verify>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.state import VoiceChatState"</verify>
  <done>The VoiceChatState dict is correctly typed and importable.</done>
</task>

<task type="auto">
  <name>Implement Context Loaders</name>
  <files>ml_engine/voice_chat_v2/context.py</files>
  <action>
    - Create `context.py`.
    - Implement `load_user_profile(user_id)` returning mock list of jobs ("Uber", "Lyft") and skills.
    - Implement `load_weather_traffic(user_id)` returning mock weather/traffic conditions as text strings (e.g., "sunny", "heavy traffic") without numbers.
  </action>
  <verify>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.context import load_user_profile; print(load_user_profile(1))"</verify>
  <done>Mock data functions exist and return correctly shaped output without relying on external DB for now.</done>
</task>

<task type="auto">
  <name>Graph Initialization & Language Enforcement</name>
  <files>ml_engine/voice_chat_v2/graph.py</files>
  <action>
    - Create `graph.py` initializing a basic `StateGraph(VoiceChatState)`.
    - Setup the base nodes/edges just connecting START to an initial node and END.
    - Create the base system prompt setup constraint that will be used later to enforce language matching.
  </action>
  <verify>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.graph import create_graph; create_graph()"</verify>
  <done>Base graph compiles correctly without errors.</done>
</task>

## Success Criteria
- [ ] `voice_chat_v2/state.py` defines all necessary state keys.
- [ ] `voice_chat_v2/context.py` provides mock profile/weather data.
- [ ] `voice_chat_v2/graph.py` graph compiles locally.
