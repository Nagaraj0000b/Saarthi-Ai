---
phase: 8
plan: 1
wave: 1
---

# Plan 8.1: Information & Contextual Nudges

## Objective
Build a dynamic 'Nudges' system that passes contextual environment factors (weather, traffic, fatigue) from the Node.js backend to the Android app and renders them as beautiful, actionable alerts.

## Context
- .gsd/ROADMAP.md
- server/services/jobRecommendationService.js
- android/app/src/main/java/com/gigone/saarthi/data/Models.kt
- android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardScreen.kt

## Tasks

<task type="auto">
  <name>Generate Nudges in Node.js Model Responses</name>
  <files>
    server/services/jobRecommendationService.js
  </files>
  <action>
    - Before returning the `/recommend` JSON payload, construct a `nudges` JSON array (`[{type: "weather", title: "Heavy Rain", message: "Surges expected on Swiggy.", severity: "warning"}]`).
    - Base this on the existing `traffic`, `weather`, and `burnoutRisk` logic that is already being populated from `mlContext`.
    - Ensure it safely defaults to empty if no actionable nudges exist.
  </action>
  <verify>Ensure `nudges` array stringifies correctly in API response payloads.</verify>
  <done>Nudges array correctly flows through `recommendJobs` and `fallbackRuleEngine` payload outputs.</done>
</task>

<task type="auto">
  <name>Update Android Data Model</name>
  <files>
    android/app/src/main/java/com/gigone/saarthi/data/Models.kt
  </files>
  <action>
    - Add a `Nudge` data class describing title, message, type, and severity.
    - Add a nullable `List<Nudge>` mapping inside the `RecommendationData` data class that Gson parses.
  </action>
  <verify>Compile Android app successfully.</verify>
  <done>Data models successfully parse backend `nudges` properties.</done>
</task>

<task type="auto">
  <name>UI Development: Beautiful Dashboard Nudges</name>
  <files>
    android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardScreen.kt
  </files>
  <action>
    - Inside `DashboardScreen.kt`, check if `recommendation?.nudges` is not empty.
    - If nudges exist, iterate through them and draw highly stylized, curved cards (using Icons mapped to severity and types).
    - These cards should appear immediately beneath the Main Job Recommendation card, likely in a horizontal scrollable row if there are multiple.
  </action>
  <verify>Verify standard Jetpack Compose compilation.</verify>
  <done>Nudges are visibly rendered underneath ML jobs with dynamic color-coding.</done>
</task>

## Success Criteria
- [ ] Backend reliably generates arrays of intelligent, contextual warnings/tips.
- [ ] Android UI displays these tips smoothly without lagging or breaking layout constraints.
- [ ] Various types of nudges (Traffic, Fatigue, Config) are properly styled according to their severity.
