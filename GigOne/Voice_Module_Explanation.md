# Voice Module Breakdown & Explanation

Here is a detailed breakdown of the voice module so you'll be fully prepared to explain it and point out the exact code files to your professor. 

The best way to explain this module is to break it down into four main "phases" of a voice interaction. You can walk him through exactly what happens when a user presses the microphone button.

---

## Phase 1: Recording on the Frontend
**The Goal:** Capture what the user says from the browser.

**What happens:** 
When the user holds the mic button on the dashboard, the browser asks for permission to use the microphone. We capture chunks of audio from their mic until they let go of the button. Then, we stitch those chunks together into a single `.webm` audio file and send it as a `multipart/form-data` request to our backend server.

**Where to show the code in the project:**
1. **`client/src/hooks/useVoiceRecorder.js`**: This is a custom React hook that does the heavy lifting of talking to the browser's `MediaRecorder` API. Points to highlight:
```javascript
  const startRecording = async () => {
    // 1. Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    
    // 2. Push audio data chunks as they come in
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };
    mediaRecorder.start();
  };
```

2. **`client/src/pages/user/DashBoard.jsx`**: Here, we use the `useVoiceRecorder` hook and attach the `startRecording()` and `stopRecording()` functions to the `onMouseDown` and `onMouseUp` events of the mic button (`.gigi-mic-btn`).
```jsx
<button
  className={`ai-mic-btn ${isRecording ? "recording" : ""}`}
  onMouseDown={handleMicDown}
  onMouseUp={handleMicUp}
  disabled={isProcessing}
>
  🎤
</button>
```

3. **`client/src/services/chatApi.js`**: We use Axios and `FormData` to send the binary audio blob to the Node.js backend along with the user's GPS coordinates.
```javascript
  sendAudioReply: async (audioBlob, conversationId, lat, lon) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    // ... Append lat/lon and post to /api/chat/reply
    // ...
```

---

## Phase 2: Transcribing Audio to Text (Backend)
**The Goal:** Convert the raw `.webm` audio file into readable text so our AI can understand it.

**What happens:** 
The backend receives the audio blob and temporarily saves it to an `/uploads` folder. We immediately send this audio file to the **Groq API** (which runs the open-source **Whisper** speech-to-text model). We chose Groq specifically because its inference speed is incredibly fast, allowing for near-instant transcription. 

**Where to show the code in the project:**
1. **`server/routes/chat.js`**: Here, we use `multer` to handle the incoming audio file attachment.
```javascript
// Uses Multer to temporarily save the audio to /uploads
router.post("/reply", auth, upload.single("audio"), reply);
```

2. **`server/controllers/chatController.js`**: In the `reply` function, we take `req.file.path` and pass it to our `transcribeAudio()` service.
```javascript
    // Parallelize compute-intensive transcription and external API calls
    const [transcription, weather] = await Promise.all([
      transcribeAudio(filePath), // Hits Groq API for Whisper
      getWeatherContext(lat, lon)
    ]);
```
*(Note: At the end of this function, we aggressively delete the temporary file using `fs.unlink(filePath)` to save disk space).*

3. **`server/services/groqService.js`**: Here is where we actually call the Groq API utilizing the `whisper-large-v3` model.

---

## Phase 3: The Chatbot "Brain" (Gemini LLM)
**The Goal:** Determine the user's intent, extract structured data (like earnings/hours), and generate a human-like response.

**What happens:** 
Now we have the text of what the user said. We feed this to **Google Gemini**. Because Gemini is incredibly smart and can handle complex JSON schemas, we instruct Gemini to do three things *simultaneously* in one prompt:
1. Come up with a natural, conversational reply.
2. Estimate the user's mood/sentiment (to help with the Burnout Detection feature).
3. Extract any specific data mapping to the current "Step" in the check-in process (e.g., if the user says "I made 500 rupees", Gemini isolates "500").

**Where to show the code in the project:**
1. **`server/services/conversationService.js`**: This is the heart of the chatbot logic. We inject real-world context (like live Weather or Traffic) and the user's transcription into the prompt we build for Gemini via `processChatTurn()`.

2. **`server/services/geminiService.js`**: Contains the API caller `analyzeSentiment()` that talks directly to Gemini (we use the fast `gemini-1.5-flash` or `flash-lite` model for speed). Gemini responds with a structured JSON like this:
```json
{
  "reply": "Awesome job! 1200 rupees is a solid day!",
  "sentiment": { "mood": "Happy", "score": 0.8 },
  "extractedValue": 1200
}
```

---

## Phase 4: Text-to-Speech (TTS Voice Generation)
**The Goal:** Convert Gemini's text reply back into a high-quality human voice for the worker to hear.

**What happens:** 
Our backend replies to the frontend with the text response and the extracted data. The frontend then asks a separate Text-to-Speech service to read that text aloud. We are using **Edge TTS** (a Python server) because it provides highly realistic, localized Indian English/Hindi (Hinglish) voices for free, drastically improving the UX over native browser robot voices.

**Where to show the code in the project:**
1. **`openai-edge-tts/app/server.py`**: Explain that this is a separate Python microservice. It exposes an endpoint that takes text and runs `edge_tts.Communicate()`, streaming back a high-quality `.mp3` audio stream.

2. **`client/src/pages/user/DashBoard.jsx` (Frontend TTS API calling)**: The frontend takes the text, hits the Python server chunk-by-chunk, turns the response into a Blob, and plays it.
```javascript
      // Hits the Python server to get the high-quality MP3 blob
      chatApi.synthesizeSpeech(cleanSentence).then(blob => {
        audioQueue[index] = blob ? URL.createObjectURL(blob) : "NATIVE";
        // Plays the synthesized audio chunk
      })
```

---

### Extra Tip for your Professor:
If he asks *why* you separated the Text-to-Speech into a Python server (`openai-edge-tts`) instead of keeping it all in Node.js, tell him:
> *"The open-source `edge-tts` library is natively built in Python and offers the highest quality free voices available. Trying to wrap it in Node.js would have been clunky or unreliable. By setting it up as a standalone microservice, we follow modern microservices architecture principles, keeping our node server lightweight while assigning the heavy audio streaming workload to Python."*
