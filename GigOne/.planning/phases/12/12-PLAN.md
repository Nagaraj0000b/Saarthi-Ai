# Phase 12 Plan: Auto-save Profile Selections

## Goal
Remove manual 'Save' buttons from the Job Selection and Skill Set Selection screens in the Android app. Implement auto-save functionality that persists selections to the backend database immediately upon user interaction, ensuring a seamless and persistent experience across sessions.

## Tasks

### 12.1 Backend Persistence Check
- [ ] Verify existing User model in Node.js supports immediate updates to `registeredJobs` and `skillSet`.
- [ ] Ensure the update endpoints are performant and handle concurrent updates gracefully.

### 12.2 Android Profile Screens Refactor
- [ ] **JobSelectionScreen**:
    - [ ] Remove the 'Save' button.
    - [ ] Update `JobSelectionViewModel` to trigger a backend update whenever a job's selection state changes.
    - [ ] Add a debouncing mechanism to prevent spamming the API during rapid toggling.
- [ ] **SkillSetSelectionScreen**:
    - [ ] Remove the 'Save' button.
    - [ ] Update `SkillSetSelectionViewModel` to trigger a backend update whenever a skill is toggled.
    - [ ] Implement visual feedback (e.g., a subtle loading indicator or "Saved" toast/snackbar) to confirm persistence.

### 12.3 Session & Login Persistence
- [ ] Verify that the user's selections are correctly re-fetched from the backend upon fresh login.
- [ ] Ensure the local state in the app is always synchronized with the backend.

## Verification
- **Unit Tests**: Update ViewModels to test that selection changes trigger repository calls.
- **Manual Test**:
    1. Navigate to Profile > Job Selection.
    2. Toggle multiple jobs.
    3. Navigate away and return; verify selections persist.
    4. Logout and log back in; verify selections are restored from the backend.
    5. Repeat for Skill Set Selection.
