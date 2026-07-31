// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UiEditorHierarchyManager } from './UiEditorHierarchyManager.js';
import { UiEditorViewManager } from './UiEditorViewManager.js';

describe('UiEditorHierarchyManager', () => {
  let editorRefs;
  let manager;
  let onSelectComponent;

  beforeEach(() => {
    document.body.innerHTML = '<main id="root"></main>';
    editorRefs = new UiEditorViewManager({
      root: document.querySelector('#root'),
    }).mount();
    onSelectComponent = vi.fn();
    manager = new UiEditorHierarchyManager({
      onSelectComponent,
      panel: editorRefs.panels.left,
      scene: editorRefs.preview,
    });
    manager.mount();
  });

  it('shows an instructive empty state until a component is opened', () => {
    expect(
      editorRefs.panels.left.querySelector('.ui-editor-panel__header').textContent,
    ).toBe('Hierarchy');
    expect(
      editorRefs.panels.left.querySelector('.ui-editor-hierarchy__empty').hidden,
    ).toBe(false);
    expect(
      editorRefs.panels.left.querySelector('.ui-editor-hierarchy__tree').hidden,
    ).toBe(true);
  });

  it('preserves the nested component structure from the preview', () => {
    const dialog = document.createElement('section');
    const content = document.createElement('div');
    const action = document.createElement('button');

    dialog.dataset.uiEditorComponent = 'SettingsDialog';
    content.className = 'settings-dialog__content';
    action.textContent = 'Save changes';
    content.append(action);
    dialog.append(content);
    editorRefs.preview.append(dialog);
    manager.refresh();

    const items = [
      ...editorRefs.panels.left.querySelectorAll(
        '.ui-editor-hierarchy__item[role="treeitem"]',
      ),
    ];

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.getAttribute('aria-level'))).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(
      items.map(
        (item) =>
          item.querySelector(':scope > .ui-editor-hierarchy__row '
            + '.ui-editor-hierarchy__label').textContent,
      ),
    ).toEqual([
      'SettingsDialog',
      'settings-dialog__content',
      'Save changes',
    ]);
    expect(items[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('hides and restores only the selected scene component', () => {
    const dialog = document.createElement('section');
    const content = document.createElement('div');

    dialog.dataset.uiEditorComponent = 'SettingsDialog';
    content.dataset.uiEditorComponent = 'ContentPanel';
    dialog.append(content);
    editorRefs.preview.append(dialog);
    manager.refresh();

    const contentToggle = [
      ...editorRefs.panels.left.querySelectorAll(
        '[data-editor-visibility-toggle]',
      ),
    ].find((button) => button.getAttribute('aria-label') === 'Hide ContentPanel');

    contentToggle.click();

    expect(content.hasAttribute('data-ui-editor-scene-hidden')).toBe(true);
    expect(dialog.hasAttribute('data-ui-editor-scene-hidden')).toBe(false);

    const showToggle = [
      ...editorRefs.panels.left.querySelectorAll(
        '[data-editor-visibility-toggle]',
      ),
    ].find((button) => button.getAttribute('aria-label') === 'Show ContentPanel');

    expect(showToggle.getAttribute('aria-pressed')).toBe('false');
    showToggle.click();

    expect(content.hasAttribute('data-ui-editor-scene-hidden')).toBe(false);
    expect(
      editorRefs.panels.left.querySelector(
        '[aria-label="Hide ContentPanel"]',
      ).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('captures and restores hidden components by their scene path', () => {
    const dialog = document.createElement('section');
    const content = document.createElement('div');
    const action = document.createElement('button');

    dialog.append(content);
    content.append(action);
    editorRefs.preview.append(dialog);
    manager.refresh();

    content.setAttribute('data-ui-editor-scene-hidden', '');
    expect(manager.getWorkspaceState()).toEqual({
      hiddenComponentPaths: [[0, 0]],
    });

    content.removeAttribute('data-ui-editor-scene-hidden');
    expect(
      manager.restoreWorkspaceState({
        hiddenComponentPaths: [[0, 0]],
      }),
    ).toBe(true);
    expect(content.hasAttribute('data-ui-editor-scene-hidden')).toBe(true);
  });

  it('shows, selects, and hides atomic Pixi components', () => {
    const preview = document.createElement('section');
    let labelVisible = true;
    const label = {
      getFields: () => [
        { id: 'x', label: 'X', type: 'number', value: 50 },
      ],
      id: 'sample-button:label',
      isVisible: () => labelVisible,
      label: 'Label',
      setVisible: (visible) => {
        labelVisible = visible;
      },
      type: 'text',
      update: vi.fn(),
    };

    preview.dataset.uiEditorComponent = 'IdleWizardButtonWidget';
    preview.uiEditorGetAtomicComponents = () => [
      {
        ...label,
        id: 'sample-button:background',
        label: 'Background',
        type: 'image',
      },
      label,
    ];
    editorRefs.preview.append(preview);
    manager.refresh();

    const rows = [
      ...editorRefs.panels.left.querySelectorAll(
        '[data-editor-component-select]',
      ),
    ];

    expect(
      rows.map(
        (row) => row.querySelector('.ui-editor-hierarchy__label').textContent,
      ),
    ).toEqual(['Background', 'Label']);

    rows[1].click();
    expect(onSelectComponent).toHaveBeenCalledWith(label);
    expect(
      editorRefs.panels.left
        .querySelector('[data-selected="true"]')
        .getAttribute('aria-selected'),
    ).toBe('true');

    editorRefs.panels.left
      .querySelector('[aria-label="Hide Label"]')
      .click();
    expect(labelVisible).toBe(false);
    expect(
      editorRefs.panels.left.querySelector('[aria-label="Show Label"]'),
    ).not.toBeNull();
  });
});
