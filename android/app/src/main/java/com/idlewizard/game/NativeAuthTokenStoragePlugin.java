package com.idlewizard.game;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAuthTokenStorage")
public class NativeAuthTokenStoragePlugin extends Plugin {
    private static final String AUTH_PREFS = "auth_token_storage";
    private static final String SPACETIMEDB_TOKEN_KEY = "spacetimedb_token";

    @PluginMethod
    public void getToken(PluginCall call) {
        String token = getAuthPreferences().getString(SPACETIMEDB_TOKEN_KEY, null);
        JSObject ret = new JSObject();
        if (token != null) {
            ret.put("token", token);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void setToken(PluginCall call) {
        String token = call.getString("token");
        if (token == null || token.trim().isEmpty()) {
            call.reject("Missing token", "missing_token");
            return;
        }

        boolean stored = getAuthPreferences()
            .edit()
            .putString(SPACETIMEDB_TOKEN_KEY, token)
            .commit();
        if (!stored) {
            call.reject("Could not store token", "store_failed");
            return;
        }

        call.resolve();
    }

    @PluginMethod
    public void clearToken(PluginCall call) {
        boolean cleared = getAuthPreferences()
            .edit()
            .remove(SPACETIMEDB_TOKEN_KEY)
            .commit();
        if (!cleared) {
            call.reject("Could not clear token", "clear_failed");
            return;
        }

        call.resolve();
    }

    private SharedPreferences getAuthPreferences() {
        return getContext().getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE);
    }
}
