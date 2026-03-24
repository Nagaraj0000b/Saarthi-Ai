package com.gigone.saarthi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.gigone.saarthi.data.ChatHistoryLog
import com.gigone.saarthi.data.ChatMessageData
import com.gigone.saarthi.ui.theme.AppColors
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// ═══════════════════════ PLATFORM ICONS (shared logic) ═══════════════════════
private data class PlatformStyle(val icon: ImageVector, val color: Color)

private fun platformStyle(platform: String): PlatformStyle = when (platform.lowercase()) {
    "uber" -> PlatformStyle(Icons.Default.LocalTaxi, Color(0xFF276EF1))
    "ola" -> PlatformStyle(Icons.Default.LocalTaxi, Color(0xFF1C8D3F))
    "swiggy" -> PlatformStyle(Icons.Default.Fastfood, Color(0xFFFC8019))
    "zomato" -> PlatformStyle(Icons.Default.Restaurant, Color(0xFFE23744))
    "rapido" -> PlatformStyle(Icons.Default.TwoWheeler, Color(0xFFFFC72C))
    "zepto" -> PlatformStyle(Icons.Default.ShoppingBag, Color(0xFF8B2FDB))
    "blinkit" -> PlatformStyle(Icons.Default.ShoppingCart, Color(0xFFF5C418))
    "porter" -> PlatformStyle(Icons.Default.LocalShipping, Color(0xFF2B3A4A))
    "dunzo" -> PlatformStyle(Icons.Default.DeliveryDining, Color(0xFF00D290))
    else -> PlatformStyle(Icons.Default.Work, AppColors.TextSecondary)
}

// ═══════════════════════ MOOD HELPERS ═══════════════════════
private data class MoodVisual(val icon: ImageVector, val label: String, val color: Color)

private fun getMoodVisual(score: Float?): MoodVisual = when {
    score == null -> MoodVisual(Icons.Outlined.SentimentNeutral, "N/A", AppColors.TextMuted)
    score >= 0.5f -> MoodVisual(Icons.Outlined.SentimentVerySatisfied, "Great", Color(0xFF10B981))
    score >= 0.1f -> MoodVisual(Icons.Outlined.SentimentSatisfied, "Good", Color(0xFF34D399))
    score >= -0.1f -> MoodVisual(Icons.Outlined.SentimentNeutral, "Okay", Color(0xFFFBBF24))
    score >= -0.5f -> MoodVisual(Icons.Outlined.SentimentDissatisfied, "Low", Color(0xFFF97316))
    else -> MoodVisual(Icons.Outlined.SentimentVeryDissatisfied, "Stressed", Color(0xFFEF4444))
}

// ═══════════════════════ MAIN SCREEN ═══════════════════════
@Composable
fun WorkLogsScreen(vm: WorkLogsViewModel = viewModel()) {
    val logs by vm.logs.collectAsStateWithLifecycle()
    val isLoading by vm.isLoading.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()

    var selectedLog by remember { mutableStateOf<ChatHistoryLog?>(null) }

    LaunchedEffect(Unit) { vm.loadLogs() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
    ) {
        // ── Header ───────────────────────────────────────────────────────
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            Text(
                "Shift History",
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                color = AppColors.TextPrimary
            )
            Text(
                "Review past check-ins, mood, and burnout trends",
                fontSize = 12.sp,
                color = AppColors.TextMuted,
                modifier = Modifier.padding(top = 2.dp)
            )
        }

        // ── Content ──────────────────────────────────────────────────────
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppColors.Primary, strokeWidth = 2.5.dp)
            }
        } else if (error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.ErrorOutline, contentDescription = null, tint = AppColors.Error, modifier = Modifier.size(40.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("Failed to load history", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold)
                    Text(error ?: "", color = AppColors.TextMuted, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(16.dp))
                }
            }
        } else if (logs.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.HistoryToggleOff, contentDescription = null, tint = AppColors.TextMuted, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("No check-ins yet", color = AppColors.TextSecondary, fontWeight = FontWeight.SemiBold)
                    Text("Start a check-in on the Dashboard", color = AppColors.TextMuted, fontSize = 12.sp)
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(logs, key = { it._id }) { log ->
                    CompactWorkLogCard(
                        log = log,
                        onReadTranscript = { selectedLog = log },
                        onDelete = { vm.deleteLog(log._id) }
                    )
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }

    // Transcript Dialog
    if (selectedLog != null) {
        TranscriptDialog(
            log = selectedLog!!,
            onDismiss = { selectedLog = null }
        )
    }
}

