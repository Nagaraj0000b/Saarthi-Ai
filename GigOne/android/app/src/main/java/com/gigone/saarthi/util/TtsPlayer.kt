package com.gigone.saarthi.util

import android.content.Context
import android.media.MediaPlayer
import android.util.Log
import com.gigone.saarthi.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/**
 * TtsPlayer — High quality TTS player.
 * Connects directly to the main Express backend API which uses Google Cloud TTS.
 */
class TtsPlayer(private val context: Context) {
    private val client = OkHttpClient()
    private var mediaPlayer: MediaPlayer? = null

    fun speak(text: String, language: String = "English", token: String = "") {
        if (token.isEmpty()) {
             Log.e("TtsPlayer", "Auth token is required for TTS")
             return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val json = JSONObject().apply {
                    put("text", text)
                    put("language", language)
                }

                // Call the main API, not the old TTS_URL
                val apiUrl = BuildConfig.API_URL.removeSuffix("/") + "/tts"

                val request = Request.Builder()
                    .url(apiUrl)
                    .addHeader("Authorization", "Bearer $token")
                    .post(json.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val bytes = response.body?.bytes() ?: return@launch
                    val tempFile = File(context.cacheDir, "tts_temp.mp3")
                    FileOutputStream(tempFile).use { it.write(bytes) }
                    
                    playAudio(tempFile.absolutePath)
                } else {
                    Log.e("TtsPlayer", "TTS API Error: ${response.code}")
                }
            } catch (e: Exception) {
                Log.e("TtsPlayer", "TTS Request Failed", e)
            }
        }
    }

    private fun playAudio(filePath: String) {
        stop() // Cancel any ongoing audio
        try {
            mediaPlayer = MediaPlayer().apply {
                setDataSource(filePath)
                prepare()
                start()
            }
        } catch (e: Exception) {
            Log.e("TtsPlayer", "MediaPlayer Error", e)
        }
    }

    fun stop() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (_: Exception) {}
    }

    fun shutdown() {
        stop()
    }
}
