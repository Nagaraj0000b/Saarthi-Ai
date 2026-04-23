package com.gigone.saarthi.ui.screens

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gigone.saarthi.data.ApiClient
import com.gigone.saarthi.data.EarningEntry
import com.gigone.saarthi.data.EarningRequest
import com.gigone.saarthi.data.EarningsApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class EarningsViewModel(application: Application) : AndroidViewModel(application) {

    private val earningsApi = ApiClient.create<EarningsApi>(application)

    private val _entries = MutableStateFlow<List<EarningEntry>>(emptyList())
    val entries: StateFlow<List<EarningEntry>> = _entries.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun clearError() {
        _errorMessage.value = null
    }

    init {
        loadEarnings()
        
        // Auto-refresh when Dashboard triggers a new check-in
        viewModelScope.launch {
            com.gigone.saarthi.util.EventBus.refreshDataEvent.collect {
                loadEarnings()
            }
        }
    }

    fun loadEarnings() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                _entries.value = earningsApi.getEarnings().sortedByDescending { it.date }
            } catch (e: HttpException) {
                if (e.code() == 401) {
                    forceLogout()
                } else {
                    _errorMessage.value = "Server error, please try again later."
                }
            } catch (e: IOException) {
                _errorMessage.value = "Network error, please check your connection."
            } catch (e: Exception) {
                _errorMessage.value = "An unexpected error occurred."
                android.util.Log.e("EarningsViewModel", "Load failed", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addEarning(request: EarningRequest, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _errorMessage.value = null
            try {
                val newEntry = earningsApi.addEarning(request)
                _entries.value = listOf(newEntry) + _entries.value
                com.gigone.saarthi.util.EventBus.triggerRefresh() // Tell Dashboard to check for target nudges
                onSuccess()
            } catch (e: HttpException) {
                if (e.code() == 401) {
                    forceLogout()
                } else {
                    _errorMessage.value = "Server error, please try again later."
                }
            } catch (e: IOException) {
                _errorMessage.value = "Network error, please check your connection."
            } catch (e: Exception) {
                _errorMessage.value = "An unexpected error occurred."
                android.util.Log.e("EarningsViewModel", "Add failed", e)
            }
        }
    }

    fun updateEarning(id: String, request: EarningRequest, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _errorMessage.value = null
            try {
                val updated = earningsApi.updateEarning(id, request)
                _entries.value = _entries.value.map { if (it._id == id) updated else it }
                onSuccess()
            } catch (e: HttpException) {
                if (e.code() == 401) {
                    forceLogout()
                } else {
                    _errorMessage.value = "Server error, please try again later."
                }
            } catch (e: IOException) {
                _errorMessage.value = "Network error, please check your connection."
            } catch (e: Exception) {
                _errorMessage.value = "An unexpected error occurred."
                android.util.Log.e("EarningsViewModel", "Update failed", e)
            }
        }
    }

    fun deleteEarning(id: String) {
        viewModelScope.launch {
            _errorMessage.value = null
            try {
                earningsApi.deleteEarning(id)
                _entries.value = _entries.value.filter { it._id != id }
            } catch (e: HttpException) {
                if (e.code() == 401) {
                    forceLogout()
                } else {
                    _errorMessage.value = "Server error, please try again later."
                }
            } catch (e: IOException) {
                _errorMessage.value = "Network error, please check your connection."
            } catch (e: Exception) {
                _errorMessage.value = "An unexpected error occurred."
                android.util.Log.e("EarningsViewModel", "Delete failed", e)
            }
        }
    }

    private fun forceLogout() {
        val app = getApplication<Application>()
        // Clear the shared preferences to wipe the session
        app.getSharedPreferences("saarthi_prefs", android.content.Context.MODE_PRIVATE).edit().clear().apply()
        
        // Force-restart the application to the Launcher Activity (SignIn)
        val intent = app.packageManager.getLaunchIntentForPackage(app.packageName)?.apply {
            addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        if (intent != null) app.startActivity(intent)
    }
}
