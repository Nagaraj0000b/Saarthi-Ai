# Session Update - Android UX & Backend Sync

## Changes Implemented

1. **Replaced openai-edge-tts with Google Cloud TTS**
   - Removed dependency on local python TTS server.
   - Built a custom `ttsService` in the Express backend using `@google-cloud/text-to-speech`.
   - Android App `TtsPlayer` now securely fetches TTS blobs directly from the Express backend via JWT authorization.

2. **Dual-Transcript Conversational Logic (Backend)**
   - `speechService` now returns both the *Original Text* (e.g. Hindi/Tamil) and *Translated Text* (English).
   - The AI generates natural, localized replies using the *Original Text*.
   - The Sentiment and Burnout engines use the *Translated Text* for higher analytical accuracy.

3. **Android Swiggy-Style UX Overhaul**
   - **Navigation:** Moved Profile to the top-right of the Dashboard. Added a new "Reports" tab to the bottom navigation.
   - **Profile Screen:** Completely redesigned with a professional layout showing Name, Phone, and Email. Added dynamic settings sub-screens for Languages, Platforms, Vehicles, and Daily Target.
   - **Dynamic Preferences:** Users can now search, add, and remove multiple Work Platforms, Vehicles, and Languages using a custom Search-and-Add component.
   - **Theme Engine:** Integrated Dark Mode support.

4. **New Android Screen: Weekly Reports**
   - Created `ReportsScreen.kt` with a visual representation of total weekly earnings and platform-wise breakdown.

## TODOs / Next Steps

- [ ] Investigate Android microphone upload failure ("Could not connect to server" during `sendAudioReply`).
- [ ] Make the conversational flow error proof.
- [ ] Fix profile details (Email and Phone number) saving issue (Persistence logic verified, needs UI testing).
