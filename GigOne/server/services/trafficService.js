/**
 * @fileoverview Traffic intelligence service using the TomTom API.
 */

const axios = require("axios");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");

const getTraffic = async (lat, lon) => {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError("Valid coordinates are required for traffic lookup", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  const apiKey = requireEnv("TOMTOM_API_KEY");
  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${apiKey}&point=${latitude},${longitude}`;

  try {
    const response = await axios.get(url, { timeout: 8000 });
    const flow = response.data?.flowSegmentData;

    if (!flow) {
      throw new AppError("Traffic data is unavailable for this location", 502, {
        code: "TRAFFIC_UNAVAILABLE",
        expose: false,
      });
    }

    const currentSpeed = Number(flow.currentSpeed) || 0;
    const freeFlowSpeed = Number(flow.freeFlowSpeed) || 0;
    const congestion =
      freeFlowSpeed > 0
        ? Math.round((1 - currentSpeed / freeFlowSpeed) * 100)
        : 0;

    let level = "clear";
    if (congestion > 60) {
      level = "heavy";
    } else if (congestion > 30) {
      level = "moderate";
    }

    return {
      current_speed_kmh: currentSpeed,
      free_flow_speed_kmh: freeFlowSpeed,
      congestion_percent: Math.max(0, congestion),
      traffic_level: level,
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
