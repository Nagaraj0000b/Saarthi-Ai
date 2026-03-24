package com.gigone.saarthi.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface EarningsApi {
    @GET("earnings")
    suspend fun getEarnings(): List<EarningEntry>

    @POST("earnings")
    suspend fun addEarning(@Body request: EarningRequest): EarningEntry

    @PUT("earnings/{id}")
    suspend fun updateEarning(@Path("id") id: String, @Body request: EarningRequest): EarningEntry

    @DELETE("earnings/{id}")
    suspend fun deleteEarning(@Path("id") id: String)
}
