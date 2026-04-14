package com.gigone.saarthi.util

import android.content.Context
import android.content.SharedPreferences
import com.gigone.saarthi.data.JobInfo
import com.gigone.saarthi.data.SkillInfo
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/** Simple wrapper around SharedPreferences for JWT token + user preferences. */
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

    fun saveUserEmail(ctx: Context, email: String) =
        prefs(ctx).edit().putString("user_email", email).apply()

    fun getUserEmail(ctx: Context): String =
        prefs(ctx).getString("user_email", "worker@gigone.com") ?: "worker@gigone.com"

    fun saveUserPhone(ctx: Context, phone: String) =
        prefs(ctx).edit().putString("user_phone", phone).apply()

    fun getUserPhone(ctx: Context): String =
        prefs(ctx).getString("user_phone", "+91 0000000000") ?: "+91 0000000000"

    fun saveUserGender(ctx: Context, gender: String) =
        prefs(ctx).edit().putString("user_gender", gender).apply()

    fun getUserGender(ctx: Context): String =
        prefs(ctx).getString("user_gender", "Male") ?: "Male"

    fun saveThemeMode(ctx: Context, theme: String) =
        prefs(ctx).edit().putString("theme_mode", theme).apply()

    fun getThemeMode(ctx: Context): String =
        prefs(ctx).getString("theme_mode", "Dark") ?: "Dark"

    fun isLoggedIn(ctx: Context): Boolean =
        getToken(ctx) != null

    fun logout(ctx: Context) =
        prefs(ctx).edit().clear().apply()

    // --- Profile Preferences ---

    fun saveSelectedLanguages(ctx: Context, languages: Set<String>) {
        prefs(ctx).edit().remove("languages").apply()
        prefs(ctx).edit().putStringSet("languages", languages.toSet()).apply()
    }

    fun getSelectedLanguages(ctx: Context): Set<String> =
        prefs(ctx).getStringSet("languages", setOf("English", "Hindi")) ?: setOf("English", "Hindi")

    fun saveJobs(ctx: Context, jobs: List<JobInfo>) {
        val json = Gson().toJson(jobs)
        prefs(ctx).edit().putString("jobs_json", json).apply()
    }

    fun getJobs(ctx: Context): List<JobInfo> {
        val json = prefs(ctx).getString("jobs_json", null) ?: return emptyList()
        val type = object : TypeToken<List<JobInfo>>() {}.type
        return try {
            Gson().fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveVehicles(ctx: Context, vehicles: Set<String>) {
        prefs(ctx).edit().remove("vehicles").apply()
        prefs(ctx).edit().putStringSet("vehicles", vehicles.toSet()).apply()
    }

    fun getVehicles(ctx: Context): Set<String> =
        prefs(ctx).getStringSet("vehicles", setOf("Bike")) ?: setOf("Bike")

    fun saveSkills(ctx: Context, skills: List<SkillInfo>) {
        val json = Gson().toJson(skills)
        prefs(ctx).edit().putString("skills_json", json).apply()
    }

    fun getSkills(ctx: Context): List<SkillInfo> {
        val json = prefs(ctx).getString("skills_json", null) ?: return emptyList()
        val type = object : TypeToken<List<SkillInfo>>() {}.type
        return try {
            Gson().fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveDailyTarget(ctx: Context, target: String) =
        prefs(ctx).edit().putString("daily_target", target).apply()

    fun getDailyTarget(ctx: Context): String =
        prefs(ctx).getString("daily_target", "1000") ?: "1000"
}
