package com.idlewizard.game;

import android.app.Activity;
import android.graphics.Color;
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.BaseInputConnection;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native keyboard boundary for the canvas-only renderer. The EditText is a
 * one-pixel, transparent input surface: Android owns IME composition and
 * selection while Pixi remains the only visible UI.
 */
@CapacitorPlugin(name = "IdleWizardTextEntry")
public class IdleWizardTextEntryPlugin extends Plugin {
    private static final String EVENT_VALUE = "textEntryValueChanged";
    private static final String EVENT_SELECTION = "textEntrySelectionChanged";
    private static final String EVENT_SUBMIT = "textEntrySubmit";
    private static final String EVENT_CANCEL = "textEntryCancel";
    private static final String EVENT_KEYBOARD_INSET = "textEntryKeyboardInset";
    private static final String EVENT_CLOSED = "textEntryClosed";

    private SessionEditText editor;
    private String activeSessionId;
    private boolean submitOnEnter;
    private boolean retainOnSubmit;
    private boolean suppressEditorEvents;
    private int lastKeyboardInset = -1;
    private TextWatcher textWatcher;

    @PluginMethod
    public void start(PluginCall call) {
        String sessionId = normalizeSessionId(call.getString("sessionId"));
        if (sessionId == null) {
            call.reject("Missing text-entry session id.", "missing_session_id");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Text entry requires an active Android activity.", "missing_activity");
            return;
        }

        String value = stringOrEmpty(call.getString("value"));
        String inputKind = stringOrDefault(call.getString("inputKind"), "text");
        boolean multiline = Boolean.TRUE.equals(call.getBoolean("multiline", false));
        boolean shouldSubmitOnEnter = Boolean.TRUE.equals(
            call.getBoolean("submitOnEnter", !multiline)
        );
        boolean shouldRetainOnSubmit = Boolean.TRUE.equals(
            call.getBoolean("retainOnSubmit", false)
        );
        Integer maxLength = call.getInt("maxLength");
        int selectionStart = integerOrDefault(
            call.getInt("selectionStart"),
            value.length()
        );
        int selectionEnd = integerOrDefault(
            call.getInt("selectionEnd"),
            selectionStart
        );

        activity.runOnUiThread(() -> {
            try {
                closeEditor("replaced", true);
                createEditor(
                    activity,
                    sessionId,
                    value,
                    inputKind,
                    multiline,
                    maxLength,
                    selectionStart,
                    selectionEnd,
                    shouldSubmitOnEnter,
                    shouldRetainOnSubmit
                );
                call.resolve();
            } catch (RuntimeException error) {
                closeEditor("start_failed", true);
                call.reject("Failed to start native text entry.", "start_failed", error);
            }
        });
    }

    @PluginMethod
    public void update(PluginCall call) {
        withActiveEditor(call, () -> {
            String value = stringOrEmpty(call.getString("value"));
            int selectionStart = integerOrDefault(
                call.getInt("selectionStart"),
                value.length()
            );
            int selectionEnd = integerOrDefault(
                call.getInt("selectionEnd"),
                selectionStart
            );
            applyEditorState(value, selectionStart, selectionEnd);
        });
    }

    @PluginMethod
    public void setSelection(PluginCall call) {
        withActiveEditor(call, () -> {
            int currentSelectionStart = editor.getSelectionStart();
            int selectionStart = integerOrDefault(
                call.getInt("selectionStart"),
                currentSelectionStart
            );
            int selectionEnd = integerOrDefault(
                call.getInt("selectionEnd"),
                selectionStart
            );
            applySelection(selectionStart, selectionEnd);
        });
    }

    @PluginMethod
    public void submit(PluginCall call) {
        withActiveEditor(call, () -> finishSession(EVENT_SUBMIT, "submit"), true);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        withActiveEditor(call, () -> finishSession(EVENT_CANCEL, "cancel"), true);
    }

    @PluginMethod
    public void close(PluginCall call) {
        withActiveEditor(call, () -> closeEditor("closed", true), true);
    }

