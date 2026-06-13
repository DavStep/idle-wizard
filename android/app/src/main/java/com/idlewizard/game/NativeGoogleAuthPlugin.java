package com.idlewizard.game;

import android.os.CancellationSignal;

import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
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

        credentialManager.getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            executor,
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    resolveSignIn(call, result, nonce);
                }

                @Override
                public void onError(GetCredentialException exception) {
                    rejectOnUiThread(call, exception.getClass().getSimpleName(), exception);
                }
            }
        );
    }

    @PluginMethod
    public void signOut(PluginCall call) {
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
                    rejectOnUiThread(call, exception.getClass().getSimpleName(), exception);
                }
            }
        );
    }

    private void resolveSignIn(PluginCall call, GetCredentialResponse result, String nonce) {
        Credential credential = result.getCredential();
        if (!(credential instanceof CustomCredential)) {
            rejectOnUiThread(call, "Unexpected credential type", null);
            return;
        }

        CustomCredential customCredential = (CustomCredential) credential;
        boolean isGoogleCredential =
            GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(customCredential.getType()) ||
            GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL.equals(customCredential.getType());
        if (!isGoogleCredential) {
            rejectOnUiThread(call, "Unexpected credential type", null);
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
            getActivity().runOnUiThread(() -> call.resolve(ret));
        } catch (RuntimeException exception) {
            rejectOnUiThread(call, "Invalid Google ID token", exception);
        }
    }

    private void rejectOnUiThread(PluginCall call, String message, Exception exception) {
        getActivity().runOnUiThread(() -> call.reject(message, null, exception));
    }

    private String createNonce() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
