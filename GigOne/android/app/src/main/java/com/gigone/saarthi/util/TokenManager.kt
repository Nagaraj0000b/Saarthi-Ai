package com.gigone.saarthi.util

import android.content.Context
import android.content.SharedPreferences

/** Simple wrapper around SharedPreferences for JWT token + user name. */
object TokenManager {
    private const val PREFS = "saarthi_prefs"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveToken(ctx: Context, token: String) =
        prefs(ctx).edit().putString("token", token).apply()

    fun getToken(ctx: Context): String? =
        prefs(ctx).getString("token", null)

    fun saveUserName(ctx: Context, name: String) =
        prefs(ctx).edit().putString("user_name", name).apply()

    fun getUserName(ctx: Context): String =
        prefs(ctx).getString("user_name", "Worker") ?: "Worker"

    fun isLoggedIn(ctx: Context): Boolean =
        getToken(ctx) != null

    fun logout(ctx: Context) =
        prefs(ctx).edit().clear().apply()
}
