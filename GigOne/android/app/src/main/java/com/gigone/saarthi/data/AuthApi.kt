package com.gigone.saarthi.data

import retrofit2.http.Body
import retrofit2.http.POST

/** Auth API — login and register endpoints. */
interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse
}
