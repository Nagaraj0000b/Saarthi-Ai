# GSD ROADMAP

> **Current Milestone**: Milestone 2: ML Recommendation Engine (V1)
> **Goal**: Replace rule-based logic with XGBoost + FastAPI.

---

## Milestone 1: Platform-to-Job Rebranding
**Status**: ✅ Completed

### Phase 1: Backend Core Refactor
**Objective**: Migrate backend logic to 'job'.
**Status**: ✅ Complete

### Phase 2: Android UI Refactor
**Objective**: Update Android app terminology and navigation.
**Status**: ✅ Complete

---

## Milestone 2: ML Recommendation Engine (V1)
**Status**: 🚧 Active

### Phase 1: Dataset Engineering
**Goal:** Generate 20,000 unbiased rows with market anchors and vehicle compatibility.
**Status**: ✅ Complete
1. ✅ Built Dataset Generator (Python).
2. ✅ Applied Compatibility Mapping (17 jobs, 6 types).
3. ✅ Validated — Compatible mean ₹148.84 vs Incompatible ₹10.02.

### Phase 2: Training & Validation
**Goal:** Train XGBoost and export the binary model.
**Status**: ✅ Complete
1. ✅ Feature Scaling and Encoding (6 categorical, 9 numerical).
2. ✅ Model Tuning — R²=0.9359, RMSE=₹20.64, MAE=₹12.08.
3. ✅ Exported model + SHAP + label encoders.

### Phase 3: Inference API (FastAPI)
**Goal:** Create a lightweight serving microservice.
**Status**: ✅ Complete
1. ✅ Built FastAPI skeleton (main.py).
2. ✅ Ported preprocessing logic (label encoders + compatibility).
3. ✅ Implemented /recommend and /health endpoints.

### Phase 4: Full Stack Integration
**Goal:** Connect Node.js to the new Python API.
**Status**: ✅ Complete
1. ✅ Rewrote jobRecommendationService.js to call ML API via fetch().
2. ✅ Added fallback rule engine for ML API downtime.
3. ✅ Updated jobController.js to pass vehicle type.
4. ✅ Updated Android Dashboard with real recommendation card + reasons.
5. ✅ Updated Recommendation data model for ML-specific fields.

### Phase 5: Verification (Empirical)
**Goal:** Prove the accuracy of the new engine.
**Status**: ⏳ Pending
1. Cross-compatibility audit.
2. Latency/Stability testing.

### Phase 6: Core UI Refinements & User Filtering
**Goal:** Fix profile saving bugs and refine recommendation UX.
**Status**: ⬜ Not Started
1. Investigate and fix the bug dropping saved platforms/jobs in the Profile Screen.
2. Enforce ML recommendations to strictly filter by the user's selected jobs/platforms.
3. Redesign Dashboard recommendation card: show ONLY the absolute best option, and open a new page/sheet for alternatives.
### Phase 7: Recommendations Empty State
**Goal:** Handle UX for when users haven't registered any jobs.
**Status**: ✅ Complete
1. Detect if selected jobs are empty in Dashboard.
2. Display a prompt urging users to 'Select Jobs to Get Recommendations' instead of making ML requests.
3. Provide a button mapping directly to the Jobs selection screen.

### Phase 8: Information Nudges
**Status**: â¬œ Not Started
**Objective**: Beautiful nudges and various types of contextual nudges for the user.
**Depends on**: Phase 7

**Tasks**:
- [ ] TBD (run /plan 8 to create)

**Verification**:
- TBD

### Phase 9: Theme & Location Persistence
**Status**: â¬œ Not Started
**Objective**: Fix theme switching (Dark/Light) and ensure location permissions are prompted correctly.
**Tasks**:
- [ ] Fix theme toggle (Dark/Light mode).
- [ ] Implement location permission prompt when disabled.
- [ ] Ensure persistence of theme preference.

**Verification**:
- Verify theme switch works and persists.
- Verify location permission prompt is triggered when location is OFF.

---

### Phase 10: ML Model Redesign (Skill Set & Expanded Types)
**Status**: ⬜ Not Started
**Objective**: Transition recommendation engine from vehicle-based to skill-based compatibility and add remaining job types.
**Depends on**: Phase 4 (Full Stack Integration)

**Tasks**:
- [ ] Update `generate_dataset.py` to remove vehicle logic and add skill set mappings.
- [ ] Add new job categories (On Demand Home Based Services, Remote Service Providers) to match the 5 target types.
- [ ] Ensure the 5 types strictly are: On Demand home based services, Ride hailing instant delivery, Delivery workers in General, Ride hailing drivers (cab+ bike), Remote service providers.
- [ ] Generate new synthetic dataset (20,000 rows) with the updated features.
- [ ] Retrain XGBoost model and export the updated endpoints/scalers.
- [ ] Update Python FastAPI (`main.py`) to accept `skill_set` instead of `vehicle`.
- [ ] Update Node.js BE to process and send user skill set.
- [ ] Update Android app UI to replace "Vehicle" selection with multi-select "Skill Sets" (3 Categories, 8 Skills).

**Verification**:
- Verify new ML API correctly categorizes all 5 types and filters appropriately based on the new skill set param.
- Verify `vehicle` is safely removed from dataset and ML endpoints.
---

### Phase 11: Shift History (Work Logs) UI Overhaul
**Status**: ⬜ Not Started
**Objective**: Redesign the Work Logs screen to be more visually engaging and professional.
**Depends on**: Phase 10

**Tasks**:
- [ ] TBD (run /plan 11 to create)

**Verification**:
- TBD

