# Saarthi: Optimizing Gig Worker Platform Recommendations using ML based on Environmental Dynamics and Worker Sentiment

---

## 1. Introduction

*   **The Gig Economy:** Transformed modern labor by offering flexible, on-demand work across ride-hailing (Uber, Ola), food delivery (Swiggy, Zomato), and quick commerce (Blinkit, Zepto).
*   **The Challenge:** Flexibility brings practical challenges, primarily unpredictable income and physical/mental strain.
*   **Lack of Tools:** Workers lack timely decision-support systems to optimize their earnings and prioritize their health simultaneously.
*   **Our Focus:** Creating an intelligent, context-aware support layer (Saarthi) that acts as a practical assistant rather than just a job-matching platform or a basic notification system.

---

## 2. Motivation

*   **Decision Uncertainty:** Gig workers make constant, time-sensitive decisions under uncertain conditions (changing demand, bad weather, traffic, fatigue).
*   **Information Silos:** Current platforms provide limited, isolated information, requiring manual judgment and app-switching by the worker.
*   **Core Problems Addressed:**
    *   **Unstable Earnings:** Fluctuating income without predictive insights.
    *   **Health and Safety Risks:** Avoidable burnout due to long hours (e.g., >10 hours/day) and harsh environmental conditions.
    *   **High Mental Effort:** Continuous stress from trial-and-error choices during daily operations.

---

## 3. Existing Work & Literature Review

*   **Platform Biases:** Current platforms rely on basic job matching using skewed internal dataset metrics, preventing cross-platform optimizations.
*   **Sentiment Analysis Limitations:** Prior analytic systems rely on traditional lexical tools (e.g., VADER) or simple Recurrent Neural Networks (RNNs).
    *   *Drawback:* These fail entirely on code-mixed dialects, sarcasm, and context-dependent frustration typical of gig workers in India (e.g., "Bhai aaj traffic bahut ganda tha, I am dead tired").
*   **Inadequate Well-being Tools:** No existing system actively monitors cumulative hours worked against emotional exhaustion to predict worker burnout in real-time.

---

## 4. Proposed Solution: Saarthi Architecture

*   **Native Kotlin Android App:** A mobile-first client architecture capturing user context and providing voice interactions (`MainActivity.kt`, `DashboardViewModel.kt`).
*   **Node.js Backend & API Gateway:** An Express/MongoDB stack managing telemetry, user identity, and active Nudge Evaluation (e.g., `environmentalNudgeEvaluator` and `hourlyTargetScheduler`).
*   **FastAPI ML Engine:**
    *   Predicts Hourly Earnings and Burnout Risk (`saarthi_earnings_model.json` & `saarthi_wellbeing_model.json`).
    *   Uses 22 dynamic input columns including temperature, humidity, congestion, and historical workload data.
    *   LangGraph endpoint (`/chat/turn`) processing Google Cloud Speech transcriptions via LLM to extract hours worked and worker sentiment dynamically.

---

## 5. Work Done Till Now

*   **Robust ML Pipeline Developed:** Implemented eXtreme Gradient Boosting (XGBoost) models for tabular data predictions supporting 26 platforms across 5 job categories.
*   **Synthetic Dataset & Open APIs:** Created 50,000 diverse synthetic data rows to actively prevent platform and demographic biases. Used OpenWeather API and Google Maps Distance Matrix for live metrics.
*   **Conversational Check-In Flow:** Developed a voice-first UI where workers perform daily check-ins; an automated finite state machine tracks the chat flow and parses gig data cleanly into structured format.
*   **Proactive Nudge Engine:** Designed an automated notification layer (`burnoutNudgeEvaluator.js`) that tracks consecutive work days and daily hours.
    *   *Example Logics:* Checks if user worked >10 hours, sending: "Long Day — Rest Well Tonight". Checks for "High" wellbeing risk score (out of 100) and dispatches "Take a Break — You Deserve It" alerts automatically.

---

## 6. Results Achieved

*   **Earnings Predictor Performance:**
    *   Achieved an **R-Squared Predictor Accuracy of 93.6% (0.9359)**.
    *   Calculated a steady Root Mean Square Error (RMSE) of ₹20.64.
    *   Discovered through SHAP values that vehicle compatibility is uniquely dominant (10x more important than the next feature) in optimizing gig routing.
*   **Burnout Classifier Reliability:**
    *   Tested an independent XGBoost booster identifying exhaustion risks natively within the Python framework using confidence scoring.
    *   Demonstrated real-time intervention by safely sending appropriate priority levels directly to worker dashboards without generating unnecessary false alarms.
*   **Conversational Accuracy:** State-of-the-art context windowing successfully categorizes code-mixed, localized worker exhaustion outperforming traditional lexical models.
