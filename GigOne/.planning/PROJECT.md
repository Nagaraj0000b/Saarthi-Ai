# GigOne Saarthi

## What This Is
An XGBoost-powered job recommendation system for Indian gig economy workers. It predicts expected hourly earnings across various job categories to provide optimal job recommendations.

## Core Value
Deliver unbiased, highly accurate earning predictions that decouple structural job realities (like remote work) from irrelevant environmental factors (weather, traffic).

## Requirements

### Validated (v1.0 & v2.0)
- [x] Basic ML recommendation engine architecture.
- [x] FastAPI inference server integration with Node.js backend.
- [x] ML-01 to ML-05: 5 job categories, unbiased dataset, environmental decoupling, XGBoost retraining, and docstrings.
- [x] INT-01 to INT-05: E2E Integration of Android profile sync, backend User model, ML filtering, and UI updates.

### Active (v3.0: Frontend Polish & Production Readiness)
- [ ] POL-01: **Documentation**: Add standard KDoc docstrings to all Android Composables, ViewModels, and Data Models.
- [ ] POL-02: **Error Handling**: Implement graceful error states and user-friendly fallback messages across all API calls.
- [ ] POL-03: **Performance**: Optimize Compose recompositions (use `remember`, `stable` classes, `collectAsStateWithLifecycle`).
- [ ] POL-04: **Code Quality**: Refactor complex Kotlin syntax into simpler, more readable forms per project guidelines.

### Out of Scope
- [ ] Backend (Node.js) changes — This milestone focuses purely on the Android frontend.
- [ ] ML Engine changes.

## Context
Milestone v1.0 modernized the ML core. Milestone v2.0 connected the Android frontend to this core. Milestone v3.0 focuses on bringing the Android frontend up to production-ready standards: ensuring robust error handling, high performance, and excellent developer documentation without breaking existing features.

## Key Decisions
- **Error Handling UX**: We will use user-friendly, generic fallback messages in the UI (e.g., "Unable to load data, please try again") while keeping technical details in the logs.
- **Scope**: Changes are strictly confined to the `android/` directory.
