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

class EarningsViewModel(application: Application) : AndroidViewModel(application) {

    private val earningsApi = ApiClient.create<EarningsApi>(application)

    private val _entries = MutableStateFlow<List<EarningEntry>>(emptyList())
    val entries: StateFlow<List<EarningEntry>> = _entries.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadEarnings()
    }

    fun loadEarnings() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _entries.value = earningsApi.getEarnings().sortedByDescending { it.date }
            } catch (e: Exception) {
                _error.value = e.message ?: "Unknown error occurred"
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addEarning(request: EarningRequest, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                val newEntry = earningsApi.addEarning(request)
                _entries.value = listOf(newEntry) + _entries.value
                onSuccess()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateEarning(id: String, request: EarningRequest, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                val updated = earningsApi.updateEarning(id, request)
                _entries.value = _entries.value.map { if (it._id == id) updated else it }
                onSuccess()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteEarning(id: String) {
        viewModelScope.launch {
            try {
                earningsApi.deleteEarning(id)
                _entries.value = _entries.value.filter { it._id != id }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
