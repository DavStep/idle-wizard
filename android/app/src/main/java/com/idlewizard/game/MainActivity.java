package com.idlewizard.game;

import android.os.Bundle;
import android.os.Build;
import android.view.Display;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final float TARGET_FRAME_RATE = 120f;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeGoogleAuthPlugin.class);
        super.onCreate(savedInstanceState);
        requestHighFrameRate();
    }

    @Override
    public void onResume() {
        super.onResume();
        requestHighFrameRate();
    }

    private void requestHighFrameRate() {
        WindowManager.LayoutParams attributes = getWindow().getAttributes();
        attributes.preferredRefreshRate = TARGET_FRAME_RATE;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            attributes.preferredDisplayModeId = getBestDisplayModeId();
        }

        getWindow().setAttributes(attributes);
    }

    private int getBestDisplayModeId() {
        Display display = getWindowManager().getDefaultDisplay();
        Display.Mode activeMode = display.getMode();
        Display.Mode bestMode = activeMode;

        for (Display.Mode mode : display.getSupportedModes()) {
            boolean sameSize =
                mode.getPhysicalWidth() == activeMode.getPhysicalWidth() &&
                mode.getPhysicalHeight() == activeMode.getPhysicalHeight();

            if (sameSize && mode.getRefreshRate() > bestMode.getRefreshRate()) {
                bestMode = mode;
            }
        }

        return bestMode.getModeId();
    }
}
