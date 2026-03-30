package com.gigone.saarthi.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.gigone.saarthi.ui.theme.AppColors
import android.graphics.pdf.PdfDocument
import android.graphics.Paint
import android.graphics.Color
import android.os.Environment
import java.io.File
import java.io.FileOutputStream

import android.content.ContentValues
import android.provider.MediaStore
import android.os.Build
import android.content.Intent

@Composable
fun ReportsScreen(navController: NavController, vm: EarningsViewModel = viewModel()) {
    val entries by vm.entries.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val context = LocalContext.current

    // --- Detailed Data Processing ---
    val totalEarned = entries.sumOf { it.amount.toDouble() }.toFloat()
    val totalHours = entries.sumOf { it.hours.toDouble() }.toFloat()
    val totalTrips = entries.size
    val avgPerHour = if (totalHours > 0) totalEarned / totalHours else 0f
    
    // Aggregate by Platform -> Pair(Amount, Hours)
    val platformStats = entries.groupBy { it.platform }
        .mapValues { (_, list) -> 
            val amount = list.sumOf { it.amount.toDouble() }.toFloat()
            val hours = list.sumOf { it.hours.toDouble() }.toFloat()
            Pair(amount, hours)
        }
        .toList()
        .sortedByDescending { it.second.first }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        // --- Top Navigation Bar ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { navController.popBackStack() },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(
                        "Weekly Report",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = AppColors.TextPrimary
                    )
                    Text(
                        "Detailed Statement",
                        fontSize = 12.sp,
                        color = AppColors.TextSecondary
                    )
                }
            }

            // Top-level Download Button replacing the bottom view
            IconButton(
                onClick = { 
                    generateAndSavePdf(context, totalEarned, totalHours, platformStats, entries)
                },
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(AppColors.BgCard)
                    .border(1.dp, AppColors.BorderSubtle, CircleShape)
            ) {
                Icon(Icons.Outlined.Download, contentDescription = "Download Report", tint = AppColors.TextPrimary, modifier = Modifier.size(18.dp))
            }
        }

        // --- Master Earnings Card ---
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = AppColors.Primary),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Box(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Column {
                    Text("Total Revenue", color = AppColors.BgDeep.copy(alpha = 0.8f), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    Spacer(Modifier.height(2.dp))
                    Text("₹${totalEarned.toInt()}", color = AppColors.BgCard, fontWeight = FontWeight.ExtraBold, fontSize = 32.sp)
                }
                Icon(
                    Icons.Default.AccountBalanceWallet,
                    contentDescription = null,
                    tint = AppColors.BgDeep.copy(alpha = 0.15f),
                    modifier = Modifier.size(60.dp).align(Alignment.CenterEnd).offset(x = 6.dp, y = 6.dp)
                )
            }
        }

        // --- Detailed Metrics Grid ---
        Row(modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp)) {
            ReportMetricCard(
                title = "Time Online",
                value = "${totalHours.toInt()}h",
                icon = Icons.Default.Schedule,
                modifier = Modifier.weight(1f)
            )
            Spacer(Modifier.width(12.dp))
            ReportMetricCard(
                title = "Avg. Rate",
                value = "₹${avgPerHour.toInt()}/h",
                icon = Icons.Default.TrendingUp,
                modifier = Modifier.weight(1f)
            )
        }

        Text(
            "Platform Breakdown",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = AppColors.TextPrimary,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // --- Platform Table ---
        if (platformStats.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                Text("No data to display yet.", color = AppColors.TextSecondary)
            }
        } else {
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = AppColors.BgCard),
                border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.BorderSubtle),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    platformStats.forEachIndexed { index, (platform, stats) ->
                        val amount = stats.first
                        val hours = stats.second
                        val visual = getPlatformVisual(platform) 
                        val percentage = if (totalEarned > 0) amount / totalEarned else 0f
                        
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { navController.navigate("platform_detail/$platform") }
                                .padding(vertical = 8.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(AppColors.BgDeep),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(visual.icon, contentDescription = null, tint = AppColors.Primary, modifier = Modifier.size(20.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(platform, color = AppColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(Modifier.height(2.dp))
                                Text("${hours.toInt()} hrs logged", color = AppColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(horizontalAlignment = Alignment.End) {
                                Text("₹${amount.toInt()}", color = AppColors.TextPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                                Spacer(Modifier.height(2.dp))
                                Text("${(percentage * 100).toInt()}% of total", color = AppColors.TextMuted, fontSize = 10.sp)
                            }
                        }
                        if (index < platformStats.size - 1) {
                            HorizontalDivider(color = AppColors.BorderSubtle, thickness = 1.dp, modifier = Modifier.padding(vertical = 4.dp))
                        }
                    }
                }
            }
        }

        // Removed bottom solid download button.

        // Safely bounds scroll at bottom
        Spacer(Modifier.height(40.dp))
    }
}

