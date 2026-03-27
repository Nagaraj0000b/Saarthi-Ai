/**
 * @fileoverview Traffic intelligence service using the Google Maps Distance Matrix API (GCP).
 */

const axios = require("axios");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");

let missingKeyWarned = false;

/**
 * Calculates predictive traffic context for a target time.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} [targetTime] - Unix timestamp (seconds) for the future shift
 */
const getTraffic = async (lat, lon, targetTime) => {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError("Valid coordinates are required for traffic lookup", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const depTime = targetTime || Math.floor(Date.now() / 1000);

  if (!apiKey) {
    return {
      predicted_duration_mins: 20,
      base_duration_mins: 15,
      congestion_percent: 33,
      traffic_level: "moderate",
      target_time: new Date(depTime * 1000).toISOString()
    };
  }

  // We simulate a commute (e.g., 5km distance from current location) to measure congestion.
  // In a real app, we might use a fixed landmark or common worker hub.
  const destinationLat = latitude + 0.045; // Approx 5km North
  const destinationLon = longitude + 0.045; // Approx 5km East

  // departure_time must be in seconds
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${latitude},${longitude}&destinations=${destinationLat},${destinationLon}&departure_time=${depTime}&traffic_model=pessimistic&key=${apiKey}`;

  try {
    const response = await axios.get(url, { timeout: 8000 });
    const result = response.data?.rows?.[0]?.elements?.[0];

    if (response.data.status !== "OK" || !result || result.status !== "OK") {
      throw new AppError("Traffic data is unavailable for this location", 502, {
        code: "TRAFFIC_UNAVAILABLE",
        expose: false,
      });
    }

    const duration = result.duration.value; // base time in seconds
    const durationInTraffic = result.duration_in_traffic?.value || duration; // predicted time in seconds

    // Calculate congestion percentage relative to free flow (base duration)
    const congestion = Math.round(((durationInTraffic - duration) / duration) * 100);

    let level = "clear";
    if (congestion > 40) {
      level = "heavy";
    } else if (congestion > 15) {
      level = "moderate";
    }

    return {
      predicted_duration_mins: Math.round(durationInTraffic / 60),
      base_duration_mins: Math.round(duration / 60),
      congestion_percent: Math.max(0, congestion),
      traffic_level: level,
      target_time: new Date(depTime * 1000).toISOString()
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Traffic service is temporarily unavailable", 502, {
      code: "TRAFFIC_ERROR",
      expose: false,
      cause: error,
    });
  }
};

module.exports = { getTraffic };
