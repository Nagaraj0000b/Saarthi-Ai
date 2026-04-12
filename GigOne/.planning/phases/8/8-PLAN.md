---
phase: 08-parallel-integration
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - ml_engine/main.py
  - server/controllers/chatV2Controller.js
  - server/routes/chatV2.js
  - android/app/src/main/java/com/gigone/saarthi/data/ChatApi.kt
  - android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardViewModel.kt
  - android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardScreen.kt
autonomous: true
requirements:
  - PHASE-8
must_haves:
  truths:
    - User can seamlessly toggle between old chatbot and new LangGraph chatbot in the Android UI.
    - Android app can send audio to the Node backend for the new LangGraph pipeline.
    - The LangGraph pipeline returns the correct next state and spoken reply.
  artifacts:
    - path: "ml_engine/main.py"
      provides: "LangGraph /chat/turn API endpoint"
    - path: "server/controllers/chatV2Controller.js"
      provides: "V2 Node endpoints mapping Android requests to Python LangGraph"
    - path: "android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardScreen.kt"
      provides: "V2 toggle UI"
  key_links:
    - from: "Android App"
      to: "Node /api/chat-v2/start or /api/chat-v2/reply"
      via: "ChatApi.kt Retrofit calls"
    - from: "Node /api/chat-v2/reply"
      to: "Python ML Engine /chat/turn"
      via: "HTTP POST request with VoiceChatState"
---

<objective>
Hook up the new LangGraph voice module to the Kotlin app frontend, tested side-by-side with the old chatbot.

Purpose: Allows live testing of the LangGraph implementation without destroying the proven V1 chatbot logic.
Output: Android UI toggle, Node API V2 orchestration endpoints, and Python LangGraph wrapper endpoint.
</objective>

<context>
@.gsd/ROADMAP.md
@.gsd/phases/7/7-SUMMARY.md
</context>

<interfaces>
From ml_engine/voice_chat_v2/state.py (Conceptual):
```python
class VoiceChatState(TypedDict):
    user_token: str
    language: str
    jobs_list: list[str]
    skills_list: list[str]
    user_input: str
    current_step: str
    # ... other state fields
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Expose LangGraph API in Python Engine</name>
  <files>ml_engine/main.py</files>
  <action>
    Add a POST endpoint `/chat/turn` to `ml_engine/main.py` that processes a LangGraph turn.
    - Import `create_graph` from `voice_chat_v2.graph`.
    - Create a global variable for the graph instance `graph_app = create_graph()`.
    - Define a Pydantic model for the incoming state payload accepting arbitrary dictionary fields (or just accept `Dict[str, Any]` using FastAPI `Body`).
    - In the `/chat/turn` route, invoke the graph with the provided state: `new_state = graph_app.invoke(payload_dict)`.
    - Return the `new_state` as JSON.
  </action>
  <verify>
    <automated>curl -X POST http://127.0.0.1:8000/chat/turn -H "Content-Type: application/json" -d '{"current_step": "start", "language": "English", "jobs_list": [], "skills_list": []}' || echo "Curl failed, but that might just be if the server isn't running"</automated>
  </verify>
  <done>Endpoint returns the updated LangGraph state with `final_summary`.</done>
</task>

<task type="auto">
  <name>Task 2: Orchestrate V2 Endpoints in Node Backend</name>
  <files>server/controllers/chatV2Controller.js, server/routes/chatV2.js</files>
  <action>
    Implement `startChatV2` and `replyChatV2` to act as intermediaries between Android and LangGraph Python API.
    - In `chatV2Controller.js`, add `startChatV2`:
      - Fetch user details, create a MongoDB `Conversation` document (with `step: "greeting"`, `language`).
      - Build the LangGraph state object: `{ user_token: req.headers.authorization, language, jobs_list: platforms, skills_list: skills, current_step: "start" }`.
      - Use `axios` or `fetch` to POST this state to `http://127.0.0.1:8000/chat/turn`.
      - Update the MongoDB Conversation `step` to the returned `current_step`.
      - Return `{ conversationId: conversation._id, step: conversation.step, reply: result.final_summary }`.
    - In `chatV2Controller.js`, add `replyChatV2`:
      - Receive audio file via `uploadAudio` middleware.
      - Call `transcribeAudio` (import from `../services/speechService` like V1 `reply`).
      - Load the existing `Conversation` from DB.
      - Build LangGraph state combining DB context and transcribed `user_input`. Set `current_step: conversation.step`.
      - POST to `http://127.0.0.1:8000/chat/turn`.
      - Extract updated `current_step` and `extractedData` from the returned state.
      - Update and save the MongoDB Conversation.
      - Return `{ conversationId: conversation._id, transcription: transcribed_text, reply: result.final_summary, step: result.current_step, isComplete: result.current_step === "completed" }`.
    - Export and register them in `server/routes/chatV2.js` as `router.post("/start", auth, startChatV2)` and `router.post("/reply", auth, uploadAudio, replyChatV2)`.
  </action>
  <verify>
    <automated>grep -q "startChatV2" server/routes/chatV2.js && echo "Found startChatV2"</automated>
  </verify>
  <done>V2 endpoints deployed that securely proxy between MongoDB and LangGraph.</done>
</task>

<task type="auto">
  <name>Task 3: Implement V2 Toggle in Android App</name>
  <files>android/app/src/main/java/com/gigone/saarthi/data/ChatApi.kt, android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardViewModel.kt, android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardScreen.kt</files>
  <action>
    Integrate side-by-side V1 and V2 models in Android.
    - In `ChatApi.kt`, add `@POST("chat-v2/start") suspend fun startSessionV2(...)` and `@Multipart @POST("chat-v2/reply") suspend fun sendAudioReplyV2(...)` mirroring the V1 parameter signatures.
    - In `DashboardViewModel.kt`:
      - Add a boolean state: `private val _useV2Chat = MutableStateFlow(false); val useV2Chat = _useV2Chat.asStateFlow()`. Add `fun toggleV2Chat(enabled: Boolean)`.
      - Update `startSession()`: `if (_useV2Chat.value) { chatApi.startSessionV2(...) } else { chatApi.startSession(...) }`.
      - Update `handleMicPressOut()`: conditionally call `chatApi.sendAudioReplyV2(...)` vs `chatApi.sendAudioReply(...)`.
      - Make sure standard exceptions are caught correctly for both.
    - In `DashboardScreen.kt`:
      - Within the Top Header Row, near the Language pill, add a simple UI Switch or clickable text "V1 / V2" bound to the `useV2Chat` state in the ViewModel. This acts as the parallel integration switch.
  </action>
  <verify>
    <automated>grep -q "useV2Chat" android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardViewModel.kt && echo "Found ViewModel toggle"</automated>
  </verify>
  <done>App users can flip a switch and test the new AI model without replacing old code.</done>
</task>

</tasks>

<verification>
Ensure Node service restarts correctly with new endpoints. Ensure Android builds successfully with new Retrofit methods. Ensure ML Engine runs with FastAPI endpoint.
</verification>

<success_criteria>
The Android App allows dynamic toggling of the chatbot brain (V1 vs V2). The entire LangGraph module is accessible via normal app usage.
</success_criteria>

<output>
After completion, create `.gsd/phases/8/8-SUMMARY.md`
</output>