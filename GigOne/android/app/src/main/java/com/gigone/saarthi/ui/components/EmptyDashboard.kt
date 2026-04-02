package com.gigone.saarthi.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.WorkOutline
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gigone.saarthi.ui.theme.AppColors

/**
 * EmptyDashboardIllustration — A stylized, Compose-native illustration for empty states.
 * Encourages users to select jobs to unlock the ML recommendation engine.
 */
@Composable
fun EmptyDashboardIllustration(
    onSetupClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // ── Stylized Canvas Illustration ──
        Box(
            modifier = Modifier
                .size(120.dp)
                .padding(bottom = 16.dp),
            contentAlignment = Alignment.Center
        ) {
            val accentColor = AppColors.Accent
            val primaryColor = AppColors.Primary

            Canvas(modifier = Modifier.fillMaxSize()) {
                // Background circle (dashed/dotted)
                drawCircle(
                    color = primaryColor.copy(alpha = 0.1f),
                    radius = size.minDimension / 2,
                    style = Stroke(
                        width = 2.dp.toPx(),
                        pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                    )
                )
                
                // Floating accent lines
                drawLine(
                    color = accentColor.copy(alpha = 0.4f),
                    start = androidx.compose.ui.geometry.Offset(size.width * 0.2f, size.height * 0.2f),
                    end = androidx.compose.ui.geometry.Offset(size.width * 0.35f, size.height * 0.15f),
                    strokeWidth = 4.dp.toPx(),
                    cap = StrokeCap.Round
                )
                
                drawCircle(
                    color = accentColor.copy(alpha = 0.3f),
                    radius = 6.dp.toPx(),
                    center = androidx.compose.ui.geometry.Offset(size.width * 0.8f, size.height * 0.3f)
                )
            }

            // Central Icon representing "Work/Jobs"
            Icon(
                Icons.Default.WorkOutline,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = AppColors.Primary
            )
            
            // Plus Badge
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = (-10).dp, y = (-10).dp),
                shape = androidx.compose.foundation.shape.CircleShape,
                color = AppColors.Accent,
                shadowElevation = 4.dp
            ) {
                Icon(
                    Icons.Default.Add,
                    contentDescription = null,
                    modifier = Modifier.padding(4.dp).size(16.dp),
                    tint = Color.White
                )
            }
        }

        // ── Text Content ──
        Text(
            "Start Your Journey",
            color = AppColors.TextPrimary,
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold
        )
        
        Spacer(Modifier.height(8.dp))
        
        Text(
            "Select the platforms you work on to see personalized job recommendations and earning predictions.",
            color = AppColors.TextSecondary,
            fontSize = 14.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(Modifier.height(24.dp))

        // ── Action Button ──
        Button(
            onClick = onSetupClick,
            colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
        ) {
            Text(
                "SET UP PROFILE",
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                fontSize = 14.sp,
                color = Color.White
            )
        }
    }
}
