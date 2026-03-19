# Chat & AI System

The Chat API orchestrates the multimodal interaction between the worker and the chatbot (the AI companion).

## Workflow

The conversation is modeled as a state machine with the following steps:
1.  **Greeting**
2.  **Mood Check**
3.  **Platform Identification**
4.  **Earnings Report**
5.  **Hours Logged**
6.  **Summary/Closing**

## Endpoints

### Start Session
`POST /api/chat/start`

Initializes a new conversation.
-   **Returns:** A personalized greeting based on the user's name, current weather, and their last known Burnout Status. A protective nudge is injected if the worker is fatigued.
-   **Side Effect:** Creates a new `Conversation` document in MongoDB.

### Reply (Voice)
`POST /api/chat/reply`

Processes a user's voice response.

**Body (Multipart):**
-   `audio`: The recorded audio file (WebM/WAV).
-   `conversationId`: ID of the active session.
-   `lat`, `lon`: (Optional) User's current location.

**Process:**
1.  **Transcribe:** Audio -> Text via Groq (Whisper).
2.  **Context:** Fetches Weather + Traffic.
3.  **Process Turn:** Sends everything to Gemini.
    -   Analyzes sentiment.
    -   Extracts data (e.g., earnings amount) if relevant to the current step.
    -   Generates the next AI response.
4.  **Update State:** Advances the conversation step (e.g., from `mood` to `platform`).
5.  **Burnout Calculation:** If the new step is `done`, the controller inherently fetches the last 5 days of data, processes the mental fatigue risk via `burnoutService`, and attaches it.
6.  **Save:** Updates the `Conversation` document with the new state, messages, and burnout status.

### Get Context
`GET /api/chat/context`

Fetches standalone environmental data.
-   **Query:** `?lat=...&lon=...`
-   **Returns:** Weather conditions and traffic congestion levels.

## Services

### `conversationService.js`
-   **`processChatTurn`**: The core function that constructs the prompt for Gemini, including history and context.
-   **`STEP_CONFIG`**: Defines the goals and extraction targets for each conversation state.

### `geminiService.js`
-   Handles pure text analysis and sentiment scoring using Google's Generative AI SDK.

### `groqService.js`
-   Interfaces with Groq Cloud to perform ultra-low latency audio transcription.
