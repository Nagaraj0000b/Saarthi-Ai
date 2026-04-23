# 🚀 Nudge Demonstration Guide

This guide provides commands to manually trigger and display "nudges" in the Saarthi app for demonstrations, testing, and stakeholder reviews.

## ⚡ Instant Demo Script (Bypass Throttling)

The system has strict anti-spam rules (Daily caps, 5-minute spacing, and Quiet Hours). To avoid these during a demo, use the specialized `demoNudges.js` script which injects nudges directly into the database.

### How to run:

**Option A: Auto-User Mode (Recommended)** 
The script will automatically find the most recently created user in the database.
`node server/demoNudges.js <scenario>`

**Option B: Specific User Mode**
If you need to target a specific account.
`node server/demoNudges.js <userId> <scenario>`

### Scenario Table:

| Scenario | Command (Auto-User) | Effect | Priority |
| :--- | :--- | :--- | :--- |
| **Heavy Rain** | `node server/demoNudges.js heavyrainfall` | Triggers Weather Alert | High |
| **Surge** | `node server/demoNudges.js surge` | Triggers Surge Pricing Alert | High |
| **Burnout** | `node server/demoNudges.js burnout` | Triggers Break/Wellbeing Reminder | Normal |
| **Target** | `node server/demoNudges.js target` | Triggers Daily Goal Progress Nudge | Normal |
| **Optimization**| `node server/demoNudges.js optimization` | Triggers Earnings Optimization Tip | Normal |
| **Shift** | `node server/demoNudges.js shift` | Triggers Next Day Shift Suggestion | Low |

---

## 🛠️ Manual Setup (Via MongoDB)
If you prefer using MongoDB Compass or a GUI:

**JSON Payload for MongoDB:**
```json
{
  "userId": "REPLACE_WITH_USER_ID",
  "type": "surge",
  "title": "⚡ Surge Alert!",
  "body": "High demand detected in your current area. Head to the city center for 1.5x earnings!",
  "emoji": "⚡",
  "priority": "high",
  "status": "pending",
  "expiresAt": "2026-12-31T23:59:59Z" 
}
```

## 🚦 System Constraints (For Reference)
When NOT using the demo script, the `nudgeDispatchService` enforces:
- **Daily Cap**: Max 3 nudges per user per day.
- **Spacing**: Min 5 minutes gap between any two nudges.
- **Quiet Hours**: No normal nudges between 10 PM and 8 AM IST (Safety/Environmental alerts bypass this).

## 📱 How to verify in App
1. Open the Saarthi App.
2. The app polls `GET /api/nudges`.
3. The nudge will appear as a notification or in the "Nudge Center".
