/**
 * @fileoverview Chat API Service.
 * Specialized service for handling conversational AI interactions, context fetching, 
 * and integration with the localized Edge Text-to-Speech server.
 * 
 * @module client/services/chatApi
 * @requires axios
 */

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TTS_URL = import.meta.env.VITE_TTS_URL || "http://localhost:5050";
const TTS_API_KEY = import.meta.env.VITE_TTS_API_KEY || "my_free_project_key";

/**
 * Retrieve authorization headers dynamically.
 * Prioritizes URL-embedded tokens (post-OAuth redirect) before falling back to LocalStorage.
 * 
 * @private
 */
const getHeaders = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || localStorage.getItem('token');
  return { Authorization: token ? `Bearer ${token}` : '' };
};

/**
 * Chat API Object
 * Encapsulates all network interactions for the conversational domain.
 */
export const chatApi = {
  /**
   * Fetches real-time weather and traffic insights.
   * @async
   */
  getContext: async (lat, lon) => {
    const res = await axios.get(`${API_URL}/chat/context?lat=${lat}&lon=${lon}`, {
      headers: getHeaders()
    });
    return res.data;
  },

  /**
   * Fetches the historical burnout state without touching location logic.
   * @async
   */
  getBurnoutStatus: async () => {
    const res = await axios.get(`${API_URL}/chat/burnout`, {
      headers: getHeaders()
    });
    return res.data;
  },

  /**
   * Fetches completed conversational check-ins (Work Logs).
   * @async
   */
  getHistory: async () => {
    const res = await axios.get(`${API_URL}/chat/history`, {
      headers: getHeaders()
    });
    return res.data;
  },

  /**
   * Initializes a new check-in session.
   * @async
   */
  startSession: async (language = null) => {
    const res = await axios.post(`${API_URL}/chat/start`, { language }, {
      headers: getHeaders()
    });
    return res.data;
  },

  /**
   * Deletes a check-in conversation entirely.
   * @async
   */
  deleteSession: async (id) => {
    const res = await axios.delete(`${API_URL}/chat/${id}`, {
      headers: getHeaders()
    });
    return res.data;
  },

  /**
   * Submits a recorded audio blob for processing.
   * Uses multipart/form-data for efficient binary transmission.
   * @async
   */
  sendAudioReply: async (audioBlob, conversationId, lat = null, lon = null, language = null) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("conversationId", conversationId);
    if (lat && lon) {
      formData.append("lat", lat);
      formData.append("lon", lon);
    }
    if (language) {
      formData.append("language", language);
    }

    const res = await axios.post(`${API_URL}/chat/reply`, formData, {
      headers: {
        ...getHeaders(),
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },
  
  /**
   * Generates natural speech from text using the Microsoft Neural TTS engine.
   * Proxying via the openai-edge-tts local server.
   * @async
   */
  synthesizeSpeech: async (text, voice = "en-IN-NeerjaNeural") => {
    const response = await fetch(`${TTS_URL}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TTS_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        voice: voice,
        response_format: "mp3",
        speed: 1.25,
      }),
    });

    if (!response.ok) throw new Error(`TTS Engine Error: ${response.status}`);
    return await response.blob();
  },
};
