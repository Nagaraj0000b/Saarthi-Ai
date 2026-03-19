/**
 * @fileoverview Custom hook for audio recording management.
 * Abstracts the complexity of the MediaRecorder API, providing a reactive interface 
 * for starting and stopping voice captures.
 * 
 * @module client/hooks/useVoiceRecorder
 * @requires react
 */

import { useState, useRef } from "react";

/**
 * useVoiceRecorder Hook
 * 
 * @returns {Object} { isRecording, startRecording, stopRecording }
 */
export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /**
   * Initializes the microphone stream and begins recording.
   * @async
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone hardware access failure:", err);
    }
  };

  /**
   * Stops the active recording and resolves with the final audio Blob.
   * @async
   * @returns {Promise<Blob>} The recorded audio as a webm blob.
   */
  const stopRecording = () => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error("No active MediaRecorder instance found."));
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        
        // Resource Cleanup: Release the hardware lock on the microphone
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        resolve(audioBlob);
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        reject(err);
      }
    });
  };

  return { isRecording, startRecording, stopRecording };
};
