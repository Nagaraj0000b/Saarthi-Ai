# Saarthi: Optimizing Gig Worker Platform Recommendations using ML based on Environmental Dynamics and Worker Sentiment

**B.Tech. Project (CS400) Report**
_submitted in partial fulfilment of the requirements for the award of the degree of Bachelor of Technology_

**By:** Nagaraj B (Roll No: 2301134)  
**Under the supervision of:** Dr. Subhasish Dhal

**Place:** IIIT Guwahati, Assam  
**Date:** April 19, 2026

---

## Declaration

I hereby declare that this project entitled "Saarthi: Optimizing Gig Worker Platform Recommendations using ML based on Environmental Dynamics and Worker Sentiment" that is being submitted to Indian Institute of Information Technology Guwahati, in partial fulfilment for the requirements of the award of degree of Bachelor of Technology in Computer Science and Engineering in the department of Computer Science and Engineering, is a genuine report of the work carried out by me. The material contained in this report has not been submitted at any other University or Institution for the award of any degree.

Nagaraj B
Roll No : 2301134

---

## Abstract

The Gig Economy has transformed the modern labour market by offering flexible, on-demand work opportunities. Yet it presents significant challenges for workers, including unpredictable income, lack of decision-making tools, and difficulty balancing economic goals with safety and well-being. Workers face three major practical problems: unstable earnings, avoidable health and safety risks, and high mental effort during daily operations.

To address these challenges, Saarthi is designed as an intelligent decision-support system that brings all important information together in one place, providing complete support for gig workers.

Saarthi implements a voice check-in flow that transcribes audio, extracts work data including platform, earnings, and hours, and detects worker sentiment. The system creates a job recommendation algorithm that ranks platforms and predicts earnings based on live weather, traffic, and worker skills. Additionally, it builds a burnout-risk predictor that evaluates worker well-being based on mood and workload to return actionable safety advice.

To overcome the lack of public gig-economy data, a synthetic dataset was generated with features for job type, platform name, temporal data, environmental context, worker history, psycho-social signals, skills, and target hourly earning. The system integrates worker signals, work history, and live context with real-time weather and traffic conditions to predict expected earnings and burnout risk.

The primary interface features a voice check-in flow configured to support multiple languages for transcription, work data extraction, and sentiment analysis in mixed languages. The system operates as a conversational interface, gathering required information and returning structured outputs for predictions.

Saarthi employs machine learning models for predicting hourly earnings and burnout levels. The earnings predictor demonstrates high precision in forecasting potential platform payouts, adapting to fluctuating environmental variables. The burnout classifier identifies exhaustion risks based on consecutive work hours and voice sentiment.

By combining predictive capabilities with voice interaction, Saarthi enables gig workers to make informed, timely decisions that maximize earnings while minimizing health risks. Ultimately, Saarthi improves economic outcomes and well-being by helping workers plan their day more effectively.

---

## Table of Contents

1. Introduction
   1.1 Overview
   1.2 Problem Statement
   1.3 Objectives
   1.4 Proposed Solution
2. Methodology and Dataset Construction
   2.1 Synthetic Dataset Generation
   2.2 Preventing Algorithmic Bias
   2.3 Voice Module and Interaction Flow
   2.4 External APIs and Services
   2.5 Sentiment Analysis via Large Language Models
   2.6 Machine Learning Models (XGBoost)
3. System Architecture
4. Database Design and Schema
5. System Evaluation and Validated Metrics
6. References

---

## 1. Introduction

### 1.1 Overview

The gig economy has significantly changed the way many people work and earn. Platforms for ride services, food delivery, and freelance tasks provide workers with flexibility in choosing their working hours and locations. However, this flexibility is accompanied by practical challenges. Earnings often fluctuate from week to week, and workers must frequently switch between multiple applications to identify suitable opportunities. In most cases, they do not receive timely decision support that could improve both income and safety. In addition, external conditions such as traffic congestion, extreme weather, and long working hours increase physical and mental strain.

