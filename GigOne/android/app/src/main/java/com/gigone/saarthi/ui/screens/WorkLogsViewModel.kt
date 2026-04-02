package com.gigone.saarthi.ui.screens

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gigone.saarthi.data.ApiClient
import com.gigone.saarthi.data.ChatApi
import com.gigone.saarthi.data.ChatHistoryLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class WorkLogsViewModel(application: Application) : AndroidViewModel(application) {

    private val chatApi = ApiClient.create<ChatApi>(application)

    private val _logs = MutableStateFlow<List<ChatHistoryLog>>(emptyList())
    val logs: StateFlow<List<ChatHistoryLog>> = _logs.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun clearError() {
        _errorMessage.value = null
    }

    init {
        loadLogs()
        
        // Auto-refresh when Dashboard triggers a new check-in
        viewModelScope.launch {
            com.gigone.saarthi.util.EventBus.refreshDataEvent.collect {
                loadLogs()
            }
        }
    }

    fun loadLogs() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                _logs.value = chatApi.getHistory()
            } catch (e: HttpException) {
                _errorMessage.value = "Server error, please try again later."
            } catch (e: IOException) {
                _errorMessage.value = "Network error, please check your connection."
            } catch (e: Exception) {
                _errorMessage.value = "An unexpected error occurred."
                android.util.Log.e("WorkLogsViewModel", "Load failed", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteLog(id: String) {
        viewModelScope.launch {
            _errorMessage.value = null
            try {
                chatApi.deleteSession(id)
                _logs.value = _logs.value.filter { it._id != id }
            } catch (e: HttpException) {
                _errorMessage.value = "Server error, please try again later."
            } catch (e: IOException) {
                _errorMessage.value = "Network error, please check your connection."
            } catch (e: Exception) {
                _errorMessage.value = "An unexpected error occurred."
                android.util.Log.e("WorkLogsViewModel", "Delete failed", e)
            }
        }
    }
}
