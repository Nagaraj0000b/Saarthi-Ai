# Weather Service

`server/services/weatherService.js` pulls current and near-future weather data from OpenWeatherMap to add environmental context to check-ins and recommendations.

- It builds two URLs (current weather and forecast) using the worker’s latitude/longitude and `process.env.OPENWEATHER_API_KEY`, requesting metric units (`server/services/weatherService.js:8‑16`).  
- The helper calls both endpoints via `axios`, then maps the current response into a compact object (`city`, `temp`, `feels_like`, `condition`, `description`) and scans the forecast list for the next day’s 09:00 entry (or a fallback) to build a `tomorrow` summary (`server/services/weatherService.js:18‑41`).  
- Errors from OpenWeather are caught, logged, and replaced with fallback objects that report unknown conditions so the rest of the app can keep functioning even if the API fails (`server/services/weatherService.js:43‑46`).

The controller can combine this weather output with traffic data before calling the LLM, allowing the conversation to mention rain, heat, or other conditions when giving suggestions or platform recommendations.
