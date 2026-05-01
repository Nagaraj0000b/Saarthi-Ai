package com.gigone.saarthi.ui.screens

import android.widget.Toast
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.gigone.saarthi.data.JobInfo
import com.gigone.saarthi.data.SkillInfo
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
                onClick = onLogout
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageLanguagesScreen(navController: NavController) {
    val context = LocalContext.current
    var selectedLanguages by remember { mutableStateOf(TokenManager.getSelectedLanguages(context)) }
    LaunchedEffect(selectedLanguages) { TokenManager.saveSelectedLanguages(context, selectedLanguages) }
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ManageJobsScreen(
    navController: NavController,
    vm: ProfileViewModel = viewModel()
) {
    val context = LocalContext.current
    var selectedJobs by remember { mutableStateOf(TokenManager.getJobs(context)) }
    val selectedSkills = remember { TokenManager.getSkills(context) }
    
    val isLoading by vm.isLoading.collectAsStateWithLifecycle()
    val errorMessage by vm.errorMessage.collectAsStateWithLifecycle()

    var platform by remember { mutableStateOf("") }
    var jobType by remember { mutableStateOf("") }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            vm.clearError()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(AppColors.BgDeep).statusBarsPadding()) {
            TopAppBar(
                title = { 
                    Column {
                        Text("Jobs", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        if (isLoading) {
                            Text("Saving...", color = AppColors.Primary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
            )
            Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = AppColors.BgCard)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("My Jobs", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = AppColors.TextPrimary)
                        Text("Add the platforms and jobs you currently work on.", fontSize = 14.sp, color = AppColors.TextSecondary)
                        Spacer(Modifier.height(16.dp))

                        if (selectedJobs.isNotEmpty()) {
                            selectedJobs.forEach { job ->
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = AppColors.Accent.copy(alpha = 0.12f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.Accent.copy(alpha = 0.4f)),
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text("${job.jobType} on ${job.platform}", color = AppColors.Accent, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                        }
                                        IconButton(onClick = {
                                            val newList = selectedJobs.filter { it != job }
                                            selectedJobs = newList
                                            vm.syncProfileDebounced(selectedSkills, newList)
                                        }, modifier = Modifier.size(24.dp)) {
                                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = AppColors.Accent)
                                        }
                                    }
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                        }

                        val platformToJobsMap = mapOf(
                            "Amazon MTurk" to listOf("Data Entry", "Online Surveys", "Image Tagging", "Transcription"),
                            "Belay" to listOf("Virtual Assistance", "Scheduling", "Digital Marketing"),
                            "Blinkit" to listOf("Food Delivery", "Grocery Delivery", "Parcel Delivery"),
                            "BluSmart" to listOf("Ride-hailing (Car)", "Ride-hailing (Bike)", "Auto-Rickshaw"),
                            "Canva Creators" to listOf("Graphic Illustration", "Video Editing", "Freelance Writing"),
                            "Clickworker" to listOf("Data Entry", "Online Surveys", "Image Tagging", "Transcription"),
                            "Fiverr" to listOf("Graphic Illustration", "Video Editing", "Freelance Writing", "Virtual Assistance", "Scheduling", "Digital Marketing"),
                            "Freelancer" to listOf("Software Development", "Cyber-security", "Algorithm Programming"),
                            "Namma Yatri" to listOf("Ride-hailing (Car)", "Ride-hailing (Bike)", "Auto-Rickshaw"),
                            "NoBroker" to listOf("House Cleaning", "Plumbing", "Carpentry", "Appliance Repair"),
                            "Ola" to listOf("Ride-hailing (Car)", "Ride-hailing (Bike)", "Auto-Rickshaw"),
                            "Pepper Content" to listOf("Graphic Illustration", "Video Editing", "Freelance Writing"),
                            "Porter" to listOf("Food Delivery", "Grocery Delivery", "Parcel Delivery"),
                            "Rapido" to listOf("Ride-hailing (Car)", "Ride-hailing (Bike)", "Auto-Rickshaw"),
                            "Shadowfax" to listOf("Food Delivery", "Grocery Delivery", "Parcel Delivery"),
                            "SquadStack" to listOf("Data Entry", "Online Surveys", "Image Tagging", "Transcription"),
                            "Swiggy" to listOf("Food Delivery", "Grocery Delivery", "Parcel Delivery"),
                            "Toloka" to listOf("Data Entry", "Online Surveys", "Image Tagging", "Transcription"),
                            "Toptal" to listOf("Software Development", "Cyber-security", "Algorithm Programming"),
                            "Turing" to listOf("Software Development", "Cyber-security", "Algorithm Programming"),
                            "Unacademy" to listOf("Academic Tutoring", "Language Teaching", "Music Lessons"),
                            "Uber" to listOf("Ride-hailing (Car)", "Ride-hailing (Bike)", "Auto-Rickshaw"),
                            "Upwork" to listOf("Software Development", "Cyber-security", "Algorithm Programming", "Graphic Illustration", "Video Editing", "Freelance Writing", "Virtual Assistance", "Scheduling", "Digital Marketing"),
                            "Urban Company" to listOf("House Cleaning", "Plumbing", "Carpentry", "Appliance Repair", "Salon at Home", "Massage Therapy", "Men Grooming"),
                            "UrbanPro" to listOf("Academic Tutoring", "Language Teaching", "Music Lessons"),
                            "Vedantu" to listOf("Academic Tutoring", "Language Teaching", "Music Lessons"),
                            "Wishup" to listOf("Virtual Assistance", "Scheduling", "Digital Marketing"),
                            "YesMadam" to listOf("Salon at Home", "Massage Therapy", "Men Grooming"),
                            "Zepto" to listOf("Food Delivery", "Grocery Delivery", "Parcel Delivery"),
                            "Zomato" to listOf("Food Delivery", "Grocery Delivery", "Parcel Delivery")
                        )

                        var platformExpanded by remember { mutableStateOf(false) }
                        val platformOptions = platformToJobsMap.keys.toList().sorted()
                        val filteredPlatforms = platformOptions.filter { it.contains(platform, ignoreCase = true) }

                        Box(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                            OutlinedTextField(
                                value = platform,
                                onValueChange = { 
                                    platform = it
                                    platformExpanded = true
                                },
                                label = { Text("Platform", color = AppColors.TextSecondary) },
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = AppColors.BgDeep, unfocusedContainerColor = AppColors.BgDeep,
                                    focusedBorderColor = AppColors.Accent, unfocusedBorderColor = AppColors.BorderSubtle,
                                    focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary
                                )
                            )
                            DropdownMenu(
                                expanded = platformExpanded && filteredPlatforms.isNotEmpty(),
                                onDismissRequest = { platformExpanded = false },
                                modifier = Modifier.background(AppColors.BgCard).fillMaxWidth(0.85f).heightIn(max = 250.dp),
                                properties = androidx.compose.ui.window.PopupProperties(focusable = false)
                            ) {
                                filteredPlatforms.forEach { selectionOption ->
                                    DropdownMenuItem(
                                        text = { Text(selectionOption, color = AppColors.TextPrimary) },
                                        onClick = {
                                            platform = selectionOption
                                            platformExpanded = false
                                            jobType = ""
                                        }
                                    )
                                }
                            }
                        }

                        var jobTypeExpanded by remember { mutableStateOf(false) }
                        val jobTypeOptions = platformToJobsMap[platform] ?: emptyList()
                        val filteredJobTypes = jobTypeOptions.filter { it.contains(jobType, ignoreCase = true) }

                        Box(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                            OutlinedTextField(
                                value = jobType,
                                onValueChange = {
                                    jobType = it
                                    jobTypeExpanded = true
                                },
                                label = { Text(if (platform.isBlank()) "Select Platform first" else "Job Type", color = AppColors.TextSecondary) },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = platform.isNotBlank(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = AppColors.BgDeep, unfocusedContainerColor = AppColors.BgDeep,
                                    focusedBorderColor = AppColors.Accent, unfocusedBorderColor = AppColors.BorderSubtle,
                                    focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary,
                                    disabledContainerColor = AppColors.BgDeep, disabledBorderColor = AppColors.BorderSubtle,
                                    disabledTextColor = AppColors.TextMuted, disabledLabelColor = AppColors.TextMuted
                                )
                            )
                            DropdownMenu(
                                expanded = jobTypeExpanded && filteredJobTypes.isNotEmpty(),
                                onDismissRequest = { jobTypeExpanded = false },
                                modifier = Modifier.background(AppColors.BgCard).fillMaxWidth(0.85f).heightIn(max = 250.dp),
                                properties = androidx.compose.ui.window.PopupProperties(focusable = false)
                            ) {
                                filteredJobTypes.forEach { selectionOption ->
                                    DropdownMenuItem(
                                        text = { Text(selectionOption, color = AppColors.TextPrimary) },
                                        onClick = {
                                            jobType = selectionOption
                                            jobTypeExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        Button(
                            onClick = {
                                if (platform.isNotBlank() && jobType.isNotBlank()) {
                                    val newJob = JobInfo(platform = platform.trim(), jobType = jobType.trim(), domain = "")
                                    val newList = selectedJobs + newJob
                                    selectedJobs = newList
                                    platform = ""
                                    jobType = ""
                                    vm.syncProfileDebounced(selectedSkills, newList)
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(45.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AppColors.Accent)
                        ) {
                            Text("Add Job", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ManageSkillsScreen(
    navController: NavController,
    vm: ProfileViewModel = viewModel()
) {
    val context = LocalContext.current
    var selectedSkills by remember { mutableStateOf(TokenManager.getSkills(context)) }
    val selectedJobs = remember { TokenManager.getJobs(context) }
    
    val isLoading by vm.isLoading.collectAsStateWithLifecycle()
    val errorMessage by vm.errorMessage.collectAsStateWithLifecycle()

    var skillName by remember { mutableStateOf("") }
    var yearsExp by remember { mutableStateOf("") }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            vm.clearError()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(AppColors.BgDeep).statusBarsPadding()) {
            TopAppBar(
                title = { 
                    Column {
                        Text("Skill Sets", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        if (isLoading) {
                            Text("Saving...", color = AppColors.Primary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
            )
            Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = AppColors.BgCard)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("My Skills", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = AppColors.TextPrimary)
                        Text("Add your skills and experience to improve ML matching.", fontSize = 14.sp, color = AppColors.TextSecondary)
                        Spacer(Modifier.height(16.dp))

                        if (selectedSkills.isNotEmpty()) {
                            selectedSkills.forEach { skill ->
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = AppColors.Success.copy(alpha = 0.12f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.Success.copy(alpha = 0.4f)),
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text(skill.name, color = AppColors.Success, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                            Text("${skill.yearsOfExperience} years exp (${skill.skillLevel} Level)", color = AppColors.TextSecondary, fontSize = 12.sp)
                                        }
                                        IconButton(onClick = {
                                            val newList = selectedSkills.filter { it != skill }
                                            selectedSkills = newList
                                            vm.syncProfileDebounced(newList, selectedJobs)
                                        }, modifier = Modifier.size(24.dp)) {
                                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = AppColors.Success)
                                        }
                                    }
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                        }

                        var skillExpanded by remember { mutableStateOf(false) }
                        val skillOptions = listOf("Administrative Support", "Arts/Music Instruction", "Assembly", "Attention to Detail", "Complex Project Management", "Content Creation", "Cosmetology/Beauty", "Customer Service", "Cyber-security", "Data Science", "Data Tagging", "Delivery Services", "Domestic Cleaning", "Driving/Ride-hailing", "Fast Typing", "Graphic Design", "Handyman/Repair", "Language Proficiency", "Navigation", "Personal Care", "Social Media Management", "Software Development", "Subject Tutoring", "Time Management", "Video Editing")

                        ExposedDropdownMenuBox(
                            expanded = skillExpanded,
                            onExpandedChange = { skillExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = skillName,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Skill Name", color = AppColors.TextSecondary) },
                                modifier = Modifier.menuAnchor(type = MenuAnchorType.PrimaryNotEditable).fillMaxWidth().padding(bottom = 8.dp),
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = skillExpanded) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = AppColors.BgDeep, unfocusedContainerColor = AppColors.BgDeep,
                                    focusedBorderColor = AppColors.Success, unfocusedBorderColor = AppColors.BorderSubtle,
                                    focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary
                                )
                            )
                            ExposedDropdownMenu(
                                expanded = skillExpanded,
                                onDismissRequest = { skillExpanded = false },
                                modifier = Modifier.background(AppColors.BgCard).heightIn(max = 250.dp)
                            ) {
                                skillOptions.forEach { selectionOption ->
                                    DropdownMenuItem(
                                        text = { Text(selectionOption, color = AppColors.TextPrimary) },
                                        onClick = {
                                            skillName = selectionOption
                                            skillExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        OutlinedTextField(
                            value = yearsExp,
                            onValueChange = { yearsExp = it },
                            label = { Text("Years of Experience", color = AppColors.TextSecondary) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = AppColors.BgDeep, unfocusedContainerColor = AppColors.BgDeep,
                                focusedBorderColor = AppColors.Success, unfocusedBorderColor = AppColors.BorderSubtle,
                                focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary
                            )
                        )

                        Button(
                            onClick = {
                                val exp = yearsExp.toIntOrNull() ?: 0
                                if (skillName.isNotBlank()) {
                                    // Let the frontend automatically suggest a skill level based on years to match the backend ML logic
                                    val sLevel = when {
                                        exp <= 1 -> "Low"
                                        exp <= 5 -> "Medium"
                                        else -> "High"
                                    }
                                    val newSkill = SkillInfo(name = skillName.trim(), yearsOfExperience = exp, skillLevel = sLevel)
                                    val newList = selectedSkills + newSkill
                                    selectedSkills = newList
                                    skillName = ""
                                    yearsExp = ""
                                    vm.syncProfileDebounced(newList, selectedJobs)
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(45.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AppColors.Success)
                        ) {
                            Text("Add Skill", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageTargetScreen(navController: NavController) {
    val context = LocalContext.current
    var dailyTarget by remember { mutableStateOf(TokenManager.getDailyTarget(context)) }
    LaunchedEffect(dailyTarget) { TokenManager.saveDailyTarget(context, dailyTarget) }

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
 * A highly reusable component for searching, adding, and deleting simple string items.
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

