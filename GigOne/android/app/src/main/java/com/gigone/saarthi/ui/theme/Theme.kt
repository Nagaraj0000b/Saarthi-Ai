package com.gigone.saarthi.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
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

@Composable
fun SaarthiTheme(content: @Composable () -> Unit) {
    // Strictly enforce Zomato Theme as requested
    AppColors.instance.updateColorsFrom(zomatoColors)
    MaterialTheme(colorScheme = LightColorScheme, content = content)
}
