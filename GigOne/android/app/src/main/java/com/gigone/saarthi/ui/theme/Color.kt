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

// Eco-Professional "Forest & Fern" Palette (Tonal Green Harmony)
val professionalWhiteColors = AppColorsClass(
    primary = Color(0xFF40916C),       // Canopy Green - Brand Accent for location, language, and mic
    accent = Color(0xFF1B4332),       // Deep Forest - Used for Earnings/Money and high-impact CTAs
    bgDeep = Color(0xFFEFF6EE),        // Soft Fern - Natural, warm background to reduce eye strain
    bgCard = Color(0xFFFFFFFF),        // Pure White - Crisp layered look for job cards and chat boxes
    textPrimary = Color(0xFF1B4332),     // Deep Forest - Sophisticated, rich dark green for all main text
    textSecondary = Color(0xFF4B6E5C),   // Muted Forest - Mid-tone green for secondary info
    textMuted = Color(0xFF8EAB9A),       // Soft Sage - Muted grey-green for placeholder text
    borderSubtle = Color(0xFFD1DCD4),    // Pale Fern - Subtle borders that blend with the theme
    error = Color(0xFF7F1D1D),         // Dark Red - Strictly for errors only
    success = Color(0xFF1B4332)        // Deep Forest - Using weight/size instead of a different color for money
)

// Forest Dew Dark Mode - Whisper Edition (Low Glow)
val darkColors = AppColorsClass(
    primary = Color(0xFFA8D5B5),       // Whisper Green - Soft, pastel accent for zero glow effect
    accent = Color(0xFFA8D5B5),        // Whisper Green - Same as primary; distinguished by weight/size for money
    bgDeep = Color(0xFF0A0F0D),        // Deep Forest Night - Near-black with green undertone
    bgCard = Color(0xFF14201A),        // Raised Canopy - Surface for main cards and chat box
    textPrimary = Color(0xFFE8F5E9),     // Frost White - Warm off-white to prevent AMOLED halation
    textSecondary = Color(0xFF5A8A6A),   // Muted Pine - Balanced neutral for secondary info
    textMuted = Color(0xFF2D4D3A),       // Deep Moss - For very subtle elements
    borderSubtle = Color(0xFF0F1A14),    // Deep Moss - Inner card surface and professional borders
    error = Color(0xFF7F1D1D),         // Dark Red - Muted error state
    success = Color(0xFFA8D5B5)        // Whisper Green
)

// Default is now the Professional Light theme
object AppColors {
    var instance by mutableStateOf(professionalWhiteColors)


    // Delegates for easy access across the app
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
