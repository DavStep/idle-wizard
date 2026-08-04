// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createHierarchyPreviewFixture } from './fixtures/createHierarchyPreviewFixture.js';
import { createLibrarySelectionEntries } from './fixtures/createLibrarySelectionEntries.js';
import { UiEditorFacade } from './UiEditorFacade.js';
import { UI_EDITOR_WORKSPACE_STORAGE_KEY } from './managers/UiEditorWorkspaceManager.js';

describe('UiEditorFacade', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="root"></main>';
  });

  it('opens a preview component and projects it into the left hierarchy', () => {
    const editor = new UiEditorFacade({
      root: document.querySelector('#root'),
    });

    editor.mount();

    expect(editor.openPreview(createHierarchyPreviewFixture())).toBe(true);
    expect(
      document.querySelectorAll(
        '.ui-editor-hierarchy__item[role="treeitem"]',
      ),
    ).toHaveLength(10);
    expect(
      document.querySelector(
        '[data-ui-editor-component="SettingsDialog"]',
      ),
    ).not.toBeNull();

    editor.clearPreview();
    expect(
      document.querySelector('.ui-editor-hierarchy__empty').hidden,
    ).toBe(false);
  });

  it('opens selected widget, dialog, and scene entries in the center preview', () => {
    const editor = new UiEditorFacade({
      libraryEntries: createLibrarySelectionEntries(),
      root: document.querySelector('#root'),
    });

    editor.mount();

    document
      .querySelector('[data-editor-library-folder="widgets"]')
      .click();
    document
      .querySelector('[data-editor-library-folder="buttons"]')
      .click();
    document
      .querySelector('[data-editor-library-entry="sample-button"]')
      .click();
    expect(
      document.querySelector(
        '.ui-editor-preview > [data-ui-editor-component="ButtonWidget"]',
      ),
    ).not.toBeNull();
    expect(
      document.querySelector('.ui-editor-usages__title').textContent,
    ).toBe('Sample Button');
    expect(
      [...document.querySelectorAll('.ui-editor-usages__label')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['Workshop primary action', 'Garden primary action']);

    document
      .querySelector('[data-editor-library-breadcrumb="library"]')
      .click();
    document
      .querySelector('[data-editor-library-folder="dialogs"]')
      .click();
    document
      .querySelector('[data-editor-library-entry="settings-dialog"]')
      .click();
    expect(
      document.querySelector(
        '.ui-editor-preview > [data-ui-editor-component="SettingsDialog"]',
      ),
    ).not.toBeNull();
    expect(
      document.querySelector('.ui-editor-usages__summary').hidden,
    ).toBe(true);

    document
      .querySelector('[data-editor-library-breadcrumb="library"]')
      .click();
    document
      .querySelector('[data-editor-library-folder="scenes"]')
      .click();
    document
      .querySelector('[data-editor-library-entry="workshop-scene"]')
      .click();
    expect(
      document.querySelector(
        '.ui-editor-preview > [data-ui-editor-component="WorkshopScene"]',
      ),
    ).not.toBeNull();
    expect(
      editor.bottomPanelManager.refs.entryButtons
        .get('workshop-scene')
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      editor.bottomPanelManager.refs.entryButtons
        .get('settings-dialog')
      .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('keeps a compatible preview surface mounted when its widget changes', () => {
    const editor = new UiEditorFacade({
      root: document.querySelector('#root'),
    });
    const firstPreview = document.createElement('section');
    const nextPreview = document.createElement('section');
    let adoptedPreview = null;
    let firstPreviewDisposed = false;
    let nextPreviewDisposed = false;

    firstPreview.uiEditorDispose = () => {
      firstPreviewDisposed = true;
    };
    firstPreview.uiEditorAdoptPreview = (candidate) => {
      adoptedPreview = candidate;
      candidate.uiEditorDispose();
      return true;
    };
    nextPreview.uiEditorDispose = () => {
      nextPreviewDisposed = true;
    };

    editor.mount();
    editor.openPreview(firstPreview);
    editor.openPreview(nextPreview);

    expect(editor.viewManager.refs.preview.firstElementChild).toBe(firstPreview);
    expect(adoptedPreview).toBe(nextPreview);
    expect(nextPreviewDisposed).toBe(true);
    expect(firstPreviewDisposed).toBe(false);

    editor.clearPreview();
    expect(firstPreviewDisposed).toBe(true);
  });

  it('collapses the hierarchy dock for asset workbenches and restores it for components', () => {
    const editor = new UiEditorFacade({
      root: document.querySelector('#root'),
    });
    const assetPreview = document.createElement('section');
    const componentPreview = document.createElement('section');

    assetPreview.dataset.uiEditorHierarchy = 'hidden';
    componentPreview.dataset.uiEditorComponent = 'SampleButton';

    editor.mount();
    editor.openPreview(assetPreview);

    expect(editor.viewManager.refs.panels.left.hidden).toBe(true);
    expect(editor.viewManager.refs.splitters.left.hidden).toBe(true);
    expect(editor.viewManager.refs.shell.dataset.leftPanelHidden).toBe('true');
    expect(
      editor.viewManager.refs.panels.left.querySelector(
        '.ui-editor-hierarchy__tree',
      ).hidden,
    ).toBe(true);

    editor.openPreview(componentPreview);

    expect(editor.viewManager.refs.panels.left.hidden).toBe(false);
    expect(editor.viewManager.refs.splitters.left.hidden).toBe(false);
    expect(
      editor.viewManager.refs.shell.dataset.leftPanelHidden,
    ).toBeUndefined();
    expect(
      editor.viewManager.refs.panels.left.querySelector(
        '.ui-editor-hierarchy__tree',
      ).hidden,
    ).toBe(false);
  });

  it('clears widget usages when refreshed library entries remove selection', () => {
    const editor = new UiEditorFacade({
      libraryEntries: createLibrarySelectionEntries(),
      root: document.querySelector('#root'),
    });

    editor.mount();
    editor.bottomPanelManager.selectEntry('sample-button');
    expect(
      document.querySelector('.ui-editor-usages__summary').hidden,
    ).toBe(false);

    editor.setLibraryEntries([]);
    expect(
      document.querySelector('.ui-editor-usages__summary').hidden,
    ).toBe(true);
  });

  it('loads unused source-asset badges after mounting the catalogue', async () => {
    const inspectAssetUsage = vi.fn(async () => ({
      unusedAssetIds: ['source:assets/ui/unused.png'],
    }));
    const editor = new UiEditorFacade({
      inspectAssetUsage,
      libraryEntries: [
        {
          assetId: 'source:assets/ui/unused.png',
          createThumbnail: () => {
            const thumbnail = document.createElement('span');
            thumbnail.dataset.editorLibraryThumbnail = 'asset:unused';
            thumbnail.uiEditorSetUnused = (unused) => {
              thumbnail.dataset.unused = String(unused);
            };
            return thumbnail;
          },
          folderPath: ['ui'],
          id: 'asset:unused',
          kind: 'asset',
          label: 'unused.png',
          sectionId: 'assets',
        },
      ],
      root: document.querySelector('#root'),
    });

    editor.mount();

    await vi.waitFor(() => {
      expect(
        editor.bottomPanelManager.refs.entryButtons
          .get('asset:unused')
          .dataset.assetUnused,
      ).toBe('');
    });
    expect(inspectAssetUsage).toHaveBeenCalledWith([
      'source:assets/ui/unused.png',
    ]);
  });

  it('restores the saved library selection and hierarchy visibility', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      UI_EDITOR_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        workspace: {
          hierarchy: {
            hiddenComponentPaths: [[0, 1]],
          },
          layout: {
            bottom: 240,
            left: 280,
            right: 320,
          },
          library: {
            currentFolderId: 'buttons',
            selectedEntryId: 'sample-button',
          },
        },
      }),
    );
    const editor = new UiEditorFacade({
      libraryEntries: createLibrarySelectionEntries(),
      root: document.querySelector('#root'),
      storage,
    });

    editor.mount();

    expect(editor.bottomPanelManager.getWorkspaceState()).toEqual({
      currentFolderId: 'buttons',
      selectedEntryId: 'sample-button',
    });
    expect(
      document.querySelector('[data-ui-editor-component="PrimaryButton"]')
        .hasAttribute('data-ui-editor-scene-hidden'),
    ).toBe(true);
    expect(
      document.querySelector('.ui-editor-toolbar__status').textContent,
    ).toBe('Workspace restored');
  });
});

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}
