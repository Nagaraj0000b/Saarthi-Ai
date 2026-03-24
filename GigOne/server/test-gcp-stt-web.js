const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const speech = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2; // Using Translate V2 API
const fs = require('fs');

const app = express();
expressWs(app); // Enable WebSockets

// Make sure your credentials exist
const keyFilename = path.join(__dirname, 'credentials.json');
if (!fs.existsSync(keyFilename)) {
    console.error(`\n[ERROR]: Missing credentials! \nPlease place 'credential.json' at:\n${keyFilename}\n`);
    process.exit(1);
}

const speechClient = new speech.SpeechClient({ keyFilename });
const translateClient = new Translate({ keyFilename });

// Basic configuration for standard audio recording via WebSockets
const request = {
    config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        // We will attempt to auto-detect the spoken language.
        // It's helpful to provide a hint of likely languages for faster detection.
        // We include English, Hindi, Bengali, Tamil, etc.
        languageCode: 'en-IN', 
        alternativeLanguageCodes: ['hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'gu-IN', 'mr-IN', 'ml-IN', 'kn-IN'],
    },
    interimResults: true,
};

app.use(express.static('public'));

app.ws('/api/speech', (ws, req) => {
    console.log('[Socket] Connected. Waiting for audio...');
    
    // Create a recognized stream when the socket connects
    const recognizeStream = speechClient
        .streamingRecognize(request)
        .on('error', (error) => {
            console.error('[GCP STT Error]:', error);
            if (ws.readyState === 1) ws.send(JSON.stringify({ error: error.message }));
        })
        .on('data', async (data) => {
            if (data.results[0] && data.results[0].alternatives[0]) {
                const transcript = data.results[0].alternatives[0].transcript;
                const isFinal = data.results[0].isFinal;
                const languageCode = data.results[0].languageCode; // See what GCP detected
                
                let translation = null;

                // We only translate when the speech is "Final" to save translation API calls
                // and to prevent jumpy/constantly changing translations.
                if (isFinal) {
                    try {
                        // Translate API will auto-detect the source language when translating to 'en'
                        const [translatedText] = await translateClient.translate(transcript, 'en');
                        translation = translatedText;
                        console.log(`[STT Final] (Detected: ${languageCode || 'auto'}): ${transcript}  -->  [Translation] English: ${translation}`);
                    } catch (err) {
                        console.error('[GCP Translate Error]:', err.message);
                        translation = `[Translation Error: Make sure Cloud Translation API is enabled]`;
                    }
                } else {
                    console.log(`[STT Interim] ${transcript}`);
                }
                
                // Send the transcription back to the frontend
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        transcript: transcript,
                        detectedLanguage: languageCode || 'auto',
                        translation: translation, // Will be null for interim results
                        isFinal: isFinal
                    }));
                }
            }
        });

    ws.on('message', (message) => {
        // message is coming as binary ArrayBuffer from browser AudioWorklet
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.write(message);
        }
    });

    ws.on('close', () => {
        console.log('[Socket] Disconnected. Stopping stream.');
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.end();
        }
    });
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`🎤 Live Multi-Language Speech & Translation Server running!`);
    console.log(`🗣️ Expected Input: Any Indian Language (Auto-Detecting)`);
    console.log(`🇺🇸 Translating to: English (en)`);
    console.log(`👉 Open http://localhost:${PORT} in your browser`);
    console.log(`=========================================\n`);
});
