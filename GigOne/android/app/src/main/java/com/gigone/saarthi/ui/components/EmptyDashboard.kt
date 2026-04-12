package com.gigone.saarthi.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WorkOutline
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gigone.saarthi.ui.theme.AppColors

@Composable
fun EmptyDashboardIllustration(
    onSetupClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Default.WorkOutline,
            contentDescription = null,
            tint = AppColors.Primary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                "No jobs selected",
                color = AppColors.TextPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "Set up your profile to get recommendations",
                color = AppColors.TextSecondary,
                fontSize = 12.sp
            )
        }
        Spacer(Modifier.width(8.dp))
        TextButton(
            onClick = onSetupClick,
            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
        ) {
            Text(
                "Set Up →",
                color = AppColors.Accent,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp
            )
        }
    }
}
