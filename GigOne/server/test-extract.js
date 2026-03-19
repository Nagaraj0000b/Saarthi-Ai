/**
 * @fileoverview Standalone Debug Utility for Conversational Data Extraction.
 * Validates the LLM-based extraction logic in isolation.
 * 
 * @module server/test-extract
 * @requires dotenv
 * @requires ./services/conversationService
 */

require("dotenv").config();
const { extractData } = require("./services/conversationService");

/**
 * Executes a sample extraction test turn.
 */
async function test() {
  // Test Case: Extraction of numerical earnings from natural language
  const result = await extractData("earnings", "I made around 1200 rupees today");
  console.log("Extracted:", result, "Type:", typeof result);
}

test();
