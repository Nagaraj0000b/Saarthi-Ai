package com.gigone.saarthi.util

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.gigone.saarthi.ui.theme.AppColors
import java.text.SimpleDateFormat
import java.util.*

data class JobVisual(val icon: ImageVector, val color: Color)

fun getJobVisual(job: String): JobVisual {
    val icon = when (job.lowercase()) {
        "uber", "ola", "blusmart", "namma yatri", "indriver" -> Icons.Default.LocalTaxi
        "swiggy", "dunzo" -> Icons.Default.Fastfood
        "zomato" -> Icons.Default.Restaurant
        "rapido" -> Icons.Default.TwoWheeler
        "zepto", "blinkit", "bigbasket", "jiomart" -> Icons.Default.ShoppingBag
        "amazon flex", "delhivery", "bluedart" -> Icons.Default.Inventory
        "urban company", "home cleaning co" -> Icons.Default.Home
        "local plumber", "local electrician" -> Icons.Default.Build
        "elderly care", "pet walker" -> Icons.Default.Favorite
        "dataentry inc", "virtual assistant hub", "translation pro" -> Icons.Default.Computer
        "suppothero" -> Icons.Default.HeadsetMic
        else -> Icons.Default.Work
    }
    // Professional Monochromatic style
    return JobVisual(icon, AppColors.TextPrimary)
}

fun formatIsoDate(isoString: String, format: String = "dd MMM, yyyy"): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val formatter = SimpleDateFormat(format, Locale.getDefault())
        formatter.timeZone = TimeZone.getDefault()
        val date = parser.parse(isoString) ?: return isoString
        formatter.format(date)
    } catch (e: Exception) {
        isoString.take(10)
    }
}

fun getRelativeDateLabel(isoString: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val date = parser.parse(isoString) ?: return "Older"
        
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply { time = date }
        
        when {
            now.get(Calendar.YEAR) == target.get(Calendar.YEAR) &&
            now.get(Calendar.DAY_OF_YEAR) == target.get(Calendar.DAY_OF_YEAR) -> "Today"
            
            now.get(Calendar.YEAR) == target.get(Calendar.YEAR) &&
            now.get(Calendar.DAY_OF_YEAR) - target.get(Calendar.DAY_OF_YEAR) == 1 -> "Yesterday"
            
            now.get(Calendar.YEAR) == target.get(Calendar.YEAR) -> 
                SimpleDateFormat("dd MMMM", Locale.getDefault()).format(date)
            else -> 
                SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(date)
        }
    } catch (e: Exception) {
        "Older"
    }
}
