package com.idlewizard.game;

import android.os.Bundle;
import android.os.Build;
import android.view.Display;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final float TARGET_FRAME_RATE = 120f;
    private static final int SOFT_INPUT_MODE =
        WindowManager.LayoutParams.SOFT_INPUT_STATE_UNSPECIFIED |
        WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IdleWizardHapticsPlugin.class);
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(NativeAuthTokenStoragePlugin.class);
        super.onCreate(savedInstanceState);
        lockSoftKeyboardWindow();
        requestHighFrameRate();
    }

    @Override
    public void onResume() {
        super.onResume();
        lockSoftKeyboardWindow();
        requestHighFrameRate();
    }

    private void lockSoftKeyboardWindow() {
        getWindow().setSoftInputMode(SOFT_INPUT_MODE);
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
