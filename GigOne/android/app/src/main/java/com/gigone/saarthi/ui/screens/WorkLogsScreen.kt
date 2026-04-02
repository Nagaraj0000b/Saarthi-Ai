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
import com.gigone.saarthi.util.formatIsoDate
import com.gigone.saarthi.util.getJobVisual
import com.gigone.saarthi.util.getRelativeDateLabel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkLogsScreen(vm: WorkLogsViewModel = viewModel()) {
    val logs by vm.logs.collectAsStateWithLifecycle()
    val isLoading by vm.isLoading.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()

    var selectedLog by remember { mutableStateOf<ChatHistoryLog?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var showSheet by remember { mutableStateOf(false) }

    // Grouping logic for "Simple" view
    val groupedLogs = remember(logs) {
        logs.groupBy { getRelativeDateLabel(it.createdAt) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
    ) {
        // --- Clean Header ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Shift History",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = AppColors.TextPrimary
                )
                Text(
                    "${logs.size} check-ins logged",
                    fontSize = 14.sp,
                    color = AppColors.TextMuted
                )
            }
            IconButton(
                onClick = { vm.loadLogs() },
                modifier = Modifier
                    .clip(CircleShape)
                    .background(AppColors.BgCard)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = AppColors.Primary)
            }
        }

        // --- Simplified Content ---
        if (isLoading && logs.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppColors.Primary, strokeWidth = 3.dp)
            }
        } else if (errorMessage != null && logs.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = AppColors.Error, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("Connection Issue", fontWeight = FontWeight.Bold, color = AppColors.TextPrimary)
                    Text(errorMessage ?: "", color = AppColors.TextMuted, fontSize = 14.sp, textAlign = TextAlign.Center)
                }
            }
        } else if (logs.isEmpty() && !isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.History, contentDescription = null, tint = AppColors.TextMuted, modifier = Modifier.size(64.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("No history yet", color = AppColors.TextSecondary, fontWeight = FontWeight.Bold)
                    Text("Session logs appear here", color = AppColors.TextMuted, fontSize = 14.sp)
                }
            }
        } else {
            androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                isRefreshing = isLoading,
                onRefresh = { vm.loadLogs() },
                modifier = Modifier.fillMaxSize()
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding =    PaddingValues(start = 16.dp, end = 16.dp, top = 0.dp, bottom = 40.dp)
                ) {
                    groupedLogs.forEach { (dateGroup, logsInGroup) ->
                        // Simple Date Header
                        item {
                            Text(
                                text = dateGroup.uppercase(),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = AppColors.Primary,
                                letterSpacing = 1.sp,
                                modifier = Modifier.padding(top = 24.dp, bottom = 12.dp, start = 8.dp)
                            )
                        }

                        items(logsInGroup) { log ->
                            SimpleWorkLogCard(log) {
                                selectedLog = log
                                showSheet = true
                            }
                        }
                    }
                }
            }
        }
    }

    if (showSheet && selectedLog != null) {
        WorkLogDetailSheet(
            log = selectedLog!!,
            sheetState = sheetState,
            onDismiss = { showSheet = false }
        )
    }
}

@Composable
private fun SimpleWorkLogCard(log: ChatHistoryLog, onClick: () -> Unit) {
    val job = log.extractedData?.job ?: "Work Session"
    val visual = getJobVisual(job)
    val mood = log.dailyMood?.moodLabel ?: "Neutral"
    val moodColor = when (mood) {
        "Positive" -> AppColors.Success
        "Negative" -> AppColors.Error
        else -> AppColors.TextMuted
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable { onClick() },
        color = AppColors.BgCard,
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.BorderSubtle)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // High-contrast monochromatic icon
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(AppColors.BgDeep),
                contentAlignment = Alignment.Center
            ) {
                Icon(visual.icon, contentDescription = null, tint = AppColors.TextPrimary, modifier = Modifier.size(22.dp))
            }

            Spacer(Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    job,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    formatIsoDate(log.createdAt, "hh:mm a"),
                    fontSize = 13.sp,
                    color = AppColors.TextMuted
                )
            }

            // Minimal mood dot
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(moodColor)
            )
            
            Spacer(Modifier.width(12.dp))
            
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = AppColors.BorderSubtle)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkLogDetailSheet(log: ChatHistoryLog, sheetState: SheetState, onDismiss: () -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = AppColors.BgCard,
        dragHandle = { BottomSheetDefaults.DragHandle(color = AppColors.BorderSubtle) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .padding(bottom = 24.dp)
        ) {
            // Simplified sheet header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp)
            ) {
                Text(
                    formatIsoDate(log.createdAt, "EEEE, dd MMMM"),
                    fontSize = 13.sp,
                    color = AppColors.Primary,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    log.extractedData?.job ?: "Check-in Detail",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = AppColors.TextPrimary
                )
                
                Spacer(Modifier.height(12.dp))
                
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    DetailBadge(log.dailyMood?.moodLabel ?: "Neutral")
                    DetailBadge(if (log.step == "completed") "Complete" else "Partial", 
                                if (log.step == "completed") AppColors.Success else AppColors.TextMuted)
                }
            }

            HorizontalDivider(color = AppColors.BorderSubtle, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp))

            // Chat History view remains as it's very useful
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(log.messages) { msg ->
                    SimpleChatBubble(msg)
                }
            }

            Button(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Close", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun DetailBadge(label: String, color: Color = AppColors.TextSecondary) {
    Surface(
        color = color.copy(alpha = 0.08f),
        shape = RoundedCornerShape(6.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.2f))
    ) {
        Text(
            label, 
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            fontSize = 11.sp, 
            fontWeight = FontWeight.Bold, 
            color = color
        )
    }
}

@Composable
private fun SimpleChatBubble(message: ChatMessageData) {
    val isAssistant = message.role.lowercase() == "assistant"
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isAssistant) Alignment.Start else Alignment.End
    ) {
        Surface(
            color = if (isAssistant) AppColors.BgDeep else AppColors.Primary.copy(alpha = 0.9f),
            shape = RoundedCornerShape(
                topStart = 12.dp, 
                topEnd = 12.dp, 
                bottomStart = if (isAssistant) 2.dp else 12.dp, 
                bottomEnd = if (isAssistant) 12.dp else 2.dp
            ),
            modifier = Modifier.widthIn(max = 300.dp)
        ) {
            Text(
                message.text,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                fontSize = 14.sp,
                color = if (isAssistant) AppColors.TextPrimary else Color.White
            )
        }
        Text(
            if (isAssistant) "Assistant" else "You",
            fontSize = 10.sp,
            color = AppColors.TextMuted,
            modifier = Modifier.padding(top = 2.dp, start = 4.dp, end = 4.dp)
        )
    }
}
     if (isAssistant) "Assistant" else "You",
            fontSize = 10.sp,
            color = AppColors.TextMuted,
            modifier = Modifier.padding(top = 2.dp, start = 4.dp, end = 4.dp)
        )
    }
}
