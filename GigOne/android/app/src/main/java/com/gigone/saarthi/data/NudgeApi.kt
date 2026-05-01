package com.gigone.saarthi.data

import retrofit2.http.*

/**
 * Retrofit interface for the Nudge API endpoints.
 */
interface NudgeApi {

    /** Poll for pending nudges. */
    @GET("/api/nudges")
    suspend fun getActiveNudges(): List<NudgeItem>

    /** Mark a nudge as read. */
    @PATCH("/api/nudges/{id}/read")
    suspend fun markRead(@Path("id") id: String): NudgeItem

    /** Dismiss a nudge permanently. */
    @PATCH("/api/nudges/{id}/dismiss")
    suspend fun dismiss(@Path("id") id: String): Map<String, String>

    /** Sync the user's daily earning target to the server. */
    @POST("/api/nudges/sync-target")
    suspend fun syncDailyTarget(@Body body: SyncTargetRequest): SyncTargetResponse
}
