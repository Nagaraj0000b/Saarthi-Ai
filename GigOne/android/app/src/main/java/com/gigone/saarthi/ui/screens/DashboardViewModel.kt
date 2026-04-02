package com.gigone.saarthi.ui.screens

import android.Manifest
import android.app.Application
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gigone.saarthi.data.ApiClient
import com.gigone.saarthi.data.AudioReplyResponse
import com.gigone.saarthi.data.ChatApi
import com.gigone.saarthi.data.RecommendationData
import com.gigone.saarthi.data.ChatMessage
import com.gigone.saarthi.util.TtsPlayer
import com.gigone.saarthi.util.TokenManager
import com.gigone.saarthi.util.VoiceRecorder
import com.google.android.gms.location.*
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.tasks.CancellationTokenSource
import androidx.activity.result.IntentSenderRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * DashboardViewModel — single source of truth for the Chatbot screen.
 */
class DashboardViewModel(application: Application) : AndroidViewModel(application) {

    private val ctx get() = getApplication<Application>()

    // ─── API + Utilities ────────────────────────────────────────────────────
    private val chatApi: ChatApi by lazy {
        ApiClient.buildRetrofit(ctx).create(ChatApi::class.java)
    }
    private val voiceRecorder = VoiceRecorder(ctx)
    private val ttsPlayer = TtsPlayer(ctx)
    private val fusedLocationClient: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(ctx)
    }

    // ─── State ──────────────────────────────────────────────────────────────
    private val _messages = MutableStateFlow<List<ChatMessage>>(
        listOf(ChatMessage("assistant", "Ready when you are! Hold the mic to speak."))
    )
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _recommendation = MutableStateFlow<RecommendationData?>(null)
    val recommendation: StateFlow<RecommendationData?> = _recommendation.asStateFlow()

    private val _isRecommendationLoading = MutableStateFlow(false)
    val isRecommendationLoading: StateFlow<Boolean> = _isRecommendationLoading.asStateFlow()

    private val _recommendationError = MutableStateFlow<String?>(null)
    val recommendationError: StateFlow<String?> = _recommendationError.asStateFlow()

    private val _currentLocationName = MutableStateFlow("Locating...")
    val currentLocationName: StateFlow<String> = _currentLocationName.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun clearError() {
        _errorMessage.value = null
    }

    private val _selectedLanguage = MutableStateFlow(
        ctx.getSharedPreferences("saarthi_prefs", 0).getString("language", "English") ?: "English"
    )
    val selectedLanguage: StateFlow<String> = _selectedLanguage.asStateFlow()

    val userName: String get() = TokenManager.getUserName(ctx)

    private var conversationId: String? = null
    private var recordingStartTime = 0L

    // ─── Language ────────────────────────────────────────────────────────────
    fun selectLanguage(lang: String) {
        _selectedLanguage.value = lang
        ctx.getSharedPreferences("saarthi_prefs", 0).edit().putString("language", lang).apply()
    }

    /**
     * Checks if system-level GPS is enabled. 
     * If not, it provides a ResolvableApiException via onResolutionRequired.
     */
    fun checkLocationSettings(
        onResolutionRequired: (IntentSenderRequest) -> Unit,
        onAlreadyEnabled: () -> Unit
    ) {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000).build()
        val builder = LocationSettingsRequest.Builder().addLocationRequest(locationRequest)
        val client: SettingsClient = LocationServices.getSettingsClient(ctx)
        val task = client.checkLocationSettings(builder.build())

        task.addOnSuccessListener { onAlreadyEnabled() }
        task.addOnFailureListener { exception ->
            if (exception is ResolvableApiException) {
                try {
                    val intentSenderRequest = IntentSenderRequest.Builder(exception.resolution.intentSender).build()
                    onResolutionRequired(intentSenderRequest)
                } catch (sendEx: Exception) {
                    // Ignore the error
                }
            }
        }
    }

    /** Fetch job recommendations based on current location. */
    fun loadRecommendations(onLocationDisabled: ((IntentSenderRequest) -> Unit)? = null) {
        viewModelScope.launch {
            _isRecommendationLoading.value = true
            _recommendationError.value = null
            try {
                if (TokenManager.getJobs(ctx).isEmpty()) {
                    _recommendationError.value = "NO_JOBS_SELECTED"
                    return@launch
                }
                
                var loc = getCurrentLocation()
                if (loc == null && onLocationDisabled != null) {
                    // Try to resolve location settings if we can't get a location
                    checkLocationSettings(
                        onResolutionRequired = { intentSenderRequest ->
                            _isRecommendationLoading.value = false
                            onLocationDisabled(intentSenderRequest)
                        },
                        onAlreadyEnabled = {
                            // If it's already enabled but loc was null, maybe it just needs a retry
                            viewModelScope.launch {
                                val retryLoc = getCurrentLocation()
                                proceedWithRecommendations(retryLoc)
                            }
                        }
                    )
                    return@launch
                }

                proceedWithRecommendations(loc)
            } catch (e: Exception) {
                android.util.Log.e("DashboardViewModel", "Failed to load recommendations", e)
                _recommendationError.value = "Couldn't load recommendations. Tap retry."
            } finally {
                _isRecommendationLoading.value = false
            }
        }
    }

    private suspend fun proceedWithRecommendations(loc: Location?) {
        if (loc == null) {
            _recommendationError.value = if (!hasLocationPermission()) {
                "Enable location to get job recommendations."
            } else {
                "Could not fetch your current location. Ensure GPS is ON."
            }
            return
        }

        try {
            val jobsStr = TokenManager.getJobs(ctx).joinToString(",")
            val skillsStr = TokenManager.getSkills(ctx).joinToString(",")
            val response = chatApi.getJobRecommendations(loc.latitude, loc.longitude, jobsStr, skillsStr)
            _recommendation.value = response.data
        } catch (e: HttpException) {
            _errorMessage.value = "Server error, please try again later."
        } catch (e: IOException) {
            _errorMessage.value = "Network error, please check your connection."
        } catch (e: Exception) {
            android.util.Log.e("DashboardViewModel", "API call failed", e)
            _errorMessage.value = "An unexpected error occurred."
        }
    }

    // ─── Session Init (mirrors initChat()) ──────────────────────────────────
    private fun startSession() {
        viewModelScope.launch {
            try {
                _isProcessing.value = true
                _errorMessage.value = null
                
                val location = getCurrentLocation()
                val jobs = TokenManager.getJobs(ctx).toList()
                val skills = TokenManager.getSkills(ctx).toList()
                
                val body = com.gigone.saarthi.data.StartSessionRequest(
                    language = _selectedLanguage.value,
                    platforms = jobs,
                    skills = skills,
                    lat = location?.latitude,
                    lon = location?.longitude
                )
                
                val data = chatApi.startSession(body)
                conversationId = data.conversationId
                _messages.value = listOf(ChatMessage("assistant", data.reply))
                
                val token = TokenManager.getToken(ctx) ?: ""
                ttsPlayer.speak(data.reply, _selectedLanguage.value, token)
            } catch (e: HttpException) {
                _errorMessage.value = "Server error, please try again later."
                _messages.value = listOf(ChatMessage("assistant", "⚠️ Could not connect to server. Try again."))
            } catch (e: IOException) {
                _errorMessage.value = "Network error, please check your connection."
                _messages.value = listOf(ChatMessage("assistant", "⚠️ Network error. Check your internet."))
            } catch (e: Exception) {
                android.util.Log.e("DashboardViewModel", "Failed to start session", e)
                _errorMessage.value = "An unexpected error occurred."
                _messages.value = listOf(ChatMessage("assistant", "⚠️ Something went wrong."))
            } finally {
                _isProcessing.value = false
            }
        }
    }

    // ─── Mic Press In (mirrors handleMicDown) ────────────────────────────────
    fun handleMicPressIn() {
        ttsPlayer.stop()

        if (conversationId == null) {
            startSession()
            return
        }
        if (!_isProcessing.value) {
            recordingStartTime = System.currentTimeMillis()
            _isRecording.value = true
            voiceRecorder.start()
        }
    }

    // ─── Mic Press Out (mirrors handleMicUp) ─────────────────────────────────
    fun handleMicPressOut() {
        if (!_isRecording.value) return

        val duration = System.currentTimeMillis() - recordingStartTime
        if (duration < 400L) {
            // Too short — accidental tap, discard
            voiceRecorder.cancel()
            _isRecording.value = false
            return
        }

        val audioFile = voiceRecorder.stop() ?: run {
            _isRecording.value = false
            return
        }
        _isRecording.value = false

        viewModelScope.launch {
            try {
                _isProcessing.value = true

                val location = getCurrentLocation()
                // Show "Processing" indicator (mirrors web client)
                _messages.value = _messages.value + ChatMessage("user", "🎙️ Processing voice...")

                val audioPart = MultipartBody.Part.createFormData(
                    "audio",
                    audioFile.name,
                    audioFile.asRequestBody("audio/webm".toMediaType())
                )
                val convIdBody = conversationId!!.toRequestBody("text/plain".toMediaType())
                val langBody = _selectedLanguage.value.toRequestBody("text/plain".toMediaType())
                
                val jobs = TokenManager.getJobs(ctx).joinToString(",")
                val skills = TokenManager.getSkills(ctx).joinToString(",")
                val jobsBody = jobs.toRequestBody("text/plain".toMediaType())
                val skillsBody = skills.toRequestBody("text/plain".toMediaType())

                val latBody = location?.latitude?.toString()?.toRequestBody("text/plain".toMediaType())
                val lonBody = location?.longitude?.toString()?.toRequestBody("text/plain".toMediaType())

                val data: AudioReplyResponse = chatApi.sendAudioReply(
                    audioPart, 
                    convIdBody, 
                    langBody,
                    jobsBody,
                    skillsBody,
                    latBody,
                    lonBody
                )

                // Replace the "Processing" bubble with real transcription + reply
                val current = _messages.value.dropLast(1)
                _messages.value = current +
                    ChatMessage("user", data.transcription) +
                    ChatMessage("assistant", data.reply)

                // Allow the user to say 'ok' and hear the AI's explicit check-in conclusion,
                // just like the web app. Reset only after this explicit conclusion is given.
                if (data.reply.contains("Naya check-in shuru karne ke liye") || data.reply.contains("check-in ho chuka hai")) {
                    conversationId = null
                    // Trigger auto-refresh on Earnings and History tabs!
                    com.gigone.saarthi.util.EventBus.triggerRefresh()
                }
                
                val token = TokenManager.getToken(ctx) ?: ""
                ttsPlayer.speak(data.reply, _selectedLanguage.value, token)
                audioFile.delete()

            } catch (e: HttpException) {
                _errorMessage.value = "Server error, please try again later."
                val current = _messages.value.dropLast(1)
                _messages.value = current + ChatMessage(
                    "assistant", "⚠️ Server error."
                )
                audioFile.delete()
            } catch (e: IOException) {
                _errorMessage.value = "Network error, please check your connection."
                val current = _messages.value.dropLast(1)
                _messages.value = current + ChatMessage(
                    "assistant", "⚠️ Network error."
                )
                audioFile.delete()
            } catch (e: Exception) {
                _errorMessage.value = "An unexpected error occurred."
                val current = _messages.value.dropLast(1)
                _messages.value = current + ChatMessage(
                    "assistant", "⚠️ Voice error: ${e.message ?: "Something went wrong."}"
                )
                audioFile.delete()
            } finally {
                _isProcessing.value = false
            }
        }
    }

    /** Check whether RECORD_AUDIO permission is already granted. */
    fun hasAudioPermission(): Boolean =
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    /** Check whether location permissions are granted. */
    fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun refreshLocation() {
        viewModelScope.launch {
            _currentLocationName.value = "Locating..."
            getCurrentLocation()
        }
    }

    /** Fetches the current location using FusedLocationProviderClient with fresh request & fallback. */
    private suspend fun getCurrentLocation(): Location? {
        if (!hasLocationPermission()) {
            _currentLocationName.value = "Loc off"
            return null
        }
        return try {
            // 1. ALWAYS try to get a FRESH, high-accuracy location first (with timeout)
            var location = withTimeoutOrNull(5000L) {
                fusedLocationClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    CancellationTokenSource().token
                ).await()
            }

            // 2. If GPS is weak/times out, fall back to the last known cached location
            if (location == null) {
                location = try {
                    fusedLocationClient.lastLocation.await()
                } catch (e: Exception) { null }
            }
            
            if (location != null) {
                updateLocationName(location)
            } else {
                _currentLocationName.value = "Unknown"
            }
            location
        } catch (e: Exception) {
            android.util.Log.e("DashboardViewModel", "Failed to get location", e)
            _currentLocationName.value = "Loc err"
            null
        }
    }

    /** Updates the human-readable location name using Geocoder. */
    private fun updateLocationName(location: Location) {
        viewModelScope.launch {
            try {
                val geocoder = Geocoder(ctx, java.util.Locale.getDefault())
                // getFromLocation is blocking, but we are in a coroutine
                val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                if (!addresses.isNullOrEmpty()) {
                    val address = addresses[0]
                    // Prefer highly specific street-level details for maximum accuracy
                    val name = address.thoroughfare ?: address.subLocality ?: address.featureName ?: address.locality ?: address.adminArea ?: "Unknown"
                    _currentLocationName.value = name
                }
            } catch (e: Exception) {
                _currentLocationName.value = "Location found"
            }
        }
    }

    fun resetSession() {
        conversationId = null
        _messages.value = listOf(ChatMessage("assistant", "Ready when you are! Hold the mic to speak."))
        _isProcessing.value = false
        _isRecording.value = false
        ttsPlayer.stop()
    }

    // ─── Cleanup ─────────────────────────────────────────────────────────────
    override fun onCleared() {
        super.onCleared()
        ttsPlayer.shutdown()
        voiceRecorder.cancel()
    }
}
