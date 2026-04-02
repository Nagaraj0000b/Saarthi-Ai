package com.gigone.saarthi.ui.screens

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gigone.saarthi.data.ApiClient
import com.gigone.saarthi.data.AuthApi
import com.gigone.saarthi.util.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
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

    /**
     * Synchronize skills and jobs with the backend.
     * Updates local TokenManager upon success.
     */
    fun syncProfile(skills: Set<String>, jobs: Set<String>) {
        viewModelScope.launch {
            _isLoading.value = true
            _isSuccess.value = false
            _errorMessage.value = null
            
            try {
                val request = com.gigone.saarthi.data.UpdateProfileRequest(
                    skills = skills.toList(),
                    registeredJobs = jobs.toList()
                )
                
                authApi.updateProfile(request)
                
                // Update local cache only after successful backend sync
                TokenManager.saveSkills(ctx, skills)
                TokenManager.saveJobs(ctx, jobs)
                
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
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun clearStatus() {
        _isSuccess.value = false
        _errorMessage.value = null
    }
}
