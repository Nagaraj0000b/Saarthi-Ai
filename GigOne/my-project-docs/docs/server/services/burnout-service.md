# Burnout Service

`server/services/burnoutService.js` defines `checkBurnout`, the pure function that turns the last five mood scores into actionable flags.

- It expects `moodHistory` as an array of five numbers (oldest first, newest last) pulled from `Conversation` during each `done` check-in (`server/services/burnoutService.js`).  
- It computes the average score and rounds to two decimals so UIs and APIs can display a stable “mood trend” (`server/services/burnoutService.js`).  
- If the average ≤ -0.3 it sets `isStressWarning`, and if the final three entries are all negative it also sets `isBurnoutAlert`.  
- The function returns `isBurnoutAlert`, `isStressWarning`, the `averageScore`, and an `action` string (`Normal`, `Monitor Stress`, `Take a Break`, or `Rest Required`) based on those flags (`server/services/burnoutService.js`).

`chatController` calls this whenever a conversation transitions to `done`, feeding it the five-day history of sentiment scores to decide whether to warn the worker or ease up the platform recommendations.
