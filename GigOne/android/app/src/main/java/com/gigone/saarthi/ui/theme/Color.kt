package com.gigone.saarthi.ui.theme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

/** Dynamic App Colors - Supports Light and Dark modes instantly. */
class AppColorsClass(
    primary: Color,
    accent: Color,
    bgDeep: Color,
    bgCard: Color,
    textPrimary: Color,
    textSecondary: Color,
    textMuted: Color,
    borderSubtle: Color,
    error: Color,
    success: Color
) {
    var Primary by mutableStateOf(primary)
    var Accent by mutableStateOf(accent)
    var BgDeep by mutableStateOf(bgDeep)
    var BgCard by mutableStateOf(bgCard)
    var TextPrimary by mutableStateOf(textPrimary)
    var TextSecondary by mutableStateOf(textSecondary)
    var TextMuted by mutableStateOf(textMuted)
    var BorderSubtle by mutableStateOf(borderSubtle)
    var Error by mutableStateOf(error)
    var Success by mutableStateOf(success)

    fun updateColorsFrom(other: AppColorsClass) {
        Primary = other.Primary
        Accent = other.Accent
        BgDeep = other.BgDeep
        BgCard = other.BgCard
        TextPrimary = other.TextPrimary
        TextSecondary = other.TextSecondary
        TextMuted = other.TextMuted
        BorderSubtle = other.BorderSubtle
        Error = other.Error
        Success = other.Success
    }
}

val darkColors = AppColorsClass(
    primary = Color(0xFF6C63FF),
    accent = Color(0xFF00D4AA),
    bgDeep = Color(0xFF07080F),
    bgCard = Color(0xFF131626),
    textPrimary = Color(0xFFFFFFFF),
    textSecondary = Color(0xFFA0AABF),
    textMuted = Color(0xFF6B7280),
    borderSubtle = Color(0xFF1E243B),
    error = Color(0xFFEF4444),
    success = Color(0xFF10B981)
)

val lightColors = AppColorsClass(
    primary = Color(0xFF6C63FF),       // Keep brand purple
    accent = Color(0xFF00B38F),        // Slightly darker teal for light bg
    bgDeep = Color(0xFFF3F4F6),        // Light gray background
    bgCard = Color(0xFFFFFFFF),        // White cards
    textPrimary = Color(0xFF111827),     // Near black text
    textSecondary = Color(0xFF4B5563),   // Gray text
    textMuted = Color(0xFF9CA3AF),       // Light gray text
    borderSubtle = Color(0xFFE5E7EB),    // Very light border
    error = Color(0xFFEF4444),
    success = Color(0xFF10B981)
)

// The global singleton that Compose will react to
object AppColors {
    var instance by mutableStateOf(darkColors)

    // Delegates for easy access across the app (AppColors.Primary instead of AppColors.instance.Primary)
    val Primary get() = instance.Primary
    val Accent get() = instance.Accent
    val BgDeep get() = instance.BgDeep
    val BgCard get() = instance.BgCard
    val TextPrimary get() = instance.TextPrimary
    val TextSecondary get() = instance.TextSecondary
    val TextMuted get() = instance.TextMuted
    val BorderSubtle get() = instance.BorderSubtle
    val Error get() = instance.Error
    val Success get() = instance.Success
}
