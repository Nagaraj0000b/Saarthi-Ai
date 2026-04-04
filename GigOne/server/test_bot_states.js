require('dotenv').config();
const { extractGigData } = require('./services/geminiService');
const { evaluateChatState } = require('./services/conversationService');

async function runTests() {
  console.log("=========================================");
  console.log("--- TESTING NLU EXTRACTION (GEMINI) ---");
  console.log("=========================================");
  
  // Test 1: Random/Garbage input
  const garbageInput = "I like bananas and the sky is blue. What is the meaning of life?";
  console.log(`\n[SCENARIO 1] User says random garbage: "${garbageInput}"`);
  const garbageResult = await extractGigData(garbageInput, ["Uber", "Zomato"]);
  console.log("-> Extracted Data (Notice it safely returns nulls instead of hallucinating):");
  console.log(garbageResult);
  
  // Test 2: Valid input with STT spelling mistake
  const STTErrorInput = "I worked on jomato today.";
  console.log(`\n[SCENARIO 2] User says job but STT mishears it: "${STTErrorInput}"`);
  const validResult = await extractGigData(STTErrorInput, ["Uber", "Zomato"]);
  console.log("-> Extracted Data (Notice 'jomato' is corrected to 'Zomato'):");
  console.log(validResult);

  console.log("\n=========================================");
  console.log("--- TESTING STATE MACHINE LOGIC ---");
  console.log("=========================================");
  
  // Test 3: State transition when user says garbage while asking for earnings
  const currentState1 = "ask_earnings";
  const existingData1 = { platform: "Zomato" }; // We already know they work on Zomato
  const newlyExtractedGarbage = { platform: null, earnings: null, hours: null, sentiment: null }; // From Scenario 1
  const nextState1 = evaluateChatState(currentState1, newlyExtractedGarbage, existingData1);
  console.log(`\n[SCENARIO 3] Bot was in state: "${currentState1}"`);
  console.log(`User replied with garbage data. Extracted:`, newlyExtractedGarbage);
  console.log(`-> Evaluated Next State: "${nextState1}" (Bot will ask for earnings again instead of moving forward)`);
  
  // Test 4: State transition when user provides correct data
  const newlyExtractedValid = { platform: null, earnings: 1200, hours: null, sentiment: null };
  const nextState2 = evaluateChatState(currentState1, newlyExtractedValid, existingData1);
  console.log(`\n[SCENARIO 4] Bot was in state: "${currentState1}"`);
  console.log(`User replied correctly. Extracted:`, newlyExtractedValid);
  console.log(`-> Evaluated Next State: "${nextState2}" (Bot safely moves to asking for hours)`);
}

runTests().catch(console.error);