# Server API Overview

The Project server is a robust Express.js application that serves as the backend for the client application. It manages user authentication, data persistence, and the orchestration of AI services.

## Directory Structure

```
server/
├── config/         # Database and Passport configuration
├── controllers/    # Business logic for API endpoints
├── middleware/     # Auth and validation middleware
├── models/         # Mongoose schemas (User, WorkLog, Conversation)
├── routes/         # API route definitions
├── services/       # External API integrations (AI, Weather, Traffic)
└── index.js        # Entry point
```

## Core Modules

### 1. Authentication (`/api/auth`)
Handles user registration, login, and Google OAuth flows. Issues JWTs for session management.

### 2. Chat & AI (`/api/chat`)
The heart of the companion experience. Manages voice/text inputs, context gathering, and the conversational state machine.

### 3. Health & Burnout
Monitors worker fatigue mathematically via the `burnoutService`, injecting protective nudges into the AI when an alert is triggered.

### 4. Data Management (`/api/earnings`, `/api/worklogs`)
CRUD operations for worker's historical data, enabling analytics and reporting.
