# Voice Module for Saarthi App

## 1. Abstract

**Summary:** This details the Architecture and Implementation of the voice module, an AI Interface designed specifically for India’s Gig economy workforce. The System addresses the accessibility gap in digital logging tools by replacing traditional form-based entries with a voice conversational pipeline. Using Gemini 2.5 Flash-lite for interacting with the user's dialogue management and Gemini 2.5 Flash for Sentiment analysis. The module uses Google Cloud Vertex AI. The system processes multilingual inputs via Speech-to-Text (STT) and uses Text-to-Speech (TTS) for the AI to talk back.

## 2. About the System

**Project name:** Saarthi (GigOne)

The Voice Module is a specialized AI subsystem designed to act as a digital companion for gig workers (e.g., delivery partners and ride-hailing drivers). Unlike standard voice assistants, this module is aware of its tasks and context-sensitive. It performs three primary functions:

* **Data Extraction from Natural Conversation:** Transforming unstructured speech to structured financial and operational data (earnings, platform, working hours).
* **Multilingual Support:** Handling unique language styles like mixed languages (e.g., Hindi and English, Kannada and English).
* **Wellbeing Monitoring:** Using Sentiment analysis to detect fatigue and stress patterns, providing health suggestions.

## 3. Detailed Introduction

### Background
The rapid expansion of the gig economy in India has created a massive workforce that works in high stress, mobile environments. However, existing tools for tracking earnings and managing wellbeing often rely on complex mobile interfaces that are difficult to use. This often leads to inconsistent data logging and a lack of insight into worker burnout.

### Solution
The voice module addresses these challenges by introducing a voice interface.

### Technical Usages
* **Gemini-2.5-Flash-Lite:** For primary conversation, prioritized for its fast response times and efficiency in extracting specific data parameters.
* **Gemini-2.5-Flash:** For sentiment analysis, where deeper reasoning is required to evaluate the emotional state of the worker.
* **Google Cloud STT:** For taking voice input from gig workers.
* **Google Cloud TTS (Standard):** In 1.15x speed, ensuring that the AI speaks at a pace that is informative but also brief, respecting the time-sensitive gig worker’s time.

## 4. System Architecture & Methodology

### 4.1 The Multimodal Pipeline Overview
The Voice Module works like a four-step production line that handles spoken information immediately. This design follows a simple "Sense-Think-Act" process. First, it senses by converting the worker's speech into text and translating it if necessary. Next, it thinks by using two different AI models (a tiered LLM approach) to understand what the worker means and how they feel. Finally, it acts by creating and speaking the AI's response back to the user.

### 4.2 Stage 1: Automatic Speech Recognition (ASR) & Translation
* **Technological Stack:** Google Cloud Speech-to-Text (v1).
* **Linguistic Handling:** ASR is configured with Multilingual Alternative Language Codes. Primary `languageCode` is `en-IN`, with simultaneous listening for `hi-IN` (Hindi), `ta-IN` (Tamil), and `bn-IN` (Bengali).
* **Translation Normalization:** Non-English transcriptions are passed through the Google Cloud Translation API to normalize the input into a consistent English format, reducing complexity for downstream LLMs.

### 4.3 Stage 2: Layered Conversational Intelligence 
The system employs a "Layered Intelligence" strategy, utilizing two distinct models from the Gemini 2.5 family via Google Cloud Vertex AI:

**Primary Conversation Engine (Gemini 2.5 Flash-Lite)**
* **Role:** Handles all real-time dialogue and data extraction.
* **Rationale:** Selected for superior latency performance. Processes "One-at-a-Time" questioning logic.
* **Data Extraction Logic:** Utilizes Zero-Shot Parameter Extraction to identify and validate variables (e.g., Platform Name, Earnings Amount, Working Hours).

**Sentiment & Wellbeing Module (Gemini 2.5 Flash)**
* **Role:** Analyzes the emotional state of the worker.
* **Rationale:** Used for deeper reasoning required to understand tone, sarcasm, and fatigue indicators.
* **Output:** Generates a "Mood Score" (ranging from -1.0 to 1.0) and a "Mood Label" (e.g., Stressed, Tired, Happy).

### 4.4 Stage 3: Affective Computing (Sentiment-Driven Feedback)
The methodology integrates Affective Computing by using the output of the Sentiment Module to influence the Conversation Engine. If the MoodScore falls below a predefined threshold (indicating high stress or fatigue), the system dynamically injects "Supportive Prompts" or "Rest Suggestions" into the next conversational turn, moving beyond simple data logging to proactive health monitoring.

