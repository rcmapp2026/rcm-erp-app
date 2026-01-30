package com.rcm.erp;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import android.media.MediaScannerConnection;

public class WebAppInterface {
    private Activity activity;

    WebAppInterface(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void shareFile(String base64Data, String fileName, String mimeType, String text) {
        try {
            // Use the public Downloads directory for broader compatibility
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs(); // Create the directory if it doesn't exist
            }
            File file = new File(downloadsDir, fileName);

            byte[] fileAsBytes = Base64.decode(base64Data, 0);
            FileOutputStream os = new FileOutputStream(file, false);
            os.write(fileAsBytes);
            os.flush();
            os.close();

            // Notify the system that a new file is available
            MediaScannerConnection.scanFile(activity, new String[]{file.getAbsolutePath()}, new String[]{mimeType}, null);

            // Use FileProvider to get a content URI, which is required for sharing on modern Android
            Uri fileUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".provider", file);

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
            shareIntent.putExtra(Intent.EXTRA_TEXT, text);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // Use a chooser to let the user select an app
            activity.startActivity(Intent.createChooser(shareIntent, "Share File"));

        } catch (Exception e) {
            e.printStackTrace();
            // Consider sending an error back to the WebView here
        }
    }
}