// ═══════════════════════ COMPACT WORK LOG CARD ═══════════════════════
@Composable
private fun CompactWorkLogCard(log: ChatHistoryLog, onReadTranscript: () -> Unit, onDelete: () -> Unit) {
    val platform = log.extractedData?.platform ?: "Unknown"
    val style = platformStyle(platform)

    val legacyScores = log.messages.mapNotNull { it.sentiment?.score }
    val avgScore = log.dailyMood?.takeIf { it.isValid }?.moodScore
        ?: if (legacyScores.isNotEmpty()) legacyScores.average().toFloat() else null
    val mood = getMoodVisual(avgScore)

    val statusText = log.burnoutStatus?.action ?: "Safe"
    val statusColor = when (statusText) {
        "Rest Required" -> AppColors.Error
        "Take a Break" -> Color(0xFFFFB347)
        else -> AppColors.Accent
    }
    val statusIcon = when (statusText) {
        "Rest Required" -> Icons.Outlined.Warning
        "Take a Break" -> Icons.Outlined.PauseCircle
        else -> Icons.Outlined.CheckCircle
    }

    val isToday = try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        val logDate = parser.parse(log.createdAt)
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        formatter.format(logDate!!) == formatter.format(Date())
    } catch (e: Exception) { false }

    Surface(
        color = AppColors.BgCard,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.BorderSubtle),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // ── Top row: date + platform ─────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.CalendarToday,
                        contentDescription = null,
                        tint = AppColors.TextMuted,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        formatLogDate(log.createdAt),
                        fontWeight = FontWeight.SemiBold,
                        color = AppColors.TextPrimary,
                        fontSize = 13.sp
                    )
                }

                // Platform pill
                Surface(
                    color = style.color.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, style.color.copy(alpha = 0.25f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(style.icon, contentDescription = null, tint = style.color, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(platform, color = style.color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(Modifier.height(10.dp))

            // ── Stats row: mood + status ─────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Mood
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(mood.icon, contentDescription = null, tint = mood.color, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Column {
                        Text("Mood", color = AppColors.TextMuted, fontSize = 10.sp)
                        Text(
                            "${mood.label} ${avgScore?.let { "%.1f".format(it) } ?: ""}".trim(),
                            fontSize = 12.sp,
                            color = mood.color,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                // Status
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(statusIcon, contentDescription = null, tint = statusColor, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Column {
                        Text("Status", color = AppColors.TextMuted, fontSize = 10.sp)
                        Text(
                            statusText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = statusColor
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))

            // ── Bottom row: actions ──────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onReadTranscript,
                    modifier = Modifier
                        .weight(1f)
                        .height(34.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary.copy(alpha = 0.12f)),
                    shape = RoundedCornerShape(8.dp),
                    elevation = ButtonDefaults.buttonElevation(0.dp)
                ) {
                    Icon(Icons.Outlined.Article, contentDescription = null, tint = AppColors.Primary, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Transcript", fontSize = 12.sp, color = AppColors.Primary, fontWeight = FontWeight.SemiBold)
                }

                if (isToday) {
                    Button(
                        onClick = onDelete,
                        modifier = Modifier
                            .height(34.dp)
                            .width(42.dp),
                        contentPadding = PaddingValues(0.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AppColors.Error.copy(alpha = 0.12f)),
                        shape = RoundedCornerShape(8.dp),
                        elevation = ButtonDefaults.buttonElevation(0.dp)
                    ) {
                        Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete", tint = AppColors.Error, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

// ═══════════════════════ TRANSCRIPT DIALOG ═══════════════════════
@Composable
fun TranscriptDialog(log: ChatHistoryLog, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = AppColors.BgCard,
        shape = RoundedCornerShape(24.dp),
        tonalElevation = 0.dp,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Article, contentDescription = null, tint = AppColors.Primary, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("Chat Transcript", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(formatLogDate(log.createdAt), fontSize = 11.sp, color = AppColors.TextMuted)
                }
            }
        },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(log.messages) { msg ->
                    val isUser = msg.role == "user"
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                    ) {
                        Text(
                            if (isUser) "You" else "Saarthi",
                            color = if (isUser) AppColors.Accent else AppColors.Primary,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 3.dp)
                        )
                        Surface(
                            color = if (isUser) AppColors.Accent.copy(alpha = 0.12f) else AppColors.Primary.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(
                                topStart = 12.dp, topEnd = 12.dp,
                                bottomStart = if (isUser) 12.dp else 4.dp,
                                bottomEnd = if (isUser) 4.dp else 12.dp
                            ),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isUser) AppColors.Accent.copy(alpha = 0.2f) else AppColors.Primary.copy(alpha = 0.2f)
                            ),
                            modifier = Modifier.widthIn(max = 240.dp)
                        ) {
                            Text(
                                msg.text,
                                color = AppColors.TextPrimary,
                                fontSize = 13.sp,
                                lineHeight = 18.sp,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Close", fontWeight = FontWeight.Bold)
            }
        }
    )
}

fun formatLogDate(isoString: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        val formatter = SimpleDateFormat("EEE, dd MMM yyyy", Locale.getDefault())
        val date = parser.parse(isoString) ?: return isoString
        formatter.format(date)
    } catch (e: Exception) {
        isoString.take(10)
    }
}
