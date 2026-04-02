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
            _error.value = null
            try {
                _logs.value = chatApi.getHistory()
            } catch (e: Exception) {
                _error.value = e.message ?: "Unknown error occurred"
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteLog(id: String) {
        viewModelScope.launch {
            try {
                chatApi.deleteSession(id)
                _logs.value = _logs.value.filter { it._id != id }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
ue = "Network error, please check your connection."
            } catch (e: Exception) {
                _errorMessage.value = "An unexpected error occurred."
                e.printStackTrace()
            }
        }
    }
}
