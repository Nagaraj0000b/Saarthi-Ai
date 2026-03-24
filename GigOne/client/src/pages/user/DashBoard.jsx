/**
 * @fileoverview User Dashboard Page.
 * The central hub of the GigOne experience, featuring the Gigi AI conversational
 * companion, real-time weather/traffic integration, and earnings overview.
 *
 * @module client/pages/user/DashBoard
 * @requires react
 * @requires react-router-dom
 * @requires ../../hooks/useVoiceRecorder
 * @requires ../../services/chatApi
 */

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { chatApi } from "../../services/chatApi";
import { earningsApi } from "../../services/earningsApi";

/**
 * UserDashBoard Component
 *
 * Orchestrates multimodal AI interaction, live clock, geolocation-based
 * context fetching, and historical work/earnings summaries.
 *
 * @component DashBoard
 * @returns {JSX.Element}
 */
/**
 * Edge TTS Neural voice map for supported Indian languages.
 */
const LANGUAGE_VOICES = {
  "English":   "en-IN-NeerjaNeural",
  "Hindi":     "hi-IN-SwaraNeural",
  "Kannada":   "kn-IN-SapnaNeural",
  "Telugu":    "te-IN-ShrutiNeural",
  "Tamil":     "ta-IN-PallaviNeural",
  "Marathi":   "mr-IN-AarohiNeural",
  "Malayalam": "ml-IN-SobhanaNeural",
  "Bengali":   "bn-IN-TanishaaNeural",
  "Urdu":      "ur-IN-GulNeural",
  "Gujarati":  "gu-IN-DhwaniNeural",
};

