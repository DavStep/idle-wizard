// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UiEditorUsageManager } from './UiEditorUsageManager.js';
import { UiEditorViewManager } from './UiEditorViewManager.js';

describe('UiEditorUsageManager', () => {
  let manager;
  let refs;

  beforeEach(() => {
    document.body.innerHTML = '<main id="root"></main>';
    const editorRefs = new UiEditorViewManager({
      root: document.querySelector('#root'),
    }).mount();

    manager = new UiEditorUsageManager({
      panel: editorRefs.panels.right,
    });
    refs = manager.mount();
  });

  it('prompts for a widget or asset before anything is selected', () => {
    expect(refs.header.textContent).toBe('Inspector');
    expect(refs.emptyState.textContent).toBe(
      'Select a widget or asset to inspect it.',
    );
    expect(refs.summary.hidden).toBe(true);
    expect(refs.properties.hidden).toBe(true);
    expect(refs.list.children).toHaveLength(0);
  });

  it('lists the selected widget properties, usages, and source locations', () => {
    expect(
      manager.showEntry({
        kind: 'widget',
        label: 'Green Button',
        properties: [
          { label: 'Font', value: 'Lilita One' },
          {
            label: 'Background asset',
            monospace: true,
            value:
              'source:assets/ui/regular-button/green-button-50.9.png',
          },
        ],
        usages: [
          {
            label: 'Garden Harvest All',
            source: 'src/rendering/pixi/pages/garden/GardenPixiPage.js',
          },
          {
            label: 'Inbox reward claim',
            source: 'src/rendering/pixi/global/dialogs/PixiInboxDialog.js',
          },
        ],
      }),
    ).toBe(true);

    expect(refs.title.textContent).toBe('Green Button');
    expect(refs.count.textContent).toBe('2 usages');
    expect(refs.emptyState.hidden).toBe(true);
    expect(
      [...refs.properties.querySelectorAll('dt')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['Font', 'Background asset']);
    expect(
      [...refs.properties.querySelectorAll('dd')].map(
        (element) => element.textContent,
      ),
    ).toEqual([
      'Lilita One',
      'source:assets/ui/regular-button/green-button-50.9.png',
    ]);
    expect(
      refs.properties.querySelector(
        '.ui-editor-usages__property-value--monospace',
      ).title,
    ).toBe('source:assets/ui/regular-button/green-button-50.9.png');
    expect(
      [...refs.list.querySelectorAll('.ui-editor-usages__label')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['Garden Harvest All', 'Inbox reward claim']);
    expect(
      refs.list.querySelector('.ui-editor-usages__source').textContent,
    ).toBe('src/rendering/pixi/pages/garden/GardenPixiPage.js');
  });

  it('shows a quiet empty state when a widget has no registered usages', () => {
    manager.showEntry({
      kind: 'widget',
      label: 'Account Tab Button',
      properties: [
        { label: 'Font', value: 'Lilita One' },
        {
          label: 'Background asset',
          monospace: true,
          value:
            'source:assets/ui/root-run-account/tab-inactive.9.png',
        },
      ],
    });

    expect(refs.title.textContent).toBe('Account Tab Button');
    expect(refs.count.textContent).toBe('0 usages');
    expect(refs.properties.hidden).toBe(false);
    expect(refs.properties.querySelectorAll('dd')).toHaveLength(2);
    expect(refs.emptyState.hidden).toBe(false);
    expect(refs.emptyState.textContent).toBe(
      'No usages registered for this widget.',
    );
  });

  it('clears widget usages for non-widget selections', () => {
    manager.showEntry({
      kind: 'widget',
      label: 'Green Button',
      usages: ['Garden Harvest All'],
    });

    expect(
      manager.showEntry({
        kind: 'dialog',
        label: 'Settings Dialog',
      }),
    ).toBe(false);
    expect(refs.summary.hidden).toBe(true);
    expect(refs.properties.hidden).toBe(true);
    expect(refs.list.children).toHaveLength(0);
    expect(refs.emptyState.textContent).toBe(
      'Select a widget or asset to inspect it.',
    );
  });

  it('inspects assets and lists the widgets that use them', () => {
    expect(
      manager.showEntry({
        kind: 'asset',
        label: 'green-button-50.9.png',
        properties: [
          { label: 'Type', value: 'Nine-slice image' },
          {
            label: 'Asset ID',
            monospace: true,
            value:
              'source:assets/ui/regular-button/green-button-50.9.png',
          },
        ],
        usages: [
          { label: 'Green Button', source: 'Background' },
          { label: 'Compact Cost Button', source: 'Background' },
        ],
      }),
    ).toBe(true);

    expect(refs.title.textContent).toBe('green-button-50.9.png');
    expect(refs.count.textContent).toBe('2 usages');
    expect(
      [...refs.properties.querySelectorAll('dt')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['Type', 'Asset ID']);
    expect(
      [...refs.list.querySelectorAll('.ui-editor-usages__label')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['Green Button', 'Compact Cost Button']);
  });

  it('edits an atomic component position, text, and asset', () => {
    const update = vi.fn();

    expect(
      manager.showComponent({
        getFields: () => [
          { id: 'x', label: 'X', type: 'number', value: 50 },
          { id: 'y', label: 'Y', type: 'number', value: 18 },
          { id: 'text', label: 'Text', type: 'text', value: 'Continue' },
          {
            id: 'asset',
            label: 'Asset',
            options: [
              { label: 'Green', value: 'green.png' },
              { label: 'Yellow', value: 'yellow.png' },
            ],
            type: 'select',
            value: 'green.png',
          },
        ],
        label: 'Label',
        update,
      }),
    ).toBe(true);

    expect(refs.title.textContent).toBe('Label');
    expect(refs.count.textContent).toBe('Atomic component');
    expect(refs.editor.hidden).toBe(false);
    expect(refs.properties.hidden).toBe(true);

    const xInput = refs.editor.querySelector(
      '[data-editor-component-field="x"]',
    );
    xInput.value = '64';
    xInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    const assetSelect = refs.editor.querySelector(
      '[data-editor-component-field="asset"]',
    );
    assetSelect.value = 'yellow.png';
    assetSelect.dispatchEvent(
      new window.Event('input', { bubbles: true }),
    );

    expect(update).toHaveBeenNthCalledWith(1, 'x', 64);
    expect(update).toHaveBeenNthCalledWith(2, 'asset', 'yellow.png');
  });

  it('keeps incompatible nine-slice assets visible but unavailable', () => {
    manager.showComponent({
      getFields: () => [
        {
          id: 'asset',
          label: 'Asset',
          options: [
            { label: 'Compact tab', value: 'tab.9.png' },
            {
              disabled: true,
              label: 'Regular button (needs 28×30)',
              reason:
                'Requires at least 28×30; Footer tab minimum is 92×28.',
              value: 'regular.9.png',
            },
          ],
          type: 'select',
          value: 'tab.9.png',
        },
      ],
      label: 'Background',
      update: vi.fn(),
    });

    const incompatible = refs.editor.querySelector(
      'option[value="regular.9.png"]',
    );

    expect(incompatible.disabled).toBe(true);
    expect(incompatible.title).toBe(
      'Requires at least 28×30; Footer tab minimum is 92×28.',
    );
  });
});
