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
import com.gigone.saarthi.data.EarningEntry
import com.gigone.saarthi.data.EarningRequest
import com.gigone.saarthi.ui.theme.AppColors
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// ═══════════════════════ PLATFORM ICON HELPER ═══════════════════════
internal data class PlatformVisual(val icon: ImageVector, val color: Color)

internal fun getPlatformVisual(platform: String): PlatformVisual = when (platform.lowercase()) {
    "uber" -> PlatformVisual(Icons.Default.LocalTaxi, Color(0xFF276EF1))
    "ola" -> PlatformVisual(Icons.Default.LocalTaxi, Color(0xFF1C8D3F))
    "swiggy" -> PlatformVisual(Icons.Default.Fastfood, Color(0xFFFC8019))
    "zomato" -> PlatformVisual(Icons.Default.Restaurant, Color(0xFFE23744))
    "rapido" -> PlatformVisual(Icons.Default.TwoWheeler, Color(0xFFFFC72C))
    "zepto" -> PlatformVisual(Icons.Default.ShoppingBag, Color(0xFF8B2FDB))
    "blinkit" -> PlatformVisual(Icons.Default.ShoppingCart, Color(0xFFF5C418))
    "porter" -> PlatformVisual(Icons.Default.LocalShipping, Color(0xFF2B3A4A))
    "dunzo" -> PlatformVisual(Icons.Default.DeliveryDining, Color(0xFF00D290))
    "shadowfax" -> PlatformVisual(Icons.Default.DeliveryDining, Color(0xFFFF6B35))
    "amazon flex" -> PlatformVisual(Icons.Default.Inventory, Color(0xFFFF9900))
    "flipkart flex" -> PlatformVisual(Icons.Default.Inventory2, Color(0xFF2874F0))
    "borzo" -> PlatformVisual(Icons.Default.LocalShipping, Color(0xFF00B4D8))
    "delhivery" -> PlatformVisual(Icons.Default.LocalShipping, Color(0xFFE41E26))
    "ecom express" -> PlatformVisual(Icons.Default.LocalShipping, Color(0xFF0B3D91))
    else -> PlatformVisual(Icons.Default.Work, AppColors.TextSecondary)
}

// ═══════════════════════ MAIN SCREEN ═══════════════════════
@Composable
fun EarningsScreen(vm: EarningsViewModel = viewModel()) {
    val entries by vm.entries.collectAsStateWithLifecycle()
    val isLoading by vm.isLoading.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()

    var showDialog by remember { mutableStateOf(false) }
    var editingEntry by remember { mutableStateOf<EarningEntry?>(null) }

    LaunchedEffect(Unit) { vm.loadEarnings() }

    val totalEarned by remember(entries) { derivedStateOf { entries.sumOf { it.amount.toDouble() }.toFloat() } }
    val totalHours by remember(entries) { derivedStateOf { entries.sumOf { it.hours.toDouble() }.toFloat() } }
    val avgPerHour by remember(totalEarned, totalHours) {
        derivedStateOf { if (totalHours > 0) (totalEarned / totalHours).toInt() else 0 }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
    ) {
        // ── Header ───────────────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "Earnings",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = AppColors.TextPrimary
                )
                Text(
                    "${entries.size} entries logged",
                    fontSize = 12.sp,
                    color = AppColors.TextMuted
                )
            }
            FloatingActionButton(
                onClick = { editingEntry = null; showDialog = true },
                containerColor = AppColors.Primary,
                contentColor = Color.White,
                modifier = Modifier.size(42.dp),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Earning", modifier = Modifier.size(22.dp))
            }
        }

        // ── Summary Cards ────────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            EarningSummaryCard(
                icon = Icons.Outlined.AccountBalanceWallet,
                label = "Earned",
                value = "₹${totalEarned.toInt()}",
                color = AppColors.Accent,
                modifier = Modifier.weight(1f)
            )
            EarningSummaryCard(
                icon = Icons.Outlined.Schedule,
                label = "Hours",
                value = "${totalHours}h",
                color = AppColors.Primary,
                modifier = Modifier.weight(1f)
            )
            EarningSummaryCard(
                icon = Icons.Outlined.TrendingUp,
                label = "Avg/Hr",
                value = "₹$avgPerHour",
                color = Color(0xFFFBBF24),
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(Modifier.height(12.dp))

        // ── List ─────────────────────────────────────────────────────────
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppColors.Primary, strokeWidth = 2.5.dp)
            }
        } else if (error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.ErrorOutline, contentDescription = null, tint = AppColors.Error, modifier = Modifier.size(40.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("Failed to load earnings", color = AppColors.TextPrimary, fontWeight = FontWeight.Bold)
                    Text(error ?: "", color = AppColors.TextMuted, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(16.dp))
                }
            }
        } else if (entries.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.ReceiptLong, contentDescription = null, tint = AppColors.TextMuted, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("No earnings yet", color = AppColors.TextSecondary, fontWeight = FontWeight.SemiBold)
                    Text("Tap + to add your first entry", color = AppColors.TextMuted, fontSize = 12.sp)
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(entries, key = { it._id }) { entry ->
                    CompactEarningCard(
                        entry = entry,
                        onEdit = { editingEntry = entry; showDialog = true },
                        onDelete = { vm.deleteEarning(entry._id) }
                    )
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }

    if (showDialog) {
        EarningDialog(
            entry = editingEntry,
            onDismiss = { showDialog = false },
            onSave = { date, platform, amount, hours ->
                val req = EarningRequest(date, platform, amount, hours)
                if (editingEntry == null) {
                    vm.addEarning(req) { showDialog = false }
                } else {
                    vm.updateEarning(editingEntry!!._id, req) { showDialog = false }
                }
            }
        )
    }
}

