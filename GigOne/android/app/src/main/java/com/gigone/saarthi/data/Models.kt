package com.gigone.saarthi.data

// ─── Auth models ──────────────────────────────────────────────────────────────
data class LoginRequest(val email: String, val password: String, val role: String = "worker")
data class RegisterRequest(val name: String, val email: String, val password: String, val role: String = "worker")
data class AuthResponse(val token: String, val user: UserData)
data class UserData(
    val id: String,
    val name: String,
    val email: String? = null,
    val role: String,
    val skills: List<String> = emptyList(),
    val registeredJobs: List<String> = emptyList()
)
data class UpdateProfileRequest(
    val skills: List<String>? = null,
    val registeredJobs: List<String>? = null
)
data class UpdateProfileResponse(
    val success: Boolean,
    val user: UserData
)


// ─── Chat models (mirrors server JSON) ──────────────────────────────────────
data class StartSessionRequest(
    val language: String,
    val platforms: List<String>,
    val skills: List<String>,
    val lat: Double? = null,
    val lon: Double? = null
)

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
data class ChatMessage(val role: String, val text: String)

data class EarningEntry(
    val _id: String,
    val userId: String? = null,
    val date: String,
    val job: String? = null,
    val platform: String? = null,
    val amount: Float,
    val hours: Float
) {
    val actualJob: String
        get() = job ?: platform ?: "Unknown"
}
data class EarningRequest(
    val date: String,
    val job: String,
    val amount: Float,
    val hours: Float
)

data class SentimentData(val score: Float?)
data class ChatMessageData(val role: String, val text: String, val sentiment: SentimentData? = null)
data class ExtractData(val job: String? = null)

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

// ─── Recommendations ─────────────────────────────────────────────────────────
data class Recommendation(
    val job: String,
    val finalScore: Float,
    val reason: String = "",
    // ML-specific fields
    val jobType: String? = null,
    val predictedEarning: Float? = null,
    val isCompatible: Boolean? = null,
    val rank: Int? = null,
    // Legacy rule-engine fields (nullable for backward compat)
    val baseEarningScore: Int? = null,
    val contextModifier: Float? = null,
    val wellbeingPenalty: Int? = null
)

data class RecommendationContext(
    val weather: Map<String, Any>?,
    val traffic: String?,
    val wellbeingRisk: String?,
    val skills: List<String>? = null
)

data class RecommendationData(
    val recommendedJob: String,
    val rankedJobs: List<Recommendation>,
    val context: RecommendationContext,
    val engine: String? = null
)

data class RecommendationResponse(
    val status: String,
    val data: RecommendationData
)
