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
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Preparing file for sharing...", Toast.LENGTH_SHORT).show()
                }

                // Validate input
                if (base64Data.isEmpty()) {
                    throw Exception("Base64 data is empty")
                }

                // Extract pure base64
                val pureBase64 = if (base64Data.contains(",")) base64Data.split(",")[1] else base64Data
                if (pureBase64.isEmpty()) {
                    throw Exception("Invalid base64 format")
                }

                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Decoding file data...", Toast.LENGTH_SHORT).show()
                }

                // Decode base64 with error handling
                val bytes = try {
                    android.util.Base64.decode(pureBase64, android.util.Base64.DEFAULT)
                } catch (e: OutOfMemoryError) {
                    throw Exception("File too large for device memory")
                } catch (e: Exception) {
                    throw Exception("Base64 decode failed: ${e.message}")
                }

                // Check file size limit (50MB)
                val maxSize = 50 * 1024 * 1024 // 50MB
                if (bytes.size > maxSize) {
                    throw Exception("File too large (${bytes.size} bytes). Maximum allowed: ${maxSize} bytes")
                }

                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Creating file (${bytes.size} bytes)...", Toast.LENGTH_SHORT).show()
                }

                // Create cache directory
                val cachePath = File(cacheDir, "shared_docs")
                if (!cachePath.exists()) {
                    val created = cachePath.mkdirs()
                    if (!created) {
                        throw Exception("Failed to create cache directory")
                    }
                }

                // Create file
                val file = File(cachePath, fileName)
                val fos = FileOutputStream(file)
                try {
                    fos.write(bytes)
                    fos.flush()
                } finally {
                    fos.close()
                }

                // Verify file was created
                if (!file.exists() || file.length() == 0L) {
                    throw Exception("File creation failed or file is empty")
                }

                runOnUiThread {
                    Toast.makeText(this@MainActivity, "File created (${file.length()} bytes), preparing share...", Toast.LENGTH_SHORT).show()
                }

                // Get URI with error handling
                val uri = try {
                    FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)
                } catch (e: Exception) {
                    throw Exception("FileProvider failed: ${e.message}")
                }

                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Opening share dialog...", Toast.LENGTH_SHORT).show()
                }

                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = mimeType
                    putExtra(Intent.EXTRA_STREAM, uri)
                    if (text.isNotEmpty()) putExtra(Intent.EXTRA_TEXT, text)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                if (mobile.isNotEmpty()) {
                    // Try to send directly to WhatsApp
                    intent.setPackage("com.whatsapp")
                    try {
                        if (!isFinishing && !isDestroyed) {
                            startActivity(intent)
                            runOnUiThread {
                                Toast.makeText(this@MainActivity, "Shared to WhatsApp!", Toast.LENGTH_SHORT).show()
                            }
                            return
                        }
                    } catch (e: Exception) {
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "WhatsApp not available, trying WhatsApp Business...", Toast.LENGTH_SHORT).show()
                        }
                        // WhatsApp not available, try WhatsApp Business
                        intent.setPackage("com.whatsapp.w4b")
                        try {
                            if (!isFinishing && !isDestroyed) {
                                startActivity(intent)
                                runOnUiThread {
                                    Toast.makeText(this@MainActivity, "Shared to WhatsApp Business!", Toast.LENGTH_SHORT).show()
                                }
                                return
                            }
                        } catch (e2: Exception) {
                            runOnUiThread {
                                Toast.makeText(this@MainActivity, "WhatsApp Business not available, using share chooser...", Toast.LENGTH_SHORT).show()
                            }
                            // Fall back to chooser
                            intent.setPackage(null)
                        }
                    }
                }

                if (!isFinishing && !isDestroyed) {
                    try {
                        val chooser = Intent.createChooser(intent, "Share RCM Document")
                        startActivity(chooser)
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "Share dialog opened!", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        throw Exception("Failed to open share dialog: ${e.message}")
                    }
                } else {
                    throw Exception("Activity is finishing or destroyed")
                }

            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Share failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
                e.printStackTrace()
                // Log additional details
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Error details: ${e.javaClass.simpleName}", Toast.LENGTH_LONG).show()
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
            // For file sharing using cache directory and FileProvider,
            // we don't need special storage permissions on modern Android
            // The cache directory is always accessible to the app
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

        // Only request basic permissions, not storage permissions since we use cache
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        permissions.add(Manifest.permission.CAMERA)

        // Remove the MANAGE_EXTERNAL_STORAGE special handling since we don't need it

        val list = permissions.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (list.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, list.toTypedArray(), PERMISSION_REQUEST_CODE)
        } else {
            // All permissions already granted
            runOnUiThread {
                Toast.makeText(this, "Permissions ready", Toast.LENGTH_SHORT).show()
                // Notify JavaScript that permissions are granted
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
            val deniedPermissions = mutableListOf<String>()
            for (i in permissions.indices) {
                if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                    deniedPermissions.add(permissions[i])
                }
            }
            val allGranted = deniedPermissions.isEmpty()

            // Notify JavaScript about permission result
            runOnUiThread {
                try {
                    webView.evaluateJavascript("window.permissionResult && window.permissionResult($allGranted)", null)
                } catch (e: Exception) {
                    // Fallback to interface method
                    onPermissionResult(allGranted)
                }
            }

            if (!allGranted) {
                runOnUiThread {
                    Toast.makeText(this, "Permissions denied: ${deniedPermissions.joinToString()}", Toast.LENGTH_LONG).show()
                }
            } else {
                runOnUiThread {
                    Toast.makeText(this, "All permissions granted", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}