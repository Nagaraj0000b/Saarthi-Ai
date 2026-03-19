# Development Setup

## Prerequisites

-   Node.js v18+
-   MongoDB (Local or Atlas)
-   API Keys:
    -   Google Gemini
    -   Groq Cloud
    -   OpenWeatherMap
    -   TomTom
    -   Google OAuth Client Credentials

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/project.git
    cd Project
    ```

2.  **Install Server Dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Install Client Dependencies:**
    ```bash
    cd ../client
    npm install
    ```

4.  **Python TTS Service:**
    Install dependencies for the local Edge TTS server:
    ```bash
    cd ../openai-edge-tts
    pip install -r requirements.txt
    ```

## Environment Variables

Create a `.env` file in `server/`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/project
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENWEATHER_API_KEY=...
TOMTOM_API_KEY=...
```

## Running the App

You will need three separate terminal windows running simultaneously to power the full system:

1.  **Start Python TTS Server:**
    ```bash
    # In openai-edge-tts/
    python app/server.py
    ```

2.  **Start Node Backend:**
    ```bash
    # In server/
    npm run dev
    ```

3.  **Start React Frontend:**
    ```bash
    # In client/
    npm run dev
    ```

Access the app at `http://localhost:5173`.
