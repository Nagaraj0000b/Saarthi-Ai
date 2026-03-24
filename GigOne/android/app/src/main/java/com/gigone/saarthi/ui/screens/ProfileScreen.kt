package com.gigone.saarthi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.gigone.saarthi.ui.theme.AppColors
import com.gigone.saarthi.util.TokenManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(navController: NavController, onLogout: () -> Unit) {
    val context = LocalContext.current
    
    // We use a LaunchedEffect to re-read from SharedPreferences whenever this screen becomes active again
    var userName by remember { mutableStateOf(TokenManager.getUserName(context)) }
    var userPhone by remember { mutableStateOf(TokenManager.getUserPhone(context)) }
    var userEmail by remember { mutableStateOf(TokenManager.getUserEmail(context)) }

    LaunchedEffect(Unit) {
        userName = TokenManager.getUserName(context)
        userPhone = TokenManager.getUserPhone(context)
        userEmail = TokenManager.getUserEmail(context)
    }

    val scrollState = rememberScrollState()
    var showMenu by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
    ) {
        // --- Header Section (Swiggy Style) ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(AppColors.BgCard)
                .padding(top = 16.dp, bottom = 24.dp)
        ) {
            // Top Right Options (Edit, Settings, Logout)
            Box(modifier = Modifier.align(Alignment.TopEnd).padding(end = 8.dp)) {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Options", tint = AppColors.TextPrimary)
                }
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false },
                    modifier = Modifier.background(AppColors.BgCard)
                ) {
                    DropdownMenuItem(
                        text = { Text("Edit Profile", color = AppColors.TextPrimary) },
                        onClick = { showMenu = false; navController.navigate("edit_profile") },
                        leadingIcon = { Icon(Icons.Outlined.Edit, contentDescription = null, tint = AppColors.TextPrimary) }
                    )
                    DropdownMenuItem(
                        text = { Text("Settings", color = AppColors.TextPrimary) },
                        onClick = { showMenu = false; navController.navigate("account_settings") },
                        leadingIcon = { Icon(Icons.Outlined.Settings, contentDescription = null, tint = AppColors.TextPrimary) }
                    )
                    HorizontalDivider(color = AppColors.BorderSubtle)
                    DropdownMenuItem(
                        text = { Text("Logout", color = AppColors.Error, fontWeight = FontWeight.Bold) },
                        onClick = { showMenu = false; onLogout() },
                        leadingIcon = { Icon(Icons.Outlined.Logout, contentDescription = null, tint = AppColors.Error) }
                    )
                }
            }

            // Back button
            IconButton(
                onClick = { navController.popBackStack() },
                modifier = Modifier.align(Alignment.TopStart).padding(start = 8.dp)
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
            }

            Column(
                modifier = Modifier.fillMaxWidth().padding(top = 40.dp, start = 24.dp, end = 24.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Profile Info
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = userName.uppercase(),
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = AppColors.TextPrimary,
                            letterSpacing = 1.sp
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(userPhone, fontSize = 14.sp, color = AppColors.TextSecondary)
                        Text(userEmail, fontSize = 14.sp, color = AppColors.TextSecondary)
                    }
                    
                    // Small Avatar
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .clip(CircleShape)
                            .background(AppColors.Primary.copy(alpha = 0.2f))
                            .border(1.dp, AppColors.Primary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Person, contentDescription = "Profile", tint = AppColors.Primary, modifier = Modifier.size(30.dp))
                    }
                }
            }
        }

        // --- List Section ---
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(vertical = 16.dp)
        ) {
            ProfileSectionHeader("WORK PREFERENCES")
            ProfileMenuItem(
                icon = Icons.Outlined.Language,
                title = "Languages",
                subtitle = "Dashboard AI communication languages",
                onClick = { navController.navigate("manage_languages") }
            )
            ProfileMenuItem(
                icon = Icons.Outlined.WorkOutline,
                title = "Platforms",
                subtitle = "Apps you are currently working for",
                onClick = { navController.navigate("manage_platforms") }
            )
            ProfileMenuItem(
                icon = Icons.Outlined.TwoWheeler,
                title = "Vehicles",
                subtitle = "Manage the vehicles you drive",
                onClick = { navController.navigate("manage_vehicles") }
            )
            ProfileMenuItem(
                icon = Icons.Outlined.TrackChanges,
                title = "Daily Target",
                subtitle = "Set your daily earnings goal",
                onClick = { navController.navigate("manage_target") }
            )

            Spacer(Modifier.height(16.dp))
            ProfileSectionHeader("DATA & ANALYTICS")
            ProfileMenuItem(
                icon = Icons.Outlined.Analytics,
                title = "Weekly Reports",
                subtitle = "View your earnings breakdown",
                onClick = { navController.navigate("reports") }
            )

            Spacer(Modifier.height(16.dp))
            ProfileSectionHeader("APP SETTINGS")

            ProfileMenuItem(
                icon = Icons.Outlined.Logout,
                title = "Logout",
                subtitle = "",
                isDestructive = true,
                onClick = onLogout
            )
            
            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
fun ProfileSectionHeader(title: String) {
    Text(
        text = title,
        color = AppColors.TextMuted,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
    )
}

@Composable
fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    isDestructive: Boolean = false,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        color = Color.Transparent
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (isDestructive) AppColors.Error.copy(alpha = 0.1f) else AppColors.BgCard),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = if (isDestructive) AppColors.Error else AppColors.TextPrimary, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = if (isDestructive) AppColors.Error else AppColors.TextPrimary)
                if (subtitle.isNotEmpty()) {
                    Text(subtitle, fontSize = 12.sp, color = AppColors.TextSecondary)
                }
            }
            if (!isDestructive) {
                Icon(Icons.AutoMirrored.Filled.ArrowForwardIos, contentDescription = null, tint = AppColors.TextMuted, modifier = Modifier.size(14.dp))
            }
        }
    }
}
