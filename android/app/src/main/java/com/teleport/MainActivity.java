package com.teleport;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register custom plugins before calling super
        registerPlugin(LocationMockerPlugin.class);

        super.onCreate(savedInstanceState);
    }
}
