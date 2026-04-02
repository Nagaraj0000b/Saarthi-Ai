# Phase 05 Context: Android Integration

## Phase Goal
Connect the Android app's management screens to the backend and update the UI with the new ML-driven categories and filtering logic.

## Decisions

### 1. Synchronization Strategy
- **Trigger**: Sync occurs only when the user explicitly clicks "Save" (or finishes editing) in `ManageJobsScreen` or `ManageSkillsScreen`.
- **Source of Truth**: The Backend is the master. Local `TokenManager` acts as a cache for offline use/fast loads.

### 2. UI Feedback & UX
- **Loading State**: Show a `CircularProgressIndicator` or "Saving..." state on the button during the API call.
- **Completion**: Use a `Toast` or `Snackbar` to confirm "Profile updated successfully."
- **Dashboard**: No major visual changes requested; focus on data accuracy.

### 3. Category & Skill Management
- **Screen Updates**: `ManageJobsScreen` and `ManageSkillsScreen` will be updated to fetch/send data to `PATCH /api/auth/profile`.
- **Logic**: Use the 5 standardized categories to group jobs in the selection UI for better organization.

### 4. Error Handling
- **Failure Mode**: If the API call fails, the app will display a "Failed to save changes" error and keep the user on the current screen.
- **Integrity**: Local `TokenManager` will only be updated *after* a successful 200 OK response from the server.

## Implementation Details
- **API Client**: Update `AuthApi.kt` (or create a new profile service) to include the `updateProfile` call.
- **ViewModels**: Update `ProfileViewModel` or similar to handle the loading state and API orchestration.
- **Navigation**: Ensure the app fetches the latest profile data on login or app start to keep local cache fresh.

## Verification Strategy
- **Manual UAT**: Change skills in the app, restart the app, and verify skills are still correctly set (fetched from DB).
- **Behavioral Check**: Verify that adding a "Ride hailing" job in the app correctly influences the Dashboard recommendations.
