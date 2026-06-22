package com.idlewizard.game;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.CancellationSignal;

import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.json.JSONException;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    private static final String AUTH_PREFS = "native_google_auth";
    private static final String PENDING_SIGN_IN_RESULT_KEY = "pending_sign_in_result";
    private static final String STORED_SIGN_IN_RESULT_KEY = "stored_sign_in_result";

    private CredentialManager credentialManager;
    private final Executor executor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        credentialManager = CredentialManager.create(getActivity());
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("Missing Google server client id", "missing_client_id");
            return;
        }

        String nonce = createNonce();
        GetSignInWithGoogleOption googleOption = new GetSignInWithGoogleOption.Builder(serverClientId)
            .setNonce(nonce)
            .build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build();

        requestCredential(call, request, nonce, true);
    }

    @PluginMethod
    public void restoreAuthorized(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("Missing Google server client id", "missing_client_id");
            return;
        }

        String nonce = createNonce();
        GetGoogleIdOption googleOption = new GetGoogleIdOption.Builder()
            .setServerClientId(serverClientId)
            .setFilterByAuthorizedAccounts(true)
            .setAutoSelectEnabled(true)
            .setNonce(nonce)
            .build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build();

        requestCredential(call, request, nonce, false);
    }

    private void requestCredential(
        PluginCall call,
        GetCredentialRequest request,
        String nonce,
        boolean savePendingResult
    ) {
        credentialManager.getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            executor,
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    resolveSignIn(call, result, nonce, savePendingResult);
                }

                @Override
                public void onError(GetCredentialException exception) {
                    if (exception instanceof GetCredentialCancellationException) {
                        resolveCancelled(call);
                        return;
                    }
                    rejectOnUiThread(call, exception.getClass().getSimpleName(), "native_error", exception);
                }
            }
        );
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        clearPendingSignInResult();
        clearStoredSignInResult();
        credentialManager.clearCredentialStateAsync(
            new ClearCredentialStateRequest(),
            new CancellationSignal(),
            executor,
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override
                public void onResult(Void result) {
                    getActivity().runOnUiThread(call::resolve);
                }

                @Override
                public void onError(ClearCredentialException exception) {
                    rejectOnUiThread(call, exception.getClass().getSimpleName(), "native_error", exception);
                }
            }
        );
    }

    @PluginMethod
    public void consumePendingSignInResult(PluginCall call) {
        String pendingJson = getAuthPreferences().getString(PENDING_SIGN_IN_RESULT_KEY, null);
        clearPendingSignInResult();
        resolveStoredJson(call, pendingJson);
    }

    @PluginMethod
    public void getStoredSignInResult(PluginCall call) {
        String storedJson = getAuthPreferences().getString(STORED_SIGN_IN_RESULT_KEY, null);
        resolveStoredJson(call, storedJson);
    }

    @PluginMethod
    public void clearStoredSignInResult(PluginCall call) {
        clearStoredSignInResult();
        call.resolve();
    }

    private void resolveSignIn(
        PluginCall call,
        GetCredentialResponse result,
        String nonce,
        boolean savePendingResult
    ) {
        Credential credential = result.getCredential();
        if (!(credential instanceof CustomCredential)) {
            rejectOnUiThread(call, "Unexpected credential type", "native_error", null);
            return;
        }

        CustomCredential customCredential = (CustomCredential) credential;
        boolean isGoogleCredential =
            GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(customCredential.getType()) ||
            GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL.equals(customCredential.getType());
        if (!isGoogleCredential) {
            rejectOnUiThread(call, "Unexpected credential type", "native_error", null);
            return;
        }

        try {
            GoogleIdTokenCredential googleCredential = GoogleIdTokenCredential.createFrom(
                customCredential.getData()
            );
            JSObject ret = new JSObject();
            ret.put("idToken", googleCredential.getIdToken());
            ret.put("email", googleCredential.getEmail());
            ret.put("displayName", googleCredential.getDisplayName());
            ret.put("familyName", googleCredential.getFamilyName());
            ret.put("givenName", googleCredential.getGivenName());
            ret.put("uniqueId", googleCredential.getUniqueId());
            ret.put("nonce", nonce);
            if (googleCredential.getProfilePictureUri() != null) {
                ret.put("profilePictureUri", googleCredential.getProfilePictureUri().toString());
            }
            saveStoredSignInResult(ret);
            if (savePendingResult) {
                savePendingSignInResult(ret);
            }
            getActivity().runOnUiThread(() -> call.resolve(ret));
        } catch (RuntimeException exception) {
            rejectOnUiThread(call, "Invalid Google ID token", "native_error", exception);
        }
    }

    private void resolveStoredJson(PluginCall call, String storedJson) {
        if (storedJson == null || storedJson.trim().isEmpty()) {
            call.resolve(new JSObject());
            return;
        }

        try {
            call.resolve(new JSObject(storedJson));
        } catch (JSONException exception) {
            call.resolve(new JSObject());
        }
    }

    private void rejectOnUiThread(PluginCall call, String message, String code, Exception exception) {
        getActivity().runOnUiThread(() -> call.reject(message, code, exception));
    }

    private void resolveCancelled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("cancelled", true);
        getActivity().runOnUiThread(() -> call.resolve(ret));
    }

    private void savePendingSignInResult(JSObject result) {
        getAuthPreferences()
            .edit()
            .putString(PENDING_SIGN_IN_RESULT_KEY, result.toString())
            .apply();
    }

    private void saveStoredSignInResult(JSObject result) {
        getAuthPreferences()
            .edit()
            .putString(STORED_SIGN_IN_RESULT_KEY, result.toString())
            .apply();
    }

    private void clearPendingSignInResult() {
        getAuthPreferences()
            .edit()
            .remove(PENDING_SIGN_IN_RESULT_KEY)
            .apply();
    }

    private void clearStoredSignInResult() {
        getAuthPreferences()
            .edit()
            .remove(STORED_SIGN_IN_RESULT_KEY)
            .apply();
    }

    private SharedPreferences getAuthPreferences() {
        return getContext().getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE);
    }

    private String createNonce() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