    @Override
    protected void handleOnDestroy() {
        Activity activity = getActivity();
        if (activity == null) {
            closeEditor("destroyed", false);
            return;
        }

        activity.runOnUiThread(() -> closeEditor("destroyed", false));
    }

    private void createEditor(
        Activity activity,
        String sessionId,
        String value,
        String inputKind,
        boolean multiline,
        Integer maxLength,
        int selectionStart,
        int selectionEnd,
        boolean shouldSubmitOnEnter,
        boolean shouldRetainOnSubmit
    ) {
        enforceKeyboardOverlayWindow(activity);
        View contentView = activity.findViewById(android.R.id.content);
        if (!(contentView instanceof ViewGroup)) {
            throw new IllegalStateException("Android content root is unavailable.");
        }

        ViewGroup root = (ViewGroup) contentView;
        SessionEditText nextEditor = new SessionEditText(activity);
        FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(1, 1);
        layoutParams.gravity = Gravity.TOP | Gravity.END;

        activeSessionId = sessionId;
        editor = nextEditor;
        submitOnEnter = shouldSubmitOnEnter;
        retainOnSubmit = shouldRetainOnSubmit;
        suppressEditorEvents = true;
        lastKeyboardInset = -1;

        nextEditor.setAlpha(0f);
        nextEditor.setBackgroundColor(Color.TRANSPARENT);
        nextEditor.setTextColor(Color.TRANSPARENT);
        nextEditor.setHintTextColor(Color.TRANSPARENT);
        nextEditor.setCursorVisible(false);
        nextEditor.setPadding(0, 0, 0, 0);
        nextEditor.setImportantForAccessibility(
            View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        );
        nextEditor.setSingleLine(!multiline);
        nextEditor.setMaxLines(multiline ? Integer.MAX_VALUE : 1);
        nextEditor.setInputType(resolveInputType(inputKind, multiline));
        nextEditor.setImeOptions(
            shouldSubmitOnEnter
                ? EditorInfo.IME_ACTION_DONE
                : EditorInfo.IME_ACTION_NONE | EditorInfo.IME_FLAG_NO_ENTER_ACTION
        );

        if (maxLength != null) {
            nextEditor.setFilters(
                new InputFilter[] {
                    new InputFilter.LengthFilter(Math.max(0, maxLength)),
                }
            );
        }

        nextEditor.setOnBackListener(() -> finishSession(EVENT_CANCEL, "cancel"));
        nextEditor.setOnSelectionListener(this::publishSelection);
        nextEditor.setOnEditorActionListener(this::handleEditorAction);
        nextEditor.setText(value);
        setSelectionClamped(nextEditor, selectionStart, selectionEnd);
        installTextWatcher(nextEditor);
        installInsetsListener(nextEditor, sessionId);
        root.addView(nextEditor, layoutParams);

        suppressEditorEvents = false;
        nextEditor.requestFocus();
        ViewCompat.requestApplyInsets(nextEditor);
        nextEditor.post(() -> showKeyboard(nextEditor));
    }

    private void installTextWatcher(SessionEditText targetEditor) {
        textWatcher = new TextWatcher() {
            @Override
            public void beforeTextChanged(
                CharSequence text,
                int start,
                int count,
                int after
            ) {}

            @Override
            public void onTextChanged(
                CharSequence text,
                int start,
                int before,
                int count
            ) {}

            @Override
            public void afterTextChanged(Editable editable) {
                if (
                    suppressEditorEvents ||
                    editor != targetEditor ||
                    activeSessionId == null
                ) {
                    return;
                }

                publishValue();
            }
        };
        targetEditor.addTextChangedListener(textWatcher);
    }

