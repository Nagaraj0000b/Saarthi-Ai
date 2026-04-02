---
phase: 7
plan: 1
wave: 1
---

# Plan 7.1: Setup Recommendations Empty State

## Objective
Handle the UX for when the user has not yet selected any jobs in their profile, preventing unnecessary ML API requests and guiding them to setup their profile.

## Context
- .gsd/ROADMAP.md
- android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardViewModel.kt
- android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardScreen.kt

## Tasks

<task type="auto">
  <name>Interrupt API Call for Empty Jobs</name>
  <files>android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardViewModel.kt</files>
  <action>
    - Add a check at the top of `loadRecommendations()` to see if `TokenManager.getJobs(ctx)` is empty.
    - If it is empty, set `_recommendationError.value` to `"NO_JOBS_SELECTED"` and exit early to prevent hitting the backend.
  </action>
  <verify>Validate codebase logic intercepts empty case.</verify>
  <done>Code prevents API fetch when the jobs set is empty.</done>
</task>

<task type="auto">
  <name>Build Empty State UI</name>
  <files>android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardScreen.kt</files>
  <action>
    - Ensure the DashboardScreen handles `"NO_JOBS_SELECTED"` error state by rendering a friendly card stating "You haven't added any jobs yet."
    - Add a "Set up Profile" button returning to `navController.navigate("manage_jobs")`.
  </action>
  <verify>Successful render of Compose preview or build.</verify>
  <done>Empty state is visible and clickable.</done>
</task>

## Success Criteria
- [ ] Backend is not blindly hit if jobs list is empty.
- [ ] User is clearly guided to register jobs before getting recommendations.
