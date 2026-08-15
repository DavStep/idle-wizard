// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiTextField } from './PixiTextField.js';

installPixiPageTestCanvas();

describe('PixiTextField', () => {
  it('uses the shared brown inset nine-slice by default', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const field = new PixiTextField({
      assetManager: { getTexture },
      width: 195,
      height: 27,
    });

    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.textFieldBrownInset,
    );
    expect(field.insetFrame.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.textFieldBrownInset.sourceInsets,
    );
    expect(field.insetFrame.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.textFieldBrownInset.borderInsets,
    );
    expect(field.insetFrame.frameWidth).toBe(195);
    expect(field.insetFrame.frameHeight).toBe(27);
    expect(field.insetFrame.visible).toBe(true);

    field.destroy({ children: true });
  });

  it('keeps the brown inset focus frame outside the writing area', () => {
    const field = new PixiTextField({
      assetManager: { getTexture: () => Texture.EMPTY },
      width: 195,
      height: 27,
    });

    field.focused = true;
    field.redrawTextState();

    const focusBounds = field.focusGraphic.getLocalBounds();
    const focusStroke = field.focusGraphic.context.instructions.at(-1);
    expect(focusBounds.x).toBeLessThan(0);
    expect(focusBounds.y).toBeLessThan(0);
    expect(focusBounds.width).toBeGreaterThan(field.fieldWidth);
    expect(focusBounds.height).toBeGreaterThan(field.fieldHeight);
    expect(focusStroke?.data?.style?.width).toBe(2);
    expect(field.textViewport.y).toBe(5);

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
});
