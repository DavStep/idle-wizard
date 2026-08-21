# Pixi text entry

`TextEntryService` is the platform boundary for visible Pixi text fields. It
owns at most one `TextEntrySession` and exposes value, selection, keyboard
inset, submit, cancel, and close events. Rendering the label, value, caret,
selection, placeholder, or validation message belongs to the calling widget.

Desktop web edits through keyboard events on the existing focusable game
canvas and uses the Clipboard API. Touch-capable mobile web instead mounts one
transparent one-pixel `input` or `textarea` so Safari and Chrome can own the
software keyboard, composition, selection, and input layout. The mobile editor
must focus synchronously inside the validated Pixi release; yielding first
loses Safari's user activation and the keyboard does not open. Visual viewport
changes are reported as keyboard insets so World Chat follows the same retained
layout path as the APK without rescaling the room. Each inserted desktop key
advances the collapsed selection, and tapping a populated single-line field
moves that selection to the nearest visible character boundary before the next
key is inserted. The backend-free `world-chat-prestige.html` recipe wires this
same service for account-safe browser reproduction of typing and caret edits.

Android uses the registered `IdleWizardTextEntry` Capacitor plugin. The plugin
adds one transparent one-pixel native `EditText` for the active session so the
Android IME owns composition. The editor stays at the top overlay edge, outside
the IME overlap, and the plugin reasserts the activity's full-window
`adjustNothing` mode before focus and keyboard display. Capacitor System Bars
inset handling stays disabled because its Android listener otherwise pads the
WebView parent by the IME height, compressing the complete game surface before
Pixi receives the inset. The native plugin reports keyboard insets in CSS pixels
so World Chat alone can translate without resizing or moving the rest of the
game. Native-backed Pixi text fields use geometric fallback hit testing because
Android WebView can retarget a post-submit field tap to the canvas; the router
must still recognize the focused field instead of closing its native session.
Programmatic updates to an active Android editor mutate its existing `Editable`
inside a batch edit, clear composing spans, and restart the field's IME input
connection. Replacing the buffer with `EditText.setText()` can leave Gboard
targeting a discarded connection after World Chat clears a successful message.
Tapping a focused Pixi field resolves the nearest visible character boundary,
forwards that selection to the native session, and reactivates the transparent
editor because the WebView receives the physical tap and can steal Android
focus while the JavaScript session still reports itself as active.

```js
const service = new TextEntryService({ canvas });
const session = await service.open({
  value: 'Elara',
  inputKind: 'username',
  maxLength: 24,
  onValue: (state) => visibleField.bind(state),
  onSubmit: (state) => saveName(state.value),
});

await session.setSelection(0, session.getSnapshot().value.length);
```
