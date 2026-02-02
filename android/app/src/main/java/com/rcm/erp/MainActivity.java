package com.rcm.erp;

import android.Manifest;
import android.app.DownloadManager;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 123;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Request Permissions on Startup
        checkAndRequestPermissions();

        WebAppInterface webAppInterface = new WebAppInterface(this);
        bridge.getWebView().addJavascriptInterface(webAppInterface, "ShareEngine");

        bridge.getWebView().setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            String fileName = extractFileName(url, contentDisposition, mimetype);

            if (url.startsWith("data:")) {
                webAppInterface.shareFile(url, fileName, mimetype, "Sharing Document");
            } else if (url.startsWith("http")) {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimetype);
                    request.addRequestHeader("cookie", CookieManager.getInstance().getCookie(url));
                    request.addRequestHeader("User-Agent", userAgent);
                    request.setTitle(fileName);
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                    
                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    dm.enqueue(request);
                    Toast.makeText(this, "Downloading " + fileName, Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Download failed", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    // Fix: Handle Back Button to navigate WebView history instead of exiting app
    @Override
    public void onBackPressed() {
        if (bridge.getWebView().canGoBack()) {
            bridge.getWebView().goBack();
        } else {
            super.onBackPressed();
        }
    }

    private void checkAndRequestPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private String extractFileName(String url, String contentDisposition, String mimetype) {
        String fileName = null;
        if (contentDisposition != null && contentDisposition.contains("filename")) {
            try {
                if (contentDisposition.contains("filename*=")) {
                    fileName = contentDisposition.split("filename\\*=")[1].split("''")[1].split(";")[0];
                    fileName = Uri.decode(fileName);
                } else if (contentDisposition.contains("filename=")) {
                    fileName = contentDisposition.split("filename=")[1].split(";")[0].replace("\"", "").trim();
                }
            } catch (Exception e) { /* fallback */ }
        }
        
        if (fileName == null || fileName.isEmpty()) {
            fileName = URLUtil.guessFileName(url, contentDisposition, mimetype);
        }
        return fileName;
    }
}
