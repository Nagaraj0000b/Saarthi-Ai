package com.gigone.saarthi.ui.screens

import android.Manifest
import android.app.Application
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gigone.saarthi.data.ApiClient
import com.gigone.saarthi.data.AudioReplyResponse
import com.gigone.saarthi.data.ChatApi
import com.gigone.saarthi.util.TtsPlayer
import com.gigone.saarthi.util.TokenManager
import com.gigone.saarthi.util.VoiceRecorder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * DashboardViewModel — single source of truth for the Chatbot screen.
 *
 * Mirrors the entire useState + handler pattern from web client's DashBoard.jsx:
 *   messages       ↔  messages state
 *   isProcessing   ↔  isProcessing state
 *   isRecording    ↔  isRecording state
 *   selectedLanguage ↔ selectedLanguage state
 *   conversationId ↔  conversationId ref
 *   initChat()     ↔  startSession()
 *   handleMicDown  ↔  handleMicPressIn()
 *   handleMicUp    ↔  handleMicPressOut()
 */
class DashboardViewModel(application: Application) : AndroidViewModel(application) {

    private val ctx get() = getApplication<Application>()

    // ─── API + Utilities ────────────────────────────────────────────────────
    private val chatApi: ChatApi by lazy {
        ApiClient.buildRetrofit(ctx).create(ChatApi::class.java)
    }
    private val voiceRecorder = VoiceRecorder(ctx)
    private val ttsPlayer = TtsPlayer(ctx)

    // ─── State ──────────────────────────────────────────────────────────────
    private val _messages = MutableStateFlow<List<ChatMessage>>(
        listOf(ChatMessage("assistant", "Ready when you are! Hold the mic to speak."))
    )
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

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

    // ─── Session Init (mirrors initChat()) ──────────────────────────────────
    private fun startSession() {
        viewModelScope.launch {
            try {
                _isProcessing.value = true
                
                val platforms = TokenManager.getPlatforms(ctx).toList()
                val vehicles = TokenManager.getVehicles(ctx).toList()
                
                val body = com.gigone.saarthi.data.StartSessionRequest(
                    language = _selectedLanguage.value,
                    platforms = platforms,
                    vehicles = vehicles
                )
                
                val data = chatApi.startSession(body)
                conversationId = data.conversationId
                _messages.value = listOf(ChatMessage("assistant", data.reply))
                
                val token = TokenManager.getToken(ctx) ?: ""
                ttsPlayer.speak(data.reply, _selectedLanguage.value, token)
            } catch (e: Exception) {
                android.util.Log.e("DashboardViewModel", "Failed to start session", e)
                _messages.value = _messages.value + ChatMessage(
                    "assistant", "⚠️ Could not connect to server. Error: ${e.message}"
                )
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

                // Show "Processing" indicator (mirrors web client)
                _messages.value = _messages.value + ChatMessage("user", "🎙️ Processing voice...")

                val audioPart = MultipartBody.Part.createFormData(
                    "audio",
                    audioFile.name,
                    audioFile.asRequestBody("audio/webm".toMediaType())
                )
                val convIdBody = conversationId!!.toRequestBody("text/plain".toMediaType())
                val langBody = _selectedLanguage.value.toRequestBody("text/plain".toMediaType())
                
                val platforms = TokenManager.getPlatforms(ctx).joinToString(",")
                val vehicles = TokenManager.getVehicles(ctx).joinToString(",")
                val platformsBody = platforms.toRequestBody("text/plain".toMediaType())
                val vehiclesBody = vehicles.toRequestBody("text/plain".toMediaType())

                val data: AudioReplyResponse = chatApi.sendAudioReply(
                    audioPart, 
                    convIdBody, 
                    langBody,
                    platformsBody,
                    vehiclesBody
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
                }
                
                val token = TokenManager.getToken(ctx) ?: ""
                ttsPlayer.speak(data.reply, _selectedLanguage.value, token)
                audioFile.delete()

            } catch (e: Exception) {
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
