export function createHierarchyPreviewFixture() {
  const dialog = createComponent('section', 'SettingsDialog', {
    className: 'ui-editor-preview-fixture',
  });
  const frame = createComponent('div', 'DialogFrame');
  const title = createComponent('header', 'TitlePlaque', {
    text: 'Settings',
  });
  const content = createComponent('div', 'ContentPanel');
  const preferences = createComponent('section', 'DevicePreferencesPanel');
  const soundRow = createComponent('div', 'SoundPreferenceRow', {
    text: 'Sound',
  });
  const musicRow = createComponent('div', 'MusicPreferenceRow', {
    text: 'Music',
  });
  const actions = createComponent('footer', 'ActionBar');
  const saveButton = createComponent('button', 'SaveButton', {
    text: 'Save changes',
  });
  const closeButton = createComponent('button', 'CloseButton', {
    text: 'Close',
  });

  saveButton.type = 'button';
  closeButton.type = 'button';
  actions.append(saveButton, closeButton);
  preferences.append(soundRow, musicRow);
  content.append(preferences, actions);
  frame.append(title, content);
  dialog.append(frame);
  return dialog;
}

function createComponent(tagName, label, { className = '', text = '' } = {}) {
  const element = document.createElement(tagName);
  element.dataset.uiEditorComponent = label;
  element.className = className;
  element.textContent = text;
  return element;
}
