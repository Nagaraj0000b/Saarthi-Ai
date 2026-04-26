package com.gigone.saarthi.data

/**
 * Data classes for the Nudge system.
 */

/** Represents a single nudge from the server. */
data class NudgeItem(
    val _id: String,
    val type: String,         // environmental, earnings_optimization, burnout, daily_target, next_day_shift, surge
    val title: String,
    val body: String,
    val emoji: String = "🔔",
    val priority: String = "normal",  // normal, high, urgent
    val status: String = "pending",   // pending, read, dismissed, expired
    val createdAt: String = "",
    val isDemo: Boolean = false,
    val data: Map<String, Any>? = null
)

/** Request body for syncing daily target to server. */
data class SyncTargetRequest(val dailyTarget: Int)

/** Generic success response. */
data class SyncTargetResponse(val success: Boolean, val dailyTarget: Int)
