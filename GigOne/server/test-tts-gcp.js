const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const path = require('path');

async function testGCPTTS() {
  console.log("Initializing GCP Text-to-Speech Client...");
  
  // Use the same credential.json that Speech-to-Text uses
  const keyFilename = path.join(__dirname, 'credential.json');
  
  if (!fs.existsSync(keyFilename)) {
    console.error(`ERROR: Cannot find ${keyFilename}. Please ensure your Google Service Account JSON file is in the server root.`);
    process.exit(1);
  }

  const client = new textToSpeech.TextToSpeechClient({ keyFilename });

  const request = {
    input: {text: 'Namaste! Welcome to GigOne. How can I help you today?'},
    // Select the language and SSML voice gender (optional)
    voice: {languageCode: 'en-IN', name: 'en-IN-Neural2-C'},
    // select the type of audio encoding
    audioConfig: {audioEncoding: 'MP3'},
  };

  console.log("Sending request to Google Cloud...");
  try {
    const [response] = await client.synthesizeSpeech(request);
    const outputFile = path.join(__dirname, 'output-test.mp3');
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(outputFile, response.audioContent, 'binary');
    console.log(`✅ Success! Audio content written to file: ${outputFile}`);
  } catch (error) {
    console.error("❌ Failed to synthesize speech:", error);
  }
}

testGCPTTS();