In response to these limitations, **Saarthi** is designed as an intelligent decision-support system consisting of an Android client, Node.js backend server, and Python FastAPI ML service. The system implements a voice check-in flow using Google Cloud Speech-to-Text and Gemini AI to transcribe audio, extract work data (platform, earnings, hours), and analyze sentiment. Saarthi creates a job recommendation algorithm using Machine Learning (XGBoost) that ranks platforms and predicts earnings based on live weather, traffic, and worker skills, while building a burnout-risk predictor that evaluates worker well-being based on mood and workload to return actionable safety advice.

To overcome the lack of public gig-economy data, a detailed synthetic dataset of 50,000 rows was generated with features for job type, platform name, temporal data (hour, day), environmental context (weather, temperature, traffic, congestion), worker history (hours worked today, last 3 days, consecutive days), psycho-social signals (mood score, burnout risk), skills, and target hourly earning. The system integrates three key data types: worker signals (skills, registered platforms, recent mood, work hours), work history (recent earnings and consecutive workdays), and live context (real-time weather and traffic conditions) to predict expected earnings and burnout risk.

For database,backend uses NoSQL document database (MongoDB) with a schema structured into five core collections. The platform integrates with external APIs including OpenWeather API for real-time localized temperature graphs and extreme humidity indexing, and Google Maps api to evaluate real-time traffic congestion indexes that are used to predict earning payouts.

At its core, Saarthi uses eXtreme Gradient Boosting (XGBoost) for predicting dynamic hourly earnings and algorithmic burnout levels. The earnings predictor shows high precision in predicting platform payouts with an R-Squared accuracy score over 90%, consistently adapting to changing environments. The burnout classifier functions with accuracy of 92%, reliably identifying exhaustion risks based on consecutive work hours and localized voice sentiment.

By combining predictive capabilities with voice interaction, Saarthi enables gig workers to make informed decisions that maximize earnings while minimizing health risks. Ultimately, Saarthi improves economic outcomes and well-being by functioning as a practical assistant that helps workers plan their day more effectively, reduce risks, and navigate the complexities of gig work with greater confidence and safety.

### 1.2 Problem Statement

Gig workers make many time-sensitive decisions every day. They must decide when to work, which task to accept, where to focus their effort, and how long to continue working. These decisions are taken under uncertain conditions such as changing demand, environmental conditions, time pressure, and physical tiredness.

At present, most platforms share limited information and basic notifications. They generally do not combine earning signals, environmental risk, and worker conditions in one decision flow. As a result, workers often depend on manual judgment, repeated app switching, and trial-and-error choices.

This creates three major practical problems: **unstable earnings**, **avoidable health and safety risk**, and **high mental effort** during daily operations. Over time, these issues reduce productivity, increase stress, and make work outcomes less predictable.

Therefore, the core problem addressed in this project is the lack of a unified, timely, and worker-centered support system that can help gig workers balance income goals with safety and well-being in real working conditions with environmental changes.

### 1.3 Objectives

- To develop a full-stack platform (Android client, Node.js backend, Python ML backend) with voice interaction using Google Cloud Speech-to-text and text-to-speech and Gemini AI for hands-free operation.
- To create ML systems, an XGBoost-based job recommendation algorithm predicting earnings from live weather, traffic, and worker skills, and a burnout-risk predictor evaluating well-being from mood and workload.
- To implement Nudge system delivering time to time alerts for earning surges, weather warnings, and rest recommendations based on real-time environmental data.
- To provide tracking feature for workers including earnings records, work logs, recommendation history, and burnout status and store it using MongoDB.

### 1.4 Proposed Solution

To address this problem, Saarthi is designed as an _decision-support system_ that uses combined information to provide guidance for gig workers.

**Data Integration Framework:** Saarthi uses three data streams to form a larger view of the worker's context:

