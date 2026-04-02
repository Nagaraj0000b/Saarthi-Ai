# Project Roadmap

## Phases
- [x] **Phase 1: Dataset Generation** - Generate a new unbiased dataset mapping jobs into 5 new categories with updated environmental impact logic.
- [x] **Phase 2: ML Model Retraining** - Retrain the XGBoost model on the new dataset and integrate it for prediction serving.
- [x] **Phase 3: Filtering & Documentation** - Implement recommendation filtering logic and add comprehensive docstrings to all ML engine functions.
- [x] **Phase 4: Backend Integration** - Update Node.js user model and recommendation service to handle user-specific registration and skills.
- [x] **Phase 5: Android Integration** - Connect the Android app's management screens to the backend and update the dashboard with the new category logic.
- [x] **Phase 6: Error Handling & Architecture Polish** - Implement robust error handling and user-friendly fallback UIs across Android screens.
- [ ] **Phase 7: Performance Optimization** - Optimize Jetpack Compose recompositions and state management.
- [ ] **Phase 8: Documentation & Code Quality** - Add comprehensive KDoc and simplify complex Kotlin syntax.
- [x] **Phase 9: UI Perfection** - Fine-tune layout, typography, and interactive feedback.

## Phase Details

### Phase 4: Backend Integration
... (Skipped for brevity, marked completed)

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

### Phase 6: Error Handling & Architecture Polish
**Goal**: Make the Android app robust against network and data failures.
**Depends on**: Phase 5
**Requirements**: POL-01, POL-02
**Success Criteria**:
  1. App does not crash on API failures.
  2. Users see friendly error messages instead of raw exceptions.

### Phase 7: Performance Optimization
**Goal**: Ensure smooth UI performance in Android.
**Depends on**: Phase 6
**Requirements**: POL-03, POL-04
**Success Criteria**:
  1. No unnecessary recompositions in Dashboard or Profile screens.
  2. State is collected safely aware of lifecycle.

### Phase 8: Documentation & Code Quality
**Goal**: Ensure the Android codebase is highly maintainable.
**Depends on**: Phase 7
**Requirements**: POL-05, POL-06
**Success Criteria**:
  1. All public classes, Composables, and ViewModels have KDoc.
  2. Complex logic is refactored for readability.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dataset Generation | 1/1 | Completed | 02-04-2026 |
| 2. ML Model Retraining | 1/1 | Completed | 02-04-2026 |
| 3. Filtering & Documentation | 1/1 | Completed | 02-04-2026 |
| 4. Backend Integration | 2/2 | Completed | 02-04-2026 |
| 5. Android Integration | 2/2 | Completed | 02-04-2026 |
| 6. Error Handling Polish | 1/1 | Completed | 03-04-2026 |
| 7. Performance Polish | 0/0 | Not started | - |
| 8. Documentation Polish | 0/0 | Not started | - |
| 9. UI Perfection | 2/2 | Completed | 03-04-2026 |
