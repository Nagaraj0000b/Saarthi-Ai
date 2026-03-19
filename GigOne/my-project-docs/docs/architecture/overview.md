# Project Architecture Overview

Project is a MERN-stack application designed to empower gig economy workers by providing an AI companion (Chatbot), detailed earnings analytics, and operational support.

## Core Components

The system is divided into two main domains:

1.  **Client Application (Frontend):**
    -   Built with React and Vite.
    -   Features a responsive dashboard with real-time updates.
    -   Integrates voice interaction via the Web Audio API and Edge TTS.
    -   Uses Shadcn/UI and Tailwind CSS for a modern, accessible interface.

2.  **Server API (Backend):**
    -   Node.js and Express REST API.
    -   MongoDB for persistent storage of users, work logs, and earnings.
    -   **AI Services Layer:** Orchestrates interactions with Gemini (Sentiment/NLG), Groq (Whisper/ASR), OpenWeather (Context), and TomTom (Traffic).
    -   **Burnout Detection:** Mathematically analyzes 5-day mood trends to track worker fatigue.

## Data Flow

### Conversational AI Loop
1.  **User Input:** Worker speaks into the app. Audio is captured via `useVoiceRecorder`.
2.  **Transcription:** Audio is sent to the server and transcribed using Groq's Whisper model.
3.  **Context Gathering:** Server fetches real-time weather and traffic data based on user location.
4.  **Unified AI Processing:** Transcription + Context is sent to Gemini 1.5 Flash.
    -   **Sentiment Analysis:** Determines mood (e.g., "stressed", "happy").
    -   **Data Extraction:** Identifies entities like earnings (`1200`), platform (`Uber`), or hours (`5`).
    -   **Response Generation:** Crafts a personalized, empathetic Hinglish response.
5.  **Synthesis & Playback:** The text response is converted to speech (Edge TTS) and played back to the user.

## Security

-   **Authentication:** Dual-strategy using JWT (JSON Web Tokens).
    -   Local Strategy (Email/Password) via Bcrypt.
    -   OAuth 2.0 Strategy (Google) via Passport.js.
-   **Authorization:** Middleware ensures only authenticated users can access personal data.
