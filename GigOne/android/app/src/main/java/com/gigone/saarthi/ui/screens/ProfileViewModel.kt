package com.gigone.saarthi.ui.screens

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gigone.saarthi.data.ApiClient
import com.gigone.saarthi.data.AuthApi
import com.gigone.saarthi.data.JobInfo
import com.gigone.saarthi.data.SkillInfo
import com.gigone.saarthi.util.TokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

/**
 * ProfileViewModel — manages user profile synchronization with the backend.
 */
class ProfileViewModel(application: Application) : AndroidViewModel(application) {

    private val ctx get() = getApplication<Application>()

    private val authApi: AuthApi by lazy {
        ApiClient.create<AuthApi>(ctx)
    }

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isSuccess = MutableStateFlow(false)
    val isSuccess: StateFlow<Boolean> = _isSuccess.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Scope to ensure API calls finish even if the ViewModel is cleared (e.g. user hits back button)
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        // Shared across all instances to prevent fetchProfile from overwriting with stale data during a pending sync
        private var globalSyncJob: Job? = null
    }

    /**
     * Fetch user profile from the backend to ensure local data is fresh.
     */
    fun fetchProfile() {
        if (globalSyncJob?.isActive == true) {
            // A sync is pending or in progress, do not fetch stale data from backend
            return
        }
        viewModelScope.launch {
            try {
                val response = authApi.getProfile()
                val user = response.user
                TokenManager.saveSkills(ctx, user.skills)
                TokenManager.saveJobs(ctx, user.registeredJobs)
                TokenManager.saveUserName(ctx, user.name)
                user.email?.let { TokenManager.saveUserEmail(ctx, it) }
            } catch (e: Exception) {
                android.util.Log.e("ProfileViewModel", "Failed to fetch profile", e)
            }
        }
    }

    /**
     * Auto-save variant: saves to local storage immediately, then debounces
     * the API call by 1 second. Safe to call on every chip add/remove.
     */
    fun syncProfileDebounced(skills: List<SkillInfo>, jobs: List<JobInfo>) {
        // Persist locally RIGHT NOW — back-navigation will never lose data
        TokenManager.saveSkills(ctx, skills)
        TokenManager.saveJobs(ctx, jobs)

        // Cancel any in-flight debounce and restart the timer
        globalSyncJob?.cancel()
        globalSyncJob = appScope.launch {
            delay(1000L)
            performSync(skills, jobs)
        }
    }

    /**
     * Synchronize skills and jobs with the backend immediately.
     */
    fun syncProfile(skills: List<SkillInfo>, jobs: List<JobInfo>) {
        globalSyncJob?.cancel()
        globalSyncJob = appScope.launch {
            performSync(skills, jobs)
        }
    }

    private suspend fun performSync(skills: List<SkillInfo>, jobs: List<JobInfo>) {
        _isLoading.value = true
        _isSuccess.value = false
        _errorMessage.value = null

        try {
            val request = com.gigone.saarthi.data.UpdateProfileRequest(
                skills = skills,
                registeredJobs = jobs
            )
            authApi.updateProfile(request)
            _isSuccess.value = true
        } catch (e: HttpException) {
            _errorMessage.value = "Server error, please try again later."
            android.util.Log.e("ProfileViewModel", "Sync failed", e)
        } catch (e: IOException) {
            _errorMessage.value = "Network error, please check your connection."
            android.util.Log.e("ProfileViewModel", "Sync failed", e)
        } catch (e: Exception) {
            _errorMessage.value = "An unexpected error occurred."
            android.util.Log.e("ProfileViewModel", "Sync failed", e)
        } finally {
            _isLoading.value = false
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun clearStatus() {
        _isSuccess.value = false
        _errorMessage.value = null
    }
}
