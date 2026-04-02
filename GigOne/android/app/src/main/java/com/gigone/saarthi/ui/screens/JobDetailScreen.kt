package com.gigone.saarthi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Event
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.gigone.saarthi.ui.theme.AppColors
import java.text.SimpleDateFormat
import java.util.*
import com.gigone.saarthi.util.getJobVisual


@Composable
fun JobDetailScreen(navController: NavController, jobName: String, vm: EarningsViewModel = viewModel()) {
    val entries by vm.entries.collectAsStateWithLifecycle()
    
    val filteredEntries = entries.filter { it.actualJob.equals(jobName, ignoreCase = true) }
        .sortedByDescending { it.date }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        // --- Header ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = { navController.popBackStack() },
                modifier = Modifier.size(36.dp)
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    "$jobName Details",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = AppColors.TextPrimary
                )
                Text(
                    "Historical Work Logs",
                    fontSize = 12.sp,
                    color = AppColors.TextSecondary
                )
            }
        }

        if (filteredEntries.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No data found for $jobName", color = AppColors.TextSecondary)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                items(filteredEntries) { entry ->
                    JobEntryCard(entry)
                }
            }
        }
    }
}

@Composable
fun JobEntryCard(entry: com.gigone.saarthi.data.EarningEntry) {
    val visual = getJobVisual(entry.actualJob)
    val formattedDate = try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        inputFormat.timeZone = TimeZone.getTimeZone("UTC")
        val date = inputFormat.parse(entry.date)
        val outputFormat = SimpleDateFormat("EEE, dd MMM yyyy", Locale.getDefault())
        outputFormat.format(date!!)
    } catch (e: Exception) {
        entry.date
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.BgCard),
        border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.BorderSubtle)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        visual.icon,
                        contentDescription = null,
                        tint = AppColors.Primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        formattedDate,
                        color = AppColors.TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    "${entry.hours.toInt()} hours worked",
                    color = AppColors.TextSecondary,
                    fontSize = 12.sp
                )
            }
            
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "₹${entry.amount.toInt()}",
                    color = AppColors.Primary,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp
                )
                Text(
                    "Earned",
                    color = AppColors.TextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