    private void installInsetsListener(
        SessionEditText targetEditor,
        String sessionId
    ) {
        ViewCompat.setOnApplyWindowInsetsListener(targetEditor, (view, insets) -> {
            if (editor != targetEditor || !sessionId.equals(activeSessionId)) {
                return insets;
            }

            Insets imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime());
            float density = view.getResources().getDisplayMetrics().density;
            int keyboardInset = Math.max(
                0,
                Math.round(imeInsets.bottom / Math.max(1f, density))
            );
            publishKeyboardInset(keyboardInset);
            return insets;
        });
    }

    private boolean handleEditorAction(
        TextView view,
        int actionId,
        KeyEvent event
    ) {
        if (!submitOnEnter || activeSessionId == null) {
            return false;
        }

        boolean actionSubmit =
            actionId == EditorInfo.IME_ACTION_DONE ||
            actionId == EditorInfo.IME_ACTION_GO ||
            actionId == EditorInfo.IME_ACTION_SEND ||
            actionId == EditorInfo.IME_ACTION_SEARCH;
        boolean enterKey =
            event != null &&
            event.getKeyCode() == KeyEvent.KEYCODE_ENTER &&
            event.getAction() == KeyEvent.ACTION_DOWN;

        if (!actionSubmit && !enterKey) {
            return false;
        }

        if (retainOnSubmit) {
            publishSessionEvent(EVENT_SUBMIT);
        } else {
            finishSession(EVENT_SUBMIT, "submit");
        }
        return true;
    }

    private void applyEditorState(
        String value,
        int selectionStart,
        int selectionEnd
    ) {
        Editable editable = editor.getText();
        suppressEditorEvents = true;
        editor.beginBatchEdit();
        try {
            // Keep the Editable object owned by the active InputConnection.
            // Replacing it with EditText.setText() can leave Gboard writing to
            // the discarded buffer until the entire chat session is reopened.
            BaseInputConnection.removeComposingSpans(editable);
            editable.replace(0, editable.length(), value);
            setSelectionClamped(editor, selectionStart, selectionEnd);
        } finally {
            editor.endBatchEdit();
            suppressEditorEvents = false;
        }

        Activity activity = getActivity();
        if (activity == null || !editor.hasFocus()) {
            return;
        }

        InputMethodManager inputMethodManager = (InputMethodManager) activity
            .getSystemService(Activity.INPUT_METHOD_SERVICE);
        if (inputMethodManager != null) {
            // Gboard may continue targeting its pre-update connection even
            // when the Editable identity is preserved. Refresh that
            // connection in place so the next key reaches this same session.
            inputMethodManager.restartInput(editor);
        }
    }

    private void applySelection(int selectionStart, int selectionEnd) {
        suppressEditorEvents = true;
        setSelectionClamped(editor, selectionStart, selectionEnd);
        suppressEditorEvents = false;
    }

    private void publishValue() {
        if (editor == null || activeSessionId == null) {
            return;
        }

        JSObject payload = sessionPayload(activeSessionId);
        payload.put("value", editor.getText().toString());
        putSelection(payload, editor);
        notifyListeners(EVENT_VALUE, payload);
    }

    private void publishSelection(int selectionStart, int selectionEnd) {
        if (suppressEditorEvents || editor == null || activeSessionId == null) {
            return;
        }

        JSObject payload = sessionPayload(activeSessionId);
        payload.put("selectionStart", Math.max(0, selectionStart));
        payload.put("selectionEnd", Math.max(0, selectionEnd));
        notifyListeners(EVENT_SELECTION, payload);
    }

    private void publishKeyboardInset(int keyboardInset) {
        if (activeSessionId == null || keyboardInset == lastKeyboardInset) {
            return;
        }

        lastKeyboardInset = keyboardInset;
        JSObject payload = sessionPayload(activeSessionId);
        payload.put("keyboardInset", keyboardInset);
        notifyListeners(EVENT_KEYBOARD_INSET, payload);
    }

    private void finishSession(String eventName, String reason) {
        if (editor == null || activeSessionId == null) {
            return;
        }

        publishSessionEvent(eventName);
        closeEditor(reason, true);
    }

    private void publishSessionEvent(String eventName) {
        if (editor == null || activeSessionId == null) {
            return;
        }

        JSObject payload = sessionPayload(activeSessionId);
        payload.put("value", editor.getText().toString());
        putSelection(payload, editor);
        notifyListeners(eventName, payload);
    }

    private void closeEditor(String reason, boolean notifyClosed) {
        SessionEditText closingEditor = editor;
        String closingSessionId = activeSessionId;

        editor = null;
        activeSessionId = null;
        submitOnEnter = false;
        retainOnSubmit = false;
        suppressEditorEvents = true;

        if (closingEditor != null) {
            if (textWatcher != null) {
                closingEditor.removeTextChangedListener(textWatcher);
            }
            textWatcher = null;
            closingEditor.setOnEditorActionListener(null);
            closingEditor.setOnBackListener(null);
            closingEditor.setOnSelectionListener(null);
            ViewCompat.setOnApplyWindowInsetsListener(closingEditor, null);
            hideKeyboard(closingEditor);
            closingEditor.clearFocus();

            ViewParentRemoval.remove(closingEditor);
        }

        if (closingSessionId != null) {
            JSObject insetPayload = sessionPayload(closingSessionId);
            insetPayload.put("keyboardInset", 0);
            notifyListeners(EVENT_KEYBOARD_INSET, insetPayload);

            if (notifyClosed) {
                JSObject closePayload = sessionPayload(closingSessionId);
                closePayload.put("reason", reason);
                notifyListeners(EVENT_CLOSED, closePayload);
            }
        }

        lastKeyboardInset = -1;
        suppressEditorEvents = false;

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().requestFocus();
        }
    }

    private void showKeyboard(EditText targetEditor) {
        if (editor != targetEditor || activeSessionId == null) {
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            return;
        }

        enforceKeyboardOverlayWindow(activity);
        InputMethodManager inputMethodManager = (InputMethodManager) activity
            .getSystemService(Activity.INPUT_METHOD_SERVICE);
        if (inputMethodManager != null) {
            inputMethodManager.showSoftInput(
                targetEditor,
                InputMethodManager.SHOW_IMPLICIT
            );
        }
    }

    private static void enforceKeyboardOverlayWindow(Activity activity) {
        WindowCompat.setDecorFitsSystemWindows(activity.getWindow(), false);
        int softInputMode = activity.getWindow().getAttributes().softInputMode;
        int overlaySoftInputMode =
            (softInputMode & ~WindowManager.LayoutParams.SOFT_INPUT_MASK_ADJUST) |
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING;
        activity.getWindow().setSoftInputMode(overlaySoftInputMode);
    }

    private void hideKeyboard(EditText targetEditor) {
        InputMethodManager inputMethodManager = (InputMethodManager) getContext()
            .getSystemService(Activity.INPUT_METHOD_SERVICE);
        if (inputMethodManager != null) {
            inputMethodManager.hideSoftInputFromWindow(
                targetEditor.getWindowToken(),
                0
            );
        }
    }

    private void withActiveEditor(PluginCall call, Runnable action) {
        withActiveEditor(call, action, false);
    }

    private void withActiveEditor(
        PluginCall call,
        Runnable action,
        boolean terminal
    ) {
        String sessionId = normalizeSessionId(call.getString("sessionId"));
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Text entry requires an active Android activity.", "missing_activity");
            return;
        }

        activity.runOnUiThread(() -> {
            if (
                editor == null ||
                activeSessionId == null ||
                !activeSessionId.equals(sessionId)
            ) {
                call.reject(
                    "Text-entry session is not active.",
                    "inactive_session"
                );
                return;
            }

            try {
                action.run();
                call.resolve();
            } catch (RuntimeException error) {
                if (terminal) {
                    closeEditor("operation_failed", true);
                }
                call.reject(
                    "Native text-entry operation failed.",
                    "operation_failed",
                    error
                );
            }
        });
    }

    private static int resolveInputType(String inputKind, boolean multiline) {
        int inputType;

        switch (inputKind) {
            case "username":
                inputType =
                    InputType.TYPE_CLASS_TEXT |
                    InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD |
                    InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS;
                break;
            case "email":
                inputType =
                    InputType.TYPE_CLASS_TEXT |
                    InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS;
                break;
            case "search":
                inputType =
                    InputType.TYPE_CLASS_TEXT |
                    InputType.TYPE_TEXT_VARIATION_FILTER;
                break;
            case "url":
                inputType =
                    InputType.TYPE_CLASS_TEXT |
                    InputType.TYPE_TEXT_VARIATION_URI;
                break;
            case "phone":
                inputType = InputType.TYPE_CLASS_PHONE;
                break;
            case "integer":
                inputType =
                    InputType.TYPE_CLASS_NUMBER |
                    InputType.TYPE_NUMBER_FLAG_SIGNED;
                break;
            case "decimal":
                inputType =
                    InputType.TYPE_CLASS_NUMBER |
                    InputType.TYPE_NUMBER_FLAG_SIGNED |
                    InputType.TYPE_NUMBER_FLAG_DECIMAL;
                break;
            case "password":
                inputType =
                    InputType.TYPE_CLASS_TEXT |
                    InputType.TYPE_TEXT_VARIATION_PASSWORD;
                break;
            case "text":
            default:
                inputType =
                    InputType.TYPE_CLASS_TEXT |
                    InputType.TYPE_TEXT_FLAG_CAP_SENTENCES;
                break;
        }

        if (
            multiline &&
            (inputType & InputType.TYPE_MASK_CLASS) == InputType.TYPE_CLASS_TEXT
        ) {
            inputType |=
                InputType.TYPE_TEXT_FLAG_MULTI_LINE |
                InputType.TYPE_TEXT_FLAG_CAP_SENTENCES;
        }

        return inputType;
    }

    private static void setSelectionClamped(
        EditText targetEditor,
        int selectionStart,
        int selectionEnd
    ) {
        int length = targetEditor.getText().length();
        int start = clamp(selectionStart, 0, length);
        int end = clamp(selectionEnd, 0, length);
        targetEditor.setSelection(Math.min(start, end), Math.max(start, end));
    }

    private static void putSelection(JSObject payload, EditText targetEditor) {
        payload.put(
            "selectionStart",
            Math.max(0, targetEditor.getSelectionStart())
        );
        payload.put("selectionEnd", Math.max(0, targetEditor.getSelectionEnd()));
    }

    private static JSObject sessionPayload(String sessionId) {
        JSObject payload = new JSObject();
        payload.put("sessionId", sessionId);
        return payload;
    }

    private static String normalizeSessionId(String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            return null;
        }

        return sessionId.trim();
    }

    private static String stringOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String stringOrDefault(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private static int integerOrDefault(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static class SessionEditText extends EditText {
        private Runnable onBack;
        private SelectionListener onSelection;

        SessionEditText(Activity activity) {
            super(activity);
        }

        void setOnBackListener(Runnable listener) {
            onBack = listener;
        }

        void setOnSelectionListener(SelectionListener listener) {
            onSelection = listener;
        }

        @Override
        protected void onSelectionChanged(int selectionStart, int selectionEnd) {
            super.onSelectionChanged(selectionStart, selectionEnd);
            if (onSelection != null) {
                onSelection.onSelectionChanged(selectionStart, selectionEnd);
            }
        }

        @Override
        public boolean onKeyPreIme(int keyCode, KeyEvent event) {
            if (
                keyCode == KeyEvent.KEYCODE_BACK &&
                onBack != null
            ) {
                if (event.getAction() == KeyEvent.ACTION_UP) {
                    onBack.run();
                }
                return true;
            }

            return super.onKeyPreIme(keyCode, event);
        }
    }

    private interface SelectionListener {
        void onSelectionChanged(int selectionStart, int selectionEnd);
    }

    private static class ViewParentRemoval {
        static void remove(View view) {
            if (view.getParent() instanceof ViewGroup) {
                ((ViewGroup) view.getParent()).removeView(view);
            }
        }
    }
}
