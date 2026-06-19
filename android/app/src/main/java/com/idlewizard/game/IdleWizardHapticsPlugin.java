package com.idlewizard.game;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "IdleWizardHaptics")
public class IdleWizardHapticsPlugin extends Plugin {
    private static final int DEFAULT_DURATION_MS = 5;
    private static final double DEFAULT_AMPLITUDE = 0.5;
    private static final int MIN_DURATION_MS = 1;
    private static final int MAX_DURATION_MS = 1000;
    private static final int MIN_ANDROID_AMPLITUDE = 1;
    private static final int MAX_ANDROID_AMPLITUDE = 255;

    @PluginMethod
    public void playConstant(PluginCall call) {
        int durationMs = readDurationMs(call);
        int androidAmplitude = readAndroidAmplitude(call);
        Vibrator vibrator = getDefaultVibrator();

        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve();
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                vibrate(vibrator, durationMs, androidAmplitude);
                call.resolve();
            } catch (RuntimeException error) {
                call.reject("Failed to play haptic pulse.", error);
            }
        });
    }

    private int readDurationMs(PluginCall call) {
        Integer durationMs = call.getInt("durationMs", DEFAULT_DURATION_MS);
        if (durationMs == null) {
            return DEFAULT_DURATION_MS;
        }

        return clamp(durationMs, MIN_DURATION_MS, MAX_DURATION_MS);
    }

    private int readAndroidAmplitude(PluginCall call) {
        Double amplitude = call.getDouble("amplitude", DEFAULT_AMPLITUDE);
        double normalizedAmplitude = amplitude == null ? DEFAULT_AMPLITUDE : amplitude;
        if (Double.isNaN(normalizedAmplitude) || Double.isInfinite(normalizedAmplitude)) {
            normalizedAmplitude = DEFAULT_AMPLITUDE;
        }

        int androidAmplitude = (int) Math.round(normalizedAmplitude * MAX_ANDROID_AMPLITUDE);
        return clamp(androidAmplitude, MIN_ANDROID_AMPLITUDE, MAX_ANDROID_AMPLITUDE);
    }

    private Vibrator getDefaultVibrator() {
        Activity activity = getActivity();
        if (activity == null) {
            return null;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) activity.getSystemService(
                Context.VIBRATOR_MANAGER_SERVICE
            );
            return vibratorManager == null ? null : vibratorManager.getDefaultVibrator();
        }

        return (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @SuppressWarnings("deprecation")
    private void vibrate(Vibrator vibrator, int durationMs, int androidAmplitude) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, androidAmplitude));
            return;
        }

        vibrator.vibrate(durationMs);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
