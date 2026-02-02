package com.rcm.erp;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.rcm.admin.share.ShareEngine;
import org.json.JSONArray;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

public class WebAppInterface {
    private Activity activity;
    private static final String TAG = "WebAppInterface";

    WebAppInterface(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void shareFile(String base64Data, String fileName, String mimeType, String text) {
        shareFile(base64Data, fileName, mimeType, text, "");
    }

    @JavascriptInterface
    public void shareFile(String base64Data, String fileName, String mimeType, String text, String mobile) {
        activity.runOnUiThread(() -> Toast.makeText(activity, "Opening WhatsApp...", Toast.LENGTH_SHORT).show());

        try {
            if (base64Data != null && base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }

            // Generate valid filename
            String finalFileName = (fileName != null && !fileName.isEmpty()) ? fileName : ("RCM_Doc_" + System.currentTimeMillis());
            finalFileName = finalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");

            if (!finalFileName.contains(".") && mimeType != null) {
                String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
                if (ext != null) finalFileName += "." + ext;
                else if (mimeType.contains("pdf")) finalFileName += ".pdf";
                else if (mimeType.contains("image")) finalFileName += ".jpg";
            }

            // Save in External Files Dir (Best for cross-app sharing)
            File sharePath = new File(activity.getExternalFilesDir(null), "temp_share");
            if (!sharePath.exists()) sharePath.mkdirs();

            // Clean old files
            File[] oldFiles = sharePath.listFiles();
            if (oldFiles != null) {
                for (File f : oldFiles) f.delete();
            }

            File file = new File(sharePath, finalFileName);
            byte[] fileAsBytes = Base64.decode(base64Data, Base64.DEFAULT);

            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(fileAsBytes);
                fos.flush();
            }

            Uri contentUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".provider", file);

            if (contentUri != null) {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType(mimeType != null ? mimeType : "*/*");
                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);

                // Set text/caption
                if (text != null && !text.isEmpty()) {
                    shareIntent.putExtra(Intent.EXTRA_TEXT, text);
                }

                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                // Handle specific mobile number for WhatsApp
                if (mobile != null && !mobile.trim().isEmpty()) {
                    String cleanMobile = mobile.replaceAll("\\D", "");
                    if (cleanMobile.length() > 10) cleanMobile = cleanMobile.substring(cleanMobile.length() - 10);

                    String jid = "91" + cleanMobile + "@s.whatsapp.net";

                    // Try WhatsApp first, then Business
                    if (isAppInstalled("com.whatsapp")) {
                        shareIntent.setPackage("com.whatsapp");
                        shareIntent.putExtra("jid", jid);
                    } else if (isAppInstalled("com.whatsapp.w4b")) {
                        shareIntent.setPackage("com.whatsapp.w4b");
                        shareIntent.putExtra("jid", jid);
                    }
                    activity.startActivity(shareIntent);
                } else {
                    // General share chooser
                    Intent chooser = Intent.createChooser(shareIntent, "Share Document");
                    chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    // Grant permissions for chooser
                    List<android.content.pm.ResolveInfo> resInfoList = activity.getPackageManager().queryIntentActivities(chooser, PackageManager.MATCH_DEFAULT_ONLY);
                    for (android.content.pm.ResolveInfo resolveInfo : resInfoList) {
                        activity.grantUriPermission(resolveInfo.activityInfo.packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    }
                    activity.startActivity(chooser);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Share Error: " + e.getMessage());
            activity.runOnUiThread(() -> Toast.makeText(activity, "Share Failed: " + e.getMessage(), Toast.LENGTH_LONG).show());
        }
    }

    private boolean isAppInstalled(String packageName) {
        PackageManager pm = activity.getPackageManager();
        try {
            pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @JavascriptInterface
    public void downloadFile(String base64Data, String fileName, String mimeType) {
        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }
            byte[] fileAsBytes = Base64.decode(base64Data, Base64.DEFAULT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (OutputStream os = activity.getContentResolver().openOutputStream(uri)) {
                        os.write(fileAsBytes);
                    }
                }
            } else {
                File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File file = new File(path, fileName);
                try (FileOutputStream os = new FileOutputStream(file)) {
                    os.write(fileAsBytes);
                }
            }
            activity.runOnUiThread(() -> Toast.makeText(activity, "Saved to Downloads", Toast.LENGTH_SHORT).show());
        } catch (Exception e) {
            Log.e(TAG, "Download failed: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public void shareFiles(String text, String filePathsJson) {
        try {
            JSONArray jsonArray = new JSONArray(filePathsJson);
            List<String> filePaths = new ArrayList<>();
            for (int i = 0; i < jsonArray.length(); i++) {
                filePaths.add(jsonArray.getString(i));
            }
            ShareEngine.shareFiles(activity, text, filePaths.toArray(new String[0]));
        } catch (Exception e) {
            Log.e(TAG, "shareFiles failed: " + e.getMessage());
        }
    }
}
