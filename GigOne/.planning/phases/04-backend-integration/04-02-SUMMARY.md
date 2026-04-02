---
phase: 04-backend-integration
plan: 02
subsystem: backend
tags: [recommendations, ml-integration, business-logic]
requires: ["04-01"]
provides: ["Smart ML recommendation logic with DB sync"]
affects: ["server/services/jobRecommendationService.js"]
tech-stack: [Node.js, Mongoose, XGBoost ML Engine]
key-files: ["server/services/jobRecommendationService.js"]
decisions:
  - "Decoupled skill-to-platform mapping into fallback rule engine using centralized jobMapping."
  - "Integrated DB-based user context fetching for recommendations when caller params are missing."
metrics:
  duration: 20m
  completed_date: 2024-05-24
---

# Phase 04 Plan 02: ML Logic & Integration Summary

Integrated dynamic user data retrieval and centralized job mapping into the recommendation engine to provide context-aware earnings predictions.

## Core Accomplishments

### 1. Dynamic User Context for ML API
- **Mechanism:** Added logic to `recommendJobs` that checks for missing `skills` or `preferredJobs`.
- **DB Sync:** If missing, it asynchronously fetches the `User` document from MongoDB using the `userId`.
- **Payload Enrichment:** Maps user skills to ML-compatible flags and passes the `registered_jobs` list to the ML Engine to ensure only relevant platform predictions are returned.

### 2. Centralized Logic and Reasoning Refinement
- **Job Mapping:** Imported `jobMapping.js` and removed hardcoded platform lists from the service.
- **Enhanced Reasoning:** Updated `generateMLReason` to use the 5 canonical job categories. Reasoning now accounts for late-night travel demand, weather-specific home services demand, and remote work recommendations during high burnout risk.
- **Fallback Rule Engine:** Refined the fallback logic to use the same centralized mapping, ensuring consistency between ML and non-ML results.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
- [x] Created `User.findById` integration.
- [x] Passed `registered_jobs` to ML context.
- [x] Used `jobMapping.js` for fallback platforms.
- [x] Verified code with manual inspection and syntax check.

## Commits
- `5fbd00e`: feat(04-02): add dynamic user context fetching for recommendations and refine logic integration.
