// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

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

  it('focuses the first item after opening a folder', () => {
    refs.folderButtons.get('widgets').click();

    expect(document.activeElement).toBe(refs.folderButtons.get('buttons'));
  });
});
