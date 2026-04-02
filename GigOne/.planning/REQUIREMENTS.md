# Milestone v2.0 Requirements: E2E Frontend-Backend Integration

## Backend & API Integration
- [ ] **INT-01**: Update the `User` Mongoose model to store `skills` (Array of Strings) and `registeredJobs` (Array of Strings).
- [ ] **INT-02**: Update the `recommendJobs` service in Node.js to fetch the current user's skills and registered jobs from the database and forward them to the ML API.
- [ ] **INT-03**: Align the `generateMLReason` logic in the Node.js service with the new 5 job categories.

## Android Frontend Integration
- [ ] **INT-04**: Update `ManageJobsScreen` and `ManageSkillsScreen` to sync with the backend API instead of only storing locally in `TokenManager`.
- [x] **INT-05**: Update `RecommendationListScreen` and `DashboardScreen` to display job categories using the new 5-tier classification.
- [x] **INT-06**: Ensure the "Reasoning" text in the UI correctly reflects the contextual insights from the retrained ML model.

## Verification
- [ ] **TEST-01**: Verify that a user setting their skills in the Android app immediately affects the recommendations returned by the API.
- [ ] **TEST-02**: Verify that jobs NOT in the user's `registeredJobs` list are never shown in the "Recommended" section.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INT-01 | Phase 4 | Pending |
| INT-02 | Phase 4 | Pending |
| INT-03 | Phase 4 | Pending |
| INT-04 | Phase 5 | Pending |
| INT-05 | Phase 5 | Complete |
| INT-06 | Phase 5 | Complete |
