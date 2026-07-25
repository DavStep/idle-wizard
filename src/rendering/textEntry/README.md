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
Android IME owns composition. It reports keyboard insets in CSS pixels and
does not change the activity's `adjustNothing` soft-input mode.

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
