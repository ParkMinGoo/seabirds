package com.threecats.seabirds;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BluetoothClassicPlugin.class);
        registerPlugin(PhotoLogOcrPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep the current logbook page and any unsaved form values in place
        // when the Android system Back button is pressed accidentally.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // A visible dive record is a temporary detail layer: Back
                // closes only that layer. On the main logbook pages Back stays
                // disabled so an accidental press cannot lose the current UI.
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "window.SeaBirdsHandleBack ? window.SeaBirdsHandleBack() : false",
                        null
                    );
                }
            }
        });
    }
}