export default function DashBoard() {
  const [time, setTime] = useState("");
  const navigate = useNavigate();

  // Language preference — persisted in localStorage
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => localStorage.getItem("gigone_language") || "English"
  );

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    localStorage.setItem("gigone_language", lang);
  };

  // Conversational State
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ready when you are! Tap the mic button to start your daily check-in.",
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [weatherData, setWeatherData] = useState(null);
  const [burnoutStatus, setBurnoutStatus] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const chatEndRef = useRef(null);
  const currentAudioRef = useRef(null);
  const playbackSessionRef = useRef(0);

  /**
   * Generates and plays audio for text seamlessly, chunking by sentences to reduce Time-to-First-Audio.
   * @private
   */
  const playSpeech = (text, voice) => {
    const currentSession = ++playbackSessionRef.current;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];
    let audioQueue = new Array(sentences.length).fill(null);
    let nextToPlayIndex = 0;
    let isPlaying = false;

    const playNext = () => {
      if (playbackSessionRef.current !== currentSession) return;
      if (nextToPlayIndex >= sentences.length) {
        isPlaying = false;
        return;
      }

      const audioSrc = audioQueue[nextToPlayIndex];
      if (audioSrc === "SKIP") {
        nextToPlayIndex++;
        playNext();
        return;
      }

      if (audioSrc === "NATIVE") {
        isPlaying = true;
        const utterance = new SpeechSynthesisUtterance(sentences[nextToPlayIndex]);
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find((v) => v.lang.includes("hi-IN") || v.lang.includes("en-IN"));
        if (indianVoice) utterance.voice = indianVoice;
        utterance.rate = 1.1;
        
        utterance.onend = () => {
          if (playbackSessionRef.current !== currentSession) return;
          nextToPlayIndex++;
          playNext();
        };
        utterance.onerror = () => {
          if (playbackSessionRef.current !== currentSession) return;
          nextToPlayIndex++;
          playNext();
        };
        window.speechSynthesis.speak(utterance);
        return;
      }

      if (audioSrc) {
        isPlaying = true;
        const audio = new Audio(audioSrc);
        currentAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(audioSrc);
          if (playbackSessionRef.current !== currentSession) return;
          currentAudioRef.current = null;
          nextToPlayIndex++;
          playNext();
        };
        audio.play().catch(e => {
          console.warn("Audio play failed, skipping:", e);
          if (playbackSessionRef.current !== currentSession) return;
          nextToPlayIndex++;
          playNext();
        });
      } else {
        isPlaying = false;
      }
    };

    sentences.forEach((sentence, index) => {
      const cleanSentence = sentence.trim();
      if (!cleanSentence) {
        audioQueue[index] = "SKIP";
        if (index === nextToPlayIndex && !isPlaying) playNext();
        return;
      }

      chatApi.synthesizeSpeech(cleanSentence, voice).then(blob => {
        if (playbackSessionRef.current !== currentSession) return;
        audioQueue[index] = blob ? URL.createObjectURL(blob) : "NATIVE";
        if (index === nextToPlayIndex && !isPlaying) {
          playNext();
        }
      }).catch(err => {
        console.warn("Edge TTS pre-fetch failed:", err.message);
        if (playbackSessionRef.current !== currentSession) return;
        audioQueue[index] = "NATIVE";
        if (index === nextToPlayIndex && !isPlaying) {
          playNext();
        }
      });
    });
  };

  /**
   * Manual session initializer.
   * @private
   */
  const initChat = async () => {
    try {
      setIsProcessing(true);
      const data = await chatApi.startSession(selectedLanguage);
      setConversationId(data.conversationId);
      setMessages([{ role: "assistant", text: data.reply }]);
      playSpeech(data.reply, LANGUAGE_VOICES[selectedLanguage]);
    } catch (err) {
      console.error("Session initialization failure:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Dynamic auto-scroll to latest message.
   */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Component Mounting Logic: Auth persistence, clock initiation, and geolocation.
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const user = urlParams.get("user");

    // Persistence layer for Google OAuth redirects
    if (token && user) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", user);
      window.history.replaceState({}, document.title, "/user/dashboard");
    }

    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    };

    // Parallel fetch for non-location dependent data
    chatApi
      .getBurnoutStatus()
      .then(setBurnoutStatus)
      .catch((err) => console.warn("Failed fetching burnout status:", err));

    earningsApi
      .getWeeklySummary()
      .then(setWeeklyData)
      .catch((err) => console.warn("Failed fetching weekly summary:", err));

    // Context Gathering: Location-aware services
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lon } = position.coords;
          setLocation({ lat, lon });
          try {
            const contextData = await chatApi.getContext(lat, lon);
            if (contextData?.weather?.current)
              setWeatherData(contextData.weather.current);
          } catch (err) {
            console.error("Context fetch failed:", err);
          }
        },
        (error) => console.warn("Geolocation access denied:", error.message),
      );
    }

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const recordingStartTimeRef = useRef(0);

  /**
   * Recording Start Handler
   */
  const handleMicDown = () => {
    // Stop any ongoing speech queue when user presses mic
    playbackSessionRef.current++;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    if (!conversationId) {
      initChat();
      return;
    }
    if (!isProcessing) {
      recordingStartTimeRef.current = Date.now();
      startRecording();
    }
  };

  /**
   * Recording Stop & Submission Handler
   */
  const handleMicUp = async () => {
    if (!isRecording) return;

    // Minimum hold threshold to filter accidental taps
    const duration = Date.now() - recordingStartTimeRef.current;
    if (duration < 400) {
      await stopRecording();
      return;
    }

    try {
      setIsProcessing(true);
      const audioBlob = await stopRecording();

      setMessages((prev) => [
        ...prev,
        { role: "user", text: "🎙️ (Processing voice...)" },
      ]);

      const data = await chatApi.sendAudioReply(
        audioBlob,
        conversationId,
        location.lat,
        location.lon,
        selectedLanguage,
      );

      if (data.burnoutStatus) {
        setBurnoutStatus(data.burnoutStatus);
      }
      // Refresh overview panel after check-in completes
      earningsApi
        .getWeeklySummary()
        .then(setWeeklyData)
        .catch(() => {});

      setMessages((prev) => {
        const newMsgs = prev.slice(0, -1);
        return [
          ...newMsgs,
          { role: "user", text: data.transcription },
          { role: "assistant", text: data.reply },
        ];
      });
      playSpeech(data.reply, LANGUAGE_VOICES[selectedLanguage]);
    } catch (err) {
      console.error("Voice interaction error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dashboard-page">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">🔷 Project</div>
        <span className="sidebar-section-label">Main</span>
        <button
          className="sidebar-link active"
          onClick={() => navigate("/user/dashboard")}
        >
          🏠 Dashboard
        </button>
        <button
          className="sidebar-link"
          onClick={() => navigate("/user/earnings")}
        >
          💰 Earnings
        </button>
        <button
          className="sidebar-link"
          onClick={() => navigate("/user/work-logs")}
        >
          📋 Work Logs
        </button>
        <button
          className="sidebar-link"
          onClick={() => navigate("/user/suggestions")}
        >
          💡 Suggestions
        </button>
        <span className="sidebar-section-label">Insights</span>
        <button
          className="sidebar-link"
          onClick={() => navigate("/user/weekly-report")}
        >
          📊 Weekly Report
        </button>
        <button
          className="sidebar-link"
          onClick={() => navigate("/user/platforms")}
        >
          🔗 Platforms
        </button>
        <button
          className="sidebar-link"
          onClick={() => navigate("/user/shift-planner")}
        >
          🕐 Shift Planner
        </button>
        <span className="sidebar-section-label">Alerts</span>
        <button
          className="sidebar-link"
          onClick={() => navigate("/user/settings")}
        >
          ⚙️ Settings
        </button>
      </aside>

      <div className="dashboard-main">
        {/* Top Operational Bar */}
        <header className="dashboard-topbar">
          <span className="topbar-badge active">🟢 Chatbot Online</span>
          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={handleLanguageChange}
            title="AI Response Language"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: "20px",
              color: "var(--color-accent)",
              fontSize: "0.78rem",
              fontWeight: 600,
              padding: "0.25rem 0.75rem",
              cursor: "pointer",
              outline: "none",
              fontFamily: "inherit",
            }}
          >
            {Object.keys(LANGUAGE_VOICES).map((lang) => (
              <option key={lang} value={lang} style={{ background: "#0d0e1a", color: "#fff" }}>
                🌐 {lang}
              </option>
            ))}
          </select>
          {weatherData ? (
            <>
              <span className="topbar-badge">
                {weatherData.condition === "Rain" ? "🌧" : "🌤"}{" "}
                {Math.round(weatherData.temp)}°C · {weatherData.city}
              </span>
            </>
          ) : (
            <span className="topbar-badge">📍 Fetching context...</span>
          )}
          <span className="topbar-clock">{time}</span>
        </header>

        <div className="dashboard-center">
          {/* AI Interface Panel */}
          <section className="ai-avatar">
            <span className="ai-status-chip">
              {isProcessing
                ? "⏳ Thinking..."
                : isRecording
                  ? "🔴 Recording..."
                  : "🎙 Listening"}
            </span>
            <div className="ai-avatar-circle">
              <img
                src="/gigi-avatar.png"
                alt="Chatbot AI"
                style={{ width: "100%", height: "100%", borderRadius: "50%" }}
              />
            </div>
            <h2 className="ai-name">Chatbot</h2>
            <p className="ai-tagline">Your Gig Companion</p>
            <div className="ai-chat-box">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className="ai-bubble"
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <p
                    className="ai-bubble-label"
                    style={{
                      color:
                        msg.role === "user"
                          ? "var(--color-accent)"
                          : "var(--color-primary)",
                    }}
                  >
                    {msg.role === "user" ? "You" : "Chatbot"}
                  </p>
                  <p style={{ margin: 0 }}>{msg.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <button
              className={`ai-mic-btn ${isRecording ? "recording" : ""}`}
              onMouseDown={handleMicDown}
              onMouseUp={handleMicUp}
              onMouseLeave={handleMicUp}
              onTouchStart={(e) => {
                e.preventDefault();
                handleMicDown();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleMicUp();
              }}
              disabled={isProcessing}
            >
              🎤
            </button>
            <span className="ai-mic-label">
              {isProcessing
                ? "Thinking..."
                : isRecording
                  ? "Release to send"
                  : "Hold to speak"}
            </span>
          </section>

          {/* Performance Overview Panel */}
          <section className="overview-panel">
            <h2 className="overview-title">Today's Overview</h2>

            {/* Burnout Risk Widget */}
            <div
              className="earnings-card"
              style={{
                marginBottom: "1.5rem",
                borderLeft: burnoutStatus?.isBurnoutAlert
                  ? "4px solid #ff4d4f"
                  : burnoutStatus?.isStressWarning
                    ? "4px solid #faad14"
                    : "4px solid var(--color-accent)",
              }}
            >
              <p className="earnings-card-label">Mental Fatigue Risk</p>
              <p>
                <span
                  className="earnings-amount"
                  style={{
                    fontSize: "1.3rem",
                    color: burnoutStatus?.isBurnoutAlert
                      ? "#ff4d4f"
                      : burnoutStatus?.isStressWarning
                        ? "#faad14"
                        : "var(--color-accent)",
                  }}
                >
                  {burnoutStatus
                    ? burnoutStatus.action
                    : "Analyzing History..."}
                </span>
              </p>
              {burnoutStatus && (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.6)",
                    marginTop: "0.5rem",
                    marginBottom: 0,
                  }}
                >
                  5-Day Mood Trend: {burnoutStatus.averageScore > 0 ? "+" : ""}
                  {burnoutStatus.averageScore}
                </p>
              )}
            </div>

            <div className="earnings-card">
              <p className="earnings-card-label">Current Progress</p>
              <p>
                <span className="earnings-amount">
                  {weeklyData
                    ? `₹${weeklyData.totalEarned.toLocaleString("en-IN")} this week`
                    : "Loading..."}
                </span>
              </p>
              {weeklyData && (
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", margin: "0.25rem 0 0.5rem" }}>
                  {weeklyData.totalHours.toFixed(1)} hrs · ₹{weeklyData.avgPerHour}/hr avg
                </p>
              )}
              <div className="bar-chart">
                {(weeklyData?.dailyEarnings ?? [0,0,0,0,0,0,0]).map((val, i) => {
                  const max = Math.max(...(weeklyData?.dailyEarnings ?? [1]));
                  const pct = max > 0 ? Math.round((val / max) * 90) + 10 : 10;
                  return (
                    <div
                      key={i}
                      className={`bar ${val > 0 && pct > 70 ? "active" : ""}`}
                      style={{ height: `${pct}%`, opacity: val === 0 ? 0.25 : 1 }}
                      title={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i] + `: ₹${val}`}
                    ></div>
                  );
                })}
              </div>
            </div>
            <div className="work-logs-summary">
              <div className="work-logs-header">
                <span>Recent Shifts</span>
              </div>
              {weeklyData?.recentShifts?.length > 0 ? (
                weeklyData.recentShifts.map((shift) => (
                  <div key={shift._id} className="work-log-item">
                    <span className="work-log-platform">{shift.platform}</span>
                    <span className="work-log-meta">
                      {new Date(shift.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {shift.hours} hrs · ₹{shift.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              ) : weeklyData ? (
                <div className="work-log-item" style={{ opacity: 0.5 }}>
                  <span className="work-log-platform">No shifts this week</span>
                  <span className="work-log-meta">Complete a check-in to track earnings</span>
                </div>
              ) : (
                <div className="work-log-item" style={{ opacity: 0.5 }}>
                  <span className="work-log-platform">Loading shifts...</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