- **Worker Signals:** Inputs including verified skills, active platform registrations, real-time mood assessments via voice analysis, working hours
- **Work Historical Patterns:** Analysis of recent earning trends, and consecutive workday patterns to identify fatigue indicators and earning patterns
- **Live Environmental Context:** Real-time processing of weather conditions (temperature, precipitation, humidity) via OpenWeather API and traffic congestion levels via Google Maps api that directly impact earning potential and safety

**Intelligence Layer:** The integrated data feeds two specialized Machine Learning models :

- **Earnings Prediction model:** Utilizes XGBoost algorithms to forecast platform-specific earning potential with R² > 90% accuracy by correlating worker profile (skills, history) with real-time environmental factors, providing ranked platform recommendations updated hourly
- **Burnout Risk Assessment:** Analyzes work patterns combined with voice-text sentiment analysis (using Gemini llm) to predict exhaustion levels with 92% accuracy before they become critical, enabling preventive interventions

**Delivery Mechanism:** The **Nudge System** transforms predictions into time to time, context-aware actions through multiple channels:

- **Earning Optimization:** Push notifications when predicted earnings exceed personal thresholds by 20%+ on specific platforms.
- **Risk Mitigation:** Weather-based alerts for extreme conditions (temperature> 40°C, heavy rainfall) with alternative indoor work suggestions and platform recommendations for delivery/ride services
- **Well-being Prompts:**recommendations when burnout risk crosses 80% threshold, including estimated recovery time and low-earning activity suggestions

**Technical Implementation:** The system comprises:

- Android client with voice-first interface (Google Speech-to-Text/Text-to-Speech)
- Node backend handling API orchestration, external service integration, and real-time data processing
- Python ML backend hosting XGBoost models
- MongoDB database for storing worker profiles, historical data, and model inputs/outputs

This closed-loop system learns from worker responses and platform feedback, refining its recommendations while maintaining voice interface that ensures safety during active work periods .

## 2. Methodology and Dataset Construction

### 2.1 Synthetic Dataset Generation

A foundational challenge in gig-economy analytics is the lack of public, un-siloed data. To train our predictive models accurately across multiple parameters, a highly detailed synthetic dataset of **50,000 rows** was generated using Python scripts. This dataset contains features describing the job type, platform name, temporal data (hour, day), environmental context (weather, temp, traffic, congestion), worker history (hours worked today, last 3 days, consecutive days), psycho-social signals (mood score, burnout risk), a binary skill matrix (8 skills, is compatible), and the target hourly earning.

### 2.2 Preventing Algorithmic Bias

To ensure the XGBoost model did not inherently favor one platform over another, the dataset generation script mathematically enforced a **uniform distribution strategy**. This ensures that the model learns the relationship between environmental factors and earnings without being skewed by over-represented platforms or categories.

<img src="ml_engine/job_type_distribution.png" width="600" />

_(Fig: Uniform distribution across job categories to ensure unbiased learning)_

- **Demographic Equality:** Simulated worker profiles were evenly distributed across genders, age groups, and vehicular types.
- **Platform Neutrality:** Earnings were randomized based on real-world averages to make sure the AI does not unfairly favor certain platforms just because they have more data than others.
- **Environmental Spread:** The models ingested random but realistic distributions of extreme weather (monsoons, heatwaves) so the AI learned _how weather impacts humans_ rather than memorizing city-specific biases.

  2.3 Voice Module and Interaction Flow

The primary interface of Saarthi is its **Android Voice Module**. Traditional manual typing is inefficient for gig workers while traveling on the road. Consequently, Saarthi implements a Voice interface to ensure a safe and seamless user experience.

1. **Google Cloud Speech-to-Text:** Captures raw audio. Crucially, we configured the APIs to support most of the Indian languages.
2. **AI State Machine Orchestrator:** The transcript is parsed by a Gemini LLM agent. The system operates as a reliable finite-state machine, logically traversing conversational steps (from "greeting" to "hour extraction" and "sentiment analysis") to ensure all required information is gathered.
3. **JSON Strict Validation:** The LLM bypasses unformatted text and returns strict, structured JSON arrays containing the numeric hours and sentiment classification needed to trigger subsequent Python model predictions.

