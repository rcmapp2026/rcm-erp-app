package com.rcm.erp;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.rcm.admin.share.ShareEngine;
import org.json.JSONArray;
import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridge.getWebView().addJavascriptInterface(new WebAppInterface(), "ShareEngine");
    }

    private class WebAppInterface {
        @JavascriptInterface
        public void shareFiles(String text, String filePathsJson) {
            try {
                JSONArray jsonArray = new JSONArray(filePathsJson);
                List<String> filePaths = new ArrayList<>();
                for (int i = 0; i < jsonArray.length(); i++) {
                    filePaths.add(jsonArray.getString(i));
                }
                ShareEngine.shareFiles(MainActivity.this, text, filePaths.toArray(new String[0]));
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    }
}
