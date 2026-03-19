# Hooks & Utilities

## Custom Hooks

### `useVoiceRecorder`
**Path:** `hooks/useVoiceRecorder.js`

Manages the browser's MediaRecorder API to capture audio.

-   **State:** `isRecording` (boolean).
-   **Methods:**
    -   `startRecording()`: Requests mic permission and begins capturing chunks.
    -   `stopRecording()`: Stops capture, compiles chunks into a `Blob`, and returns it.

## API Services

### `chatApi`
**Path:** `services/chatApi.js`

A dedicated wrapper for chat-related network requests.

-   `startSession()`: POST `/api/chat/start`
-   `sendAudioReply(blob)`: POST `/api/chat/reply` (multipart/form-data)
-   `getContext(lat, lon)`: GET `/api/chat/context`
-   `synthesizeSpeech(text)`: POST to local Edge TTS service.

### `api` (Axios Instance)
**Path:** `lib/api.js`

The global Axios client configured with:
-   **Base URL:** From `VITE_API_URL`.
-   **Interceptors:** Automatically injects the `Authorization: Bearer <token>` header from LocalStorage into every request.

## Utilities

### `cn`
**Path:** `lib/utils.js`

A helper for conditionally merging Tailwind classes. Combines `clsx` and `tailwind-merge`.
