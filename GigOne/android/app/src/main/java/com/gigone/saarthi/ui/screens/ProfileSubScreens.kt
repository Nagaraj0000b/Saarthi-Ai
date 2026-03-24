package com.gigone.saarthi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.DeleteForever
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.gigone.saarthi.ui.theme.AppColors
import com.gigone.saarthi.util.TokenManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(navController: NavController) {
    val context = LocalContext.current
    var name by remember { mutableStateOf(TokenManager.getUserName(context)) }
    var phone by remember { mutableStateOf(TokenManager.getUserPhone(context)) }
    var email by remember { mutableStateOf(TokenManager.getUserEmail(context)) }

    Column(modifier = Modifier.fillMaxSize().background(AppColors.BgDeep).statusBarsPadding()) {
        TopAppBar(
            title = { Text("Edit Profile", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
        )
        Column(modifier = Modifier.padding(16.dp)) {
            OutlinedTextField(
                value = name, onValueChange = { name = it }, label = { Text("Full Name", color = AppColors.TextSecondary) },
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary)
            )
            OutlinedTextField(
                value = phone, onValueChange = { phone = it }, label = { Text("Phone Number", color = AppColors.TextSecondary) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary)
            )
            OutlinedTextField(
                value = email, onValueChange = { email = it }, label = { Text("Email ID", color = AppColors.TextSecondary) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary)
            )
            Button(
                onClick = {
                    TokenManager.saveUserName(context, name)
                    TokenManager.saveUserPhone(context, phone)
                    TokenManager.saveUserEmail(context, email)
                    navController.popBackStack()
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary)
            ) {
                Text("Save Changes", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountSettingsScreen(navController: NavController, onLogout: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(AppColors.BgDeep).statusBarsPadding()) {
        TopAppBar(
            title = { Text("Settings", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
        )
        Column(modifier = Modifier.padding(16.dp)) {
            Spacer(Modifier.height(16.dp))
            ProfileMenuItem(
                icon = Icons.Outlined.DeleteForever,
                title = "Delete My Account",
                subtitle = "Permanently delete all your data and history",
                isDestructive = true,
                onClick = onLogout // Usually goes to a confirm dialog, mapped to logout for simplicity
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageLanguagesScreen(navController: NavController) {
    val context = LocalContext.current
    var selectedLanguages by remember { mutableStateOf(TokenManager.getSelectedLanguages(context)) }
    val allLanguages = listOf("English", "Hindi", "Kannada", "Telugu", "Tamil", "Marathi", "Malayalam", "Bengali", "Urdu", "Gujarati", "Punjabi", "Odia", "Assamese", "Bhojpuri")

    Column(modifier = Modifier.fillMaxSize().background(AppColors.BgDeep).statusBarsPadding()) {
        TopAppBar(
            title = { Text("Languages", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = { 
                    TokenManager.saveSelectedLanguages(context, selectedLanguages)
                    navController.popBackStack() 
                }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
        )
        Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
            SearchAndAddSection(
                title = "Dashboard Languages",
                subtitle = "Add languages to your dashboard.",
                selectedItems = selectedLanguages,
                suggestions = allLanguages,
                placeholder = "Search or type language",
                chipColor = AppColors.Primary,
                onAdd = { newLang -> if (newLang.isNotBlank()) selectedLanguages = selectedLanguages + newLang },
                onRemove = { langToRemove -> if (selectedLanguages.size > 1) selectedLanguages = selectedLanguages - langToRemove }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManagePlatformsScreen(navController: NavController) {
    val context = LocalContext.current
    var selectedPlatforms by remember { mutableStateOf(TokenManager.getPlatforms(context)) }
    val allPlatforms = listOf("Uber", "Ola", "Swiggy", "Zomato", "Rapido", "Zepto", "Blinkit", "Porter", "Dunzo", "Shadowfax", "Amazon Flex", "Flipkart Flex", "Borzo", "Delhivery", "Ecom Express")

    Column(modifier = Modifier.fillMaxSize().background(AppColors.BgDeep).statusBarsPadding()) {
        TopAppBar(
            title = { Text("Platforms", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = { 
                    TokenManager.savePlatforms(context, selectedPlatforms)
                    navController.popBackStack() 
                }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
        )
        Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
            SearchAndAddSection(
                title = "My Platforms",
                subtitle = "Search or add platforms you work for.",
                selectedItems = selectedPlatforms,
                suggestions = allPlatforms,
                placeholder = "Search or type platform",
                chipColor = AppColors.Accent,
                onAdd = { newPlat -> if (newPlat.isNotBlank()) selectedPlatforms = selectedPlatforms + newPlat },
                onRemove = { platToRemove -> selectedPlatforms = selectedPlatforms - platToRemove }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageVehiclesScreen(navController: NavController) {
    val context = LocalContext.current
    var selectedVehicles by remember { mutableStateOf(TokenManager.getVehicles(context)) }
    val allVehicles = listOf("Bike", "Scooter", "Electric Bike (EV)", "Auto-Rickshaw", "Cab (Mini/Sedan)", "Cab (SUV)", "Cycle", "Mini Truck", "Walking")

    Column(modifier = Modifier.fillMaxSize().background(AppColors.BgDeep).statusBarsPadding()) {
        TopAppBar(
            title = { Text("Vehicles", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = { 
                    TokenManager.saveVehicles(context, selectedVehicles)
                    navController.popBackStack() 
                }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
        )
        Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
            SearchAndAddSection(
                title = "My Vehicles",
                subtitle = "Search or add vehicles you use.",
                selectedItems = selectedVehicles,
                suggestions = allVehicles,
                placeholder = "Search or type vehicle",
                chipColor = AppColors.Success,
                onAdd = { newVeh -> if (newVeh.isNotBlank()) selectedVehicles = selectedVehicles + newVeh },
                onRemove = { vehToRemove -> selectedVehicles = selectedVehicles - vehToRemove }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageTargetScreen(navController: NavController) {
    val context = LocalContext.current
    var dailyTarget by remember { mutableStateOf(TokenManager.getDailyTarget(context)) }

    Column(modifier = Modifier.fillMaxSize().background(AppColors.BgDeep).statusBarsPadding()) {
        TopAppBar(
            title = { Text("Daily Target", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = { 
                    TokenManager.saveDailyTarget(context, dailyTarget)
                    navController.popBackStack() 
                }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
        )
        Column(modifier = Modifier.padding(16.dp)) {
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = AppColors.BgCard)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Daily Goal", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = AppColors.TextPrimary)
                    Text("Set your daily earnings target.", fontSize = 14.sp, color = AppColors.TextSecondary)
                    Spacer(Modifier.height(16.dp))

                    OutlinedTextField(
                        value = dailyTarget,
                        onValueChange = { dailyTarget = it },
                        label = { Text("Target Amount (₹)", color = AppColors.TextSecondary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = AppColors.BgDeep,
                            unfocusedContainerColor = AppColors.BgDeep,
                            focusedBorderColor = AppColors.Primary,
                            unfocusedBorderColor = AppColors.BorderSubtle,
                            focusedTextColor = AppColors.TextPrimary,
                            unfocusedTextColor = AppColors.TextPrimary
                        )
                    )
                }
            }
            Button(
                onClick = {
                    TokenManager.saveDailyTarget(context, dailyTarget)
                    navController.popBackStack()
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary)
            ) {
                Text("Save Target", fontWeight = FontWeight.Bold)
            }
        }
    }
}

/**
 * A highly reusable component for searching, adding, and deleting items.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SearchAndAddSection(
    title: String,
    subtitle: String,
    selectedItems: Set<String>,
    suggestions: List<String>,
    placeholder: String,
    chipColor: androidx.compose.ui.graphics.Color,
    onAdd: (String) -> Unit,
    onRemove: (String) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }

    val filteredSuggestions = suggestions.filter {
        it.contains(query, ignoreCase = true) && !selectedItems.contains(it)
    }

    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.BgCard)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = AppColors.TextPrimary)
            Text(subtitle, fontSize = 14.sp, color = AppColors.TextSecondary)
            Spacer(Modifier.height(16.dp))

            // Custom Chips
            if (selectedItems.isNotEmpty()) {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    selectedItems.forEach { item ->
                        Surface(
                            onClick = { onRemove(item) },
                            shape = RoundedCornerShape(8.dp),
                            color = chipColor.copy(alpha = 0.12f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, chipColor.copy(alpha = 0.4f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(item, color = chipColor, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Spacer(Modifier.width(6.dp))
                                Icon(
                                    Icons.Default.Close, 
                                    contentDescription = "Remove", 
                                    tint = chipColor, 
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
            }

            // Search/Add Input
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = it }
            ) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { 
                        query = it
                        expanded = true 
                    },
                    placeholder = { Text(placeholder, color = AppColors.TextSecondary) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Done),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                        onDone = {
                            if (query.isNotBlank()) {
                                onAdd(query.trim())
                                query = ""
                                expanded = false
                            }
                        }
                    ),
                    trailingIcon = {
                        if (query.isNotBlank()) {
                            IconButton(onClick = { 
                                onAdd(query.trim())
                                query = ""
                                expanded = false
                            }) {
                                Icon(Icons.Default.Add, contentDescription = "Add", tint = chipColor)
                            }
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = AppColors.BgDeep,
                        unfocusedContainerColor = AppColors.BgDeep,
                        focusedBorderColor = chipColor,
                        unfocusedBorderColor = AppColors.BorderSubtle,
                        focusedTextColor = AppColors.TextPrimary,
                        unfocusedTextColor = AppColors.TextPrimary
                    )
                )

                if (filteredSuggestions.isNotEmpty() || query.isNotBlank()) {
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false },
                        modifier = Modifier.background(AppColors.BgCard)
                    ) {
                        filteredSuggestions.forEach { suggestion ->
                            DropdownMenuItem(
                                text = { Text(suggestion, color = AppColors.TextPrimary) },
                                onClick = {
                                    onAdd(suggestion)
                                    query = ""
                                    expanded = false
                                }
                            )
                        }
                        
                        if (query.isNotBlank() && filteredSuggestions.none { it.equals(query, ignoreCase = true) }) {
                            DropdownMenuItem(
                                text = { Text("Add \"$query\"", color = chipColor, fontWeight = FontWeight.Bold) },
                                onClick = {
                                    onAdd(query.trim())
                                    query = ""
                                    expanded = false
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
