/**
 * @fileoverview Traffic Intelligence Service using TomTom API.
 * Provides real-time traffic flow data to assist gig workers with operational planning.
 * 
 * @module server/services/trafficService
 * @requires axios
 */

const axios = require("axios");

/**
 * Retrieves traffic flow information for a specific geographical coordinate.
 * 
 * @async
 * @function getTraffic
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {Promise<Object>} Standardized traffic metrics (speed, congestion, level).
 */
const getTraffic = async (lat, lon) => {
  const API_KEY = process.env.TOMTOM_API_KEY;
  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${API_KEY}&point=${lat},${lon}`;

  try {
    const res = await axios.get(url);
    const flow = res.data.flowSegmentData;

    const currentSpeed = flow.currentSpeed;
    const freeFlowSpeed = flow.freeFlowSpeed;
    const congestion = Math.round((1 - currentSpeed / freeFlowSpeed) * 100);

    let level = "clear";
    if (congestion > 60) level = "heavy";
    else if (congestion > 30) level = "moderate";

    return {
      current_speed_kmh: currentSpeed,
      free_flow_speed_kmh: freeFlowSpeed,
      congestion_percent: Math.max(0, congestion), // Ensure non-negative
      traffic_level: level, 
    };
  } catch (err) {
    console.error("TomTom Traffic API error:", err.message);
    return { traffic_level: "unknown", congestion_percent: 0 };
  }
};

module.exports = { getTraffic };
