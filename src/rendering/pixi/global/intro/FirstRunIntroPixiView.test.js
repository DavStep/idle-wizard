// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import {
  FIRST_RUN_INTRO_PIXI_ASSETS,
  FIRST_RUN_INTRO_PIXI_GEOMETRY,
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
    expect(view.panel.assetManager.getTexture).toHaveBeenCalledWith(
      FIRST_RUN_INTRO_PIXI_ASSETS.panel,
    );
    expect(view.title.text).toBe('After the War');
    expect(view.title.textObject.style.fill).toBe('#ffffff');
    expect(view.title.position).toMatchObject({
      x: FIRST_RUN_INTRO_PIXI_GEOMETRY.panelPaddingX,
      y: FIRST_RUN_INTRO_PIXI_GEOMETRY.panelTitleY,
    });
    expect(view.copy.textObject.style.fill).toBe('#ffffff');
    expect(view.advanceButton.variant).toBe('yellow');
    expect(view.advanceButton.sizeTier).toBe(30);
    expect(view.advanceButton.buttonHeight).toBe(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.advanceButtonHeight,
    );
    expect(view.advanceButton.rootRunFrame.compatibilityError).toBeNull();
    expect(view.advanceButton.buttonWidth).toBe(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.nextButtonWidth,
    );
    expect(view.advanceButton.x).toBe(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceWidth -
        FIRST_RUN_INTRO_PIXI_GEOMETRY.panelLeft -
        FIRST_RUN_INTRO_PIXI_GEOMETRY.panelRight -
        FIRST_RUN_INTRO_PIXI_GEOMETRY.panelPaddingX -
        FIRST_RUN_INTRO_PIXI_GEOMETRY.nextButtonWidth,
    );
    expect(view.advanceButton.rootRunFrame.visible).toBe(true);
    expect(view.copy.text).toBe(
      "One last battle at the demon lord's keep.",
    );
    expect(view.advanceButton.textLabel.text).toBe('Next');
    expect(view.backdrops.castle.visible).toBe(true);

    presenter.advance();
    expect(view.copy.text).toBe(
      'The demon lord has been defeated.',
    );
    expect(view.defeated.visible).toBe(true);

    presenter.advance();
    presenter.advance();
    expect(view.copy.text).toContain('old workshop');
    expect(view.sale.visible).toBe(true);
    expect(view.advanceButton.buttonWidth).toBe(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.longActionButtonWidth,
    );
    expect(view.advanceButton.textLabel.text).toBe(
      'Enter workshop',
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
      'The demon lord has been defeated.',
    );
    expect(ticker.handlers.size).toBe(1);

    view.deactivate();
    expect(ticker.handlers.size).toBe(0);
  });

  it('keeps the story panel opaque and completes the demon drop promptly', () => {
    const ticker = createTicker();
    const view = new FirstRunIntroPixiView({
      assets: createAssets(),
      application: { ticker },
    });
    const presenter = new FirstRunIntroPixiPresenter({ view });

    view.activate();
    presenter.show();

    expect(view.panel.alpha).toBe(1);
    expect(view.copy.alpha).toBe(1);

    presenter.advance();
    ticker.tick(90);

    expect(view.panel.alpha).toBe(1);
    expect(view.copy.alpha).toBe(1);

    ticker.tick(90);
    expect(view.copy.text).toBe(
      'The demon lord has been defeated.',
    );
    expect(view.panel.alpha).toBe(1);
    expect(view.copy.alpha).toBe(1);
    expect(view.transitionShade.alpha).toBe(0);

    ticker.tick(160);

    expect(view.defeated.position.y).toBeGreaterThan(300);
    expect(view.defeated.scale.x).toBeGreaterThan(
      view.defeated.scale.y,
    );

    ticker.tick(140);

    expect(view.defeated.position.y).toBe(
      370,
    );
    expect(view.panel.alpha).toBe(1);
    expect(view.copy.alpha).toBe(1);
  });
});

function createAssets() {
  return {
    loaded: true,
    getTexture: vi.fn(() => Texture.EMPTY),
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
