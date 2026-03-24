/**
 * @fileoverview Weather intelligence service using the OpenWeather API.
 */

const axios = require("axios");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");

const getWeatherContext = async (lat, lon) => {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError("Valid coordinates are required for weather lookup", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  const apiKey = requireEnv("OPENWEATHER_API_KEY");
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

  try {
    const [currentResponse, forecastResponse] = await Promise.all([
      axios.get(currentUrl, { timeout: 8000 }),
      axios.get(forecastUrl, { timeout: 8000 }),
    ]);

    const currentData = currentResponse.data;
    const forecastList = forecastResponse.data?.list;

    if (!currentData?.main || !currentData?.weather?.[0] || !Array.isArray(forecastList)) {
      throw new AppError("Weather data is unavailable for this location", 502, {
        code: "WEATHER_UNAVAILABLE",
        expose: false,
      });
    }

    const current = {
      city: currentData.name,
      temp: currentData.main.temp,
      feels_like: currentData.main.feels_like,
      condition: currentData.weather[0].main,
      description: currentData.weather[0].description,
    };

    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const tomorrowForecast =
      forecastList.find(
        (item) =>
          item.dt_txt?.startsWith(tomorrowDate) && item.dt_txt.includes("09:00:00")
      ) || forecastList.find((item) => item.dt_txt?.startsWith(tomorrowDate));

    const tomorrow = tomorrowForecast
      ? {
          temp: tomorrowForecast.main?.temp,
          condition: tomorrowForecast.weather?.[0]?.main,
          description: tomorrowForecast.weather?.[0]?.description,
        }
      : { condition: "Unknown" };

    return { current, tomorrow };
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
