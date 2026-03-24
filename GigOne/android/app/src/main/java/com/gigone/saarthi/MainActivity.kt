package com.gigone.saarthi

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.*
import com.gigone.saarthi.ui.screens.*
import com.gigone.saarthi.ui.theme.AppColors
import com.gigone.saarthi.ui.theme.SaarthiTheme
import com.gigone.saarthi.util.TokenManager

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SaarthiTheme { AppNavigation() }
        }
    }
}

// --- Bottom tab definition (removed Profile from bottom, Swiggy-style) ---
data class TabItem(val route: String, val label: String, val icon: ImageVector)

val tabs = listOf(
    TabItem("chatbot", "Saarthi", Icons.AutoMirrored.Filled.Chat),
    TabItem("earnings", "Earnings", Icons.Default.AccountBalanceWallet),
    TabItem("worklogs", "History", Icons.Default.ReceiptLong),
)

// --- Root navigation: Auth -> Main ---
@Composable
fun AppNavigation() {
    val context = LocalContext.current
    val navController = rememberNavController()
    val startRoute = if (TokenManager.isLoggedIn(context)) "main" else "signin"

    NavHost(navController = navController, startDestination = startRoute) {

        composable("signin") {
            SignInScreen(
                onSignInSuccess = {
                    navController.navigate("main") { popUpTo("signin") { inclusive = true } }
                },
                onNavigateToSignUp = { navController.navigate("signup") }
            )
        }

        composable("signup") {
            SignUpScreen(
                onSignUpSuccess = {
                    navController.navigate("main") { popUpTo("signin") { inclusive = true } }
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable("main") {
            MainScreen(onLogout = {
                TokenManager.logout(context)
                navController.navigate("signin") { popUpTo(0) { inclusive = true } }
            })
        }
    }
}

// --- Main screen with bottom tabs and nested navigation ---
@Composable
fun MainScreen(onLogout: () -> Unit) {
    val tabNav = rememberNavController()
    val backStackEntry by tabNav.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    // Hide bottom bar on deep profile screens
    val showBottomBar = currentRoute in tabs.map { it.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = AppColors.BgDeep, tonalElevation = 0.dp) {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                tabNav.navigate(tab.route) {
                                    popUpTo(tabs[0].route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label, fontSize = 11.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = AppColors.Primary,
                                selectedTextColor = AppColors.Primary,
                                unselectedIconColor = AppColors.TextMuted,
                                unselectedTextColor = AppColors.TextMuted,
                                indicatorColor = AppColors.BgDeep
                            )
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = tabNav,
            startDestination = tabs[0].route,
            modifier = Modifier.padding(padding)
        ) {
            composable("chatbot") {
                DashboardScreen(onProfileClick = { tabNav.navigate("profile") })
            }
            composable("earnings") {
                EarningsScreen()
            }
            composable("worklogs") {
                WorkLogsScreen()
            }
            
            // --- Profile & Settings Screens ---
            composable("profile") {
                ProfileScreen(navController = tabNav, onLogout = onLogout)
            }
            composable("reports") {
                ReportsScreen()
            }
            composable("edit_profile") {
                EditProfileScreen(navController = tabNav)
            }
            composable("account_settings") {
                AccountSettingsScreen(navController = tabNav, onLogout = onLogout)
            }
            composable("manage_languages") {
                ManageLanguagesScreen(navController = tabNav)
            }
            composable("manage_platforms") {
                ManagePlatformsScreen(navController = tabNav)
            }
            composable("manage_vehicles") {
                ManageVehiclesScreen(navController = tabNav)
            }
            composable("manage_target") {
                ManageTargetScreen(navController = tabNav)
            }
        }
    }
}
