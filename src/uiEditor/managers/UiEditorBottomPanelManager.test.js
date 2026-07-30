// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  UI_EDITOR_LIBRARY_FOLDERS,
  UiEditorBottomPanelManager,
} from './UiEditorBottomPanelManager.js';
import { UiEditorViewManager } from './UiEditorViewManager.js';

describe('UiEditorBottomPanelManager', () => {
  let manager;
  let refs;

  beforeEach(() => {
    document.body.innerHTML = '<main id="root"></main>';
    const editorRefs = new UiEditorViewManager({
      root: document.querySelector('#root'),
    }).mount();

    manager = new UiEditorBottomPanelManager({
      panel: editorRefs.panels.bottom,
    });
    refs = manager.mount();
  });

  it('starts at a library root with folders instead of tabs', () => {
    expect(
      document.querySelector('[role="tablist"]'),
    ).toBeNull();
    expect(refs.breadcrumb.textContent).toBe('Library');
    expect(
      [...refs.folderButtons.keys()],
    ).toEqual(['assets', 'widgets', 'dialogs', 'scenes']);
    expect(
      [...refs.folderButtons.values()].every(
        (button) => button.tagName === 'BUTTON',
      ),
    ).toBe(true);
  });

  it('opens UI Widgets as four nested category folders', () => {
    refs.folderButtons.get('widgets').click();

    expect(refs.breadcrumb.textContent).toBe('Library/UI Widgets');
    expect([...refs.folderButtons.keys()]).toEqual([
      'buttons',
      'progress-bars',
      'sliders',
      'composite-widgets',
    ]);
    expect(
      UI_EDITOR_LIBRARY_FOLDERS.find(
        (folder) => folder.id === 'widgets',
      ).children,
    ).toEqual([...refs.folderButtons.keys()]);
  });

  it('opens an empty leaf folder and navigates back through breadcrumbs', () => {
    refs.folderButtons.get('widgets').click();
    refs.folderButtons.get('buttons').click();

    expect(refs.breadcrumb.textContent).toBe('Library/UI Widgets/Buttons');
    expect(
      refs.viewport.querySelector('[data-editor-library-section-content]')
        .dataset.empty,
    ).toBe('true');

    refs.breadcrumb
      .querySelector('[data-editor-library-breadcrumb="library"]')
      .click();
    expect(refs.breadcrumb.textContent).toBe('Library');
    expect([...refs.folderButtons.keys()]).toEqual([
      'assets',
      'widgets',
      'dialogs',
      'scenes',
    ]);
  });

  it('selects registered entries without rebuilding their buttons', () => {
    const selectedEntries = [];
    manager.onSelectEntry = (entry) => {
      selectedEntries.push(entry.id);
      return true;
    };
    manager.setEntries([
      {
        id: 'primary-button',
        kind: 'widget',
        label: 'Primary Button',
        sectionId: 'buttons',
      },
      {
        id: 'settings-dialog',
        kind: 'dialog',
        label: 'Settings Dialog',
        sectionId: 'dialogs',
      },
    ]);

    const widgetButton = refs.entryButtons.get('primary-button');
    const dialogButton = refs.entryButtons.get('settings-dialog');
    manager.openFolder('buttons');
    widgetButton.click();

    expect(selectedEntries).toEqual(['primary-button']);
    expect(widgetButton.getAttribute('aria-pressed')).toBe('true');

    manager.openFolder('dialogs');
    dialogButton.click();

    expect(selectedEntries).toEqual(['primary-button', 'settings-dialog']);
    expect(widgetButton.getAttribute('aria-pressed')).toBe('false');
    expect(dialogButton.getAttribute('aria-pressed')).toBe('true');
    expect(refs.entryButtons.get('primary-button')).toBe(widgetButton);
  });

  it('captures and restores the open folder and selected entry', () => {
    const selectedEntries = [];
    manager.onSelectEntry = (entry) => {
      selectedEntries.push(entry.id);
      return true;
    };
    manager.setEntries([
      {
        id: 'primary-button',
        kind: 'widget',
        label: 'Primary Button',
        sectionId: 'buttons',
      },
    ]);

    expect(
      manager.restoreWorkspaceState({
        currentFolderId: 'buttons',
        selectedEntryId: 'primary-button',
      }),
    ).toBe(true);
    expect(manager.getWorkspaceState()).toEqual({
      currentFolderId: 'buttons',
      selectedEntryId: 'primary-button',
    });
    expect(selectedEntries).toEqual(['primary-button']);
  });

  it('shows optional retained previews in a compact entry gallery', () => {
    const connect = vi.fn();
    const disconnect = vi.fn();

    manager.setEntries([
      {
        createThumbnail: () => {
          const thumbnail = document.createElement('span');
          thumbnail.dataset.editorLibraryThumbnail = 'primary-button';
          thumbnail.uiEditorThumbnailConnect = connect;
          thumbnail.uiEditorThumbnailDisconnect = disconnect;
          return thumbnail;
        },
        id: 'primary-button',
        kind: 'widget',
        label: 'Primary Button',
        sectionId: 'buttons',
      },
    ]);
    manager.openFolder('buttons');

    const list = refs.viewport.querySelector(
      '[data-editor-library-section-content]',
    );
    const entry = refs.entryButtons.get('primary-button');

    expect(list.dataset.layout).toBe('gallery');
    expect(entry.dataset.hasThumbnail).toBe('true');
    expect(
      entry.querySelector('[data-editor-library-thumbnail]'),
    ).not.toBeNull();
    expect(
      entry.querySelector('.ui-editor-library-entry__label').textContent,
    ).toBe('Primary Button');
    expect(connect).toHaveBeenCalledOnce();

    const disconnectCount = disconnect.mock.calls.length;
    manager.openFolder('dialogs');
    expect(disconnect).toHaveBeenCalledTimes(disconnectCount + 1);
  });

  it('focuses the first item after opening a folder', () => {
    refs.folderButtons.get('widgets').click();

    expect(document.activeElement).toBe(refs.folderButtons.get('buttons'));
  });
});
