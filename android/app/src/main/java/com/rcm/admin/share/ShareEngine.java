package com.rcm.admin.share;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import java.io.File;
import java.util.ArrayList;

public class ShareEngine {

    public static void shareFiles(Context context, String text, String[] filePaths) {
        if (filePaths == null || filePaths.length == 0) {
            return; // or handle as a text-only share
        }

        Intent intent = new Intent();
        intent.setAction(Intent.ACTION_SEND_MULTIPLE);
        intent.putExtra(Intent.EXTRA_TEXT, text);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        ArrayList<Uri> uris = new ArrayList<>();
        for (String filePath : filePaths) {
            File file = new File(filePath);
            Uri contentUri = FileProvider.getUriForFile(context, context.getPackageName() + ".provider", file);
            uris.add(contentUri);
        }

        intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);

        // Set the MIME type based on the files being shared. 
        // This is a generic type, you might want to be more specific based on the file types.
        intent.setType("*/*");

        Intent chooser = Intent.createChooser(intent, "Share Via");
        context.startActivity(chooser);
    }
}
