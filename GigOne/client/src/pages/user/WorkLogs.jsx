/**
 * @fileoverview Work Logs Page.
 * Displays qualitative historical data from AI check-ins.
 * Includes transcript viewing, sentiment scores, and burnout history.
 *
 * @module client/pages/user/WorkLogs
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { chatApi } from "../../services/chatApi";

export default function WorkLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const handleDeleteLog = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this check-in? This action cannot be undone.",
      )
    )
      return;
    try {
      await chatApi.deleteSession(id);
      setLogs((prev) => prev.filter((log) => log._id !== id));
      if (selectedLog && selectedLog._id === id) setSelectedLog(null);
    } catch (err) {
      console.error("Failed to delete log:", err);
    }
  };

  useEffect(() => {
    chatApi
      .getHistory()
      .then((data) => setLogs(data))
      .catch((err) => console.error("Failed to fetch work logs:", err))
      .finally(() => setLoading(false));
  }, []);

  const getSentimentEmoji = (score) => {
    if (score === undefined || score === null) return "😐";
    if (score >= 0.5) return "😄";
    if (score >= 0.1) return "🙂";
    if (score >= -0.1) return "😐";
    if (score >= -0.5) return "😟";
    return "😫";
  };

  const platformEmoji = { Uber: "🚗", Swiggy: "🍔", Rapido: "🏍️", Other: "📦" };

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">🔷 Project</div>
        <span className="sidebar-section-label">Main</span>
        <button
          className="sidebar-link"
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
          className="sidebar-link active"
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
        <header className="dashboard-topbar">
          <span className="topbar-badge">📋 Work Logs & Check-ins</span>
        </header>

        <div className="earnings-page-content">
          <div className="earnings-page-header">
            <h1 className="earnings-page-title">Shift History</h1>
          </div>

          <p
            style={{
              color: "var(--color-text-secondary)",
              marginBottom: "2rem",
            }}
          >
            Review your past AI check-ins, mood tracking, and burnout trends.
          </p>

          {loading ? (
            <div className="earnings-loading">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="earnings-empty">
              <p>No check-in logs found.</p>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.85rem",
                }}
              >
                Complete a daily check-in on the Dashboard to start tracking
                your shifts.
              </p>
            </div>
          ) : (
            <div className="worklog-grid">
              {logs.map((log) => {
                // Calculate average sentiment for the log
                const sentiments = log.messages
                  .filter((m) => m.sentiment && m.sentiment.score !== undefined)
                  .map((m) => m.sentiment.score);
                const avgScore =
                  sentiments.length > 0
                    ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
                    : null;
                const platform = log.extractedData?.platform || "Unknown";

                // Allow deletion ONLY if the log was created on the current calendar day
                const isToday =
                  new Date(log.createdAt).toDateString() ===
                  new Date().toDateString();

                return (
                  <div key={log._id} className="worklog-card">
                    <div className="worklog-card-header">
                      <span className="worklog-date">
                        {new Date(log.createdAt).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span className="worklog-platform-pill">
                        {platformEmoji[platform] || "📦"} {platform}
                      </span>
                    </div>

                    <div className="worklog-stats-row">
                      <div className="worklog-stat">
                        <span className="label">Mood</span>
                        <span
                          className="value emotion"
                          title={`Score: ${avgScore !== null ? avgScore.toFixed(2) : "N/A"}`}
                        >
                          {getSentimentEmoji(avgScore)}
                        </span>
                      </div>
                      <div className="worklog-stat">
                        <span className="label">Status</span>
                        <span
                          className={`value burnout ${log.burnoutStatus?.action === "Rest Required" ? "danger" : log.burnoutStatus?.action === "Take a Break" ? "medium" : "safe"}`}
                        >
                          {log.burnoutStatus?.action || "Safe"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        marginTop: "0.5rem",
                        width: "100%",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="btn"
                        style={{
                          flex: 1,
                          padding: "0.6rem",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--color-border)",
                          fontSize: "0.85rem",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => setSelectedLog(log)}
                      >
                        Read Transcript
                      </button>
                      {isToday && (
                        <button
                          className="btn"
                          style={{
                            flex: "none",
                            width: "40px",
                            height: "40px",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(255, 77, 109, 0.1)",
                            color: "#ff4d6d",
                            border: "1px solid rgba(255, 77, 109, 0.3)",
                          }}
                          onClick={() => handleDeleteLog(log._id)}
                          title="Delete Today's Check-in"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transcript Modal */}
      {selectedLog && (
        <div
          className="earnings-form-overlay"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="worklog-transcript-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Chat Transcript</h2>
              <span className="date-subtitle">
                {new Date(selectedLog.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <div className="modal-chat-body">
              {selectedLog.messages.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.role}`}>
                  <span className="bubble-author">
                    {msg.role === "user" ? "You" : "Chatbot"}
                  </span>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
