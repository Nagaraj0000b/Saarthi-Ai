/**
 * @fileoverview Standalone Debug Utility for Chat Reply Workflows.
 * Orchestrates a manual conversational turn to verify API responsiveness 
 * and end-to-end integration logic.
 * 
 * @module server/test-reply
 * @requires axios
 * @requires fs
 * @requires form-data
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

/**
 * Debug Reply Sequence
 * Simulates a check-in session and a subsequent reply.
 * 
 * @async
 * @function debugReply
 */
async function debugReply() {
  try {
    // Stage 1: Session Initialization
    console.log("🚀 Initializing test session...");
    const startRes = await axios.post('http://localhost:5000/api/chat/start', {}, {
      headers: {
        Authorization: 'Bearer test-token' 
      }
    });

    console.log("✅ Session initiated:", startRes.data);

  } catch (err) {
    // Comprehensive error reporting for debug visibility
    console.error("❌ Debug sequence failure:", err.response?.data || err.message);
  }
}

debugReply();
