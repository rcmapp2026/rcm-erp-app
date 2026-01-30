package com.rcm.erp;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;

public class WebAppInterface {
    private Activity activity;

    WebAppInterface(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void shareFile(String base64Data, String fileName, String mimeType, String text) {
        try {
            // MASTER FIX: Use the app's secure external cache directory
            File cacheDir = activity.getExternalCacheDir();
            if (cacheDir == null) { return; } // Handle case where cache is not available
            
            File file = new File(cacheDir, fileName);

            byte[] fileAsBytes = Base64.decode(base64Data, 0);
            FileOutputStream os = new FileOutputStream(file, false);
            os.write(fileAsBytes);
            os.flush();
            os.close();

            // FileProvider will grant temporary access to the receiving app
            Uri fileUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".provider", file);

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
            shareIntent.putExtra(Intent.EXTRA_TEXT, text);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            activity.startActivity(Intent.createChooser(shareIntent, "Share File"));

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
