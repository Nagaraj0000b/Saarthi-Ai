# Testing Strategy

## Manual Testing

### Authentication
1.  **Sign Up:** Create a new user via the form. Verify redirection to Dashboard.
2.  **Login:** Log out and log back in.
3.  **Google Auth:** Click "Google", verify consent screen, and callback redirection.

### AI Chat Flow
1.  **Greeting:** Verify the AI greets you by name and mentions the weather.
2.  **Voice Interaction:**
    -   Hold the mic button.
    -   Speak a sentence (e.g., "I am feeling good, worked on Uber today").
    -   Release button.
    -   Verify:
        -   "Processing..." state appears.
        -   Transcription appears in the chat bubble.
        -   Audio reply plays back automatically.
        -   Conversation advances to the next logical step (e.g., asking for earnings).

## Automated Testing (Planned)

-   **Backend:** Jest + Supertest for API endpoint validation.
-   **Frontend:** Vitest + React Testing Library for component rendering and interaction tests.
-   **E2E:** Playwright for full user journey testing.

## Debug Scripts

Located in `server/`:

-   `node test-extract.js`: Tests the Gemini JSON extraction logic in isolation.
-   `node test-reply.js`: Simulates a full HTTP conversation loop (Start Session -> Reply) to verify server stability.
-   `node test-burnout.js`: Verifies the physiological math models for burnout detection against edge-case histories.