@Composable
fun ReportMetricCard(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.BgCard),
        border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.BorderSubtle),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Icon(icon, contentDescription = null, tint = AppColors.Primary, modifier = Modifier.size(22.dp).padding(bottom = 6.dp))
            Text(title, color = AppColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(4.dp))
            Text(value, color = AppColors.TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }
    }
}

fun generateAndSavePdf(
    context: android.content.Context, 
    earned: Float, 
    hours: Float, 
    platformStats: List<Pair<String, Pair<Float, Float>>>,
    entries: List<com.gigone.saarthi.data.EarningEntry>
) {
    try {
        val document = PdfDocument()
        var pageInfo = PdfDocument.PageInfo.Builder(400, 600, 1).create()
        var page = document.startPage(pageInfo)
        
        var canvas = page.canvas
        val paint = Paint()
        
        // Header
        paint.color = Color.BLACK
        paint.textSize = 24f
        paint.isFakeBoldText = true
        canvas.drawText("GigOne Weekly Report", 20f, 50f, paint)
        
        // Divider
        paint.strokeWidth = 2f
        canvas.drawLine(20f, 70f, 380f, 70f, paint)
        
        // Content
        paint.textSize = 16f
        paint.isFakeBoldText = false
        canvas.drawText("Detailed Earnings Statement", 20f, 110f, paint)
        
        paint.textSize = 18f
        canvas.drawText("Total Revenue: Rs. ${earned.toInt()}", 20f, 150f, paint)
        canvas.drawText("Total Hours Logged: ${hours.toInt()} hrs", 20f, 180f, paint)
        
        // Breakdown List
        var yPos = 240f
        paint.textSize = 16f
        paint.color = Color.DKGRAY
        paint.isFakeBoldText = true
        canvas.drawText("Platform Breakdown:", 20f, yPos, paint)
        yPos += 30f
        
        paint.textSize = 14f
        paint.isFakeBoldText = false
        if (platformStats.isEmpty()) {
            canvas.drawText("No data available yet.", 30f, yPos, paint)
            yPos += 25f
        } else {
            for ((platform, stats) in platformStats) {
                val pAmount = stats.first
                val pHours = stats.second
                canvas.drawText("• $platform : ${pHours.toInt()} hrs | Rs. ${pAmount.toInt()}", 30f, yPos, paint)
                yPos += 25f
            }
        }

        // --- Detailed Logs Section ---
        yPos += 20f
        paint.textSize = 16f
        paint.color = Color.BLACK
        paint.isFakeBoldText = true
        canvas.drawText("Detailed Work Logs:", 20f, yPos, paint)
        yPos += 25f

        paint.textSize = 12f
        paint.isFakeBoldText = false
        
        val sortedEntries = entries.sortedByDescending { it.date }
        for (entry in sortedEntries) {
            // Check if we need a new page
            if (yPos > 540f) {
                document.finishPage(page)
                pageInfo = PdfDocument.PageInfo.Builder(400, 600, document.pages.size + 1).create()
                page = document.startPage(pageInfo)
                canvas = page.canvas
                yPos = 50f
                
                paint.textSize = 14f
                paint.isFakeBoldText = true
                canvas.drawText("Detailed Work Logs (continued):", 20f, yPos, paint)
                yPos += 25f
                paint.textSize = 12f
                paint.isFakeBoldText = false
            }

            val datePart = try { entry.date.split("T")[0] } catch (e: Exception) { entry.date }
            canvas.drawText("${entry.platform} | $datePart | ${entry.hours.toInt()}h | Rs. ${entry.amount.toInt()}", 30f, yPos, paint)
            yPos += 20f
        }
        
        // Footer (on the last page)
        paint.textSize = 10f
        paint.color = Color.GRAY
        canvas.drawText("Generated by GigOne Assistant on ${java.util.Date()}", 20f, 580f, paint)
        
        document.finishPage(page)
        
        val pdfName = "GigOne_Report_${System.currentTimeMillis()}.pdf"
        var fileUri: android.net.Uri? = null
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val resolver = context.contentResolver
            val contentValues = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, pdfName)
                put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }
            fileUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
            fileUri?.let { uri ->
                resolver.openOutputStream(uri)?.use { out ->
                    document.writeTo(out)
                }
            }
        } else {
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val file = File(downloadsDir, pdfName)
            val fos = FileOutputStream(file)
            document.writeTo(fos)
            fos.close()
        }
        document.close()
        
        Toast.makeText(context, "Saved to Downloads!", Toast.LENGTH_SHORT).show()
        
        // Automatically pop open the PDF viewer!
        if (fileUri != null) {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(fileUri, "application/pdf")
                flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(Intent.createChooser(intent, "Open PDF Report"))
        }

    } catch (e: Exception) {
        e.printStackTrace()
        Toast.makeText(context, "Couldn't save: ${e.message}", Toast.LENGTH_LONG).show()
    }
}
