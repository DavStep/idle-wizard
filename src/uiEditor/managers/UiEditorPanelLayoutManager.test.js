// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { UiEditorPanelLayoutManager } from './UiEditorPanelLayoutManager.js';
import { UiEditorViewManager } from './UiEditorViewManager.js';

describe('UiEditorPanelLayoutManager', () => {
  let refs;
  let manager;
  let sizes;

  beforeEach(() => {
    document.body.innerHTML = '<main id="root"></main>';
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    refs = new UiEditorViewManager({
      root: document.querySelector('#root'),
    }).mount();
    sizes = { left: 260, right: 300, bottom: 220 };

    for (const dock of Object.keys(sizes)) {
      refs.panels[dock].getBoundingClientRect = () => ({
        width: dock === 'bottom' ? 710 : sizes[dock],
        height: dock === 'bottom' ? sizes[dock] : 900,
      });
    }

    manager = new UiEditorPanelLayoutManager(refs);
    const originalSetPanelSize = manager.setPanelSize.bind(manager);
    manager.setPanelSize = (dock, requestedSize) => {
      const result = originalSetPanelSize(dock, requestedSize);
      sizes[dock] = result;
      return result;
    };
    manager.mount();
  });

  it('resizes every dock from its keyboard separator', () => {
    refs.splitters.left.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    refs.splitters.right.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    refs.splitters.bottom.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );

    expect(
      refs.shell.style.getPropertyValue('--editor-left-panel-width'),
    ).toBe('268px');
    expect(
      refs.shell.style.getPropertyValue('--editor-right-panel-width'),
    ).toBe('308px');
    expect(
      refs.shell.style.getPropertyValue('--editor-bottom-panel-height'),
    ).toBe('228px');
  });

  it('uses the larger keyboard step while shift is held', () => {
    refs.splitters.left.dispatchEvent(
      new window.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(
      refs.shell.style.getPropertyValue('--editor-left-panel-width'),
    ).toBe('292px');
  });

  it('keeps panels within the preview-safe bounds', () => {
    expect(manager.setPanelSize('left', 0)).toBe(72);
    expect(manager.setPanelSize('right', 5000)).toBe(409);
    expect(manager.setPanelSize('bottom', 5000)).toBe(405);
  });

  it('tracks an active drag through window pointer movement and release', () => {
    refs.splitters.left.setPointerCapture = () => {};
    refs.splitters.left.releasePointerCapture = () => {};

    refs.splitters.left.dispatchEvent(
      new window.MouseEvent('pointerdown', {
        button: 0,
        clientX: 260,
        bubbles: true,
      }),
    );
    window.dispatchEvent(
      new window.MouseEvent('pointermove', {
        clientX: 300,
        bubbles: true,
      }),
    );

    expect(
      refs.shell.style.getPropertyValue('--editor-left-panel-width'),
    ).toBe('300px');

    window.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true }));
    expect(refs.shell.dataset.resizing).toBeUndefined();
  });
});
