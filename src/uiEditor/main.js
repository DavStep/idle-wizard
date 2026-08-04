import '@fontsource/lilita-one/latin-400.css';
import './uiEditor.css';

import { createIdleWizardAssetEntries } from './catalog/createIdleWizardAssetEntries.js';
import { createIdleWizardButtonEntries } from './catalog/createIdleWizardButtonEntries.js';
import { createHierarchyPreviewFixture } from './fixtures/createHierarchyPreviewFixture.js';
import { createLibrarySelectionEntries } from './fixtures/createLibrarySelectionEntries.js';
import { loadUiEditorIntegrations } from './integrations/loadUiEditorIntegrations.js';
import { createUiEditorIntegrationEntries } from './sdk/createUiEditorIntegrationEntries.js';
import { validateUiEditorCompositionCoverage } from './sdk/validateUiEditorCompositionCoverage.js';
import { UiEditorFacade } from './UiEditorFacade.js';
import {
  consumePendingNineSliceSelection,
} from './widgets/UiEditorAssetWorkbench.js';

const root = document.querySelector('#ui-editor-root');

if (!root) {
  throw new Error('The UI editor root is missing.');
}

const previewId = new URLSearchParams(window.location.search).get('preview');
const buttonEntries = createIdleWizardButtonEntries();
const integrationEntries = createUiEditorIntegrationEntries(
  loadUiEditorIntegrations(),
);
validateUiEditorCompositionCoverage([
  ...buttonEntries,
  ...integrationEntries,
]);
const editor = new UiEditorFacade({
  libraryEntries: [
    ...createIdleWizardAssetEntries(buttonEntries),
    ...buttonEntries,
    ...integrationEntries,
    ...(previewId === 'library-selection'
      ? createLibrarySelectionEntries()
      : []),
  ],
  root,
});
editor.mount();

if (!previewId) {
  const pendingNineSlice = consumePendingNineSliceSelection();

  if (pendingNineSlice) {
    editor.bottomPanelManager.openEntryFolder(pendingNineSlice.entryId);
    if (
      editor.bottomPanelManager.selectEntry(pendingNineSlice.entryId)
    ) {
      const status = editor.viewManager.refs.preview.querySelector(
        '.ui-editor-asset-workbench__save-status',
      );

      if (status) {
        status.dataset.tone = 'success';
        status.textContent = `Saved ${pendingNineSlice.metadataPath}`;
      }
    }
  }
}

if (previewId === 'hierarchy') {
  editor.openPreview(createHierarchyPreviewFixture());
}

if (previewId === 'asset-deletion') {
  const deletionEntry = editor.libraryEntries.find(
    ({ assetId }) =>
      assetId
      === 'source:assets/ui/regular-button/green-button-50.9.png',
  );

  if (deletionEntry) {
    editor.bottomPanelManager.openEntryFolder(deletionEntry.id);
    editor.bottomPanelManager.selectEntry(deletionEntry.id);
    globalThis.queueMicrotask(() => {
      editor.viewManager.refs.preview
        .querySelector(
          '.ui-editor-asset-workbench__action[data-danger="true"]',
        )
        ?.click();
    });
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => editor.unmount());
}
