package com.rcm.erp

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private val PERMISSION_REQUEST_CODE = 1234
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        setupWebView()
        requestAppPermissions()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }
        }

        webView.addJavascriptInterface(AndroidBridge(), "AndroidInterface")
        webView.importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
        webView.loadUrl("file:///android_asset/public/index.html")
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun shareFile(base64Data: String, fileName: String, mimeType: String, text: String, mobile: String) {
            try {
                val pureBase64 = if (base64Data.contains(",")) base64Data.split(",")[1] else base64Data
                val bytes = android.util.Base64.decode(pureBase64, android.util.Base64.DEFAULT)
                
                val cachePath = File(cacheDir, "shared_docs")
                if (!cachePath.exists()) cachePath.mkdirs()
                val file = File(cachePath, fileName)
                FileOutputStream(file).use { it.write(bytes) }

                if (!file.exists() || file.length() == 0L) {
                    throw Exception("File creation failed or file is empty")
                }

                val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)

                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = mimeType
                    putExtra(Intent.EXTRA_STREAM, uri)
                    if (text.isNotEmpty()) putExtra(Intent.EXTRA_TEXT, text)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                
                startActivity(Intent.createChooser(intent, "Share RCM Document"))

            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Share failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        @JavascriptInterface
        fun downloadFile(base64Data: String, fileName: String, mimeType: String) {
            try {
                val pureBase64 = if (base64Data.contains(",")) base64Data.split(",")[1] else base64Data
                val bytes = android.util.Base64.decode(pureBase64, android.util.Base64.DEFAULT)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }
                    val resolver = contentResolver
                    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    uri?.let {
                        resolver.openOutputStream(it).use { output ->
                            output?.write(bytes)
                        }
                    } ?: throw Exception("MediaStore URI is null")
                } else {
                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val file = File(downloadsDir, fileName)
                    FileOutputStream(file).use { it.write(bytes) }
                }

                runOnUiThread {
                    Toast.makeText(this@MainActivity, "File saved to Downloads", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Download failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        @JavascriptInterface
        fun openWhatsApp(mobile: String, text: String) {
            try {
                val uri = Uri.parse("whatsapp://send?phone=91$mobile&text=${Uri.encode(text)}")
                val intent = Intent(Intent.ACTION_VIEW, uri)
                startActivity(intent)
            } catch (e: Exception) {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/91$mobile?text=${Uri.encode(text)}"))
                startActivity(browserIntent)
            }
        }

        @JavascriptInterface
        fun requestStoragePermission() {
            runOnUiThread { requestAppPermissions() }
        }

        @JavascriptInterface
        fun checkStoragePermissions(): Boolean {
            return true
        }

        @JavascriptInterface
        fun onPermissionResult(granted: Boolean) {
            // This can be called from JavaScript to notify permission result
            runOnUiThread {
                if (granted) {
                    Toast.makeText(this@MainActivity, "Permissions granted!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@MainActivity, "Permissions denied. Please enable in settings.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    fun requestAppPermissions() {
        val permissions = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissions.add(Manifest.permission.CAMERA)

        val list = permissions.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (list.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, list.toTypedArray(), PERMISSION_REQUEST_CODE)
        } else {
            runOnUiThread {
                try {
                    webView.evaluateJavascript("window.permissionResult && window.permissionResult(true)", null)
                } catch (e: Exception) {
                    onPermissionResult(true)
                }
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            runOnUiThread {
                try {
                    webView.evaluateJavascript("window.permissionResult && window.permissionResult($allGranted)", null)
                } catch (e: Exception) {
                    onPermissionResult(allGranted)
                }
            }
        }
    }
}