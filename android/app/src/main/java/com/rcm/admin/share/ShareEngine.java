package com.rcm.admin.share;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.File;
import java.util.ArrayList;

public class ShareEngine {

    public static void shareFiles(Context context, String text, String[] filePaths) {
        Intent intent = new Intent();
        ArrayList<Uri> uris = new ArrayList<>();

        if (filePaths != null && filePaths.length > 0) {
            for (String path : filePaths) {
                if (path == null) continue;
                File file = new File(path);
                // Add a check to ensure the file actually exists before trying to share it.
                if (file.exists()) {
                    Uri contentUri = FileProvider.getUriForFile(context, context.getPackageName() + ".provider", file);
                    uris.add(contentUri);
                }
            }
        }

        if (!uris.isEmpty()) {
            // If we have files, use ACTION_SEND_MULTIPLE.
            intent.setAction(Intent.ACTION_SEND_MULTIPLE);
            intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
            intent.setType("*/*");
        } else {
            // If there are no files, fall back to a simple text share.
            intent.setAction(Intent.ACTION_SEND);
            intent.setType("text/plain");
        }

        intent.putExtra(Intent.EXTRA_TEXT, text);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        try {
            Intent chooser = Intent.createChooser(intent, "Share Via");
            context.startActivity(chooser);
        } catch (android.content.ActivityNotFoundException ex) {
            // Prevent crash if no app can handle the share intent.
            Toast.makeText(context, "No app available to handle this action.", Toast.LENGTH_SHORT).show();
        }
    }
}
