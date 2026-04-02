# Project Roadmap

## Phases
- [x] **Phase 1: Dataset Generation** - Generate a new unbiased dataset mapping jobs into 5 new categories with updated environmental impact logic.
- [x] **Phase 2: ML Model Retraining** - Retrain the XGBoost model on the new dataset and integrate it for prediction serving.
- [x] **Phase 3: Filtering & Documentation** - Implement recommendation filtering logic and add comprehensive docstrings to all ML engine functions.
- [x] **Phase 4: Backend Integration** - Update Node.js user model and recommendation service to handle user-specific registration and skills.
- [ ] **Phase 5: Android Integration** - Connect the Android app's management screens to the backend and update the dashboard with the new category logic.

## Phase Details

### Phase 4: Backend Integration
**Goal**: Connect the user's registration and skill data to the ML engine via the Node.js server.
**Depends on**: Phase 3
**Requirements**: INT-01, INT-02, INT-03
**Success Criteria**:
  1. The User model includes `skills` and `registeredJobs`.
  2. The `recommendJobs` service sends user-specific data to the Python ML API.
  3. API results are filtered correctly based on persistent user settings.

**Plans**: 2 plans
- [x] 04-01-PLAN.md — Foundation & Profile Sync
- [x] 04-02-PLAN.md — Smart Recommendation Integration

### Phase 5: Android Integration
**Goal**: Update the Android app to allow users to manage their settings and view improved recommendations.
**Depends on**: Phase 4
**Requirements**: INT-04, INT-05, INT-06
**Success Criteria**:
  1. Users can save their skills and registered jobs to the backend via the Android app.
  2. The Dashboard and Recommendation screens show correctly labeled job categories and reasoning text.

**Plans**: 2 plans
- [x] 05-01-PLAN.md — Foundation & Profile Sync
- [x] 05-02-PLAN.md — UI Integration & Category Display

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dataset Generation | 1/1 | Completed | 02-04-2026 |
| 2. ML Model Retraining | 1/1 | Completed | 02-04-2026 |
| 3. Filtering & Documentation | 1/1 | Completed | 02-04-2026 |
| 4. Backend Integration | 2/2 | Completed | 02-04-2026 |
| 5. Android Integration | 0/2 | Not started | - |
