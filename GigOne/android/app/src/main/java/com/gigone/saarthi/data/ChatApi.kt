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
    @POST("chat/start")
    suspend fun startSession(
        @Body body: StartSessionRequest
    ): StartSessionResponse

    /**
     * Submits a recorded audio file for transcription + AI reply.
     * Mirrors: POST /api/chat/reply  (multipart/form-data)
     * Fields: audio (file), conversationId, language, platforms, vehicles
     */
    @Multipart
    @POST("chat/reply")
    suspend fun sendAudioReply(
        @Part audio: MultipartBody.Part,
        @Part("conversationId") conversationId: RequestBody,
        @Part("language") language: RequestBody? = null,
        @Part("platforms") platforms: RequestBody? = null,
        @Part("vehicles") vehicles: RequestBody? = null,
        @Part("lat") lat: RequestBody? = null,
        @Part("lon") lon: RequestBody? = null
    ): AudioReplyResponse

    /**
     * Fetches the user's current burnout risk status.
     * Mirrors: GET /api/chat/burnout
     */
    @GET("chat/burnout")
    suspend fun getBurnoutStatus(): BurnoutStatus

    @GET("chat/history")
    suspend fun getHistory(): List<ChatHistoryLog>

    @DELETE("chat/{id}")
    suspend fun deleteSession(@Path("id") id: String)

    /**
     * Fetches platform recommendations for the next shift.
     * GET /api/recommendations/next-shift?lat={lat}&lon={lon}
     */
    @GET("recommendations/next-shift")
    suspend fun getRecommendations(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double
    ): RecommendationResponse
}
