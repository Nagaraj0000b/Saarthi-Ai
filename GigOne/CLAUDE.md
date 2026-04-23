# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Node.js/Express)
- **Run in development mode**: `cd server && npm run dev`
- **Start server**: `cd server && npm start`
- **Run all tests**: `cd server && npm test`
- **Run nudge-specific tests**: `cd server && npm run test:nudges`

### ML Engine (Python)
- **Install dependencies**: `cd ml_engine && pip install -r requirements.txt`
- **Run main model**: `cd ml_engine && python main.py`
- **Train model**: `cd ml_engine && python train_main_model.py`

### Android App
- Build and run via Android Studio or Gradle commands in the `android/` directory.

## Architecture Overview

The project is a multi-component system designed to support gig workers (Saarthi).

### 1. Backend Server (`/server`)
An Express.js API that acts as the central orchestrator.
- **Core Logic**: Uses a controller-service-model pattern.
- **Models**: MongoDB/Mongoose for Users, Conversations, Earnings, WorkLogs, and Nudges.
- **Key Services**:
    - `geminiService.js`: Integration with Google Gemini for AI.
    - `conversationServiceV2.js`: Manages the voice/chat interaction flow.
    - `nudgeDispatchService.js`: Handles the delivery of proactive "nudges" to users.
    - `trafficService.js` & `weatherService.js`: External data integration for contextual awareness.
- **Middleware**: Passport.js for authentication and custom error handlers.

### 2. ML Engine (`/ml_engine`)
A Python-based machine learning suite for earnings prediction and wellbeing analysis.
- **Models**: Uses XGBoost for training earnings models.
- **Data Pipeline**: Includes scripts for generating synthetic datasets and merging weather/traffic data.
- **Voice Chat V2**: Contains a graph-based state machine (`graph.py`, `nodes.py`, `state.py`) to manage conversational logic.

### 3. Android App (`/android`)
The client application for gig workers, implemented in Kotlin/Java.
- **Structure**: Standard Android Gradle project structure.
- **Integration**: Communicates with the Node.js backend via REST APIs.

## Project Structure
- `/android`: Android mobile application.
- `/server`: Node.js backend API.
- `/ml_engine`: Python ML models and data processing scripts.
- `/ml_engine/voice_chat_v2`: Conversational AI logic.
