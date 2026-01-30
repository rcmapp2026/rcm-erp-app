package com.rcm.erp

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Base64
import android.webkit.JavascriptInterface
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

class WebInterface(private val context: Context) {
    @JavascriptInterface
    fun vibrate(duration: Long) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            val v = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            v.vibrate(duration)
        }
    }
    @JavascriptInterface
    fun openWhatsApp(mobile: String, text: String) {
        val uri = Uri.parse("whatsapp://send?phone=91$mobile&text=${Uri.encode(text)}")
        val intent = Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { context.startActivity(intent) } catch (e: Exception) {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/91$mobile?text=${Uri.encode(text)}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
    @JavascriptInterface
    fun sendReminder(base64Image: String, messageText: String, sourceSection: String) {
        try {
            // Decode base64 to bytes
            val imageBytes = Base64.decode(base64Image.split(",")[1], Base64.DEFAULT)
            
            // Save to cache
            val cacheDir = context.externalCacheDir ?: context.cacheDir
            val imageFile = File(cacheDir, "reminder_${sourceSection.lowercase()}_${System.currentTimeMillis()}.png")
            FileOutputStream(imageFile).use { it.write(imageBytes) }
            
            // Call UniversalShareManager
            UniversalShareManager.sendReminder(context, messageText, imageFile.absolutePath, sourceSection)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    @JavascriptInterface
    fun sendPdfToWhatsApp(base64Pdf: String) {
        try {
            // Decode base64 to bytes
            val pdfBytes = Base64.decode(base64Pdf.split(",")[1], Base64.DEFAULT)
            
            // Save to cache
            val cacheDir = context.externalCacheDir ?: context.cacheDir
            val pdfFile = File(cacheDir, "report_${System.currentTimeMillis()}.pdf")
            FileOutputStream(pdfFile).use { it.write(pdfBytes) }
            
            // Call UniversalShareManager
            UniversalShareManager.sendPdfToWhatsApp(context, pdfFile.absolutePath)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    @JavascriptInterface
    fun requestNotificationPermission() = true
    @JavascriptInterface
    fun requestStoragePermission() = true
}