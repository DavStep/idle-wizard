// @vitest-environment jsdom

import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { TextEntryService } from '../../textEntry/TextEntryService.js';
import { PixiInputRouter } from '../input/PixiInputRouter.js';
import { PixiTextField } from './PixiTextField.js';

installPixiPageTestCanvas();

describe('PixiTextField', () => {
  it('uses the shared clean inset nine-slice by default with a contained focus ring', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const field = new PixiTextField({
      assetManager: { getTexture },
      width: 195,
      height: 27,
    });

    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.textFieldCleanInset,
    );
    expect(field.insetFrame.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.textFieldCleanInset.sourceInsets,
    );
    expect(field.insetFrame.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.textFieldCleanInset.borderInsets,
    );
    expect(field.insetFrame.frameWidth).toBe(195);
    expect(field.insetFrame.frameHeight).toBe(27);
    expect(field.insetFrame.visible).toBe(true);

    field.focused = true;
    field.redrawTextState();

    const focusBounds = field.focusGraphic.getLocalBounds();
    const focusStroke = field.focusGraphic.context.instructions.at(-1);
    expect(focusBounds.x).toBeGreaterThanOrEqual(0);
    expect(focusBounds.y).toBeGreaterThanOrEqual(0);
    expect(focusBounds.width).toBeLessThanOrEqual(field.fieldWidth);
    expect(focusBounds.height).toBeLessThanOrEqual(field.fieldHeight);
    expect(focusStroke?.data?.style?.width).toBe(1);

    field.destroy({ children: true });
  });

  it('closes and deselects its text-entry session when routed focus leaves', async () => {
    let registration = null;
    const close = vi.fn(async () => {});
    const field = new PixiTextField({
      inputRouter: {
        registerPressTarget: vi.fn((displayObject, descriptor) => {
          registration = descriptor;
          return vi.fn();
        }),
      },
      textEntryService: {
        open: vi.fn(async () => ({
          close,
          getSnapshot: () => ({ active: true }),
          subscribe: () => vi.fn(),
        })),
      },
    });

    await registration.onActivate();
    expect(registration.fallbackHitTest).toBe(true);
    registration.onFocusChange(false);

    expect(close).toHaveBeenCalledTimes(1);
    expect(field.focused).toBe(false);

    field.destroy({ children: true });
  });

  it('does not restore a late text-entry session after focus already left', async () => {
    let registration = null;
    let resolveSession = null;
    const close = vi.fn(async () => {});
    const field = new PixiTextField({
      inputRouter: {
        registerPressTarget: vi.fn((displayObject, descriptor) => {
          registration = descriptor;
          return vi.fn();
        }),
      },
      textEntryService: {
        open: vi.fn(
          () =>
            new Promise((resolve) => {
              resolveSession = resolve;
            }),
        ),
      },
    });

    const focusPromise = registration.onActivate();
    registration.onFocusChange(false);
    resolveSession({
      close,
      getSnapshot: () => ({ active: true }),
      subscribe: () => vi.fn(),
    });
    await focusPromise;

    expect(close).toHaveBeenCalledTimes(1);
    expect(field.focused).toBe(false);
    expect(field.session).toBeNull();

    field.destroy({ children: true });
  });

  it('passes retained-submit behavior to the text-entry session', async () => {
    const open = vi.fn(async () => ({
      close: vi.fn(),
      getSnapshot: () => ({ active: true }),
      subscribe: () => vi.fn(),
    }));
    const field = new PixiTextField({
      retainOnSubmit: true,
      textEntryService: { open },
    });

    await field.focus();

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ retainOnSubmit: true }),
    );
    field.destroy({ children: true });
  });

  it('moves the active native selection to the tapped character boundary', async () => {
    let registration = null;
    const setSelection = vi.fn(async () => {});
    const field = new PixiTextField({
      inputRouter: {
        registerPressTarget: vi.fn((displayObject, descriptor) => {
          registration = descriptor;
          return vi.fn();
        }),
      },
      textEntryService: {
        open: vi.fn(async (options) => ({
          close: vi.fn(),
          getSnapshot: () => ({
            active: true,
            selectionEnd: options.selectionEnd,
            selectionStart: options.selectionStart,
            value: options.value,
          }),
          setSelection,
          subscribe: () => vi.fn(),
        })),
      },
    });
    field.setValue('abcdef');
    await registration.onActivate();

    const secondCharacterX =
      field.textViewport.x + field.measureCaretPosition(2).x;
    await registration.onActivate({
      point: { x: secondCharacterX, y: field.textViewport.y + 2 },
    });

    expect(field.selectionStart).toBe(2);
    expect(field.selectionEnd).toBe(2);
    expect(setSelection).toHaveBeenCalledWith(2, 2);
    field.destroy({ children: true });
  });

  it('types left to right and inserts at the tapped caret on desktop web', async () => {
    const canvas = document.createElement('canvas');
    const textEntryService = new TextEntryService({
      canvas,
      isNativePlatform: () => false,
      platformProvider: () => 'web',
    });
    const field = new PixiTextField({ textEntryService });

    await field.focus();
    for (const key of 'wizard') {
      dispatchKey(canvas, key);
    }

    expect(field.value).toBe('wizard');
    expect(field.selectionStart).toBe(6);
    expect(field.selectionEnd).toBe(6);

    const thirdCharacterX =
      field.textViewport.x + field.measureCaretPosition(3).x;
    await field.activate({
      point: { x: thirdCharacterX, y: field.textViewport.y + 2 },
    });
    for (const key of 'xyz') {
      dispatchKey(canvas, key);
    }

    expect(field.value).toBe('wizxyzard');
    expect(field.selectionStart).toBe(6);
    expect(field.selectionEnd).toBe(6);

    field.destroy({ children: true });
  });

  it('keeps desktop web words in typed order when spaces pass through the input router', async () => {
    const root = new Container();
    const canvas = document.createElement('canvas');
    const inputRouter = new PixiInputRouter();
    inputRouter.mount({ root, canvas });
    const textEntryService = new TextEntryService({
      canvas,
      isNativePlatform: () => false,
      platformProvider: () => 'web',
    });
    const field = new PixiTextField({ inputRouter, textEntryService });
    root.addChild(field);
    inputRouter.focus(field.registration.id);
    await field.focus();

    const message = 'now I have 650 mana and 1mana/s';
    for (const key of message) {
      dispatchKey(canvas, key);
    }

    expect(field.value).toBe(message);
    expect(field.selectionStart).toBe(message.length);
    expect(field.selectionEnd).toBe(message.length);

    field.destroy({ children: true });
    inputRouter.unmount();
    root.destroy({ children: true });
  });

  it('wraps multiline text and keeps the active caret inside the visible writing area', () => {
    const field = new PixiTextField({
      assetManager: { getTexture: () => Texture.EMPTY },
      width: 120,
      height: 48,
      multiline: true,
    });
    const value =
      'The send button disappears after I type a long report about the workshop.';

    field.applySessionSnapshot({
      active: true,
      selectionEnd: value.length,
      selectionStart: value.length,
      value,
    });

    expect(field.textLabel.textObject.style.wordWrap).toBe(true);
    expect(field.textLabel.textObject.style.breakWords).toBe(true);
    expect(field.textLabel.textObject.style.whiteSpace).toBe('pre-wrap');
    expect(field.textLabel.measuredHeight).toBeGreaterThan(
      field.textMask.getLocalBounds().height,
    );

    const caretBounds = field.caretGraphic.getLocalBounds();
    const visibleHeight = field.textMask.getLocalBounds().height;
    expect(caretBounds.y).toBeGreaterThanOrEqual(0);
    expect(caretBounds.y + caretBounds.height).toBeLessThanOrEqual(visibleHeight);

    field.destroy({ children: true });
  });

  it('scrolls a long single-line value to keep the active caret visible', () => {
    const field = new PixiTextField({
      assetManager: { getTexture: () => Texture.EMPTY },
      width: 120,
      height: 29,
    });
    const value =
      'This long world chat message should keep the newest text visible.';

    field.applySessionSnapshot({
      active: true,
      selectionEnd: value.length,
      selectionStart: value.length,
      value,
    });

    const caretBounds = field.caretGraphic.getLocalBounds();
    expect(caretBounds.x).toBeGreaterThanOrEqual(0);
    expect(caretBounds.x + caretBounds.width).toBeLessThanOrEqual(
      field.textAreaWidth,
    );
    expect(field.textLabel.x).toBeLessThan(0);

    field.applySessionSnapshot({
      active: true,
      selectionEnd: 0,
      selectionStart: 0,
      value,
    });

    expect(field.textScrollX).toBe(0);
    expect(field.caretGraphic.getLocalBounds().x).toBe(0);

    field.destroy({ children: true });
  });

  it('opens a populated field with the caret at the end of its value', async () => {
    const open = vi.fn(async (options) => ({
      close: vi.fn(),
      getSnapshot: () => ({
        active: true,
        selectionEnd: options.selectionEnd,
        selectionStart: options.selectionStart,
        value: options.value,
      }),
      subscribe: () => vi.fn(),
    }));
    const field = new PixiTextField({ textEntryService: { open } });

    field.setValue('StepWizzard');
    await field.focus();

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        selectionEnd: 'StepWizzard'.length,
        selectionStart: 'StepWizzard'.length,
        value: 'StepWizzard',
      }),
    );
    expect(field.caretGraphic.getLocalBounds().x).toBeGreaterThan(0);

    field.destroy({ children: true });
  });

  it('blinks the focused caret and keeps it steady under reduced motion', async () => {
    let now = 0;
    let nextFrameId = 1;
    const frames = new Map();
    const motionRuntime = {
      cancelFrame: (frameId) => frames.delete(frameId),
      now: () => now,
      prefersReducedMotion: () => false,
      requestFrame: (callback) => {
        const frameId = nextFrameId++;
        frames.set(frameId, () => {
          frames.delete(frameId);
          callback();
        });
        return frameId;
      },
    };
    const createTextEntryService = () => ({
      open: async (options) => ({
        close: vi.fn(),
        getSnapshot: () => ({
          active: true,
          selectionEnd: options.selectionEnd,
          selectionStart: options.selectionStart,
          value: options.value,
        }),
        subscribe: () => vi.fn(),
      }),
    });
    const field = new PixiTextField({
      motionRuntime,
      textEntryService: createTextEntryService(),
    });

    field.setValue('Mira');
    await field.focus();
    expect(field.caretGraphic.alpha).toBe(1);
    expect(frames.size).toBe(1);

    now = 600;
    [...frames.values()][0]();
    expect(field.caretGraphic.alpha).toBe(0);

    now = 1_100;
    [...frames.values()].at(-1)();
    expect(field.caretGraphic.alpha).toBe(1);
    field.destroy({ children: true });
    expect(frames.size).toBe(0);

    const reducedFrames = [];
    const reducedField = new PixiTextField({
      motionRuntime: {
        cancelFrame: vi.fn(),
        now: () => 0,
        prefersReducedMotion: () => true,
        requestFrame: (callback) => reducedFrames.push(callback),
      },
      textEntryService: createTextEntryService(),
    });
    reducedField.setValue('Mira');
    await reducedField.focus();

    expect(reducedField.caretGraphic.alpha).toBe(1);
    expect(reducedFrames).toHaveLength(0);
    reducedField.destroy({ children: true });
  });
});

function dispatchKey(canvas, key) {
  canvas.dispatchEvent(
    new window.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    }),
  );
}
