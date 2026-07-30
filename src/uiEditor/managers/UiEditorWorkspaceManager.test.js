// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  UI_EDITOR_WORKSPACE_STORAGE_KEY,
  UiEditorWorkspaceManager,
} from './UiEditorWorkspaceManager.js';

describe('UiEditorWorkspaceManager', () => {
  let createWorkspaceState;
  let manager;
  let restoreWorkspaceState;
  let storage;
  let toolbar;

  beforeEach(() => {
    document.body.innerHTML = '<header id="toolbar"></header>';
    toolbar = document.querySelector('#toolbar');
    storage = createMemoryStorage();
    createWorkspaceState = vi.fn(() => ({
      layout: { bottom: 220, left: 260, right: 300 },
    }));
    restoreWorkspaceState = vi.fn(() => true);
    manager = new UiEditorWorkspaceManager({
      createWorkspaceState,
      restoreWorkspaceState,
      storage,
      toolbar,
    });
  });

  it('saves the current workspace from the visible control', () => {
    manager.mount();
    toolbar.querySelector('.ui-editor-toolbar__save').click();

    const saved = JSON.parse(
      storage.getItem(UI_EDITOR_WORKSPACE_STORAGE_KEY),
    );

    expect(saved.version).toBe(1);
    expect(saved.workspace).toEqual({
      layout: { bottom: 220, left: 260, right: 300 },
    });
    expect(
      toolbar.querySelector('.ui-editor-toolbar__status').textContent,
    ).toBe('Workspace saved');
  });

  it('restores a saved workspace when the editor mounts', () => {
    storage.setItem(
      UI_EDITOR_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        workspace: {
          library: {
            currentFolderId: 'buttons',
            selectedEntryId: 'green-button',
          },
        },
      }),
    );

    manager.mount();

    expect(restoreWorkspaceState).toHaveBeenCalledWith({
      library: {
        currentFolderId: 'buttons',
        selectedEntryId: 'green-button',
      },
    });
    expect(
      toolbar.querySelector('.ui-editor-toolbar__status').textContent,
    ).toBe('Workspace restored');
  });

  it('uses Ctrl or Command plus S without opening the browser save dialog', () => {
    manager.mount();
    const event = new window.KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 's',
      metaKey: true,
    });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(createWorkspaceState).toHaveBeenCalledOnce();
    expect(storage.getItem(UI_EDITOR_WORKSPACE_STORAGE_KEY)).not.toBeNull();
  });
});

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}
