# Phase 06 Context: Error Handling & Architecture Polish

## Phase Goal
Make the Android app robust against network and data failures. Implement graceful error handling and user-friendly fallback messages across the app.

## Requirements Addressed
- **POL-01**: Implement graceful error handling (try/catch blocks) across all API calls in ViewModels.
- **POL-02**: Ensure the UI displays user-friendly fallback messages (Snackbars, empty states) instead of crashing or showing raw exceptions when network calls fail.

## Implementation Decisions
- **ViewModels**: Audit all ViewModels (`DashboardViewModel`, `ProfileViewModel`, and any others like `AuthViewModel` or `EarningsViewModel` if they exist).
- **Error State Management**: Use `MutableStateFlow<String?>` to hold error messages, and expose them as `StateFlow<String?>`.
- **UI Fallbacks**: Composables observing these ViewModels must react to the error state by showing a `Toast`, `Snackbar`, or an error UI overlay instead of crashing.
- **Generic Messaging**: Do not expose raw HTTP codes or stack traces to the end user. Catch exceptions (like `HttpException`, `IOException`) and map them to friendly strings (e.g., "Network error, please check your connection and try again" or "Unable to connect to the server").

## Files of Interest
- `android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardViewModel.kt`
- `android/app/src/main/java/com/gigone/saarthi/ui/screens/ProfileViewModel.kt`
- Corresponding UI screens (e.g., `DashboardScreen.kt`, `ProfileSubScreens.kt`, `SignInScreen.kt`) to ensure they handle the emitted error states.

## Verification
- We should be able to force a network error (e.g., by changing the API base URL to an invalid one) and observe that the app handles it gracefully without a fatal exception.