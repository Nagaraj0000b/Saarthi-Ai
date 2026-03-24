package com.gigone.saarthi.util

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

/**
 * VoiceRecorder — thin wrapper around Android MediaRecorder.
 * Analogous to the web client's useVoiceRecorder.js hook.
 *
 * Usage:
 *   val recorder = VoiceRecorder(context)
 *   recorder.start()
 *   ...
 *   val file = recorder.stop()  // returns File ready to upload
 */
class VoiceRecorder(private val context: Context) {

    private val cacheDir: File = context.cacheDir
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

    /** Starts microphone capture. Call only after RECORD_AUDIO permission is granted. */
    fun start() {
        val file = File(cacheDir, "saarthi_voice_${System.currentTimeMillis()}.webm")
        outputFile = file

        recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)  // API 31+ constructor
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }.apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.WEBM)
            setAudioEncoder(MediaRecorder.AudioEncoder.OPUS)
            setAudioSamplingRate(16000)
            setAudioEncodingBitRate(64000)
            setOutputFile(file.absolutePath)
            prepare()
            start()
        }
    }

    /**
     * Stops recording and returns the recorded audio [File].
     * Returns null if no recording was active.
     * Mirrors: stopRecording() → Promise<Blob> in the web hook.
     */
    fun stop(): File? {
        return try {
            recorder?.apply {
                stop()
                release()
            }
            recorder = null
            outputFile
        } catch (e: Exception) {
            recorder?.release()
            recorder = null
            null
        }
    }

    /** Cancels and discards the current recording without returning a file. */
    fun cancel() {
        try { recorder?.stop() } catch (_: Exception) {}
        recorder?.release()
        recorder = null
        outputFile?.delete()
        outputFile = null
    }
}
