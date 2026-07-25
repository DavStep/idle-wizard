// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import {
  FirstRunIntroPixiPresenter,
  FirstRunIntroPixiView,
} from './FirstRunIntroPixiView.js';
import { PixiFrame } from '../../primitives/PixiFrame.js';

installPixiPageTestCanvas();

describe('FirstRunIntroPixiView', () => {
  it('retains one tree while the presenter advances the exact frozen copy', () => {
    const view = new FirstRunIntroPixiView({
      assets: createAssets(),
    });
    const children = [...view.root.children];
    const complete = vi.fn();
    const presenter = new FirstRunIntroPixiPresenter({ view });

    view.activate();
    presenter.show({
      reducedMotion: true,
      onComplete: complete,
    });

    expect(view.panel).toBeInstanceOf(PixiFrame);
    expect(view.panel.shadowEnabled).toBe(false);
    expect(view.title.text).toBe('after the war');
    expect(view.advanceButton.variant).toBe('yellow');
    expect(view.advanceButton.rootRunFrame.visible).toBe(true);
    expect(view.copy.text).toBe(
      "one last battle at the demon lord's keep.",
    );
    expect(view.advanceButton.textLabel.text).toBe('next');
    expect(view.backdrops.castle.visible).toBe(true);

    presenter.advance();
    expect(view.copy.text).toBe(
      'the demon lord has been defeated.',
    );
    expect(view.defeated.visible).toBe(true);

    presenter.advance();
    presenter.advance();
    expect(view.copy.text).toContain('old workshop');
    expect(view.sale.visible).toBe(true);
    expect(view.advanceButton.textLabel.text).toBe(
      'enter workshop',
    );
    presenter.advance();

    expect(complete).toHaveBeenCalledTimes(1);
    expect(view.root.visible).toBe(false);
    expect(view.root.children).toEqual(children);
  });

  it('registers its ticker only for active visual transitions', () => {
    const ticker = createTicker();
    const view = new FirstRunIntroPixiView({
      assets: createAssets(),
      application: { ticker },
    });
    const presenter = new FirstRunIntroPixiPresenter({ view });

    view.activate();
    presenter.show();
    expect(ticker.handlers.size).toBe(1);

    presenter.advance();
    ticker.tick(180);
    expect(view.copy.text).toBe(
      'the demon lord has been defeated.',
    );
    expect(ticker.handlers.size).toBe(1);

    view.deactivate();
    expect(ticker.handlers.size).toBe(0);
  });
});

function createAssets() {
  return {
    loaded: true,
    getTexture: () => Texture.EMPTY,
  };
}

function createTicker() {
  const handlers = new Set();
  return {
    handlers,
    add: (handler) => handlers.add(handler),
    remove: (handler) => handlers.delete(handler),
    tick(deltaMS) {
      for (const handler of [...handlers]) {
        handler({ deltaMS });
      }
    },
  };
}
