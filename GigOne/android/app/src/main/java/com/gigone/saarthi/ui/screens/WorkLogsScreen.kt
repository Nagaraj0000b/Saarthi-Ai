package com.gigone.saarthi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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

@Composable
fun WorkLogsScreen(vm: WorkLogsViewModel = viewModel()) {
    val logs by vm.logs.collectAsStateWithLifecycle()
    val isLoading by vm.isLoading.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()

    var selectedLog by remember { mutableStateOf<ChatHistoryLog?>(null) }

    LaunchedEffect(Unit) {
        vm.loadLogs()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Shift History",
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                color = AppColors.TextPrimary
            )
        }

        Text(
            "Review your past AI check-ins, mood tracking, and burnout trends.",
            fontSize = 13.sp,
            color = AppColors.TextSecondary,
            modifier = Modifier.padding(start = 24.dp, end = 24.dp, bottom = 16.dp)
        )

        // List
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppColors.Primary)
            }
        } else if (error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    "Error loading history:\n$error\n\nTake a screenshot of this!",
                    color = Color(0xFFFF4D6D),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(32.dp)
                )
            }
        } else if (logs.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    "No check-in logs found. Run a check-in on the Dashboard!",
                    color = AppColors.TextSecondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(32.dp)
                )
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, top = 0.dp, end = 16.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(logs) { log ->
                    WorkLogCard(
                        log = log,
                        onReadTranscript = { selectedLog = log },
                        onDelete = { vm.deleteLog(log._id) }
                    )
                }
            }
        }
    }

    // Transcript Modal
    if (selectedLog != null) {
        TranscriptDialog(
            log = selectedLog!!,
            onDismiss = { selectedLog = null }
        )
    }
}

@Composable
fun WorkLogCard(log: ChatHistoryLog, onReadTranscript: () -> Unit, onDelete: () -> Unit) {
    val platform = log.extractedData?.platform ?: "Unknown"
    val emoji = when(platform) {
        "Uber" -> "🚗"
        "Swiggy" -> "🍔"
        "Rapido" -> "🏍️"
        else -> "📦"
    }

    val legacyScores = log.messages.mapNotNull { it.sentiment?.score }
    val avgScore = log.dailyMood?.takeIf { it.isValid }?.moodScore 
        ?: if (legacyScores.isNotEmpty()) legacyScores.average().toFloat() else null
    val moodEmoji = when {
        avgScore == null -> "😐"
        avgScore >= 0.5f -> "😄"
        avgScore >= 0.1f -> "🙂"
        avgScore >= -0.1f -> "😐"
        avgScore >= -0.5f -> "😟"
        else -> "😫"
    }

    val isToday = try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        val logDate = parser.parse(log.createdAt)
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        formatter.format(logDate!!) == formatter.format(Date())
    } catch (e: Exception) { false }

    Surface(
        color = Color(0x1A6C63FF),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    formatLogDate(log.createdAt),
                    fontWeight = FontWeight.Bold,
                    color = AppColors.TextPrimary,
                    fontSize = 15.sp
                )
                Surface(
                    color = Color(0x3300D4AA),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        "$emoji $platform",
                        color = AppColors.Accent,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                Column {
                    Text("Mood", color = AppColors.TextSecondary, fontSize = 12.sp)
                    Text("$moodEmoji ${avgScore?.let { "%.2f".format(it) } ?: "N/A"}", fontSize = 16.sp, color = AppColors.TextPrimary)
                }
                Column {
                    Text("Status", color = AppColors.TextSecondary, fontSize = 12.sp)
                    val statusText = log.burnoutStatus?.action ?: "Safe"
                    val statusColor = when (statusText) {
                        "Rest Required" -> Color(0xFFFF4D6D)
                        "Take a Break" -> Color(0xFFFFB347)
                        else -> AppColors.Accent
                    }
                    Text(statusText, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = statusColor)
                }
            }

            Spacer(Modifier.height(16.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onReadTranscript,
                    modifier = Modifier.weight(1f).height(40.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0x1AFFFFFF)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Read Transcript", fontSize = 13.sp, color = AppColors.TextPrimary)
                }
                if (isToday) {
                    Button(
                        onClick = onDelete,
                        modifier = Modifier.size(40.dp),
                        contentPadding = PaddingValues(0.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x1AFF4D6D)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("🗑️", fontSize = 16.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun TranscriptDialog(log: ChatHistoryLog, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF131626),
        title = {
            Column {
                Text("Chat Transcript", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold)
                Text(formatLogDate(log.createdAt), fontSize = 12.sp, color = AppColors.TextSecondary)
            }
        },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(log.messages) { msg ->
                    val isUser = msg.role == "user"
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                    ) {
                        Text(
                            if (isUser) "You" else "Saarthi",
                            color = AppColors.TextSecondary,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                        Surface(
                            color = if (isUser) Color(0x3300D4AA) else Color(0x336C63FF),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.widthIn(max = 240.dp)
                        ) {
                            Text(
                                msg.text,
                                color = AppColors.TextPrimary,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary)) {
                Text("Close")
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
