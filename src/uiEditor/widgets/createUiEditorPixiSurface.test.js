// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import {
  UI_EDITOR_PIXI_VIEWPORTS,
  createUiEditorPixiAtomicComponents,
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurfaceShell,
  disposeUiEditorPixiControl,
} from './createUiEditorPixiSurface.js';

const uiEditorCss = readFileSync(`${cwd()}/src/uiEditor/uiEditor.css`, 'utf8');

function createDisplayObject(label, overrides = {}) {
  return {
    children: [],
    label,
    position: { x: 0, y: 0 },
    renderable: true,
    visible: true,
    ...overrides,
  };
}

describe('createUiEditorPixiAtomicComponents', () => {
  it('exposes semantic dialog controls without nine-slice internals', () => {
    const root = createDisplayObject('global.confirmation:dialog');
    const message = createDisplayObject('global.confirmation:message', {
      setText: vi.fn(),
      text: 'Reset this cauldron?',
      textObject: {},
    });
    const cancel = createDisplayObject('global.confirmation:cancel', {
      setEnabled: vi.fn(),
      setText: vi.fn(),
      textLabel: { text: 'Keep brewing' },
    });
    const paper = createDisplayObject('global.confirmation:paperFrame', {
      setSkin: vi.fn(),
      sprites: Array.from({ length: 9 }, (_, index) =>
        createDisplayObject(`paper:slice:${index}`),
      ),
    });
    paper.children.push(...paper.sprites);
    root.children.push(message, cancel, paper);

    const components = createUiEditorPixiAtomicComponents(root);

    expect(components.map(({ label, type }) => [label, type])).toEqual([
      ['Message', 'text'],
      ['Cancel button', 'button'],
      ['Paper frame', 'image'],
    ]);
    expect(components.some(({ id }) => id.includes('slice'))).toBe(false);

    const cancelComponent = components[1];
    expect(cancelComponent.getFields().map(({ id }) => id)).toEqual([
      'x',
      'y',
      'text',
    ]);
    cancelComponent.update('x', 18);
    cancelComponent.update('text', 'Stay here');
    cancelComponent.setVisible(false);

    expect(cancel.position.x).toBe(18);
    expect(cancel.setText).toHaveBeenCalledWith('Stay here');
    expect(cancel.visible).toBe(false);
    expect(cancel.renderable).toBe(false);
  });

  it('keeps semantic compound children and their drill-in target', () => {
    const root = createDisplayObject('chooseHerbRow');
    const icon = createDisplayObject('chooseHerbRow:icon');
    const component = createUiEditorPixiHierarchyComponent({
      children: [
        createUiEditorPixiHierarchyComponent({
          displayObjects: [icon],
          id: 'choose-herb-row:icon',
          label: 'Herb icon',
          primary: icon,
          type: 'image',
        }),
      ],
      displayObjects: [root],
      id: 'choose-herb-row',
      label: 'ChooseHerbRow:InventoryChoiceRow',
      libraryEntryId: 'compound.inventory-choice-row',
      primary: root,
      type: 'widget',
    });

    expect(component.libraryEntryId).toBe(
      'compound.inventory-choice-row',
    );
    expect(component.children.map(({ label }) => label)).toEqual([
      'Herb icon',
    ]);
    expect(component.getSelectionDisplayObjects()).toEqual([root]);
    expect(
      component.children[0].getSelectionDisplayObjects(),
    ).toEqual([icon]);
    component.setVisible(false);
    expect(root.visible).toBe(false);
  });
});

describe('disposeUiEditorPixiControl', () => {
  it('lets the retained control release input registrations before destroying the router', () => {
    const order = [];
    const control = {
      destroy: vi.fn(() => order.push('control')),
    };
    const input = {
      destroy: vi.fn(() => order.push('input')),
    };

    disposeUiEditorPixiControl({
      control,
      input,
      root: { destroyed: false },
    });

    expect(order).toEqual(['control', 'input']);
  });

  it('still destroys the input router when control cleanup fails', () => {
    const input = { destroy: vi.fn() };
    const cleanupError = new Error('control cleanup failed');

    expect(() =>
      disposeUiEditorPixiControl({
        control: { destroy: () => { throw cleanupError; } },
        input,
        root: { destroyed: false },
      }),
    ).toThrow(cleanupError);
    expect(input.destroy).toHaveBeenCalledOnce();
  });
});

describe('createUiEditorPixiSurfaceShell', () => {
  it('wraps authored game previews in the reusable pan and zoom viewport', () => {
    const shell = createUiEditorPixiSurfaceShell({
      component: 'RetainedDialog:garden.cancel',
      viewport: UI_EDITOR_PIXI_VIEWPORTS.GAME_SCREEN,
    });
    const pan = shell.host.querySelector(
      '.ui-editor-game-screen-preview__pan',
    );
    const viewport = shell.host.querySelector(
      '.ui-editor-game-screen-preview__viewport',
    );
    const viewportContent = viewport.querySelector(
      '.ui-editor-pan-zoom-viewport__content',
    );
    const zoomIn = shell.host.querySelector(
      '[aria-label="Dialog preview zoom in"]',
    );
    const zoomStatus = shell.host.querySelector(
      '.ui-editor-pan-zoom-controls__status',
    );
    const center = shell.host.querySelector(
      '[aria-label="Center dialog preview"]',
    );

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 400 },
      clientWidth: { configurable: true, value: 400 },
    });
    Object.defineProperties(viewportContent, {
      offsetHeight: { configurable: true, value: 780 },
      offsetWidth: { configurable: true, value: 390 },
    });

    expect(shell.host.dataset.previewViewport).toBe('game-screen');
    expect(
      shell.host.querySelector('.ui-editor-game-screen-preview__frame canvas'),
    ).toBe(shell.canvas);
    expect(shell.host.querySelector(
      '[data-ui-editor-component="EditorPanZoomViewport"]',
    )).not.toBeNull();
    expect(center).not.toBeNull();
    expect(pan.getAttribute('aria-pressed')).toBe('false');

    pan.click();

    expect(pan.getAttribute('aria-pressed')).toBe('true');
    expect(shell.host.querySelector(
      '.ui-editor-game-screen-preview__viewport',
    ).dataset.panEnabled).toBe('true');

    zoomIn.click();
    viewport.dispatchEvent(new window.KeyboardEvent('keydown', {
      bubbles: true,
      key: 'ArrowLeft',
    }));
    expect(zoomStatus.textContent).toBe('125%');
    expect(viewportContent.style.transform).toContain('+ 16px');

    center.click();

    expect(zoomStatus.textContent).toBe('125%');
    expect(viewportContent.style.transform).toContain('+ 0px');
    expect(viewport.dataset.zoom).toBe('1.25');
    shell.dispose();
  });

  it('overlays authored-screen controls without reserving a separate row', () => {
    const viewportRule = uiEditorCss.match(
      new RegExp(
        String.raw`\.ui-editor-game-screen-preview__viewport`
          + String.raw`\.ui-editor-pan-zoom-viewport\s*`
          + String.raw`\{(?<body>[^}]*)\}`,
      ),
    )?.groups?.body ?? '';
    const toolbarRule = uiEditorCss.match(
      /\.ui-editor-game-screen-preview__toolbar\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body ?? '';

    expect(viewportRule).toMatch(/(?:^|\n)\s*inset:\s*0;/);
    expect(toolbarRule).toContain('position: absolute;');
    expect(toolbarRule).toContain('bottom: 12px;');
  });
});
