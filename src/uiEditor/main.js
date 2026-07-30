import '@fontsource/lilita-one/latin-400.css';
import './uiEditor.css';

import { createIdleWizardButtonEntries } from './catalog/createIdleWizardButtonEntries.js';
import { createHierarchyPreviewFixture } from './fixtures/createHierarchyPreviewFixture.js';
import { createLibrarySelectionEntries } from './fixtures/createLibrarySelectionEntries.js';
import { UiEditorFacade } from './UiEditorFacade.js';

const root = document.querySelector('#ui-editor-root');

if (!root) {
  throw new Error('The UI editor root is missing.');
}

const previewId = new URLSearchParams(window.location.search).get('preview');
const editor = new UiEditorFacade({
  libraryEntries: [
    ...createIdleWizardButtonEntries(),
    ...(previewId === 'library-selection'
      ? createLibrarySelectionEntries()
      : []),
  ],
  root,
});
editor.mount();

if (previewId === 'hierarchy') {
  editor.openPreview(createHierarchyPreviewFixture());
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => editor.unmount());
}
