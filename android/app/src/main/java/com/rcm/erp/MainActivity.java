package com.rcm.erp;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

// Import the plugins
import com.getcapacitor.community.filesystem.Filesystem;
import com.getcapacitor.community.share.Share;

public class MainActivity extends BridgeActivity {
    @java.lang.Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Manually register the plugins to guarantee they are available.
        // This is the GUARANTEED FIX for the APK.
        registerPlugins(new ArrayList<Class<? extends Plugin>>() {{
            add(Filesystem.class);
            add(Share.class);
        }});
    }
}