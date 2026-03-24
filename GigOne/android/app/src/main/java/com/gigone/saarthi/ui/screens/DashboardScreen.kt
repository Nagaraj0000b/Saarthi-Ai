package com.gigone.saarthi.ui.screens

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.gigone.saarthi.R
import com.gigone.saarthi.ui.theme.AppColors
import kotlinx.coroutines.launch

/** Data class for a single check-in message. */
data class ChatMessage(val role: String, val text: String)

/** Available languages — matches web client's LANGUAGE_VOICES keys. */
private val LANGUAGES = listOf(
    "English","Hindi","Kannada","Telugu","Tamil",
    "Marathi","Malayalam","Bengali","Urdu","Gujarati"
)

/**
 * DashboardScreen — fully wired to DashboardViewModel.
 * Mirrors DashBoard.jsx: session init, voice recording, message display, TTS playback.
 */
@Composable
fun DashboardScreen(
    userName: String = "Worker",
    vm: DashboardViewModel = viewModel()
) {
    // ─── Collect state ───────────────────────────────────────────────────────
    val messages by vm.messages.collectAsStateWithLifecycle()
    val isProcessing by vm.isProcessing.collectAsStateWithLifecycle()
    val isRecording by vm.isRecording.collectAsStateWithLifecycle()
    val selectedLanguage by vm.selectedLanguage.collectAsStateWithLifecycle()

    DisposableEffect(Unit) {
        onDispose { vm.resetSession() }
    }

    // ─── UI state ────────────────────────────────────────────────────────────
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    var showLangPicker by remember { mutableStateOf(false) }

    // Auto-scroll to bottom on each new message
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            coroutineScope.launch { listState.animateScrollToItem(messages.size - 1) }
        }
    }

    // ─── Runtime permission launcher ─────────────────────────────────────────
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) vm.handleMicPressIn()
        // If denied, do nothing — user will see the button disabled
    }

    // ─── Root layout ─────────────────────────────────────────────────────────
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding() // This is necessary for system bars, but we'll minimize internal padding
                .navigationBarsPadding() 
        ) {

            // ── TOP HEADER (Greeting + Dropdown) ──────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(top = 0.dp, bottom = 4.dp), // Minimized padding to move it up
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Good Morning,", fontSize = 12.sp, color = AppColors.TextSecondary)
                    Text(
                        userName,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = AppColors.TextPrimary
                    )
                }
                // Language selector pill
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0x0DFFFFFF),
                    modifier = Modifier.clickable { showLangPicker = true }
                ) {
                    Text(
                        "🌐 $selectedLanguage ▼",
                        color = AppColors.Accent,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }

            // ── AVATAR SECTION (Moved back out and tightened) ─────────────────
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp) // Smaller avatar to save space
                        .clip(CircleShape)
                        .background(Color(0x1A6C63FF))
                        .border(1.dp, Color(0x806C63FF), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.gigi_avatar),
                        contentDescription = "Saarthi AI Avatar",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
                Text(
                    "Saarthi AI",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = AppColors.TextPrimary
                )
                Text("Your voice companion", fontSize = 9.sp, color = AppColors.TextSecondary)
            }

            // ── CHAT MESSAGE BOX (Expanded) ───────────────────────────────────
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f) // Takes all remaining space
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                shape = RoundedCornerShape(24.dp),
                color = Color(0x1A6C63FF),
                tonalElevation = 0.dp
            ) {
                Box(
                    modifier = Modifier.border(1.dp, Color(0x336C63FF), RoundedCornerShape(24.dp))
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(messages) { msg ->
                            val isUser = msg.role == "user"
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                            ) {
                                Text(
                                    text = if (isUser) "You" else "Saarthi",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isUser) AppColors.Accent else AppColors.Primary,
                                    modifier = Modifier.padding(
                                        start = if (isUser) 0.dp else 6.dp,
                                        end = if (isUser) 6.dp else 0.dp,
                                        bottom = 3.dp
                                    )
                                )
                                val bubbleShape = RoundedCornerShape(
                                    topStart = 16.dp, topEnd = 16.dp,
                                    bottomStart = if (isUser) 16.dp else 4.dp,
                                    bottomEnd = if (isUser) 4.dp else 16.dp
                                )
                                Surface(
                                    shape = bubbleShape,
                                    color = if (isUser) Color(0x2600D4AA) else Color(0x336C63FF),
                                    modifier = Modifier
                                        .widthIn(max = 280.dp)
                                        .border(
                                            1.dp,
                                            if (isUser) Color(0x4D00D4AA) else Color(0x4D6C63FF),
                                            bubbleShape
                                        )
                                ) {
                                    Text(
                                        text = msg.text,
                                        color = AppColors.TextPrimary,
                                        fontSize = 14.sp,
                                        lineHeight = 20.sp,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ── FLOATING MIC AREA (Bottom) ────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp, bottom = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Status label
                Surface(
                    color = Color(0xD907080F),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text(
                        text = when {
                            isProcessing -> "THINKING..."
                            isRecording  -> "LISTENING..."
                            else         -> "HOLD TO SPEAK"
                        },
                        color = if (isRecording) AppColors.Accent else AppColors.TextSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.5.sp,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    )
                }

                Spacer(Modifier.height(12.dp))

                // Mic button — hold-to-record
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .scale(if (isRecording) 1.10f else 1f)
                        .clip(CircleShape)
                        .background(
                            if (isRecording) Color(0x4000D4AA) else Color(0x266C63FF)
                        )
                        .border(
                            2.dp,
                            if (isRecording) AppColors.Accent else AppColors.Primary,
                            CircleShape
                        )
                        .pointerInput(isProcessing) {
                            if (!isProcessing) {
                                detectTapGestures(
                                    onPress = {
                                        // Press down → start recording (request permission if needed)
                                        if (vm.hasAudioPermission()) {
                                            vm.handleMicPressIn()
                                        } else {
                                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                        }
                                        // Wait for release
                                        tryAwaitRelease()
                                        // Release → send audio
                                        vm.handleMicPressOut()
                                    }
                                )
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(
                            color = AppColors.Primary,
                            modifier = Modifier.size(28.dp),
                            strokeWidth = 2.5.dp
                        )
                    } else {
                        Icon(
                            Icons.Default.Mic,
                            contentDescription = "Hold to speak",
                            tint = if (isRecording) AppColors.Accent else AppColors.Primary,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                }
            }
        }

        // ── LANGUAGE PICKER DIALOG ────────────────────────────────────────────
        if (showLangPicker) {
            AlertDialog(
                onDismissRequest = { showLangPicker = false },
                containerColor = Color(0xFF131626),
                tonalElevation = 0.dp,
                shape = RoundedCornerShape(20.dp),
                title = {
                    Text(
                        "Select Language",
                        color = AppColors.TextPrimary,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp
                    )
                },
                text = {
                    LazyColumn {
                        items(LANGUAGES) { lang ->
                            val isSelected = lang == selectedLanguage
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        vm.selectLanguage(lang)
                                        showLangPicker = false
                                    }
                                    .padding(vertical = 2.dp),
                                color = if (isSelected) Color(0x266C63FF) else Color.Transparent,
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = lang,
                                    color = if (isSelected) AppColors.Primary else AppColors.TextSecondary,
                                    fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Normal,
                                    fontSize = 15.sp,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                                )
                            }
                        }
                    }
                },
                confirmButton = {}
            )
        }
    }
}
