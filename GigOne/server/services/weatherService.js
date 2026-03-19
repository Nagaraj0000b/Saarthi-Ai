/**
 * @fileoverview Weather Intelligence Service using OpenWeather API.
 * Fetches current conditions and next-day forecasts to provide contextual AI suggestions.
 * 
 * @module server/services/weatherService
 * @requires axios
 */

const axios = require("axios");

/**
 * Aggregates current and future weather state for a given location.
 * 
 * @async
 * @function getWeatherContext
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {Promise<Object>} Composite weather object containing current and tomorrow's data.
 */
const getWeatherContext = async (lat, lon) => {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

  try {
    const [currentRes, forecastRes] = await Promise.all([
      axios.get(currentUrl),
      axios.get(forecastUrl)
    ]);

    const currentData = currentRes.data;
    const current = {
      city: currentData.name,
      temp: currentData.main.temp,
      feels_like: currentData.main.feels_like,
      condition: currentData.weather[0].main,
      description: currentData.weather[0].description,
    };

    const list = forecastRes.data.list;
    const tomorrowDateString = new Date(Date.now() + 86400000).toISOString().split("T")[0]; 

    // Target morning hours for the next-day forecast (9 AM)
    let tomorrowForecast = list.find((item) => 
      item.dt_txt.startsWith(tomorrowDateString) && item.dt_txt.includes("09:00:00")
    ) || list.find((item) => item.dt_txt.startsWith(tomorrowDateString));

    const tomorrow = tomorrowForecast ? {
      temp: tomorrowForecast.main.temp,           
      condition: tomorrowForecast.weather[0].main,
      description: tomorrowForecast.weather[0].description,
    } : { condition: "Unknown" };

    return { current, tomorrow };
  } catch (error) {
    console.error("OpenWeather API Error:", error.message);
    return { current: { condition: "Unknown" }, tomorrow: { condition: "Unknown" } };
  }
};

module.exports = { getWeatherContext };
