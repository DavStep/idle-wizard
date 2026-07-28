// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { createPixiThemeSnapshot } from '../../theme/PixiThemeTokens.js';
import { PixiWorldChatView } from './PixiWorldChatView.js';

installPixiPageTestCanvas();

describe('PixiWorldChatView', () => {
  it('stays in global chrome, keeps the latest two messages, and opens from any room', () => {
    const onActivate = vi.fn(() => true);
    const input = createInputRouter();
    const view = new PixiWorldChatView({
      assets: createAssets(),
      inputRouter: input.router,
    });

    view.applyTheme(createPixiThemeSnapshot({ theme: 'midnight' }));
    view.layout({ sourceWidth: 360, sourceHeight: 723.333333 });
    view.activate();
    view.bind({
      label: 'World Chat',
      visible: true,
      messages: [
        { body: 'first' },
        { body: 'second' },
        { body: 'third' },
      ],
      onActivate,
    });

    expect(view.root.visible).toBe(true);
    expect(view.panel.title.text).toBe('World Chat');
    expect(view.panel.title.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: 2,
      join: 'round',
    });
    expect(view.panel.root.position).toMatchObject({
      x: 180,
      y: expect.closeTo(601.833333, 5),
    });
    expect(view.panel.root.pivot).toMatchObject({ x: 164, y: 20.5 });
    expect(view.preview.text).toBe('second\nthird');
    expect(view.preview.style.whiteSpace).toBe('pre-line');

    expect(input.registration.haptic).toBe('light');
    input.registration.onPressChange(true, { confirmed: false });
    expect(view.panel.root.scale.x).toBe(0.94);
    input.registration.onPressChange(false, { confirmed: false });
    expect(view.panel.root.scale.x).toBe(1);

    input.registration.onActivate();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('uses the shared confirmed release snap on the complete chat panel', () => {
    const frames = [];
    let nowMs = 0;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    globalThis.requestAnimationFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    globalThis.cancelAnimationFrame = vi.fn();

    try {
      const input = createInputRouter();
      const view = new PixiWorldChatView({
        assets: createAssets(),
        inputRouter: input.router,
      });

      view.layout({ sourceWidth: 360, sourceHeight: 723.333333 });
      view.activate();
      view.bind({ visible: true, onActivate: () => true });

      input.registration.onPressChange(true, { confirmed: false });
      expect(view.panel.root.scale.x).toBe(0.94);

      input.registration.onPressChange(false, { confirmed: true });
      expect(frames).toHaveLength(1);

      nowMs = 65;
      frames.shift()();
      expect(view.panel.root.scale.x).toBeGreaterThan(1);
      expect(view.panel.root.scale.x).toBeLessThanOrEqual(1.055);

      nowMs = 180;
      frames.shift()();
      expect(view.panel.root.scale.x).toBe(1);

      view.destroy();
    } finally {
      dateNow.mockRestore();
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it('honors the existing level gate without constructing another widget state', () => {
    const view = new PixiWorldChatView({ assets: createAssets() });
    view.activate();
    view.bind({ visible: false });

    expect(view.root.visible).toBe(false);
    expect(view.root.renderable).toBe(false);

    view.bind({ visible: true, preview: 'mira: hello' });
    expect(view.root.visible).toBe(true);
    expect(view.preview.text).toBe('mira: hello');
  });
});

function createAssets() {
  return {
    has: () => false,
    getTexture: () => Texture.EMPTY,
    getAtlasTexture: () => Texture.EMPTY,
  };
}

function createInputRouter() {
  let registration = null;
  return {
    get registration() {
      return registration;
    },
    router: {
      registerPressTarget: vi.fn((descriptor) => {
        registration = descriptor;
        return { unregister: vi.fn() };
      }),
    },
  };
}
