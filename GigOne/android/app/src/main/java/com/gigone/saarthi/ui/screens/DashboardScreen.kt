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
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.gigone.saarthi.data.RecommendationData
import com.gigone.saarthi.data.Recommendation
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
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
import com.gigone.saarthi.util.TokenManager

data class ChatMessage(val role: String, val text: String)

/**
 * DashboardScreen — fully wired to DashboardViewModel.
 * Mirrors DashBoard.jsx: session init, voice recording, message display, TTS playback.
 */
@Composable
fun DashboardScreen(
    vm: DashboardViewModel = viewModel(),
    onProfileClick: () -> Unit = {},
) {
    val ctx = LocalContext.current
    val userName = TokenManager.getUserName(ctx)
    
    val LANGUAGES = remember { 
        val prefs = TokenManager.getSelectedLanguages(ctx).toList().sorted()
        if (prefs.isEmpty()) listOf("English", "Hindi") else prefs
    }
    // ─── Collect state ───────────────────────────────────────────────────────
    val messages by vm.messages.collectAsStateWithLifecycle()
    val isProcessing by vm.isProcessing.collectAsStateWithLifecycle()
    val isRecording by vm.isRecording.collectAsStateWithLifecycle()
    val selectedLanguage by vm.selectedLanguage.collectAsStateWithLifecycle()
    val currentLocationName by vm.currentLocationName.collectAsStateWithLifecycle()
    val recommendation: RecommendationData? by vm.recommendation.collectAsStateWithLifecycle()
    val isRecommendationLoading by vm.isRecommendationLoading.collectAsStateWithLifecycle()
    val recommendationError by vm.recommendationError.collectAsStateWithLifecycle()

    // ─── Runtime permission launchers ─────────────────────────────────────────
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val micGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: false
        val locGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                         permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        
        if (locGranted) {
            vm.refreshLocation()
            if (recommendation == null) {
                vm.loadRecommendations()
            }
        }
        if (micGranted) vm.handleMicPressIn()
    }

    val locationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                         permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (locGranted) {
            vm.refreshLocation()
            vm.loadRecommendations()
        }
    }

    // Load recommendations on first launch (Cached by ViewModel)
    LaunchedEffect(Unit) {
        if (recommendation == null && !isRecommendationLoading) {
            if (!vm.hasLocationPermission()) {
                locationLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            } else {
                vm.loadRecommendations()
            }
        }
    }

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

    // ─── UI state ────────────────────────────────────────────────────────────

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

            // ── TOP HEADER ──────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Language Pill
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0x0DFFFFFF),
                    modifier = Modifier.clickable { showLangPicker = true }
                ) {
                    val shortLang = selectedLanguage.take(3).uppercase()
                    Text(
                        "🌐 $shortLang ▼",
                        color = AppColors.Accent,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }

                // Right side: Location + Profile
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Location Pill
                    Row(
                        modifier = Modifier
                            .clickable {
                                if (vm.hasLocationPermission()) {
                                    vm.refreshLocation()
                                } else {
                                    locationLauncher.launch(
                                        arrayOf(
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION
                                        )
                                    )
                                }
                            }
                            .padding(end = 10.dp), // Reverted strictly to start/end padding to fix profile layout
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = "Location",
                            tint = AppColors.Accent,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            currentLocationName,
                            color = AppColors.TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    // Right: Profile Icon (Navigates to Swiggy-style Profile screen)
                    IconButton(
                        onClick = onProfileClick,
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Color(0x1A6C63FF))
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = "Profile",
                            tint = AppColors.Primary,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }

            // ── RECOMMENDATION CARD (UNDER CONSTRUCTION) ────────────────────────────
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(16.dp),
                color = AppColors.BgCard,
                border = BorderStroke(1.dp, AppColors.BorderSubtle)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "recomandtions will be shown here",
                        color = AppColors.TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                }
            }

            // ── CHAT MESSAGE BOX (Expanded) ───────────────────────────────────
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f) // Takes all remaining space
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                shape = RoundedCornerShape(24.dp),
                color = AppColors.BgCard,
                tonalElevation = 0.dp,
                border = BorderStroke(1.dp, AppColors.BorderSubtle)
            ) {
                @OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
                androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                    isRefreshing = isRecommendationLoading,
                    onRefresh = { 
                        if (vm.hasLocationPermission()) {
                            vm.refreshLocation()
                            vm.loadRecommendations()
                        } else {
                            locationLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                            )
                        }
                    },
                    modifier = Modifier.fillMaxSize()
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
                                    text = if (isUser) "You" else "Assistant",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isUser) AppColors.TextSecondary else AppColors.Primary,
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
                                    color = if (isUser) AppColors.BgDeep else AppColors.Primary.copy(alpha = 0.08f),
                                    modifier = Modifier
                                        .widthIn(max = 280.dp)
                                        .border(
                                            1.dp,
                                            if (isUser) AppColors.BorderSubtle else AppColors.Primary.copy(alpha = 0.15f),
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
                                            permissionLauncher.launch(
                                                arrayOf(
                                                    Manifest.permission.RECORD_AUDIO,
                                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                                )
                                            )
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
