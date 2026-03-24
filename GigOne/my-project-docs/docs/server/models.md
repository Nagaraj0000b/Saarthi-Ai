# Server Models

## User
- Located at `server/models/User.js`. Required `name` and unique `email` identify workers, while optional `passwordHash` and `googleId` allow either local or Google OAuth logins.  
- `role` defaults to `user` and timestamps track onboarding. `toJSON` strips `passwordHash` so controllers and routes never leak secrets while still returning the rest of the user data.
- Used by `authController` for register/login, by `passport.js` for OAuth provisioning, and by JWT auth middleware to attach `req.user.userId`.

## EarningsEntry
- The document at `server/models/EarningsEntry.js` stores one income record per platform: `userId` reference, `platform` enum (`Uber`, `Swiggy`, `Rapido`, `Other`), positive `amount` and `hours`, and the `date` of the shift (default is now).  
- Timestamps enable weekly emails/reports and history tables, while the schema is written to by the `/api/earnings` controller and automatically auto-saved from the chat flow whenever a conversation reaches the `done` step with valid `earnings` and `platform` extractions.

## WorkLog
- Defined in `server/models/WorkLog.js`, it captures each manually logged shift with `userId`, `platform`, `hours`, `date`, and optional `notes`. The platform field mirrors Earnings’ enum so UI filters stay consistent.  
- `getWorkLogs` and `addWorkLog` controllers expose this collection over `/api/worklogs`, and timestamps make it easy to sort logs in reverse chronology for dashboards.

## Conversation
- `server/models/Conversation.js` is the stateful document for the voice check-in: it links to a `User`, records the current `step` in the deterministic flow (`greeting` → `done`), and collects `extractedData` (`platform`, `earnings`, `hours`) as the AI parses the worker’s replies.  
- It also tracks `burnoutStatus` (alerts, stress warnings, average mood score, recommended action) and embeds the `messages` array, where each entry captures the `role`, `text`, and optional Gemini-derived `sentiment` (mood, score, summary, suggestion).  
- Controllers read/write this model to persist each turn, compute burnout via the `BurnoutService`, auto-save earnings, and return historical transcripts when `/api/chat/history` is requested.
