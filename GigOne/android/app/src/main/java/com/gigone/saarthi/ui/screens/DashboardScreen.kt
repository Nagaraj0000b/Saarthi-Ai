package com.gigone.saarthi.ui.screens

import android.Manifest
import android.widget.Toast
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.gigone.saarthi.R
import com.gigone.saarthi.data.RecommendationData
import com.gigone.saarthi.data.Recommendation
import com.gigone.saarthi.util.getJobVisual

import com.gigone.saarthi.data.ChatMessage
import com.gigone.saarthi.ui.theme.AppColors
import com.gigone.saarthi.util.TokenManager
import kotlinx.coroutines.launch

/**
 * DashboardScreen — fully wired to DashboardViewModel.
 * Mirrors DashBoard.jsx: session init, voice recording, message display, TTS playback.
 */
@Composable
fun DashboardScreen(
    vm: DashboardViewModel = viewModel(),
    onProfileClick: () -> Unit = {},
    onJobRecommendationsClick: () -> Unit = {},
    onManageJobsClick: () -> Unit = {}
) {
    val ctx = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val userName = TokenManager.getUserName(ctx)
    
    // ─── Intent Sender Launcher for System GPS ──────────────────────────────
    val gpsLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            vm.loadRecommendations()
        }
    }
    
    // ─── Collect state ───────────────────────────────────────────────────────
    val messages: List<ChatMessage> by vm.messages.collectAsStateWithLifecycle()
    val isProcessing: Boolean by vm.isProcessing.collectAsStateWithLifecycle()
    val isRecording: Boolean by vm.isRecording.collectAsStateWithLifecycle()
    val selectedLanguage: String by vm.selectedLanguage.collectAsStateWithLifecycle()
    val currentLocationName: String by vm.currentLocationName.collectAsStateWithLifecycle()
    val recommendation: RecommendationData? by vm.recommendation.collectAsStateWithLifecycle()
    val isRecommendationLoading: Boolean by vm.isRecommendationLoading.collectAsStateWithLifecycle()
    val recommendationError: String? by vm.recommendationError.collectAsStateWithLifecycle()
    val errorMessage: String? by vm.errorMessage.collectAsStateWithLifecycle()

    // ─── Error Handling ──────────────────────────────────────────────────────
    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(ctx, it, Toast.LENGTH_LONG).show()
            vm.clearError()
        }
    }

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
                vm.loadRecommendations(onLocationDisabled = { gpsLauncher.launch(it) })
            }
        }
        if (micGranted) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            vm.handleMicPressIn()
        }
    }

    val locationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                         permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (locGranted) {
            vm.refreshLocation()
            vm.loadRecommendations(onLocationDisabled = { gpsLauncher.launch(it) })
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
                vm.loadRecommendations(onLocationDisabled = { gpsLauncher.launch(it) })
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
                    .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 0.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Language Pill and V2 Toggle
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0x0DFFFFFF),
                        modifier = Modifier.clickable { showLangPicker = true }
                    ) {
                        val shortLang = selectedLanguage.take(3).uppercase()
                        Text(
                            "🌐 $shortLang ▼",
                            color = AppColors.Accent,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                    
                    // V2 toggle removed per Phase 9
                }

                // Right side: Location + Profile
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Location Pill
                    Row(
                        modifier = Modifier
                            .clickable {
                                if (vm.hasLocationPermission()) {
                                    vm.refreshLocation()
                                    vm.checkLocationSettings(
                                        onResolutionRequired = { gpsLauncher.launch(it) },
                                        onAlreadyEnabled = { /* Already on */ }
                                    )
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
                            fontSize = 14.sp,
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

            // ── RECOMMENDATION CARD (ML-Powered) ────────────────────────────
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp)
                    .clickable { onJobRecommendationsClick() },
                shape = RoundedCornerShape(16.dp),
                color = AppColors.BgCard,
                border = BorderStroke(1.dp, AppColors.BorderSubtle)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    if (isRecommendationLoading) {
                        // Loading state
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CircularProgressIndicator(
                                color = AppColors.Primary,
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Analyzing best jobs...", color = AppColors.TextSecondary, fontSize = 14.sp)
                        }
                    } else if (recommendation != null) {
                        val data = recommendation!!
                        val compatibleJobs = data.rankedJobs.filter { it.isCompatible != false }

                        // ── ENGINE BADGE ──
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "BEST JOB RIGHT NOW",
                                color = AppColors.Accent,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 1.sp
                            )
                            Surface(
                                color = AppColors.Primary.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    if (data.engine == "ml_xgboost_v1") "AI ⚡" else "RULES",
                                    color = AppColors.Primary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Spacer(Modifier.height(10.dp))

                        // ── TOP RECOMMENDATION ──
                        if (compatibleJobs.isNotEmpty()) {
                            val topJob = compatibleJobs[0]
                            val visual = getJobVisual(topJob.job)
                            Surface(
                                color = AppColors.Primary.copy(alpha = 0.08f),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, AppColors.Primary.copy(alpha = 0.2f))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Job Icon
                                    Surface(
                                        color = AppColors.Primary.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Icon(
                                            visual.icon,
                                            contentDescription = topJob.job,
                                            tint = AppColors.Primary,
                                            modifier = Modifier
                                                .padding(8.dp)
                                                .size(24.dp)
                                        )
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            topJob.job,
                                            color = AppColors.TextPrimary,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            maxLines = 1,
                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                        )
                                        if (!topJob.jobType.isNullOrEmpty()) {
                                            Text(
                                                topJob.jobType!!,
                                                color = AppColors.TextSecondary,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                                modifier = Modifier.padding(top = 1.dp)
                                            )
                                        }
                                        Text(
                                            topJob.reason.ifEmpty { "Best earning potential" },
                                            color = AppColors.Accent,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium,
                                            maxLines = 1,
                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                            modifier = Modifier.padding(top = 1.dp)
                                        )
                                    }
                                    // Earning badge
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            "₹${topJob.finalScore.toInt()}",
                                            color = AppColors.Accent,
                                            fontSize = 18.sp,
                                            fontWeight = FontWeight.ExtraBold
                                        )
                                        Text(
                                            "/hr",
                                            color = AppColors.TextSecondary,
                                            fontSize = 14.sp
                                        )
                                    }
                                }
                            }

                            // ── ALTERNATIVES (Removed per UI Phase 6) ──
                        }
                    } else if (recommendationError != null) {
                        if (recommendationError == "NO_JOBS_SELECTED") {
                            com.gigone.saarthi.ui.components.EmptyDashboardIllustration(
                                onSetupClick = onManageJobsClick,
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                            )
                        } else {
                            Text(
                                "Could not load recommendations",
                                color = AppColors.TextSecondary,
                                fontSize = 14.sp,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            )
                        }
                    } else {
                        Text(
                            "Pull down to get job recommendations",
                            color = AppColors.TextSecondary,
                            fontSize = 14.sp,
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        )
                    }
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
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        if (vm.hasLocationPermission()) {
                            vm.refreshLocation()
                            vm.loadRecommendations(onLocationDisabled = { gpsLauncher.launch(it) })
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
                                    fontSize = 14.sp,
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
                        fontSize = 14.sp,
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
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
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
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
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
                    val currentLanguages = remember(showLangPicker) {
                        val prefs = TokenManager.getSelectedLanguages(ctx).toList().sorted()
                        if (prefs.isEmpty()) listOf("English", "Hindi") else prefs
                    }
                    LazyColumn {
                        items(currentLanguages) { lang ->
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
