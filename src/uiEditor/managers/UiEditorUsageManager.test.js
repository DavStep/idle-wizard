// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

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

  it('prompts for a widget before anything is selected', () => {
    expect(refs.header.textContent).toBe('Usages');
    expect(refs.emptyState.textContent).toBe(
      'Select a widget to view its usages.',
    );
    expect(refs.summary.hidden).toBe(true);
    expect(refs.list.children).toHaveLength(0);
  });

  it('lists the selected widget usages and source locations', () => {
    expect(
      manager.showEntry({
        kind: 'widget',
        label: 'Green Button',
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
    });

    expect(refs.title.textContent).toBe('Account Tab Button');
    expect(refs.count.textContent).toBe('0 usages');
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
    expect(refs.list.children).toHaveLength(0);
    expect(refs.emptyState.textContent).toBe(
      'Select a widget to view its usages.',
    );
  });
});
