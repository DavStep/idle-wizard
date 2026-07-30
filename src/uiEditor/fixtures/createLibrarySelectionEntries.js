import { createHierarchyPreviewFixture } from './createHierarchyPreviewFixture.js';

export function createLibrarySelectionEntries() {
  return [
    {
      id: 'sample-button',
      kind: 'widget',
      label: 'Sample Button',
      sectionId: 'buttons',
      createPreview: createButtonPreview,
    },
    {
      id: 'settings-dialog',
      kind: 'dialog',
      label: 'Settings Dialog',
      sectionId: 'dialogs',
      createPreview: createHierarchyPreviewFixture,
    },
    {
      id: 'workshop-scene',
      kind: 'scene',
      label: 'Workshop Scene',
      sectionId: 'scenes',
      createPreview: createScenePreview,
    },
  ];
}

function createButtonPreview() {
  const preview = createPreviewShell('ButtonWidget', 'Button widget');
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.uiEditorComponent = 'PrimaryButton';
  button.textContent = 'Sample Button';
  preview.append(button);
  return preview;
}

function createScenePreview() {
  const preview = createPreviewShell('WorkshopScene', 'Workshop scene');
  const landmark = document.createElement('section');
  landmark.dataset.uiEditorComponent = 'WorkshopLandmark';
  landmark.textContent = 'Workshop Scene';
  preview.append(landmark);
  return preview;
}

function createPreviewShell(component, title) {
  const preview = document.createElement('section');
  const heading = document.createElement('header');

  preview.className = 'ui-editor-preview-fixture';
  preview.dataset.uiEditorComponent = component;
  heading.dataset.uiEditorComponent = 'PreviewTitle';
  heading.textContent = title;
  preview.append(heading);
  return preview;
}
