# Installation Guide

## 1) Clone the project from GitHub

```bash
git clone https://github.com/Nagaraj0000b/Saarthi-Ai.git
cd Saarthi-Ai
```

## 2) Prerequisites

1. Android Studio
2. Node.js 18+
3. Python 3.10+
4. MongoDB Community Edition (local install)
5. ngrok (for testing on real mobile devices)

## 3) Environment setup (.env files)

This project uses two separate `.env` files:

- `GigOne/server/.env` for backend config
- `GigOne/android/.env` for Android API base URL

Create them from examples:

```bash
copy GigOne\server\.env.example GigOne\server\.env
copy GigOne\android\.env.example GigOne\android\.env
```

Quick way (if you are already inside `GigOne/server`):

```bash
copy .env.example .env
```

If you are on macOS/Linux, use:

```bash
cp GigOne/server/.env.example GigOne/server/.env
cp GigOne/android/.env.example GigOne/android/.env
```

### Server `.env` required values

- `MONGO_URI` (required): Mongo connection string
- `JWT_SECRET` (required): long random secret for token signing

### Server `.env` optional values

- `PORT` (default: `5000`)
- `CLIENT_URL` (default: `http://localhost:5173`)
- `ML_API_URL` (default: `http://127.0.0.1:8000`)
- `CHAT_TURN_URL` (default: `http://127.0.0.1:8000/chat/turn`)
- `CHAT_TURN_TIMEOUT_MS` (default: `60000`)
- `GOOGLE_MAPS_API_KEY` (optional; enables live traffic API)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (optional; enables Google OAuth)
- `GEMINI_API_KEY` (fallback only for sentiment service)

### Google Cloud credentials

Place service account credentials at:

- `GigOne/server/credential.json`

This is required for Speech-to-Text, Translation, Text-to-Speech, and Vertex Gemini features.

### Android `.env` value

- `API_URL` (required): backend base URL used by Android build.

Examples:

- Android emulator (same PC): `API_URL=http://10.0.2.2:5000`
- Physical device with ngrok: `API_URL=https://<your-ngrok-id>.ngrok-free.app`

## 4) Install and run

### A) Start backend (Node server)

```bash
cd GigOne/server
npm install
npm run dev
```

### B) Start ML engine

```bash
cd GigOne/ml_engine
pip install fastapi uvicorn xgboost pandas numpy pydantic
python main.py
```

### C) If running on physical phone, expose backend with ngrok

In a new terminal:

```bash
ngrok.exe http 5000
```

Copy ngrok HTTPS URL and set it as `API_URL` in `GigOne/android/.env`.

## 5) Run Android app

1. Open `GigOne/android` in Android Studio.
2. Click **Run** (green play button).
3. Use either:
   - Android Emulator, or
   - Physical phone (USB connected)

For physical phone:

- Enable Developer Options
- Enable USB Debugging
- Connect phone via USB and run from Android Studio
