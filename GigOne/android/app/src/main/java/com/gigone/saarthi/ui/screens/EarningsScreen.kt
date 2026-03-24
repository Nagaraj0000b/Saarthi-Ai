package com.gigone.saarthi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
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
import com.gigone.saarthi.data.EarningEntry
import com.gigone.saarthi.data.EarningRequest
import com.gigone.saarthi.ui.theme.AppColors
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun EarningsScreen(vm: EarningsViewModel = viewModel()) {
    val entries by vm.entries.collectAsStateWithLifecycle()
    val isLoading by vm.isLoading.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()

    var showDialog by remember { mutableStateOf(false) }
    var editingEntry by remember { mutableStateOf<EarningEntry?>(null) }

    LaunchedEffect(Unit) {
        vm.loadEarnings()
    }

    val totalEarned = entries.sumOf { it.amount.toDouble() }.toFloat()
    val totalHours = entries.sumOf { it.hours.toDouble() }.toFloat()
    val avgPerHour = if (totalHours > 0) (totalEarned / totalHours).toInt() else 0

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
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Earnings tracking",
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                color = AppColors.TextPrimary
            )
            FloatingActionButton(
                onClick = {
                    editingEntry = null
                    showDialog = true
                },
                containerColor = AppColors.Primary,
                contentColor = AppColors.TextPrimary,
                modifier = Modifier.size(40.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Earning")
            }
        }

        // Summary Cards
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SummaryCard(
                label = "Total Earned",
                value = "₹${totalEarned.toInt()}",
                color = AppColors.Accent,
                modifier = Modifier.weight(1f)
            )
            SummaryCard(
                label = "Total Hrs",
                value = "${totalHours}h",
                color = AppColors.TextPrimary,
                modifier = Modifier.weight(1f)
            )
            SummaryCard(
                label = "Avg/Hr",
                value = "₹$avgPerHour",
                color = AppColors.Primary,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(Modifier.height(16.dp))

        // List
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppColors.Primary)
            }
        } else if (error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    "Error loading earnings:\n$error\n\nTake a screenshot of this!",
                    color = Color(0xFFFF4D6D),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(32.dp)
                )
            }
        } else if (entries.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No earnings found. Add one!", color = AppColors.TextSecondary)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(entries) { entry ->
                    EarningCard(
                        entry = entry,
                        onEdit = {
                            editingEntry = entry
                            showDialog = true
                        },
                        onDelete = { vm.deleteEarning(entry._id) }
                    )
                }
            }
        }
    }

    if (showDialog) {
        EarningDialog(
            entry = editingEntry,
            onDismiss = { showDialog = false },
            onSave = { date, platform, amount, hours ->
                val freq = EarningRequest(date, platform, amount, hours)
                if (editingEntry == null) {
                    vm.addEarning(freq) { showDialog = false }
                } else {
                    vm.updateEarning(editingEntry!!._id, freq) { showDialog = false }
                }
            }
        )
    }
}

@Composable
fun SummaryCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Surface(
        color = Color(0x1F6C63FF),
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(label, fontSize = 11.sp, color = AppColors.TextSecondary)
            Spacer(Modifier.height(4.dp))
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
fun EarningCard(entry: EarningEntry, onEdit: () -> Unit, onDelete: () -> Unit) {
    Surface(
        color = Color(0x1A6C63FF), // Match chat box style
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                val emoji = when (entry.platform) {
                    "Uber" -> "🚗"
                    "Swiggy" -> "🍔"
                    "Rapido" -> "🏍️"
                    else -> "📦"
                }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 4.dp)) {
                    Text("$emoji ${entry.platform}", fontWeight = FontWeight.Bold, color = AppColors.TextPrimary, fontSize = 15.sp)
                    Spacer(Modifier.width(12.dp))
                    Text(formatDate(entry.date), color = AppColors.TextSecondary, fontSize = 12.sp)
                }
                Text("${entry.hours} hrs at ₹${if(entry.hours > 0) (entry.amount/entry.hours).toInt() else 0}/hr", color = AppColors.TextMuted, fontSize = 12.sp)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("₹${entry.amount.toInt()}", fontWeight = FontWeight.ExtraBold, color = AppColors.Accent, fontSize = 18.sp)
                Spacer(Modifier.width(12.dp))
                Icon(Icons.Default.Edit, contentDescription = "Edit", tint = AppColors.TextSecondary, modifier = Modifier
                    .size(18.dp)
                    .clickable { onEdit() })
                Spacer(Modifier.width(12.dp))
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFFF4D6D), modifier = Modifier
                    .size(18.dp)
                    .clickable { onDelete() })
            }
        }
    }
}

@Composable
fun EarningDialog(entry: EarningEntry?, onDismiss: () -> Unit, onSave: (String, String, Float, Float) -> Unit) {
    val platforms = listOf("Uber", "Swiggy", "Rapido", "Other")
    
    var platform by remember { mutableStateOf(entry?.platform ?: "Uber") }
    var amount by remember { mutableStateOf(entry?.amount?.toInt()?.toString() ?: "") }
    var hours by remember { mutableStateOf(entry?.hours?.toString() ?: "") }
    var date by remember { mutableStateOf(entry?.date?.take(10) ?: SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF131626),
        title = {
            Text(if (entry == null) "Log Earnings" else "Edit Entry", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Simplified dropdown (just cycling on click for native simplicity)
                OutlinedTextField(
                    value = platform,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Platform (Tap to change)") },
                    modifier = Modifier.fillMaxWidth().clickable { 
                        val next = platforms[(platforms.indexOf(platform) + 1) % platforms.size]
                        platform = next
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary,
                        unfocusedBorderColor = AppColors.BorderSubtle, focusedBorderColor = AppColors.Primary
                    )
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        label = { Text("Amount (₹)") },
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary,
                            unfocusedBorderColor = AppColors.BorderSubtle, focusedBorderColor = AppColors.Primary
                        )
                    )
                    OutlinedTextField(
                        value = hours,
                        onValueChange = { hours = it },
                        label = { Text("Hours") },
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = AppColors.TextPrimary, unfocusedTextColor = AppColors.TextPrimary,
                            unfocusedBorderColor = AppColors.BorderSubtle, focusedBorderColor = AppColors.Primary
                        )
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amount.toFloatOrNull() ?: return@Button
                    val hrs = hours.toFloatOrNull() ?: return@Button
                    onSave(date, platform, amt, hrs)
                },
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary)
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = AppColors.TextSecondary)
            }
        }
    )
}

fun formatDate(isoString: String): String {
    try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        val formatter = SimpleDateFormat("dd MMM, yyyy", Locale.getDefault())
        val date = parser.parse(isoString) ?: return isoString
        return formatter.format(date)
    } catch (e: Exception) {
        return isoString.take(10)
    }
}
