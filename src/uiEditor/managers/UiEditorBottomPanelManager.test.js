// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

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

  afterEach(() => {
    manager.unmount();
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

  it('sorts production assets into their source-directory folders', () => {
    manager.setEntries([
      {
        assetId: 'source:assets/ui/panel.png',
        folderPath: ['ui'],
        id: 'asset:panel',
        kind: 'asset',
        label: 'panel.png',
        sectionId: 'assets',
      },
      {
        assetId:
          'source:assets/ui/root-run-cost-button/green-button.png',
        folderPath: ['ui', 'root-run-cost-button'],
        id: 'asset:green-button',
        kind: 'asset',
        label: 'green-button.png',
        sectionId: 'assets',
      },
      {
        assetId: 'source:assets/avatars/elara.png',
        folderPath: ['avatars'],
        id: 'asset:elara',
        kind: 'asset',
        label: 'elara.png',
        sectionId: 'assets',
      },
    ]);
    manager.openFolder('assets');

    expect([...refs.folderButtons.values()].map(
      (button) => button.textContent,
    )).toEqual(['Avatars', 'UI']);

    refs.folderButtons.get('asset-folder:ui').click();

    expect(refs.breadcrumb.textContent).toBe('Library/UI Assets/UI');
    expect(
      refs.entryButtons.get('asset:panel').parentElement.hidden,
    ).toBe(false);
    expect([...refs.folderButtons.values()].map(
      (button) => button.textContent,
    )).toEqual(['Root Run Cost Button']);

    refs.folderButtons
      .get('asset-folder:ui/root-run-cost-button')
      .click();

    expect(refs.breadcrumb.textContent).toBe(
      'Library/UI Assets/UI/Root Run Cost Button',
    );
    expect(
      refs.entryButtons.get('asset:green-button').parentElement.hidden,
    ).toBe(false);
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

  it('moves backward and forward through visited folders', () => {
    refs.folderButtons.get('widgets').click();
    refs.folderButtons.get('buttons').click();

    expect(manager.goBack()).toBe(true);
    expect(refs.breadcrumb.textContent).toBe('Library/UI Widgets');
    expect(manager.goBack()).toBe(true);
    expect(refs.breadcrumb.textContent).toBe('Library');
    expect(manager.goBack()).toBe(false);

    expect(manager.goForward()).toBe(true);
    expect(refs.breadcrumb.textContent).toBe('Library/UI Widgets');
    expect(manager.goForward()).toBe(true);
    expect(refs.breadcrumb.textContent).toBe('Library/UI Widgets/Buttons');
    expect(manager.goForward()).toBe(false);
  });

  it('discards forward history after opening a different folder', () => {
    refs.folderButtons.get('widgets').click();
    refs.folderButtons.get('buttons').click();
    manager.goBack();

    refs.folderButtons.get('progress-bars').click();

    expect(refs.breadcrumb.textContent).toBe(
      'Library/UI Widgets/Progress bars',
    );
    expect(manager.goForward()).toBe(false);
    expect(manager.goBack()).toBe(true);
    expect(refs.breadcrumb.textContent).toBe('Library/UI Widgets');
  });

  it('uses standard folder-history shortcuts without browser navigation', () => {
    refs.folderButtons.get('widgets').click();
    refs.folderButtons.get('buttons').click();
    const backEvent = new window.KeyboardEvent('keydown', {
      altKey: true,
      bubbles: true,
      cancelable: true,
      key: 'ArrowLeft',
    });

    window.dispatchEvent(backEvent);

    expect(backEvent.defaultPrevented).toBe(true);
    expect(refs.breadcrumb.textContent).toBe('Library/UI Widgets');
    expect(document.activeElement).toBe(
      refs.folderButtons.get('buttons'),
    );

    const forwardEvent = new window.KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: ']',
      metaKey: true,
    });

    window.dispatchEvent(forwardEvent);

    expect(forwardEvent.defaultPrevented).toBe(true);
    expect(refs.breadcrumb.textContent).toBe(
      'Library/UI Widgets/Buttons',
    );
  });

  it('leaves folder-history shortcuts available to editable controls', () => {
    refs.folderButtons.get('widgets').click();
    const input = document.createElement('input');
    const event = new window.KeyboardEvent('keydown', {
      altKey: true,
      bubbles: true,
      cancelable: true,
      key: 'ArrowLeft',
    });

    document.body.append(input);
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(refs.breadcrumb.textContent).toBe('Library/UI Widgets');
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
    expect(manager.goBack()).toBe(false);
  });

  it('opens the containing folder for a programmatically selected asset', () => {
    manager.setEntries([
      {
        assetId: 'source:assets/rooms/workshop/window.png',
        folderPath: ['rooms', 'workshop'],
        id: 'asset:workshop-window',
        kind: 'asset',
        label: 'window.png',
        sectionId: 'assets',
      },
    ]);

    expect(manager.openEntryFolder('asset:workshop-window')).toBe(true);
    expect(refs.breadcrumb.textContent).toBe(
      'Library/UI Assets/Rooms/Workshop',
    );
    expect(
      refs.entryButtons.get('asset:workshop-window').parentElement.hidden,
    ).toBe(false);
  });

  it('creates nested feature folders for discovered UI Lab integrations', () => {
    manager.setEntries([
      {
        folderPath: ['Brewing'],
        id: 'lab:brewing-hud',
        kind: 'widget',
        label: 'Brewing HUD',
        sectionId: 'composite-widgets',
      },
    ]);

    expect(manager.openEntryFolder('lab:brewing-hud')).toBe(true);
    expect(refs.breadcrumb.textContent).toBe(
      'Library/UI Widgets/Composite widgets/Brewing',
    );
    expect(
      refs.entryButtons.get('lab:brewing-hud').parentElement.hidden,
    ).toBe(false);
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

  it('projects unused source-asset state into its thumbnail and accessible name', () => {
    const setUnused = vi.fn();

    manager.setEntries([
      {
        assetId: 'source:assets/ui/unused-panel.png',
        createThumbnail: () => {
          const thumbnail = document.createElement('span');
          thumbnail.dataset.editorLibraryThumbnail = 'asset:unused-panel';
          thumbnail.uiEditorSetUnused = setUnused;
          return thumbnail;
        },
        folderPath: ['ui'],
        id: 'asset:unused-panel',
        kind: 'asset',
        label: 'unused-panel.png',
        sectionId: 'assets',
      },
    ]);
    manager.setUnusedAssetIds([
      'source:assets/ui/unused-panel.png',
    ]);

    const button = refs.entryButtons.get('asset:unused-panel');

    expect(setUnused).toHaveBeenLastCalledWith(true);
    expect(button.dataset.assetUnused).toBe('');
    expect(button.getAttribute('aria-label')).toBe(
      'unused-panel.png, unused asset',
    );
  });

  it('filters the complete asset catalogue by filename or source path', () => {
    manager.setEntries([
      {
        assetId:
          'source:assets/ui/root-run-cost-button/green-button-short.9.png',
        folderPath: ['ui', 'root-run-cost-button'],
        id: 'asset:green-button-short',
        kind: 'asset',
        label: 'green-button-short.9.png',
        sectionId: 'assets',
      },
      {
        assetId: 'source:assets/avatars/elara.png',
        folderPath: ['avatars'],
        id: 'asset:elara',
        kind: 'asset',
        label: 'elara.png',
        sectionId: 'assets',
      },
    ]);
    manager.openFolder('assets');
    const filter = refs.header.querySelector(
      '[data-editor-library-filter="assets"]',
    );

    expect(refs.viewport.contains(filter)).toBe(false);
    expect(filter.getAttribute('aria-label')).toBe('Filter assets');
    expect(refs.filterStatus.textContent).toBe('2 assets');
    filter.value = 'cost-button';
    filter.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(refs.filterStatus.textContent).toBe('1 of 2 assets');
    expect(
      refs.entryButtons.get('asset:green-button-short').parentElement.hidden,
    ).toBe(false);
    expect(
      refs.entryButtons.get('asset:elara').parentElement.hidden,
    ).toBe(true);
    expect(
      refs.viewport.querySelector('.ui-editor-folder-grid').hidden,
    ).toBe(true);
  });

  it('focuses the first item after opening a folder', () => {
    refs.folderButtons.get('widgets').click();

    expect(document.activeElement).toBe(refs.folderButtons.get('buttons'));
  });
});
