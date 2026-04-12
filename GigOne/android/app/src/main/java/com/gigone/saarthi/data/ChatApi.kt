package com.gigone.saarthi.data

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.*

/**
 * Retrofit interface for the Chat/Check-in API.
 * Mirrors the web client's chatApi.js exactly.
 *
 * All calls are authenticated via AuthInterceptor in ApiClient.
 */
interface ChatApi {

    /**
     * Initializes a new check-in session.
     * Mirrors: POST /api/chat/start  { language, platforms, vehicles }
     */
    @POST("chat-v2/start")
    suspend fun startSession(
        @Body body: StartSessionRequest
    ): StartSessionResponse

    /**
     * Submits a recorded audio file for transcription + AI reply.
     * Mirrors: POST /api/chat/reply  (multipart/form-data)
     * Fields: audio (file), conversationId, language, platforms, skills
     */
    @Multipart
    @POST("chat-v2/reply")
    suspend fun sendAudioReply(
        @Part audio: MultipartBody.Part,
        @Part("conversationId") conversationId: RequestBody,
        @Part("language") language: RequestBody? = null,
        @Part("platforms") platforms: RequestBody? = null,
        @Part("skills") skills: RequestBody? = null,
        @Part("lat") lat: RequestBody? = null,
        @Part("lon") lon: RequestBody? = null
    ): AudioReplyResponse

    /**
     * Fetches the user's current burnout risk status.
     * Mirrors: GET /api/chat/burnout
     */
    @GET("chat-v2/burnout")
    suspend fun getBurnoutStatus(): BurnoutStatus

    @GET("chat-v2/history")
    suspend fun getHistory(): List<ChatHistoryLog>

    @DELETE("chat-v2/{id}")
    suspend fun deleteSession(@Path("id") id: String)

    /**
     * Fetches job recommendations for the next shift.
     * GET /api/jobs/next-shift?lat={lat}&lon={lon}
     */
    @GET("jobs/next-shift")
    suspend fun getJobRecommendations(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double,
        @Query("jobs") jobs: String? = null,
        @Query("skills") skills: String? = null
    ): RecommendationResponse
}
