package com.gigone.saarthi.data

// ─── Auth models ──────────────────────────────────────────────────────────────
data class LoginRequest(val email: String, val password: String, val role: String = "worker")
data class RegisterRequest(val name: String, val email: String, val password: String, val role: String = "worker")
data class AuthResponse(val token: String, val user: UserData)
data class UserData(val id: String, val name: String, val role: String)

// ─── Chat models (mirrors server JSON) ────────────────────────────────────────
/** Response from POST /api/chat/start */
data class StartSessionResponse(
    val conversationId: String,
    val reply: String
)

/** Nested burnout object inside AudioReplyResponse */
data class BurnoutStatus(
    val isBurnoutAlert: Boolean = false,
    val isStressWarning: Boolean = false,
    val action: String = "",
    val averageScore: Float = 0f
)

/** Response from POST /api/chat/reply */
data class AudioReplyResponse(
    val transcription: String,
    val reply: String,
    val burnoutStatus: BurnoutStatus? = null,
    val isComplete: Boolean = false
)

// ─── Earnings & Work Logs ─────────────────────────────────────────────────────
data class EarningEntry(
    val _id: String,
    val userId: String? = null,
    val date: String,
    val platform: String,
    val amount: Float,
    val hours: Float
)
data class EarningRequest(
    val date: String,
    val platform: String,
    val amount: Float,
    val hours: Float
)

data class SentimentData(val score: Float?)
data class ChatMessageData(val role: String, val text: String, val sentiment: SentimentData? = null)
data class ExtractData(val platform: String? = null)

data class DailyMoodData(
    val moodLabel: String?,
    val moodScore: Float?,
    val summary: String?,
    val suggestion: String?,
    val isValid: Boolean = false
)
data class ChatHistoryLog(
    val _id: String,
    val createdAt: String,
    val step: String,
    val burnoutStatus: BurnoutStatus? = null,
    val dailyMood: DailyMoodData? = null,
    val extractedData: ExtractData? = null,
    val messages: List<ChatMessageData> = emptyList()
)
