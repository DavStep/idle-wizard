// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  createUiEditorAtlasWorkbench,
} from './UiEditorAtlasWorkbench.js';

const entry = {
  assetUrl: '/atlas.png',
  atlasFrames: [
    {
      height: 100,
      name: 'icon:mana',
      originalHeight: 128,
      originalWidth: 128,
      source: 'assets/game/source/icons/icon-mana.png',
      width: 100,
      x: 100,
      y: 50,
    },
    {
      height: 80,
      name: 'potion:moon',
      originalHeight: 128,
      originalWidth: 128,
      source: 'assets/game/source/items/potions/potion-moon.png',
      width: 60,
      x: 400,
      y: 200,
    },
  ],
  atlasSize: { height: 500, width: 1000 },
  label: 'game atlas',
};

describe('UiEditorAtlasWorkbench', () => {
  it('selects the clicked frame and keeps its exact atlas bounds visible', () => {
    const onSelectFrame = vi.fn();
    const workbench = createUiEditorAtlasWorkbench(entry, {
      onSelectFrame,
    });
    const canvas = workbench.root.querySelector('[data-atlas-canvas]');
    const selected = workbench.root.querySelector(
      '[data-frame-state="selected"]',
    );

    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      bottom: 500,
      height: 500,
      left: 0,
      right: 1000,
      top: 0,
      width: 1000,
      x: 0,
      y: 0,
    });
    canvas.dispatchEvent(new window.MouseEvent('click', {
      bubbles: true,
      clientX: 150,
      clientY: 80,
    }));

    expect(workbench.getSelectedFrame()?.name).toBe('icon:mana');
    expect(onSelectFrame).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'icon:mana' }),
    );
    expect(selected.hidden).toBe(false);
    expect(selected.style.left).toBe('10%');
    expect(selected.style.top).toBe('10%');
    expect(selected.style.width).toBe('10%');
    expect(selected.style.height).toBe('20%');
    expect(
      selected.querySelector('.ui-editor-atlas__frame-label').textContent,
    ).toBe('icon:mana');
  });

  it('searches names and paths, then selects matches from the keyboard', () => {
    const workbench = createUiEditorAtlasWorkbench(entry);
    const search = workbench.root.querySelector('.ui-editor-atlas__search');
    const canvas = workbench.root.querySelector('[data-atlas-canvas]');

    search.value = 'potions';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(
      workbench.root.querySelector('.ui-editor-atlas__search-status')
        .textContent,
    ).toBe('1 match');
    expect(
      workbench.root.querySelectorAll('[data-frame-state="match"]'),
    ).toHaveLength(1);

    search.dispatchEvent(new window.KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Enter',
    }));
    expect(workbench.getSelectedFrame()?.name).toBe('potion:moon');

    canvas.dispatchEvent(new window.KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape',
    }));
    expect(workbench.getSelectedFrame()).toBeNull();
  });

  it('copies the selected frame ID and source path', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    const workbench = createUiEditorAtlasWorkbench(entry, { clipboard });

    expect(workbench.selectFrame('potion:moon')).toBe(true);
    workbench.root.querySelector('[data-atlas-action="copy-id"]').click();
    await vi.waitFor(() => {
      expect(clipboard.writeText).toHaveBeenCalledWith('potion:moon');
    });

    workbench.root.querySelector('[data-atlas-action="copy-path"]').click();
    await vi.waitFor(() => {
      expect(clipboard.writeText).toHaveBeenCalledWith(
        'assets/game/source/items/potions/potion-moon.png',
      );
    });
    expect(
      workbench.root.querySelector('.ui-editor-atlas__live-status')
        .textContent,
    ).toBe('Source path copied.');
  });

  it('supports fit-width and exact-size zoom controls', () => {
    const workbench = createUiEditorAtlasWorkbench(entry);
    const stage = workbench.root.querySelector('[data-atlas-viewport]');
    const canvas = workbench.root.querySelector('[data-atlas-canvas]');
    const image = workbench.root.querySelector('.ui-editor-atlas__image');

    Object.defineProperty(stage, 'clientWidth', {
      configurable: true,
      value: 532,
    });
    image.dispatchEvent(new window.Event('load'));

    expect(canvas.dataset.zoom).toBe('50%');
    expect(canvas.style.width).toBe('500px');
    expect(
      workbench.root.querySelector('[data-atlas-action="fit"]')
        .getAttribute('aria-pressed'),
    ).toBe('true');

    workbench.root.querySelector('[data-atlas-action="actual-size"]').click();
    expect(canvas.dataset.zoom).toBe('100%');
    expect(canvas.style.width).toBe('1000px');
  });
});
