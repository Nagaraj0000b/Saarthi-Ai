/**
 * @fileoverview Earnings API Service.
 * Handles all network interactions for the earnings tracking domain.
 *
 * @module client/services/earningsApi
 * @requires axios
 */

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getHeaders = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || localStorage.getItem("token");
  return { Authorization: token ? `Bearer ${token}` : "" };
};

export const earningsApi = {
  /**
   * Fetches all earnings entries for the authenticated user.
   * @async
   */
  getEarnings: async () => {
    const res = await axios.get(`${API_URL}/earnings`, {
      headers: getHeaders(),
    });
    return res.data;
  },

  /**
   * Records a new earnings entry.
   * @async
   */
  addEarning: async ({ platform, amount, hours, date }) => {
    const res = await axios.post(
      `${API_URL}/earnings`,
      { platform, amount, hours, date },
      { headers: getHeaders() }
    );
    return res.data;
  },

  /**
   * Updates an existing earnings entry.
   * @async
   */
  updateEarning: async (id, { platform, amount, hours, date }) => {
    const res = await axios.put(
      `${API_URL}/earnings/${id}`,
      { platform, amount, hours, date },
      { headers: getHeaders() }
    );
    return res.data;
  },

  /**
   * Fetches a summary of the current week's earnings for the dashboard overview.
   * Returns: { totalEarned, totalHours, avgPerHour, dailyEarnings[7], recentShifts }
   * @async
   */
  getWeeklySummary: async () => {
    const res = await axios.get(`${API_URL}/earnings/weekly`, {
      headers: getHeaders(),
    });
    return res.data;
  },

  /**
   * Deletes an earnings entry.
   * @async
   */
  deleteEarning: async (id) => {
    const res = await axios.delete(`${API_URL}/earnings/${id}`, {
      headers: getHeaders(),
    });
    return res.data;
  },
};
