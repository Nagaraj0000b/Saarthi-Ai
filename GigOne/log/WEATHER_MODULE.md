# Weather Module for Saarthi App

## 1. Abstract

**Summary:** This details the Architecture and Implementation of the Weather Module, an environmental context provider for India’s Gig economy workforce. The system fetches real-time weather conditions based on the worker's geographical coordinates (`lat`/`lon`). This data is injected directly into the Gemini conversational pipeline to make AI responses context-aware and is utilized by the Platform Recommendation Engine to dynamically adjust shift earning estimates.

## 2. About the System

**Project name:** Saarthi (GigOne)

The Weather Module operates as a synchronous background service. Instead of requiring the worker to manually check the weather, the system automatically pulls environmental data during interactions. It performs three primary functions:

* **Real-time Data Ingestion:** Retrieving current weather conditions (temperature, precipitation, alerts) using the worker's mobile GPS coordinates.
* **Conversational Context Enrichment:** Providing the Gemini LLM with environmental constraints so the AI can offer proactive health advice (e.g., suggesting hydration during extreme heat or rain gear during monsoons).
* **Recommendation Modification:** Acting as a context modifier for the Platform Recommendation Engine, adjusting the baseline earning scores based on how weather impacts gig demand (e.g., higher food delivery demand during rain).

## 3. Detailed Introduction

### Background
Gig workers (riders and delivery partners) spend their entire shifts outdoors. Environmental factors heavily dictate both their potential earnings (surge pricing) and their physical wellbeing (heatstroke, exhaustion). Traditional apps treat weather as a separate utility rather than an integrated operational metric.

### Solution
The Weather Module solves this by silently augmenting the user's voice log request with localized weather data, ensuring the digital companion is always aware of the worker's physical reality.

### Technical Usages
* **Geospatial API / Weather API:** For converting latitude/longitude into structured meteorological data.
* **Parallel Execution:** Weather fetching runs concurrently with the Groq Whisper STT transcription to eliminate latency bottlenecks.
* **Node.js/Express:** Acts as the orchestration layer (`weatherService.js`).

## 4. System Architecture & Methodology

### 4.1 The Context Injection Pipeline Overview
The module follows a "Capture-Fetch-Inject" workflow. When a worker speaks to the app, their mobile device sends `lat/lon` metadata alongside the audio. The backend catches this, fetches the local weather while the audio transcribes, and bundles both into the final prompt for the AI.

### 4.2 Stage 1: Metadata Capture & Validation
* **Technological Stack:** Express `req.body` metadata parsing.
* **Logic:** The module verifies the presence of valid `latitude` and `longitude` parameters in the multipart form data. If missing, it safely falls back to a generic "Unknown" state without failing the request.

### 4.3 Stage 2: Parallel Fetching
To preserve the fast response times required by the voice interface, the `getWeatherContext` function is executed via `Promise.all` alongside the `transcribeAudio` service. 

### 4.4 Stage 3: LLM Context Augmentation
The raw weather data is simplified and appended to the Gemini prompt context window. 
* **Role:** Gives the AI situational awareness.
* **Rationale:** Allows Gemini to organically say things like *"I see it's 40 degrees in your area, please drink water"* without explicit hardcoded rules.

## 5. Technical Implementation & Data Flow

### 5.1 Service Integration
The logic is encapsulated in `server/services/weatherService.js`. It utilizes HTTP clients (like Axios/Fetch) to call the external provider.

### 5.2 The Contextual State Flow
The system normalizes raw weather API responses into a lean object to save LLM token usage and limit noise.
* **Condition State:** Normalizes conditions into broad categories (e.g., "Clear", "Rain", "Extreme Heat").
* **Temperature State:** Extracts the numerical temperature.

### 5.3 Data Schema: Weather Context (JSON Output)
The structured object returned by the service to the chat controller:

```json
{
  "location": "Koramangala, Bengaluru",
  "temperature": 32.5,
  "condition": "Heavy Rain",
  "isExtreme": true,
  "recommendationModifier": 1.15
}
```

### 5.4 Backend Data Pipeline (Sequential Execution)
1. **Request:** Client uploads audio + `lat`/`lon` via `/api/chat/reply`.
2. **Parallel Processing:**
   * **Task A:** Audio sent to Groq STT.
   * **Task B:** `weatherService.getWeatherContext(lat, lon)` is invoked.
   * **Task C:** `trafficService.getTraffic(lat, lon)` is invoked.
3. **Prompt Assembly:** The outputs of A, B, and C are merged.
4. **AI Generation:** Gemini 2.5 Flash-Lite generates a response considering the weather.
5. **Recommendation Pipeline (Optional):** If the worker asks for the "Next Shift", the weather context is passed to the `contextAdjustmentService` to calculate bounded score modifiers.