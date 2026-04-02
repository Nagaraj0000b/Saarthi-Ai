# Phase 9.1 Summary: Theme & Location Perfection

## Completed Tasks

### 1. High-Contrast Dark Mode
- Added `darkColors` palette to `Color.kt` using a modern Slate/Indigo aesthetic.
- Updated `ProfileScreen.kt` to include "Dark" in the theme selection dialog.
- Wired the selection to update `AppColors.instance` instantly.

### 2. Theme Persistence Fix
- Refactored `SaarthiTheme` in `Theme.kt` to remove the hardcoded Zomato theme reset.
- Implemented a `LaunchedEffect` that reads the saved theme from `TokenManager` on app startup.
- Ensured the `MaterialTheme` color scheme is dynamically derived from `AppColors.instance`.

### 3. System GPS Resolution Dialog
- Integrated `SettingsClient` in `DashboardViewModel.kt` to check system-level location settings.
- Implemented `gpsLauncher` in `DashboardScreen.kt` using `ActivityResultContracts.StartIntentSenderForResult()`.
- The app now triggers the standard Android "Turn on Location" system dialog if GPS is disabled when:
    - Recommendations are loaded on startup.
    - The user performs a pull-to-refresh on the dashboard.
    - The user taps the "Location" pill in the header.

## Verification
- [x] Theme selection persists across app restarts (Tested logic).
- [x] Dark Mode is visually consistent and selectable.
- [x] System GPS prompt is triggered when hardware location is OFF.

---
*Created via GSD Executor.*
