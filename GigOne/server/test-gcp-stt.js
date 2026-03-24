const path = require('path');
const speech = require('@google-cloud/speech');
const Microphone = require('node-microphone');

// Configure your credential file path and region details here
const keyFilename = path.join(__dirname, 'credential.json');

// Ensure you have credential.json in the same directory as this script!
const client = new speech.SpeechClient({ keyFilename });

// Basic configuration for standard audio recording
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US'; // Or 'en-IN' for Indian English

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  },
  interimResults: true, // Shows partial results while you speak
};

// Create a stream to send audio to the Cloud Speech API
const recognizeStream = client
  .streamingRecognize(request)
  .on('error', (err) => {
    console.error('\n[Google Speech API Error]:', err.message);
    if (err.message.includes('NOT_FOUND')) {
        console.error('Make sure credential.json is in the server folder and is a valid Google Cloud Service Account key.');
    }
  })
  .on('data', data => {
    const transcript = data.results[0] && data.results[0].alternatives[0]
      ? data.results[0].alternatives[0].transcript
      : '\n\nReached transcription time limit, press Ctrl+C\n';
      
    // Overwrite the current line with interim results
    process.stdout.write(`\r[STT Result]: ${transcript}`);
  });

console.log('🎤 Listening... Speak into your microphone.');
console.log('Press Ctrl+C to stop.\n');

// Use node-microphone which defaults to arecord on Linux/Mac, but can attempt to use ffmpeg/sox if available.
// On Windows it often relies on sox, but we can try letting it find default devices.
const mic = new Microphone({
  rate: sampleRateHertz,
  channels: 1,
  debug: false
});

const micStream = mic.startRecording();

micStream.on('error', (err) => {
  console.error('\n[Microphone Error]:', err.message);
});

micStream.pipe(recognizeStream);

process.on('SIGINT', () => {
  console.log('\nStopping recording...');
  mic.stopRecording();
  process.exit();
});
