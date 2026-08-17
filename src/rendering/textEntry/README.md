# Pixi text entry

`TextEntryService` is the platform boundary for visible Pixi text fields. It
owns at most one `TextEntrySession` and exposes value, selection, keyboard
inset, submit, cancel, and close events. Rendering the label, value, caret,
selection, placeholder, or validation message belongs to the calling widget.

Desktop web edits through keyboard events on the existing focusable game
canvas and uses the Clipboard API. It does not create an `input`, `textarea`,
or `contenteditable` surface. Consequently, full browser IME composition and
mobile-web soft keyboards are intentionally unsupported.

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
