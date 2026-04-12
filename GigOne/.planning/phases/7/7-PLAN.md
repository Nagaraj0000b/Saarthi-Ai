---
phase: 07-final-summarization
plan: 01
type: execute
wave: 1
depends_on:
  - 06-hours-extraction
files_modified:
  - server/controllers/chatV2Controller.js
  - ml_engine/voice_chat_v2/nodes.py
  - ml_engine/voice_chat_v2/graph.py
  - test_phase7.py
autonomous: true
requirements:
  - "strict extraction flow (Greeting -> Mood -> Platform -> Earnings -> Hours -> Summary)"
must_haves:
  truths:
    - "System generates a final summary combining shift data, weather, and traffic for the next shift."
    - "The final summary is delivered immediately after successful hours extraction without requiring another user prompt."
    - "State machine correctly ends the flow with current_step as 'completed'."
  artifacts:
    - path: "server/controllers/chatV2Controller.js"
      provides: "Context passing for weather and traffic"
    - path: "ml_engine/voice_chat_v2/nodes.py"
      provides: "final_summary_node implementation"
    - path: "ml_engine/voice_chat_v2/graph.py"
      provides: "routing for final_summarization"
    - path: "test_phase7.py"
      provides: "Empirical verification for the full 6-step flow"
  key_links:
    - from: "ml_engine/voice_chat_v2/graph.py"
      to: "ml_engine/voice_chat_v2/nodes.py"
      via: "final_summary_node"
---

<objective>
Generate final summary of the recorded shift data, incorporating the weather and traffic context for the *next* shift.

Purpose: Closes the conversation loop by summarizing earnings and hours, and providing contextual advice (weather/traffic) for their next shift.
Output: `final_summary` generated and `current_step` advanced to `completed`.
</objective>

<context>
@.gsd/ROADMAP.md
@server/controllers/chatV2Controller.js
@ml_engine/voice_chat_v2/nodes.py
@ml_engine/voice_chat_v2/graph.py
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Pass Weather and Traffic Context in Node Backend</name>
  <files>server/controllers/chatV2Controller.js</files>
  <action>
    Update `getRawReply` to extract `weather` and `traffic` from `req.body` and add them to the `context` object.
    
    ```javascript
    const context = {
      platforms: Array.isArray(req.body.platforms) ? req.body.platforms : [],
      skills: Array.isArray(req.body.skills) ? req.body.skills : [],
      dailyMood: req.body.dailyMood || null,
      extractedData: req.body.extractedData || {},
      weather: req.body.weather || null,
      traffic: req.body.traffic || null
    };
    ```
    This ensures `generateConstrainedReply` (which handles `nextState === "complete"`) receives the necessary context.
  </action>
  <verify>
    <automated>grep -q "weather: req.body.weather" server/controllers/chatV2Controller.js</automated>
  </verify>
  <done>Node backend successfully passes weather and traffic to the reply generator.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Implement final_summary_node and refactor hours_node</name>
  <files>ml_engine/voice_chat_v2/nodes.py</files>
  <action>
    1. Create `final_summary_node(state)`:
       - Call `/api/chat-v2/raw-reply` with `"state": "complete"`.
       - Pass `"weather": {"nextShift": {"description": state.get("weather_condition", "clear")}}`.
       - Pass `"traffic": {"traffic_level": state.get("traffic_condition", "light")}`.
       - Pass `extractedData` with earnings and hours.
       - Set `final_summary` to the response.
       - Set `current_step` to "completed".
       
    2. Refactor `hours_node(state)`:
       - Remove the `raw-reply` call.
       - It should only extract hours, verify them, and return `{"hours_worked": str(hours), "current_step": "final_summarization"}`.
  </action>
  <verify>
    <automated>python -c "import sys; sys.path.append('ml_engine'); import voice_chat_v2.nodes; print(voice_chat_v2.nodes.final_summary_node)"</automated>
  </verify>
  <done>final_summary_node is implemented and hours_node is cleanly refactored.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Route final summarization in Graph</name>
  <files>ml_engine/voice_chat_v2/graph.py</files>
  <action>
    - Import `final_summary_node` from `.nodes`.
    - Update `start_router` to return "final_summary_node" when `step == "final_summarization"`.
    - Update `create_graph` to `workflow.add_node("final_summary_node", final_summary_node)`.
    - Update edges: Change `workflow.add_edge("hours_node", END)` to `workflow.add_edge("hours_node", "final_summary_node")`.
    - Add `workflow.add_edge("final_summary_node", END)`.
  </action>
  <verify>
    <automated>python -c "import sys; sys.path.append('ml_engine'); from voice_chat_v2.graph import create_graph; create_graph()"</automated>
  </verify>
  <done>Graph correctly routes from hours_node to final_summary_node.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Empirical Validation</name>
  <files>test_phase7.py</files>
  <action>
    - Create `test_phase7.py` simulating the full conversation flow: Start -> Mood -> Platform -> Earnings -> Hours -> Summary.
    - Set initial state with `weather_condition = "rainy"` and `traffic_condition = "heavy"`.
    - After the hours input turn, assert that `state["current_step"] == "completed"`.
    - Print and verify that `state["final_summary"]` includes weather/traffic mentions dynamically generated by the AI.
  </action>
  <verify>
    <automated>python test_phase7.py</automated>
  </verify>
  <done>Full extraction flow correctly generates a final summary with weather and traffic context.</done>
</task>

</tasks>

<verification>
Run `python test_phase7.py` to verify the state transitions and final summary text.
</verification>

<success_criteria>
- AI generates a concluding message acknowledging the shift.
- Weather and traffic for the next shift are explicitly mentioned in the final reply.
- The transition from hours extraction to final summary happens automatically in one turn.
- The graph effectively completes the strict extraction flow as defined in the roadmap.
</success_criteria>

<output>
After completion, create `.gsd/phases/7/7-SUMMARY.md`
</output>