// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { UiEditorNodeCatalogManager } from './UiEditorNodeCatalogManager.js';

afterEach(() => {
  document.body.replaceChildren();
});

describe('UiEditorNodeCatalogManager', () => {
  it('builds stable hierarchy selectors and reports component metadata', () => {
    const stage = document.createElement('section');
    const layer = document.createElement('div');
    const button = document.createElement('button');
    const icon = document.createElement('img');

    stage.className = 'game-stage';
    layer.className = 'room-top-panel-layer';
    button.className = 'room-top-panel__avatar-button is-selected';
    button.setAttribute('aria-label', 'open avatar');
    icon.src = '/ui/avatar.webp';
    button.append(icon);
    layer.append(button);
    stage.append(layer);
    document.body.append(stage);

    const manager = new UiEditorNodeCatalogManager({
      stage,
      sourceIndexManager: {
        findForElement: (element) => element === button
          ? { widget: 'TopPanelViewManager', path: 'src/pages/topPanel/TopPanelViewManager.js' }
          : null,
      },
    });
    const descriptor = manager.describe(button);

    expect(descriptor).toMatchObject({
      label: 'open avatar',
      widget: 'TopPanelViewManager',
      source: 'src/pages/topPanel/TopPanelViewManager.js',
      selector:
        ':scope > div.room-top-panel-layer > button.room-top-panel__avatar-button',
    });
    expect(manager.find(descriptor.selector)).toBe(button);
    expect(manager.describe(icon).asset).toContain('/ui/avatar.webp');
    expect(manager.list({ query: 'avatar' }).map((entry) => entry.element)).toContain(button);
  });

  it('prefers explicit editor ids for elements whose list position can change', () => {
    const stage = document.createElement('section');
    const row = document.createElement('button');
    stage.append(row);
    document.body.append(stage);
    row.dataset.uiEditorId = 'shop:first-row';

    const manager = new UiEditorNodeCatalogManager({ stage });

    expect(manager.createSelector(row)).toBe('[data-ui-editor-id="shop:first-row"]');
    expect(manager.find(manager.createSelector(row))).toBe(row);
  });

  it('uses visible control copy before a generic shared class', () => {
    const stage = document.createElement('section');
    const button = document.createElement('button');
    button.className = 'style-button';
    button.textContent = 'next';
    stage.append(button);
    document.body.append(stage);

    const manager = new UiEditorNodeCatalogManager({ stage });

    expect(manager.getLabel(button)).toBe('next');
  });
});
