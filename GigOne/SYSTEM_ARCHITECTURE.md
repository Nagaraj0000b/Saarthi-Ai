# System Architecture: GigOne Intelligent Ecosystem

## 1. Executive Summary
GigOne is an advanced, ML-powered companion platform designed for gig workers (delivery, ride-hailing, etc.). The system goes beyond simple job listing by providing **context-aware intelligent recommendations**. It utilizes a hybrid architecture combining a robust Node.js orchestration layer, a high-performance Python Machine Learning inference microservice, and real-time environmental intelligence to predict profitability and optimize worker well-being.

## 

## 2. High-Level System Topology
The system follows a **Distributed Microservices Architecture** comprised of three primary layers:

### A. Presentation Layer (Android Mobile Client)
*   **Role:** The user interface for gig workers.
*   **Key Features:** 
    *   **Intelligent Dashboard:** Displays ranked job opportunities with personalized "Why this job?" justifications.
    *   **Proactive UX:** Implements "Smart Nudges" and empty-state handling to guide users toward job selection.
    *   **Telemetry:** Captures user interactions and work history to feed the backend.

### B. Orchestration Layer (Node.js Backend)
*   **Role:** The central intelligence hub and API Gateway.
*   **Core Responsibilities:**
    *   **Context Aggregation:** Parallel execution of service calls to gather weather, traffic, user workload, and sentiment data.
    *   **Feature Engineering (Pre-Inference):** Transforms raw user data (skills, preferences) and environmental data into a structured feature vector for the ML engine.
    *   **Service Coordination:** Orchestrates communication between the mobile client and the Python ML microservice.
    
### C. Intelligence & Inference Layer (Python/FastAPI)
*   **Role:** High-performance predictive engine.
*   **Core Responsencies:**
    *   **XGBoost Inference:** Executes the trained XGBoost model to predict `predicted_earning` and `is_compatible` status.
    *   **Feature Matching:** Processes numerical and categorical features (e.g., `skill_bike`, `temp`, `congestion_percent`).
    *   **High Availability:** Operates as a standalone microservice, allowing independent scaling and updates.

---

## 3. Detailed Component Breakdown

### 3.1 The Intelligence Pipeline (The "Brain")
The core value proposition lies in the **Hybrid Recommendation Engine**:

1.  **Primary Path (ML-Driven):**
    *   **Input:** A JSON payload containing processed features (Time, Weather, Traffic, User Skills, Burnout Risk, Workload).
    *   **Processing:** The FastAPI service loads a pre-trained XGBoost model and executes inference.
    *   **Output:** A ranked list of jobs with predicted earnings and compatibility flags.
2.  **Secondary Path (Rule-Based Fallback):**
    *   **Trigger:** Activated if the Python Microservice is unreachable or times out.
    *   **Logic:** Uses a static `jobMapping` and `jobBaselineService` to provide a safe, albeit less precise, recommendation based on fixed skill-to-category mappings.

### 3.2 Environmental & Sentiment Intelligence
The system integrates "Contextual Awareness" through specialized services:
*   **Weather Intelligence (`weatherService.js`):** Integrates with OpenWeather API to provide real-time temperature and precipitation forecasts (critical for delivery/ride-hating demand prediction).
*   **Mobility Intelligence (`trafficService.js`):** Monitors urban congestion levels to adjust job profitability estimates.
*   **Natural Language Processing (`geminiService.js`):** Utilizes Google Vertex AI (Gemini 2.5 Flash) to:
    *   **Sentiment Analysis:** Analyze user transcripts to detect stress, fatigue, or excitement.
    *   **Data Extraction:** Parse unstructured "Hinglish" (Hindi + English) transcripts to automatically extract earnings, hours worked, and platforms used.
*   **Wellbeing & Fatigue Monitoring (`wellbeingRiskService.js`):** Evaluates "Burnout Risk" by analyzing recent workload patterns and sentiment, influencing the "Reasoning" engine to suggest lower-impact work during high-risk periods.

---

## 4. Data Architecture & Flow

### 4.1 Data Flow Diagram (Request/Response Cycle)
1.  **Trigger:** Android Client requests `GET /recommendations`.
2.  **Context Gathering:** Node.js Backend initiates `Promise.all()` to query:
    *   `User` Database (Skills, Registered Jobs).
    *   `Weather` Service (Temp, Condition).
    *   `Traffic` Service (Congestion %).
    *   `Workload` Service (Hours today/last 3 days).
    *   `Sentiment` Service (Average Mood).
3.  **Inference Request:** Node.js sends the aggregated `mlContext` payload to the **Python FastAPI** via `POST /recommend`.
4.  **Result Transformation:** Node.js receives predictions, applies final business filters (user preferences), and generates human-readable **"Smart Reasons"** (e.g., *"High demand due to rain"*).
5.  **Delivery:** JSON response sent to Android Client.

### 4.2 Feature Vector Composition
The ML model relies on a highly engineered feature set:
| Feature Group | Examples |
| :--- | :--- |
| **Temporal** | Hour of day, Day of week |
| **Environmental** | Temperature, Weather Condition, Traffic Level, Congestion % |
| **User Competency** | Boolean flags for skills (e.g., `skill_bike`, `skill_car`, `skill_digital`) |
| **Workload/Fatigue** | Hours worked today, Consecutive work days, Burnout risk score |
  **Psychological** | Average mood score (via NLP) |

---

## 5. Technology Stack Summary

| Layer | Technology |
| :--- | :--- |
| **Mobile** | Android (Kotlin/Java) |
| **Backend Orchestration** | Node.js, Express.js |
| **AI/ML Inference** | Python, FastAPI, XGBoost |
| **NLP / LLM** | Google Vertex AI (Gemini 2.5 Flash) |
| **Database** | MongoDB |
| **External APIs** | OpenWeatherMap, Google Maps (Traffic) |
| **Infrastructure** | Microservices, RESTful API |

---

## 6. Security & Reliability
*   **Fault Tolerance:** The system implements a robust **Circuit Breaker pattern** where the Node.js backend falls back to a rule-based engine if the ML microservice fails.
*   **Security:** Use of `credential.json` for GCP Vertex AI and `.env` for API keys; strict validation of user input via `validation.js`.
*   **Concurrency:** High-concurrency context gathering using Node.js asynchronous patterns to minimize latency.