### 4.5 Stage 4: Text-to-Speech (TTS) & Speed Calibration
* **Engine:** Google Cloud Text-to-Speech (Standard).
* **Voice Modeling:** Standard-tier Frequency Modulation voices are used for efficient API credit consumption compared to other models, while maintaining high intelligibility.
* **Increasing Speech Speed:** SpeakingRate is fixed at 1.15x. This ensures that the AI delivers information faster than the human conversational average (respecting the worker's time) without compromising clarity.

## 5. Technical Implementation & Data Flow

### 5.1 API Integration & Authentication Architecture
The module is built as a Node.js/Express microservice. To ensure security and reliability, all AI services are authenticated through a centralized Google Cloud Service Account (`credential.json`). This approach bypasses the rate limits associated with standard API Studio keys and enables the use of the `@google-cloud/vertexai` SDK for high-concurrency environments.

### 5.2 The Conversational State Machine (NLU Logic)
The system maintains a "State-Aware" dialogue flow. Each user interaction is processed through a Step-Config Mapping that defines the conversational goal and the data to be extracted:
* **Greeting State:** Starts the conversation in a friendly way, using language that is welcoming and respectful to everyone, no matter their background or beliefs.
* **Mood State:** Triggers the Sentiment Analysis module.
* **Platform State:** Normalizes and extracts the gig platform name (e.g., "Uber", "Zomato").
* **Earnings/Hours State:** Extracts numerical values while ignoring non-numeric conversational filler.

### 5.3 Data Schema: Sentiment Analysis (JSON Output)
The Gemini 2.5 Flash model is instructed to return strictly formatted JSON objects. This allows the backend to programmatically update the user's database without manual verification.

```json
{
  "moodLabel": "happy|neutral|tired|stressed|frustrated|excited",
  "moodScore": -1.0, 
  "summary": "One-sentence synthesis of user state",
  "suggestion": "Actionable self-care tip",
  "confidence": 0.95
}
```

### 5.4 TTS & Audio Configuration
The Text-to-Speech engine is configured for Conversational Efficiency. The following technical parameters are passed to the Google Cloud TTS API for every synthesis request:
* **Encoding:** MP3 (optimized for mobile bandwidth).
* **Speaking Rate:** 1.15 (115% of standard human speed).
* **Voice Tier:** Standard-A (Frequency Modulation synthesis).
* **Language Mapping:** Dynamic selection based on the user's preferred locale (e.g., `hi-IN-Standard-A` for Hindi).

### 5.5 Backend Data Pipeline (Sequential Execution)
1. **Request:** The backend receives a `multipart/form-data` request containing the audio blob and metadata (coordinates, user ID).
2. **STT Transcription:** Audio is sent to the Google STT engine; the resulting transcription is then sent to the Translation API.
3. **Parallel Processing:**
   * **Turn Processing:** Gemini 2.5 Flash-Lite generates the conversational reply and extracts the next required data point.
   * **Sentiment Processing:** (In the "Mood" step) Gemini 2.5 Flash evaluates the emotional state.
4. **Response Synthesis:** The AI's reply text is converted back to audio using the TTS engine.
5. **Persistence:** The extracted data, sentiment scores, and conversational history are saved to MongoDB via a Mongoose schema.

## 6. Defense Points for Professor Questions

| Likely Question | Suggested Answer |
| --- | --- |
| Why use two different Gemini models (Flash-lite and Flash)? | This is a "Layered Intelligence" strategy. We use **Flash-lite** for the main conversation because it has the lowest latency, which is critical for a real-time voice interface. We use the slightly more powerful **Flash** model for sentiment analysis because it requires deeper reasoning to understand emotional nuances, and this task can run in parallel without blocking the user's conversational turn. This tiered approach optimizes for both speed and accuracy. |
| Why translate all languages to English before sending them to the LLM? | While Gemini is multilingual, normalizing all input to a single language (English) significantly improves the reliability and consistency of our structured data extraction. It reduces prompt complexity and ensures that data saved to our database (like platform names) is uniform, regardless of whether the user said it in Hindi, Tamil, or English. It's a deliberate choice for data integrity. |
| Your conversational flow is a rigid step-by-step state machine. What if a user provides all the information at once? | We chose a guided, "One-at-a-Time" state machine for our initial version to guarantee data integrity. This ensures we capture all required fields (platform, earnings, hours) without the risk of the LLM skipping a step. For future versions, we plan to implement multi-slot extraction, but for the core product, ensuring no data is missed was the top priority. |
| Why is the Text-to-Speech (TTS) speed set to 1.15x? | This was a user-experience calibration. Gig workers operate in time-sensitive environments. A 1.15x speed is slightly faster than the average human conversational pace, which makes the interaction feel efficient and respectful of the worker's time, but it's not so fast that it compromises clarity or sounds unnatural. |
| Why use a service account (`credential.json`) instead of a simple API key? | Using a Google Cloud Service Account with the Vertex AI SDK is a best practice for production-grade applications. It provides more robust security, avoids the stricter rate limits associated with standard API Studio keys, and is designed for the high-concurrency environment of a microservice handling many users at once. |
