package com.gigone.saarthi.data

import android.content.Context
import com.gigone.saarthi.BuildConfig
import com.gigone.saarthi.util.TokenManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Centralized Retrofit + OkHttp client.
 * Connects using API_URL provided via BuildConfig from .env.
 */
object ApiClient {

    /**
     * Interceptor that injects JWT token from SharedPrefs into every request.
     * Mirrors chatApi.js `getHeaders()`.
     */
    private class AuthInterceptor(private val context: Context) : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val token = TokenManager.getToken(context)
            val request = chain.request().newBuilder().apply {
                if (token != null) header("Authorization", "Bearer $token")
            }.build()
            return chain.proceed(request)
        }
    }

    fun buildRetrofit(context: Context): Retrofit {
        val baseUrl = BuildConfig.API_URL + "/"

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(context.applicationContext))
            .addInterceptor(logging)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)  // audio uploads need more time
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    // Legacy cached instance kept for AuthApi backward compat
    @PublishedApi
    internal val retrofit: Retrofit by lazy {
        // Fallback without auth — used only by AuthApi (login/register pre-token)
        val baseUrl = BuildConfig.API_URL + "/"
        val client = OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY })
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    /**
     * Creates an API service. 
     * If [context] is provided, it uses buildRetrofit(context) which includes AuthInterceptor.
     * Otherwise, it uses the default retrofit instance (no auth).
     */
    inline fun <reified T> create(context: Context? = null): T {
        return if (context != null) {
            buildRetrofit(context).create(T::class.java)
        } else {
            retrofit.create(T::class.java)
        }
    }
}