// ═══════════════════════ SUMMARY CARD ═══════════════════════
@Composable
private fun EarningSummaryCard(
    icon: ImageVector,
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = color.copy(alpha = 0.08f),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.15f)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = color.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
            Spacer(Modifier.height(6.dp))
            Text(value, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = color)
            Text(label, fontSize = 10.sp, color = AppColors.TextMuted)
        }
    }
}

// ═══════════════════════ COMPACT EARNING CARD ═══════════════════════
@Composable
private fun CompactEarningCard(entry: EarningEntry, onEdit: () -> Unit, onDelete: () -> Unit) {
    val visual = getPlatformVisual(entry.platform)

    Surface(
        color = AppColors.BgCard,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.BorderSubtle),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 14.dp, vertical = 12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Platform icon circle
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(visual.color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(visual.icon, contentDescription = entry.platform, tint = visual.color, modifier = Modifier.size(20.dp))
            }

            Spacer(Modifier.width(12.dp))

            // Info
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        entry.platform,
                        fontWeight = FontWeight.Bold,
                        color = AppColors.TextPrimary,
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        formatDate(entry.date),
                        color = AppColors.TextMuted,
                        fontSize = 11.sp
                    )
                }
                Text(
                    "${entry.hours}h • ₹${if (entry.hours > 0) (entry.amount / entry.hours).toInt() else 0}/hr",
                    color = AppColors.TextMuted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            // Amount
            Text(
                "₹${entry.amount.toInt()}",
                fontWeight = FontWeight.ExtraBold,
                color = AppColors.Accent,
                fontSize = 16.sp
            )

            Spacer(Modifier.width(8.dp))

            // Actions
            Icon(
                Icons.Outlined.Edit,
                contentDescription = "Edit",
                tint = AppColors.TextMuted,
                modifier = Modifier
                    .size(18.dp)
                    .clickable { onEdit() }
            )
            Spacer(Modifier.width(8.dp))
            Icon(
                Icons.Outlined.DeleteOutline,
                contentDescription = "Delete",
                tint = AppColors.Error.copy(alpha = 0.7f),
                modifier = Modifier
                    .size(18.dp)
                    .clickable { onDelete() }
            )
        }
    }
}

// ═══════════════════════ EARNING DIALOG ═══════════════════════
@Composable
fun EarningDialog(entry: EarningEntry?, onDismiss: () -> Unit, onSave: (String, String, Float, Float) -> Unit) {
    val platforms = listOf("Uber", "Ola", "Swiggy", "Zomato", "Rapido", "Zepto", "Blinkit", "Porter", "Dunzo", "Other")

    var platform by remember { mutableStateOf(entry?.platform ?: "Uber") }
    var amount by remember { mutableStateOf(entry?.amount?.toInt()?.toString() ?: "") }
    var hours by remember { mutableStateOf(entry?.hours?.toString() ?: "") }
    var date by remember { mutableStateOf(entry?.date?.take(10) ?: SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = AppColors.BgCard,
        shape = RoundedCornerShape(24.dp),
        tonalElevation = 0.dp,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (entry == null) Icons.Outlined.AddCircle else Icons.Outlined.Edit,
                    contentDescription = null,
                    tint = AppColors.Primary,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    if (entry == null) "Log Earnings" else "Edit Entry",
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                // Platform selector — cycling through list
                val visual = getPlatformVisual(platform)
                OutlinedTextField(
                    value = platform,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Platform (Tap to change)", color = AppColors.TextMuted) },
                    leadingIcon = {
                        Icon(visual.icon, contentDescription = null, tint = visual.color, modifier = Modifier.size(20.dp))
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            val next = platforms[(platforms.indexOf(platform) + 1) % platforms.size]
                            platform = next
                        },
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = AppColors.TextPrimary,
                        unfocusedTextColor = AppColors.TextPrimary,
                        unfocusedBorderColor = AppColors.BorderSubtle,
                        focusedBorderColor = AppColors.Primary,
                        focusedContainerColor = AppColors.BgDeep,
                        unfocusedContainerColor = AppColors.BgDeep
                    )
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        label = { Text("Amount (₹)", color = AppColors.TextMuted) },
                        leadingIcon = { Text("₹", color = AppColors.Accent, fontWeight = FontWeight.Bold) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = AppColors.TextPrimary,
                            unfocusedTextColor = AppColors.TextPrimary,
                            unfocusedBorderColor = AppColors.BorderSubtle,
                            focusedBorderColor = AppColors.Primary,
                            focusedContainerColor = AppColors.BgDeep,
                            unfocusedContainerColor = AppColors.BgDeep
                        )
                    )
                    OutlinedTextField(
                        value = hours,
                        onValueChange = { hours = it },
                        label = { Text("Hours", color = AppColors.TextMuted) },
                        leadingIcon = { Icon(Icons.Outlined.Schedule, contentDescription = null, tint = AppColors.TextMuted, modifier = Modifier.size(18.dp)) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = AppColors.TextPrimary,
                            unfocusedTextColor = AppColors.TextPrimary,
                            unfocusedBorderColor = AppColors.BorderSubtle,
                            focusedBorderColor = AppColors.Primary,
                            focusedContainerColor = AppColors.BgDeep,
                            unfocusedContainerColor = AppColors.BgDeep
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
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Save", fontWeight = FontWeight.Bold)
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
