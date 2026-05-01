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

    private var cachedRetrofit: Retrofit? = null

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
        // Use applicationContext to avoid leaking activity contexts
        val appContext = context.applicationContext

        // Return cached instance if it exists to avoid recreating the client and interceptors
        cachedRetrofit?.let { return it }

        val baseUrl = BuildConfig.API_URL + "/"

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(appContext))
            .addInterceptor(logging)
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        cachedRetrofit = retrofit
        return retrofit
    }

    // Instance for AuthApi (login/register pre-token)
    val authRetrofit: Retrofit by lazy {
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
     * Otherwise, it uses the authRetrofit instance (no auth).
     */
    inline fun <reified T> create(context: Context? = null): T {
        return if (context != null) {
            buildRetrofit(context).create(T::class.java)
        } else {
            authRetrofit.create(T::class.java)
        }
    }
}
