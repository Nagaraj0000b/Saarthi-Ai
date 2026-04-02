# Phase 9: Theme & Location Persistence - Research

**Researched:** March 31, 2026
**Domain:** Android Jetpack Compose / Persistence / Location Services
**Confidence:** HIGH

## Summary

This research focuses on two critical UX areas: persisting the user's theme choice across app restarts and ensuring the app can prompt the user to enable system-level GPS if it is disabled. Currently, the theme resets to Zomato Red on every launch due to a hardcoded initialization in `SaarthiTheme`, and the location logic only checks for permissions without verifying if GPS is actually ON at the OS level.

**Primary recommendation:** Initialize `AppColors.instance` from `TokenManager` on app startup, and use Google Play Services `SettingsClient` API to trigger the standard "Turn on Location" system dialog when GPS is required but disabled.

<user_constraints>
## User Constraints (from 9-CONTEXT.md)

### Locked Decisions
- **Typography Standards:** All instructional and secondary text must be increased to a minimum of **14.sp**.
- **High Contrast:** Ensure `AppColors.TextSecondary` maintains a contrast ratio of at least 4.5:1 against all backgrounds.
- **Haptic Feedback Integration:** Use `LocalHapticFeedback.current` from Compose.
- **Layout Refinement:** Increase vertical spacing between Top Header and Recommendation Card from `8.dp` to `16.dp`.
- **Theme Management:** Add a "Change Theme" option in the `ProfileScreen` under "APP SETTINGS".
- **Options:** "Zomato Red" (Default) and "Professional Indigo".
- **Persistence:** Save the selection in `SharedPreferences` via `TokenManager`.
- **Enhanced Empty States:** Use Compose-native `Canvas` or `Icon` compositions for a stylized "Empty Dashboard" illustration.

### the agent's Discretion
- Choosing specific `HapticFeedbackType` for Mic release and Refresh trigger.
- Designing the Canvas-based stylized illustration for the empty state.
- Implementation details for the Theme Selector (Dialog vs Toggle).
- Specific color values for Dark Mode (if added on top of Brand Themes).

### Deferred Ideas (OUT OF SCOPE)
- Adding Lottie dependency for animations.
- Complex animation transitions between themes.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Jetpack Compose | 1.7.x | UI Toolkit | Modern Android standard |
| Google Play Services Location | 21.x | GPS & Fused Location | Official way to handle location & GPS prompts |
| SharedPreferences | — | Local Persistence | Used via TokenManager for lightweight settings |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| androidx.activity-compose | 1.9.x | Activity Callbacks | To launch the "Turn on GPS" system dialog |

## Architecture Patterns

### Pattern 1: Persistent Dynamic Theme Initialization
**What:** Loading the saved theme from `TokenManager` during the first composition of `SaarthiTheme`.
**When to use:** On app startup to avoid "theme flicker" or resetting to default.
**Example:**
```kotlin
// In Theme.kt
@Composable
fun SaarthiTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    
    // One-time initialization from persistence
    LaunchedEffect(Unit) {
        val savedTheme = TokenManager.getThemeMode(context)
        AppColors.instance = when(savedTheme) {
            "Professional Indigo" -> professionalWhiteColors
            "Dark" -> darkColors // New dark palette
            else -> zomatoColors
        }
    }
    
    // Note: SaarthiTheme must NOT call updateColorsFrom(zomatoColors) 
    // in every composition, as that overrides the user choice.
}
```

### Pattern 2: Resolvable GPS Prompt
**What:** Using `SettingsClient` to detect if GPS is disabled and showing the system "Turn on GPS" dialog.
**When to use:** When the user attempts a location-dependent action (e.g., Refresh Location) and `getCurrentLocation` returns null despite having permissions.
**Implementation Detail:**
1. `DashboardViewModel` exposes an event `triggerGpsPrompt`.
2. `DashboardScreen` uses `rememberLauncherForActivityResult(StartIntentSenderForResult())` to launch the resolution.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GPS Status Check | Custom BroadcastReceiver for GPS status | `SettingsClient` API | Handles the dialog UI and hardware-specific checks automatically |
| Theme State | Custom event system for color updates | `mutableStateOf` in singleton | Native Compose support for instant re-composition |

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `saarthi_prefs` SharedPreferences | None (re-use existing `theme_mode` key) |
| Secrets/env vars | None | — |
| Build artifacts | None | — |

