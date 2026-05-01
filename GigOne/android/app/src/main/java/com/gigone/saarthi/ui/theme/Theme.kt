package com.gigone.saarthi.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import com.gigone.saarthi.util.TokenManager

@Composable
fun SaarthiTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    
    // Initialize theme from persistence on first composition
    LaunchedEffect(Unit) {
        val savedTheme = TokenManager.getThemeMode(context)
        AppColors.instance = when(savedTheme) {
            "Light" -> professionalWhiteColors
            "Dark" -> darkColors
            else -> professionalWhiteColors
        }
    }

    val colorScheme = lightColorScheme(
        primary = AppColors.Primary,
        secondary = AppColors.Accent,
        background = AppColors.BgDeep,
        surface = AppColors.BgCard,
        onPrimary = Color.White,
        onSecondary = Color.White,
        onBackground = AppColors.TextPrimary,
        onSurface = AppColors.TextPrimary,
        error = AppColors.Error,
        outline = AppColors.BorderSubtle,
    )

    MaterialTheme(colorScheme = colorScheme, content = content)
}
