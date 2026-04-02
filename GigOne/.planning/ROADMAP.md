# Project Roadmap

## Phases
- [ ] **Phase 1: Dataset Generation** - Generate a new unbiased dataset mapping jobs into 5 new categories with updated environmental impact logic.
- [ ] **Phase 2: ML Model Retraining** - Retrain the XGBoost model on the new dataset and integrate it for prediction serving.
- [ ] **Phase 3: Filtering & Documentation** - Implement recommendation filtering logic and add comprehensive docstrings to all ML engine functions.

## Phase Details

### Phase 1: Dataset Generation
**Goal**: The system generates an unbiased dataset with the new job categories and logic constraints.
**Depends on**: Nothing
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. The dataset generation process maps job platforms into the 5 specified job categories.
  2. The generated dataset enforces zero impact of weather and traffic on remote and freelance roles.
**Plans**: TBD

### Phase 2: ML Model Retraining
**Goal**: The system serves predictions using a retrained XGBoost model with the new categories and constraints.
**Depends on**: Phase 1
**Requirements**: ML-01, ML-02, ML-03
**Success Criteria** (what must be TRUE):
  1. The system successfully trains a new XGBoost model using the Phase 1 dataset.
  2. Users receive accurate earning predictions based on the newly mapped 5 job categories.
  3. The system outputs earning predictions for remote/freelance jobs that remain constant regardless of weather or traffic inputs.
**Plans**: TBD

### Phase 3: Filtering & Documentation
**Goal**: System filters job recommendations appropriately and the ML codebase is well-documented.
**Depends on**: Phase 2
**Requirements**: ML-04, DOCS-01
**Success Criteria** (what must be TRUE):
  1. The system filters job recommendations to only include jobs the user is registered for and has the required skills for.
  2. Developers can read comprehensive docstrings for all functions within the ML engine files.
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dataset Generation | 0/0 | Not started | - |
| 2. ML Model Retraining | 0/0 | Not started | - |
| 3. Filtering & Documentation | 0/0 | Not started | - |