// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UiEditorHierarchyManager } from './UiEditorHierarchyManager.js';
import { UiEditorViewManager } from './UiEditorViewManager.js';

describe('UiEditorHierarchyManager', () => {
  let editorRefs;
  let manager;
  let onOpenComponent;
  let onSelectComponent;

  beforeEach(() => {
    document.body.innerHTML = '<main id="root"></main>';
    editorRefs = new UiEditorViewManager({
      root: document.querySelector('#root'),
    }).mount();
    onSelectComponent = vi.fn();
    onOpenComponent = vi.fn();
    manager = new UiEditorHierarchyManager({
      onOpenComponent,
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

  it('treats an explicit empty semantic hierarchy as a preview leaf', () => {
    const preview = document.createElement('section');
    const editorViewport = document.createElement('div');
    const editorToolbar = document.createElement('div');

    preview.dataset.uiEditorComponent = 'BaseButton';
    preview.uiEditorGetAtomicComponents = () => [];
    editorViewport.dataset.uiEditorComponent = 'EditorPanZoomViewport';
    editorToolbar.dataset.uiEditorComponent = 'EditorViewportToolbar';
    preview.append(editorViewport, editorToolbar);
    editorRefs.preview.append(preview);
    manager.refresh();

    const items = [
      ...editorRefs.panels.left.querySelectorAll(
        '.ui-editor-hierarchy__item[role="treeitem"]',
      ),
    ];

    expect(items).toHaveLength(1);
    expect(
      items[0].querySelector('.ui-editor-hierarchy__label').textContent,
    ).toBe('BaseButton');
  });

  it('collapses branches and filters layers while preserving matching ancestors', () => {
    const dialog = document.createElement('section');
    const content = document.createElement('div');
    const action = document.createElement('button');

    dialog.dataset.uiEditorComponent = 'SettingsDialog';
    content.dataset.uiEditorComponent = 'Content';
    action.dataset.uiEditorComponent = 'Save changes';
    content.append(action);
    dialog.append(content);
    editorRefs.preview.append(dialog);
    manager.refresh();

    const disclosure = editorRefs.panels.left.querySelector(
      '[aria-label="Collapse SettingsDialog"]',
    );
    disclosure.click();

    const rootItem = disclosure.closest('.ui-editor-hierarchy__item');
    expect(rootItem.getAttribute('aria-expanded')).toBe('false');
    expect(
      rootItem.querySelector(':scope > .ui-editor-hierarchy__group').hidden,
    ).toBe(true);

    const search = editorRefs.panels.left.querySelector(
      '.ui-editor-hierarchy__search-input',
    );
    search.value = 'save';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(rootItem.hidden).toBe(false);
    expect(rootItem.getAttribute('aria-expanded')).toBe('true');
    expect(
      editorRefs.panels.left.querySelector(
        '.ui-editor-hierarchy__search-status',
      ).textContent,
    ).toBe('1 layer');

    search.value = '';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(rootItem.getAttribute('aria-expanded')).toBe('false');
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

  it('selects DOM hierarchy rows and marks the matching preview component', () => {
    const dialog = document.createElement('section');
    const soundRow = document.createElement('div');
    const musicRow = document.createElement('div');

    dialog.dataset.uiEditorComponent = 'SettingsDialog';
    soundRow.dataset.uiEditorComponent = 'SoundPreferenceRow';
    musicRow.dataset.uiEditorComponent = 'MusicPreferenceRow';
    dialog.append(soundRow, musicRow);
    editorRefs.preview.append(dialog);
    manager.refresh();

    const soundHierarchyRow = [
      ...editorRefs.panels.left.querySelectorAll(
        '[data-editor-component-select]',
      ),
    ].find(
      (row) =>
        row.querySelector('.ui-editor-hierarchy__label')?.textContent
          === 'SoundPreferenceRow',
    );

    soundHierarchyRow.click();

    expect(soundRow.hasAttribute('data-ui-editor-scene-selected')).toBe(true);
    expect(
      editorRefs.panels.left
        .querySelector('[data-selected="true"]')
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(onSelectComponent).toHaveBeenCalledWith(null, soundRow);

    const musicHierarchyRow = [
      ...editorRefs.panels.left.querySelectorAll(
        '[data-editor-component-select]',
      ),
    ].find(
      (row) =>
        row.querySelector('.ui-editor-hierarchy__label')?.textContent
          === 'MusicPreferenceRow',
    );

    musicHierarchyRow.click();

    expect(soundRow.hasAttribute('data-ui-editor-scene-selected')).toBe(false);
    expect(musicRow.hasAttribute('data-ui-editor-scene-selected')).toBe(true);
  });

  it('opens the owning component inspector when the hierarchy root is selected', () => {
    const preview = document.createElement('section');
    const inspectorComponent = {
      getFields: () => [],
      id: 'sample-widget',
      label: 'SampleWidget',
      update: vi.fn(),
    };
    preview.dataset.uiEditorComponent = 'SampleWidget';
    preview.uiEditorGetInspectorComponent = () => inspectorComponent;
    editorRefs.preview.append(preview);
    manager.refresh();

    editorRefs.panels.left
      .querySelector('[data-editor-component-select]')
      .click();

    expect(onSelectComponent).toHaveBeenLastCalledWith(
      inspectorComponent,
      preview,
    );
    expect(
      editorRefs.panels.left.querySelector('[data-selected="true"]'),
    ).not.toBeNull();
  });

  it('selects the hierarchy root programmatically', () => {
    const preview = document.createElement('section');
    preview.dataset.uiEditorComponent = 'PixiProgressBar';
    editorRefs.preview.append(preview);
    manager.refresh();

    expect(manager.selectRootComponent()).toBe(true);
    expect(
      editorRefs.panels.left
        .querySelector('[aria-level="1"]')
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(onSelectComponent).toHaveBeenLastCalledWith(null, preview);
  });

  it('shows, selects, and hides atomic Pixi components', () => {
    const preview = document.createElement('section');
    preview.uiEditorSelectAtomicComponent = vi.fn();
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

    preview.dataset.uiEditorComponent = 'TextButton';
    preview.uiEditorGetAtomicComponents = () => [
      {
        ...label,
        id: 'sample-button:base-button',
        label: 'BaseButton (inherited)',
        libraryEntryId: 'base-button',
        type: 'widget',
      },
      label,
    ];
    editorRefs.preview.append(preview);
    manager.refresh();

    const rows = [
      ...editorRefs.panels.left.querySelectorAll(
        '[data-editor-component-select^="atomic:"]',
      ),
    ];

    expect(
      rows.map(
        (row) => row.querySelector('.ui-editor-hierarchy__label').textContent,
      ),
    ).toEqual(['BaseButton (inherited)', 'Label']);

    rows[1].click();
    expect(onSelectComponent).toHaveBeenCalledWith(label);
    expect(preview.uiEditorSelectAtomicComponent).toHaveBeenLastCalledWith(
      label,
    );
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

    manager.clearSelection();
    expect(preview.uiEditorSelectAtomicComponent).toHaveBeenLastCalledWith(
      null,
    );
  });

  it('rebinds the canvas outline when a selected Pixi atom is remounted', () => {
    const preview = document.createElement('section');
    const createComponent = (label) => ({
      getFields: () => [],
      id: 'stable-content',
      isVisible: () => true,
      label,
      setVisible() {},
      type: '9-slice',
      update() {},
    });
    let component = createComponent('Original Content');

    preview.dataset.uiEditorComponent = 'SampleDialog';
    preview.uiEditorGetAtomicComponents = () => [component];
    preview.uiEditorSelectAtomicComponent = vi.fn();
    editorRefs.preview.append(preview);
    manager.refresh();

    editorRefs.panels.left
      .querySelector('[data-editor-component-select^="atomic:"]')
      .click();

    component = createComponent('Replacement Content');
    manager.refresh();

    expect(preview.uiEditorSelectAtomicComponent).toHaveBeenLastCalledWith(
      component,
    );
    expect(
      editorRefs.panels.left.querySelector('[data-selected="true"]')
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('keeps embedded Pixi widgets as leaves and opens their library entry on double click', () => {
    const preview = document.createElement('section');
    const component = (overrides) => ({
      getFields: () => [],
      isVisible: () => true,
      setVisible: vi.fn(),
      type: 'widget',
      update: vi.fn(),
      ...overrides,
    });
    const row = component({
      id: 'choose-herb-row',
      label: 'ChooseHerbRow:InventoryChoiceRow',
      libraryEntryId: 'compound.inventory-choice-row',
    });

    preview.dataset.uiEditorComponent = 'ChooseHerbDialog:BaseDialog';
    preview.uiEditorGetAtomicComponents = () => [
      component({
        children: [row],
        id: 'choose-herb-content',
        label: 'Content',
        type: '9-slice',
      }),
    ];
    editorRefs.preview.append(preview);
    manager.refresh();

    const items = [
      ...editorRefs.panels.left.querySelectorAll(
        '.ui-editor-hierarchy__item[role="treeitem"]',
      ),
    ];
    expect(items.map((item) => item.getAttribute('aria-level'))).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(
      items.map((item) =>
        item.querySelector(
          ':scope > .ui-editor-hierarchy__row .ui-editor-hierarchy__label',
        ).textContent,
      ),
    ).toEqual([
      'ChooseHerbDialog:BaseDialog',
      'Content',
      'ChooseHerbRow:InventoryChoiceRow',
    ]);

    const rowElement = items[2].querySelector(
      ':scope > .ui-editor-hierarchy__row',
    );
    rowElement.click();
    const replacementRow = editorRefs.panels.left.querySelector(
      '.ui-editor-hierarchy__item[aria-level="3"] '
        + '> .ui-editor-hierarchy__row',
    );
    replacementRow.dispatchEvent(new window.MouseEvent('click', {
      bubbles: true,
      detail: 2,
    }));

    expect(onOpenComponent).toHaveBeenCalledWith(
      'compound.inventory-choice-row',
    );
  });
});
