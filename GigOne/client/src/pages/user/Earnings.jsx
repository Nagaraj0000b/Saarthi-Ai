/**
 * @fileoverview Earnings Page.
 * Dedicated view for granular financial tracking and historical income analysis.
 * Supports CRUD operations and displays voice-extracted check-in earnings.
 *
 * @module client/pages/user/Earnings
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { earningsApi } from "../../services/earningsApi";

export default function Earnings() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    platform: "Uber",
    amount: "",
    hours: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    earningsApi
      .getEarnings()
      .then((data) => setEntries(data))
      .catch((err) => console.error("Failed to fetch earnings:", err))
      .finally(() => setLoading(false));
  }, []);

  // Summary computations
  const totalEarnings = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const avgPerHour = totalHours > 0 ? (totalEarnings / totalHours).toFixed(0) : 0;

  const openAddForm = () => {
    setEditingEntry(null);
    setFormData({ platform: "Uber", amount: "", hours: "", date: new Date().toISOString().split("T")[0] });
    setShowForm(true);
  };

  const openEditForm = (entry) => {
    setEditingEntry(entry);
    setFormData({
      platform: entry.platform,
      amount: String(entry.amount),
      hours: String(entry.hours),
      date: new Date(entry.date).toISOString().split("T")[0],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await earningsApi.deleteEarning(id);
      setEntries((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.hours) return;
    try {
      setSubmitting(true);
      const payload = {
        platform: formData.platform,
        amount: Number(formData.amount),
        hours: Number(formData.hours),
        date: formData.date,
      };

      if (editingEntry) {
        const updated = await earningsApi.updateEarning(editingEntry._id, payload);
        setEntries((prev) => prev.map((e) => (e._id === editingEntry._id ? updated : e)));
      } else {
        const newEntry = await earningsApi.addEarning(payload);
        setEntries((prev) => [newEntry, ...prev]);
      }

      setShowForm(false);
      setEditingEntry(null);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const platformEmoji = { Uber: "🚗", Swiggy: "🍔", Rapido: "🏍️", Other: "📦" };

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">🔷 Project</div>
        <span className="sidebar-section-label">Main</span>
        <button className="sidebar-link" onClick={() => navigate("/user/dashboard")}>🏠 Dashboard</button>
        <button className="sidebar-link active" onClick={() => navigate("/user/earnings")}>💰 Earnings</button>
        <button className="sidebar-link" onClick={() => navigate("/user/work-logs")}>📋 Work Logs</button>
        <button className="sidebar-link" onClick={() => navigate("/user/suggestions")}>💡 Suggestions</button>
        <span className="sidebar-section-label">Insights</span>
        <button className="sidebar-link" onClick={() => navigate("/user/weekly-report")}>📊 Weekly Report</button>
        <button className="sidebar-link" onClick={() => navigate("/user/platforms")}>🔗 Platforms</button>
        <button className="sidebar-link" onClick={() => navigate("/user/shift-planner")}>🕐 Shift Planner</button>
        <span className="sidebar-section-label">Alerts</span>
        <button className="sidebar-link" onClick={() => navigate("/user/settings")}>⚙️ Settings</button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <span className="topbar-badge">💰 Earnings Tracker</span>
        </header>

        <div className="earnings-page-content">
          {/* Header */}
          <div className="earnings-page-header">
            <h1 className="earnings-page-title">Earnings</h1>
            <button className="earnings-add-btn" onClick={openAddForm}>+ Add Entry</button>
          </div>

          {/* Summary cards */}
          <div className="earnings-summary-row">
            <div className="earnings-summary-card">
              <span className="earnings-summary-label">Total Earned</span>
              <span className="earnings-summary-value accent">₹{totalEarnings.toLocaleString("en-IN")}</span>
            </div>
            <div className="earnings-summary-card">
              <span className="earnings-summary-label">Total Hours</span>
              <span className="earnings-summary-value">{totalHours.toFixed(1)} hrs</span>
            </div>
            <div className="earnings-summary-card">
              <span className="earnings-summary-label">Avg ₹/hr</span>
              <span className="earnings-summary-value primary">₹{avgPerHour}</span>
            </div>
            <div className="earnings-summary-card">
              <span className="earnings-summary-label">Entries</span>
              <span className="earnings-summary-value">{entries.length}</span>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="earnings-loading">Loading earnings...</div>
          ) : entries.length === 0 ? (
            <div className="earnings-empty">
              <p>No earnings recorded yet.</p>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                Complete a voice check-in or tap "+ Add Entry" to log your first shift!
              </p>
            </div>
          ) : (
            <div className="earnings-table-wrapper">
              <table className="earnings-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Platform</th>
                    <th>Earned</th>
                    <th>Hours</th>
                    <th>₹/hr</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry._id}>
                      <td>{new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td>
                        <span className="earnings-platform-pill">
                          {platformEmoji[entry.platform] || "📦"} {entry.platform}
                        </span>
                      </td>
                      <td className="earnings-amount-cell">₹{entry.amount.toLocaleString("en-IN")}</td>
                      <td>{entry.hours} hrs</td>
                      <td className="earnings-rate-cell">₹{entry.hours > 0 ? (entry.amount / entry.hours).toFixed(0) : 0}</td>
                      <td className="earnings-actions-cell">
                        <button className="earnings-action-btn edit" onClick={() => openEditForm(entry)} title="Edit">✏️</button>
                        <button className="earnings-action-btn delete" onClick={() => handleDelete(entry._id)} title="Delete">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="earnings-form-overlay" onClick={() => { setShowForm(false); setEditingEntry(null); }}>
          <form className="earnings-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2 className="earnings-form-title">{editingEntry ? "Edit Entry" : "Log Earnings"}</h2>

            <label className="label">Platform</label>
            <select
              className="input"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            >
              <option value="Uber">🚗 Uber</option>
              <option value="Swiggy">🍔 Swiggy</option>
              <option value="Rapido">🏍️ Rapido</option>
              <option value="Other">📦 Other</option>
            </select>

            <label className="label" style={{ marginTop: "0.8rem" }}>Amount Earned (₹)</label>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="e.g. 1200"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />

            <label className="label" style={{ marginTop: "0.8rem" }}>Hours Worked</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 6"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              required
            />

            <label className="label" style={{ marginTop: "0.8rem" }}>Date</label>
            <input
              className="input"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />

            <div className="earnings-form-actions">
              <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditingEntry(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : editingEntry ? "Update" : "Save Entry"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
