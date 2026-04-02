# Traffic Module for Saarthi App

## 1. Abstract

**Summary:** This details the Architecture and Implementation of the Traffic Module, a situational awareness service for the Saarthi platform. The system retrieves real-time local congestion data based on the worker's coordinates. This data is used to inform the Gemini LLM of the worker's driving conditions and feeds into the Wellbeing-Aware Safety Layer to estimate physiological strain and adjust platform recommendations accordingly.

## 2. About the System

**Project name:** Saarthi (GigOne)

The Traffic Module operates as an intelligent background service that gauges the friction of the gig worker's immediate environment. It performs three primary functions:

* **Congestion Fetching:** Looking up live traffic severity around the user's current `lat`/`lon`.
* **Workload Strain Estimation:** Providing a key variable to the Wellbeing Risk Module (heavy traffic equals higher stress accumulation per hour).
* **Dynamic Platform Guidance:** Helping the Platform Recommendation Engine penalize platforms that require long-distance driving during severe gridlock.

## 3. Detailed Introduction

### Background
Traffic congestion is a leading cause of gig worker fatigue, directly impacting both earnings (fewer trips per hour) and mental wellbeing (frustration, physical strain). Existing loggers track time but fail to contextualize *how difficult* that time was.

### Solution
The Traffic Module actively polls surrounding congestion levels during check-ins to contextualize the shift. It provides a real-world modifier to both the earnings estimator and the burnout detector.

### Technical Usages
* **Mapping / Traffic API:** For fetching live congestion density and route delays.
* **Parallel Processing:** Executed concurrently with STT to ensure zero user-facing latency.
* **Node.js/Express:** Orchestrated in the backend via `trafficService.js`.

## 4. System Architecture & Methodology

### 4.1 The Congestion Evaluation Pipeline
Operating alongside the Weather module, this pipeline captures the worker's location, retrieves a localized traffic index, and maps it to a "Strain Multiplier" that influences both AI empathy and systemic wellbeing calculations.

### 4.2 Stage 1: Spatial Querying
* **Technological Stack:** Axios/Fetch in Node.js calling an external traffic endpoint.
* **Bounding Box Logic:** The `lat`/`lon` coordinates are used to request traffic density within an immediate radius (e.g., 2-5 km) of the worker.

### 4.3 Stage 2: Contextual Traffic Classification
Traffic data is notoriously noisy. The service simplifies raw routing delays into actionable brackets:
* `Low`: Normal driving conditions.
* `Moderate`: Standard urban friction.
* `Severe`: Gridlock. Triggers a high-strain penalty in the wellbeing module.

### 4.4 Stage 3: AI & Wellbeing Injection
The classified traffic state is passed two ways:
1. **To Gemini:** So the AI can adjust its tone (e.g., "Traffic looks awful out there, drive safe").
2. **To the Burnout Service:** Where it acts as an aggravating variable. One hour worked in "Severe" traffic calculates as higher workload intensity than an hour in "Low" traffic.

## 5. Technical Implementation & Data Flow

### 5.1 Service Integration
Contained entirely within `server/services/trafficService.js`. Authentic calls are made via server-side secrets, keeping API keys secure.

### 5.2 Algorithmic Role in Recommendations
In the `contextAdjustmentService.js`, traffic data is used to adjust bounded platform modifiers. 
* *Example:* If traffic is `Severe`, a local food delivery platform (short radius) might rank higher than an inter-city cab platform (long radius).

### 5.3 Data Schema: Traffic Context (JSON Output)
The simplified object passed to the conversational and recommendation engines:

```json
{
  "congestionLevel": "Severe",
  "delayFactor": 0.8,
  "strainMultiplier": 1.25,
  "summary": "Heavy gridlock detected within 5km."
}
```
* *Note:* `strainMultiplier` directly influences the fatigue calculations in the `burnoutService`.

### 5.4 Backend Data Pipeline (Sequential Execution)
1. **Request:** Backend receives user audio blob + coordinates.
2. **Parallel Fetch:** `trafficService.getTraffic(lat, lon)` runs concurrently with Speech-To-Text processing.
3. **Strain Evaluation:** The traffic `strainMultiplier` is passed into `calculateAndSaveBurnout`.
4. **Response Generation:** 
   * The Gemini LLM is fed the `congestionLevel`.
   * The AI generates a supportive, context-aware reply.
5. **Persistence:** The traffic conditions during the check-in are optionally saved into the `Conversation` or `WorkLog` models for historical analysis.