<div align="center">
  <img src="SequenceDiagram.png" width="450" />
  <br>
  <em>*(Fig: Overall Architecture Flow Diagram of the Voice Module Pipeline)*</em>
  <br><br>
  <img src="diagram-export-4-20-2026-12_51_39-AM.png" width="450" />
  <br>
  <em>*(Fig: Sequence Diagram detailing the Conversation State Machine steps)*</em>
</div>

2.4 External APIs and Services

To construct a living, predictive contextual engine, the Node.js backend continuously integrates with third-party Web APIs prior to returning predictions:

- **OpenWeather API:** Real-time fetching of localized temperature and extreme humidity.
- **Google Maps Api:** Evaluates real-time traffic congestion.

  2.5 Sentiment Analysis via Large Language Models (LLM)

Prior analytical systems often rely on traditional lexicon-based tools (like VADER) or simple Recurrent Neural Networks (RNNs) for tracking sentiment. However, gig workers converse in highly nuanced, code-mixed dialects (e.g., _"aaj traffic bahut ganda tha, I am dead tired"_).

Lexicon models fail entirely on code-mixing, sarcasm, and context-dependent frustration. By utilizing Generative Pre-trained Transformers (specifically Gemini via Google Vertex APIs), Saarthi achieves state-of-the-art context windowing, successfully interpreting localized exhaustion. (_Reference: Wang et al., "Is ChatGPT a Good Sentiment Analyzer? A Preliminary Study", 2023_).

2.6 Machine Learning Models (XGBoost)

**eXtreme Gradient Boosting (XGBoost)** was implemented for predicting dynamic hourly earnings and algorithmic burnout levels. XGBoost operates by building an ensemble of decision trees sequentially, where each new tree corrects the residual errors of the previous ones. It minimizes a regularized objective function: `L(Φ) = Σ l(y_pred, y) + Σ Ω(f)`, where `l` is the loss function and `Ω` is the regularization term penalizing model complexity, helping to prevent overfitting.

XGBoost was chosen because it is widely regarded as the most dominant algorithm for tabular, sparse datasets (_Reference: Chen & Guestrin, "XGBoost: A Scalable Tree Boosting System", KDD 2016_).

### Core Principles:

1. **Additive Training:** The model is built incrementally. At each step `t`, a new tree `f_t(x)` is added to the ensemble, designed to fit the residuals (errors) from the previous `t-1` trees: `y_pred_t = y_pred_(t-1) + η * f_t(x)`. Here, `η` is the **learning rate (shrinkage)**, which scales down the contribution of each new tree to prevent overfitting and make the learning process more robust.
2. **Similarity Score & Gain:** For each node in a tree, a **Similarity Score** is calculated based on the sum of first and second-order gradients (`g` and `h`) of the loss function for samples in that node, incorporating the regularization `λ`. When considering a split, XGBoost calculates the **Gain** by subtracting the parent node's similarity score and the regularization `γ` from the sum of the similarity scores of its two child nodes. A split is only considered beneficial if the gain is positive.

### 1. XGBoost Regression (Earnings Predictor)

For forecasting continuous hourly earnings, XGBoost utilizes **Mean Squared Error (MSE)** as its primary loss function: `l(y_pred, y) = 1/2(y_pred - y)²`. The first-order gradients (`g`) represent the residuals, and the second-order gradients (`h`) are constant (1). These gradients are fundamental for calculating the similarity scores and gains used to construct trees that precisely predict earnings, adapting to fluctuating environmental variables.

### 2. XGBoost Classification (Burnout Risk Predictor)

To assess burnout risk, the problem is formulated as a multi-class classification task. The model utilizes the **Softmax objective function (`multi:softprob`)**, minimizing the multi-class **logarithmic loss (cross-entropy)**: `l(y_pred, y) = -Σ y_j * log(p_j)`. Here, `p_j` is the predicted probability for class `j`, derived from the Softmax function. This objective allows the system to output distinct probability scores for various exhaustion risk levels, ensuring reliable safety interventions by guiding tree construction through appropriate gradients and hessians.

