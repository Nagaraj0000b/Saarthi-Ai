---
phase: 1
plan: 1
wave: 1
---

# Plan: Backend Terminology Refactor

## Wave 1: Service Renaming
<task name="rename-services">
Rename platformRecommendationService.js and platformBaselineService.js.
</task>
<verify>
Test-Path "server/services/jobRecommendationService.js"
Test-Path "server/services/jobBaselineService.js"
</verify>

## Wave 2: Controller & Model Updates
<task name="update-models">
Rename fields in Conversation, EarningsEntry, and WorkLog models.
</task>
<verify>
Select-String "job:" "server/models/Conversation.js"
</verify>
