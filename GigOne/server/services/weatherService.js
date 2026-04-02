/**
 * @fileoverview Weather intelligence service using the OpenWeather 5-day/3-hour forecast.
 */

const axios = require("axios");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");

/**
 * Fetches weather context for the current time and a specific future target time.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} [targetTime] - Unix timestamp (seconds) for the future shift
 */
const getWeatherContext = async (lat, lon, targetTime) => {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError("Valid coordinates are required for weather lookup", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  const apiKey = requireEnv("OPENWEATHER_API_KEY");
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

  try {
    const response = await axios.get(forecastUrl, { timeout: 8000 });
    const forecastList = response.data?.list;

    if (!Array.isArray(forecastList) || forecastList.length === 0) {
      throw new AppError("Weather forecast is unavailable for this location", 502, {
        code: "WEATHER_UNAVAILABLE",
        expose: false,
      });
    }

    // Current weather is typically the first item in the forecast list (or we could fetch 'weather' endpoint)
    // For simplicity and to save API calls, we use the first item as "current"
    const currentData = forecastList[0];
    const current = {
      city: response.data.city?.name || "Unknown",
      temp: currentData.main.temp,
      condition: currentData.weather[0].main,
      description: currentData.weather[0].description,
    };

    let nextShift = null;
    if (targetTime) {
      // Find the forecast block closest to targetTime
      // forecastList items have 'dt' (Unix timestamp in seconds)
      let closest = forecastList[0];
      let minDiff = Math.abs(closest.dt - targetTime);

      for (const item of forecastList) {
        const diff = Math.abs(item.dt - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = item;
        }
      }

      nextShift = {
        time: closest.dt_txt,
        temp: closest.main.temp,
        condition: closest.weather[0].main,
        description: closest.weather[0].description,
        pop: closest.pop, // Probability of precipitation (0 to 1)
      };
    }

    return { current, nextShift };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Weather service is temporarily unavailable", 502, {
      code: "WEATHER_ERROR",
      expose: false,
      cause: error,
    });
  }
};

module.exports = { getWeatherContext };
