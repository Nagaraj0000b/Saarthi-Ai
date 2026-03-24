# OpenAI Edge TTS

The voice module uses the community `openai-edge-tts` server (found at `openai-edge-tts/`) as its text-to-speech backend. This project emulates OpenAI’s `/v1/audio/speech` endpoint on a local container so the app can render AI replies in a natural voice without hitting OpenAI’s cloud TTS.

## Key points to mention to your professor

- The service proxies Microsoft Edge’s free `edge-tts` engine, so it costs nothing beyond the local infrastructure and just requires Docker or Python to run.  
- It exposes an OpenAI-compatible endpoint at `http://localhost:5050/v1/audio/speech` that supports the same parameters (`input`, `voice`, `response_format`, `speed`, stream format, etc.), which lets the frontend switch between local and official endpoints with minimal code change.  
- The frontend (see `client/src/services/chatApi.js`) calls this proxy in `synthesizeSpeech` so it simply fetches the URL, sends the text, and plays the returned MP3 blob—no SDK or special auth is needed beyond the dummy API key in `.env`.
- The server image ships with voice mappings for alloy/echo/fable/onyx/nova/shimmer but you can also specify any `edge-tts` voice. It supports MP3/OPUS/AAC/FLAC/WAV/PCM and even SSE streaming for live playback, so you can mention those when discussing flexibility.
- Deployment setup is Docker-first: `docker compose up --build` (with optional `INSTALL_FFMPEG_ARG=true` if you need `ffmpeg` conversions). The repo includes `.env.example` plus a `Dockerfile` and compose stack for quick local usage; we just mount it alongside the app and hit port 5050.

When your professor asks, show them the `openai-edge-tts/README.md` (or this doc) to explain that we kept the API signature compatible with OpenAI’s spec while running the actual speech generation locally. That makes the entire voice experience self-contained and removes reliance on paid TTS call volume.
