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
      label: 'world chat',
      visible: true,
      messages: [
        { body: 'first' },
        { body: 'second' },
        { body: 'third' },
      ],
      onActivate,
    });

    expect(view.root.visible).toBe(true);
    expect(view.panel.root.position).toMatchObject({
      x: 16,
      y: expect.closeTo(581.333333, 5),
    });
    expect(view.preview.text).toBe('second\nthird');

    input.registration.onActivate();
    expect(onActivate).toHaveBeenCalledTimes(1);
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
