package com.gigone.saarthi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.gigone.saarthi.ui.theme.AppColors

@Composable
fun ReportsScreen(vm: EarningsViewModel = viewModel()) {
    val entries by vm.entries.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()

    // --- Data Processing for this week ---
    // In a real app, you'd filter by this week (Monday-Sunday). For simplicity, we process all available in state right now.
    val totalEarned = entries.sumOf { it.amount.toDouble() }.toFloat()
    val platformTotals = entries.groupBy { it.platform }.mapValues { (_, list) -> list.sumOf { it.amount.toDouble() }.toFloat() }.toList().sortedByDescending { it.second }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        Text(
            "Weekly Report",
            fontSize = 26.sp,
            fontWeight = FontWeight.ExtraBold,
            color = AppColors.TextPrimary
        )
        Text(
            "Monday - Today",
            fontSize = 14.sp,
            color = AppColors.TextSecondary,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        // --- Total Earnings Card ---
        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = AppColors.Primary.copy(alpha = 0.15f))
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Total Earned", color = AppColors.Primary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Spacer(Modifier.height(8.dp))
                Text("₹${totalEarned.toInt()}", color = AppColors.TextPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 42.sp)
            }
        }

        Text(
            "Platform Breakdown",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = AppColors.TextPrimary,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // --- Platform Table ---
        if (platformTotals.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                Text("No data to display yet.", color = AppColors.TextSecondary)
            }
        } else {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = AppColors.BgCard)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    platformTotals.forEachIndexed { index, (platform, amount) ->
                        val visual = getPlatformVisual(platform)
                        val percentage = if (totalEarned > 0) amount / totalEarned else 0f
                        
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Icon
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(visual.color.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(visual.icon, contentDescription = null, tint = visual.color, modifier = Modifier.size(24.dp))
                            }
                            
                            Spacer(Modifier.width(16.dp))
                            
                            // Name & Progress Bar
                            Column(modifier = Modifier.weight(1f)) {
                                Text(platform, color = AppColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Spacer(Modifier.height(6.dp))
                                LinearProgressIndicator(
                                    progress = percentage,
                                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                                    color = visual.color,
                                    trackColor = visual.color.copy(alpha = 0.2f)
                                )
                            }
                            
                            Spacer(Modifier.width(16.dp))
                            
                            // Amount
                            Column(horizontalAlignment = Alignment.End) {
                                Text("₹${amount.toInt()}", color = AppColors.Accent, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                                Text("${(percentage * 100).toInt()}%", color = AppColors.TextSecondary, fontSize = 12.sp)
                            }
                        }
                        
                        if (index < platformTotals.size - 1) {
                            HorizontalDivider(color = AppColors.BorderSubtle, thickness = 1.dp)
                        }
                    }
                }
            }
        }
        
        Spacer(Modifier.height(30.dp))
    }
}
