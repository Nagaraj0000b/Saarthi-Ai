# Client Application Overview

The client is a Single Page Application (SPA) built with React, serving as the user interface for workers and administrators.

## Directory Structure

```
client/src/
├── components/
│   └── ui/            # Reusable shadcn/ui components (Button, Card, Input)
├── hooks/             # Custom React hooks (useVoiceRecorder)
├── lib/               # Utilities and API clients
├── pages/
│   ├── admin/         # Admin dashboard views
│   ├── auth/          # SignIn and SignUp pages
│   └── user/          # Worker dashboard and feature pages
├── services/          # Domain-specific API wrappers (chatApi, earningsApi, worklogsApi)
├── App.jsx            # Main router configuration
└── main.jsx           # Entry point
```

## Key Features

-   **Glassmorphism Design:** A modern, dark-themed UI with translucent cards and neon accents.
-   **Voice-First Interface:** Primary interaction model for the AI companion.
-   **Real-time Dashboard:** Live clock, dynamic weather badges, and immediate AI feedback.
-   **Burnout Risk UI:** Dynamic visual indicators to warn workers of mental fatigue.