## Common Pitfalls

### Pitfall 1: Hardcoded Theme Overrides
**What goes wrong:** `SaarthiTheme` currently has a line: `AppColors.instance.updateColorsFrom(zomatoColors)`. This *negates* any persistence because it resets the theme to Zomato every time the UI re-composes.
**How to avoid:** Remove the hardcoded override and rely on `AppColors.instance` being set during initialization or by the toggle.

### Pitfall 2: Fragmented Location Permissions vs Status
**What goes wrong:** App has location permissions but GPS is OFF at system level. `FusedLocationProviderClient` will return null or timeout, frustrating the user.
**How to avoid:** Check `SettingsClient.checkLocationSettings` before calling `getCurrentLocation`.

## Code Examples

### Dark Mode Palette (Indigo/Emerald)
Verified high-contrast palette for modern dark mode:
```kotlin
val darkColors = AppColorsClass(
    primary = Color(0xFF818CF8),       // Indigo 400 (Lighter for dark mode contrast)
    accent = Color(0xFF34D399),        // Emerald 400
    bgDeep = Color(0xFF0F172A),        // Slate 900
    bgCard = Color(0xFF1E293B),        // Slate 800
    textPrimary = Color(0xFFF8FAFC),   // Slate 50
    textSecondary = Color(0xFF94A3B8), // Slate 400
    textMuted = Color(0xFF64748B),     // Slate 500
    borderSubtle = Color(0xFF334155),  // Slate 700
    error = Color(0xFFFB7185),         // Rose 400
    success = Color(0xFF34D399)
)
```

### GPS Resolution Launcher
```kotlin
val gpsLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.StartIntentSenderForResult()
) { result ->
    if (result.resultCode == Activity.RESULT_OK) {
        vm.loadRecommendations() // Retry after GPS enabled
    }
}

// In ViewModel
fun checkGps(context: Context, onResolutionRequired: (IntentSenderRequest) -> Unit) {
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000).build()
    val builder = LocationSettingsRequest.Builder().addLocationRequest(request)
    val client = LocationServices.getSettingsClient(context)
    
    client.checkLocationSettings(builder.build()).addOnFailureListener { e ->
        if (e is ResolvableApiException) {
            onResolutionRequired(IntentSenderRequest.Builder(e.resolution.intentSender).build())
        }
    }
}
```

## Open Questions

1. **Dark Mode Integration:** Should "Dark" be a separate toggle (Light/Dark) that works with both Zomato and Indigo, or should it be a third standalone theme option?
   - **Recommendation:** Start with a standalone "Dark Mode" theme to simplify the initial persistence implementation.

2. **MainActivity Logic:** The user asked to examine `MainActivity.kt`. 
   - **Finding:** Current `MainActivity` is minimal. 
   - **Recommendation:** Keep location logic in `DashboardViewModel` but handle the `ActivityResult` in `DashboardScreen` (or `MainActivity` if global status is desired). `DashboardScreen` is currently the only consumer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| play-services-location | GPS Prompts | ✓ | 21.x | Use manual settings intent |
| SharedPreferences | Persistence | ✓ | Native | — |

## Sources
- [Google Android Documentation - Change Location Settings](https://developer.android.com/develop/sensors-and-location/location/change-settings)
- [Material Design 3 - Dark Theme Guidelines]
- [Local Project Audit - TokenManager.kt, Color.kt, Theme.kt]

## Metadata
**Confidence breakdown:**
- Theme Persistence: HIGH (Already have SharedPreferences infrastructure)
- Location Status: HIGH (Standard Android pattern)
- Pitfalls: HIGH (Identified specific hardcoded override in code)

**Research date:** March 31, 2026
**Valid until:** April 30, 2026
