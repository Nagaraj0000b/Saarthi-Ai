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

// Upgraded to a Premium, Modern Aesthetic (Slate & Indigo)
val professionalWhiteColors = AppColorsClass(
    primary = Color(0xFF4F46E5),       // Deep Premium Indigo (modern tech/fintech primary)
    accent = Color(0xFF10B981),        // Vibrant Emerald for success and earnings
    bgDeep = Color(0xFFF8FAFC),        // Slate 50 - Very clean, modern off-white background
    bgCard = Color(0xFFFFFFFF),        // Pure white for elevated cards
    textPrimary = Color(0xFF0F172A),     // Slate 900 - Rich near-black for high legibility
    textSecondary = Color(0xFF475569),   // Slate 600 - Crisp secondary text
    textMuted = Color(0xFF94A3B8),       // Slate 400 - Muted placeholder text
    borderSubtle = Color(0xFFE2E8F0),    // Slate 200 - Extremely subtle, clean borders
    error = Color(0xFFEF4444),         // Vibrant Rose for errors
    success = Color(0xFF10B981)
)

// Official Zomato Color Palette
val zomatoColors = AppColorsClass(
    primary = Color(0xFFE23744),       // Zomato Red
    accent = Color(0xFFE23744),        // Accent also red
    bgDeep = Color(0xFFF4F4F2),        // Light cream/grey background
    bgCard = Color(0xFFFFFFFF),        // White cards
    textPrimary = Color(0xFF1C1C1C),     // Zomato Dark Grey for text
    textSecondary = Color(0xFF696969),   // Secondary text grey
    textMuted = Color(0xFF9C9C9C),       // Muted grey
    borderSubtle = Color(0xFFE8E8E8),    // Light border
    error = Color(0xFFE23744),         // Error also using brand red
    success = Color(0xFF48C479)        // Zomato success green
)

// Default is now the Zomato theme
object AppColors {
    var instance by mutableStateOf(zomatoColors)

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
