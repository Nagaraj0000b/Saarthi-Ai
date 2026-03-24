# Traffic Service

`server/services/trafficService.js` sources real-time congestion data from TomTom Flow Segment API to inform context-aware recommendations.

- It builds the request URL by combining the worker’s latitude/longitude with `process.env.TOMTOM_API_KEY` and calls TomTom’s `flowSegmentData/absolute/10/json` endpoint via `axios` (`server/services/trafficService.js:7‑11`).  
- The response contains `flowSegmentData`, from which the service reads `currentSpeed` and `freeFlowSpeed`. It derives `congestion_percent = Math.round((1 - currentSpeed / freeFlowSpeed) * 100)` (clamped to ≥ 0) and categorizes the result into `traffic_level` strings (`clear`, `moderate`, `heavy`) based on that percentage (`server/services/trafficService.js:12‑30`).  
- If TomTom fails, it logs the error and returns a fallback object (`traffic_level: "unknown", congestion_percent: 0`) so `chatController.context` and other callers can keep presenting context even with intermittent API outages (`server/services/trafficService.js:31‑34`).

The chat controller or any context-aware recommendation logic can consume this payload to adjust tone/recommendations when traffic is bad, matching the “weather + traffic” context described in the documentation.
