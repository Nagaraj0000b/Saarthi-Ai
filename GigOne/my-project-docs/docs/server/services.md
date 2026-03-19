# External Services Integration

The server integrates with several third-party APIs to provide intelligence and context.

## AI Services

### Gemini Service (`services/geminiService.js`)
-   **Provider:** Google Vertex AI / Generative AI
-   **Model:** `gemini-1.5-flash`
-   **Role:** The "Brain". Handles NLG (Natural Language Generation), intent classification, and entity extraction.

### Groq Service (`services/groqService.js`)
-   **Provider:** Groq Cloud
-   **Model:** `whisper-large-v3`
-   **Role:** The "Ears". Provides near-instant speech-to-text transcription.

## Context Services

### Weather Service (`services/weatherService.js`)
-   **Provider:** OpenWeatherMap
-   **Endpoints:** Current Weather, 5-Day Forecast
-   **Role:** Provides atmospheric context. For example, if it's raining, the chatbot might suggest wearing a raincoat or expecting surge pricing.

### Traffic Service (`services/trafficService.js`)
-   **Provider:** TomTom Traffic API
-   **Endpoint:** Flow Segment Data
-   **Role:** Provides road congestion data. Helps the chatbot advise on whether traffic conditions are favorable for driving.

### Burnout Service (`services/burnoutService.js`)
-   **Provider:** Native (Mathematical Logic)
-   **Role:** Processes a worker's 5-day historic mood data using the Effort-Recovery Model and EMA to determine if they are at risk of mental fatigue or severe burnout.