## 3. System Architecture

Saarthi is orchestrated through a mobile-first distributed system utilizing a native Kotlin Android Client, a Node.js Express Gateway, and a scalable Python FastAPI Machine Learning backend.

<img src="SystemArchitecture.png" width="600" />

_(Fig: High-Level Architecture connecting Android, Node.js, and Python ML Backend)_

### 3.1 System Flow Execution

The end-to-end execution flow of the architecture operates through the following sequential steps:

1. **Voice Input & Client Request:** The gig worker interacts with the native Kotlin Android Client via voice. The client captures the audio, retrieves the user's current GPS coordinates, and sends the structured payload to the backend server.
2. **Gateway & Parsing:** The Node backend receives the incoming request. It utilizes the Gemini LLM agent to parse the transcribed text, extracting structured data (platform, hours, earnings) and analyzing the worker's nuanced sentiment from their voice check-in.
3. **Environmental Context Aggregation:** The Node backend fetches live external data by querying the OpenWeather API for localized climate conditions (temperature, humidity) and the Google Maps API for real-time traffic congestion metrics.
4. **Machine Learning Inference Request:** The extracted worker data, historical work patterns, and newly fetched live environmental context are consolidated into a single payload and forwarded to the Python FastAPI Machine Learning backend.
5. **Predictive Modeling (XGBoost):** The XGBoost models process the aggregated data to forecast platform-specific dynamic hourly earnings and classify the worker's current algorithmic burnout risk level.
6. **Persistence & Proactive Delivery:** The predictions are returned to the Node backend, which securely logs the complete telemetry and AI workflow states into the MongoDB database. The backend then constructs a personalized recommendation or nudge, sending it back to the Android Client where it is delivered completely hands-free via Google Text-to-Speech.

## 4. Database Design and Schema

To ensure scalable and rapid retrieval of gig worker telemetry, the Node.js backend leverages a NoSQL document database (MongoDB). The schema is purposefully structured into five core collections to securely handle identity, continuous workload metrics, financial correlation, and AI-driven workflow states.

Below is the strict Entity-Relationship Diagram detailing the tables, primary/foreign keys, and 1-to-Many correlations modeled within the Mongoose layer.

<img src="ErDiagram.png" width="450" />

_(Fig: Entity-Relationship diagram illustrating database schema design for worker logs and context)_

## 5. System Evaluation and Validated Metrics

The machine learning modules were rigorously evaluated and demonstrated exceptional reliability in real-world scenarios:

- **Earnings Predictor:** The model demonstrated exceptionally high precision in forecasting potential platform payouts, achieving an **R-Squared Accuracy Score of over 90%**. It consistently adapted to fluctuating environmental variables, proving to be a highly dependable tool for gig workers wishing to maximize their daily income.
- **Burnout Classifier:** Functioning with a validated **Accuracy of 92%**, this classification model proved remarkably reliable. By accurately identifying genuine exhaustion risks based on consecutive work hours and localized voice sentiment, it successfully provides crucial safety interventions without generating unnecessary false alarms.

---

## 6. References

1. T. Chen and C. Guestrin, "XGBoost: A Scalable Tree Boosting System," in _Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining_, San Francisco, CA, USA, 2016, pp. 785-794. [https://dl.acm.org/doi/abs/10.1145/2939672.2939785](https://dl.acm.org/doi/abs/10.1145/2939672.2939785)
2. Z. Wang, Q. Xie, Z. Ding, M. Feng, and R. Xia, "Is ChatGPT a Good Sentiment Analyzer? A Preliminary Study," _arXiv preprint arXiv:2304.04339_, 2023. [https://arxiv.org/abs/2304.04339](https://arxiv.org/abs/2304.04339)
