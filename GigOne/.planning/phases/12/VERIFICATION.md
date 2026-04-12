# Phase 12 Verification: Auto-save Profile Selections

## Verification Goals
- Ensure UI allows selection without manual saving.
- Ensure backend reflects changes immediately (debounced).
- Ensure data persists across logins.

## Test Cases

### 1. Auto-save Trigger
- **Action**: Add a job in `ManageJobsScreen`.
- **Observation**: "Saving..." appears in the header briefly.
- **Result**: PASS

### 2. UI Persistence (Navigation)
- **Action**: Add a job, navigate back to Profile, then go back to Jobs.
- **Observation**: Selection is still present.
- **Result**: PASS

### 3. Backend Persistence (Login)
- **Action**: Change skills, logout, login.
- **Observation**: Skills match the changed state.
- **Result**: PASS

### 4. Debouncing Efficiency
- **Action**: Rapidly add 5 jobs.
- **Observation**: Backend receives fewer than 5 calls (debounced).
- **Result**: PASS
