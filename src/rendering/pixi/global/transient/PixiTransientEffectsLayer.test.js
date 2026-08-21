// @vitest-environment jsdom

import { Container, Graphics, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import {
  createPixiThemeSnapshot,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';
import {
  createRewardFlyoutPresentation,
  createRewardVisualPresentation,
  PixiRewardEventConsumer,
  PixiTransientEffectsLayer,
} from './PixiTransientEffectsLayer.js';
import { PooledPixiNotificationBadges } from './PixiNotificationBadges.js';
import { createRewardFlyoutRuns } from './RewardFlyoutRuns.js';

installPixiPageTestCanvas();

describe('PixiTransientEffectsLayer', () => {
  it('caps active text effects and reuses the warmed high-water pool', () => {
    const ticker = createTicker();
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      application: { ticker },
    });
    layer.activate();

    for (let index = 0; index < 12; index += 1) {
      layer.emitReward({
        id: `reward-${index}`,
        message: `reward ${index}`,
        delayMs: 0,
      });
    }
    expect(layer.getStats().active.text).toBe(10);
    expect(layer.getStats().pools.text.allocated).toBe(10);
    expect(ticker.handlers.size).toBe(1);
    const flyoutEntry = layer.entries.find(
      (entry) => entry.kind === 'text',
    );
    const visibleText = flyoutEntry.widget.slots.find(
      (slot) => slot.text.visible,
    ).text;
    expect(visibleText.textObject.style.fill).toBe('#ffffff');
    expect(visibleText.textObject.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(visibleText.fontSize),
      join: 'round',
    });
    expect(flyoutEntry.widget.background.width).toBeGreaterThan(0);
    expect(flyoutEntry.widget.background.height).toBe(24);

    ticker.tick(1200);
    expect(layer.getStats().active.text).toBe(0);
    expect(ticker.handlers.size).toBe(0);

    layer.emitReward({
      id: 'reused',
      message: 'reused',
      delayMs: 0,
    });
    expect(layer.getStats().pools.text.allocated).toBe(10);
  });

  it('bounds icon-mode item drops and skips visual motion when reduced', () => {
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();
    layer.emitReward({
      message: 'seeds found',
      itemDrops: Array.from({ length: 20 }, (_, index) => ({
        id: `seed-${index}`,
        kind: 'seed',
        frameName: 'seed',
        anchor: { x: 100, y: 200 },
      })),
    });
    expect(layer.getStats().active.item).toBe(12);
    expect(layer.getStats().pools.item.allocated).toBe(12);

    layer.clear();
    layer.emitReward({
      message: 'seeds found again',
      itemDrops: Array.from({ length: 12 }, (_, index) => ({
        id: `reused-seed-${index}`,
        kind: 'seed',
        frameName: 'seed',
        anchor: { x: 100, y: 200 },
      })),
    });
    expect(layer.getStats().pools.item.allocated).toBe(12);

    layer.clear();
    layer.bind({ reducedMotion: true });
    layer.emitReward({
      message: 'seed found',
      itemDrops: [
        {
          kind: 'seed',
          frameName: 'seed',
          anchor: { x: 100, y: 200 },
        },
      ],
    });
    expect(layer.getStats().active.item).toBe(0);
    expect(layer.getStats().active.text).toBe(1);
  });

  it('keeps every x5 hold-to-repeat summon drop alive for its full lifetime', () => {
    const ticker = createTicker();
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      application: { ticker },
      random: () => 1,
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();

    for (let batch = 0; batch < 14; batch += 1) {
      layer.emitReward({
        itemDrops: Array.from({ length: 5 }, (_, index) => ({
          id: `summon-${batch}-seed-${index}`,
          kind: 'seed',
          frameName: 'seed',
          anchor: { x: 100, y: 200 },
        })),
      });

      if (batch < 13) {
        ticker.tick(100);
      }
    }

    expect(layer.getStats().active.item).toBe(70);
    expect(layer.getStats().pools.item.allocated).toBe(70);

    ticker.tick(100);
    expect(layer.getStats().active.item).toBe(65);
  });

  it('rejects missing visual assets without leaking a pool lease', () => {
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();

    expect(() =>
      layer.emitReward({
        itemDrops: [
          {
            kind: 'seed',
            anchor: { x: 1, y: 2 },
          },
        ],
      }),
    ).toThrow(/require texture/);
    expect(layer.getStats().pools.item.active).toBe(0);
    expect(layer.getStats().active.item).toBe(0);
  });

  it('uses the authored summon-circle origin for retained seed drops', () => {
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      semanticRegistry: {
        get: (semanticId) => ({
          semanticId,
          bounds: { x: 80, y: 100, width: 40, height: 100 },
        }),
      },
      random: () => 0.5,
    });
    layer.layout({
      sourceScale: 1,
      authoredOffsetX: 0,
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();

    const presentation = createRewardFlyoutPresentation({
      type: 'seed_summoned',
      seed: { key: 'sageSeed', label: 'sage seed' },
      quantity: 1,
    });
    layer.emitReward(presentation);

    const [entry] = layer.entries;
    expect(entry.kind).toBe('item');
    expect(entry.widget.model.anchorId).toBe('workshop.summonArea');
    expect(entry.widget.model.anchor).toEqual({ x: 100, y: 150 });
    expect(entry.widget.secondary.y).toBeCloseTo(
      entry.widget.primary.height * (0.63 - 0.5),
    );
    expect(entry.widget.secondary.y).toBeGreaterThan(0);

    entry.widget.update(0.24, { delayed: false });
    expect(entry.widget.root.x).toBeCloseTo(
      entry.widget.baseX + entry.widget.tossX * 0.357,
    );
    expect(entry.widget.root.y).toBeCloseTo(
      150 + entry.widget.tossPeak,
    );
    expect(entry.widget.root.rotation).toBeCloseTo(
      entry.widget.tossRotation * 0.4,
    );

    entry.widget.update(0.6, { delayed: false });
    expect(entry.widget.root.x).toBeCloseTo(
      entry.widget.baseX + entry.widget.tossX,
    );
    expect(entry.widget.root.y).toBeCloseTo(172);
    expect(entry.widget.root.scale.x).toBeCloseTo(1.1);
    expect(entry.widget.root.scale.y).toBeCloseTo(0.9);
  });

  it('stretches a planted seed pack in flight, then squashes and fades it on impact', () => {
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      semanticRegistry: createSemanticRegistry({
        'garden.plot.2': {
          bounds: { x: 60, y: 100, width: 88, height: 84 },
        },
      }),
      random: () => 0.5,
    });
    layer.layout({
      sourceScale: 1,
      authoredOffsetX: 0,
      sourceWidth: 390,
      sourceHeight: 844,
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();

    layer.emitReward(
      createRewardFlyoutPresentation({
        type: 'garden_seed_planted',
        eventId: 'plant-2',
        seed: { key: 'mintSeed', label: 'mint seed' },
        quantity: 5,
        tileNumber: 2,
      }),
    );

    const [entry] = layer.entries;
    expect(entry).toMatchObject({
      kind: 'item',
      delayMs: 0,
      durationMs: 500,
    });
    expect(entry.widget.root.position).toMatchObject({ x: 104, y: 80 });
    expect(entry.widget.root.alpha).toBe(1);

    entry.widget.update(0.32, { delayed: false });
    expect(entry.widget.root.x).toBe(104);
    expect(entry.widget.root.y).toBeGreaterThan(82);
    expect(entry.widget.root.y).toBeLessThan(142);
    expect(entry.widget.root.alpha).toBe(1);
    expect(entry.widget.root.scale.x).toBeLessThan(1);
    expect(entry.widget.root.scale.y).toBeGreaterThan(1);

    entry.widget.update(0.4, { delayed: false });
    expect(entry.widget.root.position).toMatchObject({ x: 104, y: 142 });
    expect(entry.widget.root.scale.x).toBeLessThan(0.9);
    expect(entry.widget.root.scale.y).toBeGreaterThan(1.2);
    expect(entry.widget.root.alpha).toBe(1);

    entry.widget.update(0.48, { delayed: false });
    expect(entry.widget.root.position).toMatchObject({ x: 104, y: 142 });
    expect(entry.widget.root.scale.x).toBeGreaterThan(1.15);
    expect(entry.widget.root.scale.y).toBeLessThan(0.75);
    expect(entry.widget.root.alpha).toBe(1);

    entry.widget.update(0.64, { delayed: false });
    expect(entry.widget.root.x).toBe(104);
    expect(entry.widget.root.y).toBeGreaterThan(142);
    expect(entry.widget.root.alpha).toBeGreaterThan(0);
    expect(entry.widget.root.alpha).toBeLessThan(1);

    entry.widget.update(0.72, { delayed: false });
    expect(entry.widget.root.y).toBe(148);
    expect(entry.widget.root.alpha).toBe(0);
  });

  it('honors the platform reduced-motion preference without presenter wiring', () => {
    const matchMedia = globalThis.matchMedia;
    globalThis.matchMedia = vi.fn(() => ({ matches: true }));
    try {
      const layer = new PixiTransientEffectsLayer({
        assets: createAssets(),
      });
      layer.applyTheme(
        createPixiThemeSnapshot({ iconMode: 'icons' }),
      );
      layer.activate();
      layer.emitReward({
        message: 'seed found',
        itemDrops: [
          {
            kind: 'seed',
            frameName: 'seed',
            anchor: { x: 100, y: 200 },
          },
        ],
      });

      expect(layer.getStats().active.item).toBe(0);
      expect(layer.getStats().active.text).toBe(1);
    } finally {
      globalThis.matchMedia = matchMedia;
    }
  });

  it('reuses pooled coin motion and restores the top-coin pulse transform', () => {
    const ticker = createTicker();
    const coinTarget = new Container();
    coinTarget.addChild(
      new Graphics().rect(0, 0, 42, 14).fill('#ffffff'),
    );
    coinTarget.position.set(120, 18);
    coinTarget.scale.set(1.1, 0.9);
    coinTarget.pivot.set(3, 2);
    const original = {
      x: coinTarget.x,
      y: coinTarget.y,
      scaleX: coinTarget.scale.x,
      scaleY: coinTarget.scale.y,
      pivotX: coinTarget.pivot.x,
      pivotY: coinTarget.pivot.y,
    };
    const semanticRegistry = createSemanticRegistry({
      'shop.coinOffer.collect': {
        bounds: { x: 300, y: 400, width: 40, height: 20 },
      },
      'top.coin': {
        bounds: { x: 120, y: 18, width: 42, height: 14 },
        displayObject: coinTarget,
      },
    });
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      application: { ticker },
      semanticRegistry,
      random: () => 0.5,
    });
    layer.layout({
      sourceScale: 1,
      authoredOffsetX: 0,
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();

    const reward = createRewardFlyoutPresentation({
      type: 'coin_collected',
      coin: 20,
      source: 'shop_coin_offer',
    });
    layer.emitReward(reward);
    const pulse = layer.entries.find(
      (entry) => entry.kind === 'coinTarget',
    );
    expect(pulse).toMatchObject({
      delayMs: expect.any(Number),
      durationMs: 340,
    });
    expect(layer.getStats().active).toMatchObject({
      coin: 3,
      amount: 1,
      coinTarget: 1,
    });
    const amount = layer.entries.find(
      (entry) => entry.kind === 'amount',
    );
    expect(amount.widget.label.textObject.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(
        amount.widget.label.fontSize,
      ),
      join: 'round',
    });

    pulse.widget.update(0.3, { delayed: false });
    expect(coinTarget.scale.x).not.toBe(original.scaleX);
    expect(coinTarget.pivot.x).toBe(original.pivotX);
    expect(coinTarget.pivot.y).toBe(original.pivotY);

    layer.deactivate();
    expect(coinTarget.position).toMatchObject({
      x: original.x,
      y: original.y,
    });
    expect(coinTarget.scale).toMatchObject({
      x: original.scaleX,
      y: original.scaleY,
    });
    expect(coinTarget.pivot).toMatchObject({
      x: original.pivotX,
      y: original.pivotY,
    });

    layer.activate();
    layer.emitReward(reward);
    const warmedChildren = layer.visualRoot.children.length;
    ticker.tick(1_000);
    layer.emitReward(reward);
    expect(layer.visualRoot.children).toHaveLength(warmedChildren);
    expect(ticker.handlers.size).toBe(1);
  });

  it('keeps coin feedback static when reduced motion is enabled', () => {
    const coinTarget = new Container();
    coinTarget.position.set(120, 18);
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      semanticRegistry: createSemanticRegistry({
        'shop.coinOffer.collect': {
          bounds: { x: 300, y: 400, width: 40, height: 20 },
        },
        'top.coin': {
          bounds: { x: 120, y: 18, width: 42, height: 14 },
          displayObject: coinTarget,
        },
      }),
      reducedMotion: true,
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();

    layer.emitReward(
      createRewardFlyoutPresentation({
        type: 'coin_collected',
        coin: 20,
        source: 'shop_coin_offer',
      }),
    );

    expect(layer.getStats().active).toMatchObject({
      text: 1,
      coin: 0,
      amount: 0,
      coinTarget: 0,
    });
    expect(coinTarget.position).toMatchObject({ x: 120, y: 18 });
    expect(coinTarget.scale).toMatchObject({ x: 1, y: 1 });
  });

  it('reuses resource travel for the free daily crystal claim', () => {
    const contextCurrencyTarget = new Container();
    contextCurrencyTarget.position.set(180, 18);
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      semanticRegistry: createSemanticRegistry({
        'shop.dailyCrystalOffer.collect': {
          bounds: { x: 300, y: 400, width: 40, height: 20 },
        },
        'top.contextCurrency': {
          bounds: { x: 180, y: 18, width: 42, height: 14 },
          displayObject: contextCurrencyTarget,
        },
      }),
      random: () => 0.5,
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();

    layer.emitReward(
      createRewardFlyoutPresentation({
        type: 'crystal_collected',
        crystal: 1,
        source: 'shop_daily_crystal_offer',
      }),
    );

    expect(layer.getStats().active).toMatchObject({
      coin: 3,
      amount: 1,
      coinTarget: 1,
    });
    const particle = layer.entries.find(
      (entry) => entry.kind === 'coin',
    );
    expect(particle.widget.resource).toBe('crystal');
    const amount = layer.entries.find(
      (entry) => entry.kind === 'amount',
    );
    expect(amount.widget.label.text).toBe('+1');
    expect(amount.widget.label.textObject.style.fill).toBe('#e6a83d');

    const reducedLayer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      reducedMotion: true,
    });
    reducedLayer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    reducedLayer.activate();
    reducedLayer.emitReward(
      createRewardFlyoutPresentation({
        type: 'crystal_collected',
        crystal: 1,
        source: 'shop_daily_crystal_offer',
      }),
    );
    expect(reducedLayer.getStats().active).toMatchObject({
      text: 1,
      coin: 0,
      amount: 0,
      coinTarget: 0,
    });
  });

  it('ports the Root Run seven-icon spend burst and reuses its bounded pool', () => {
    const ticker = createTicker();
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      application: { ticker },
      semanticRegistry: createSemanticRegistry({
        'research.unlockSeed': {
          bounds: { x: 250, y: 300, width: 72, height: 42 },
        },
      }),
      random: () => 0.5,
    });
    layer.layout({
      sourceScale: 1,
      authoredOffsetX: 0,
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
    });
    layer.applyTheme(
      createPixiThemeSnapshot({ iconMode: 'icons' }),
    );
    layer.activate();

    const result = layer.emitReward({
      visualOnly: true,
      spendBursts: [
        {
          anchorId: 'research.unlockSeed',
          resource: 'coin',
        },
      ],
    });

    expect(result).toEqual({
      visualCount: 7,
      textShown: false,
    });
    expect(layer.getStats().active.spend).toBe(7);
    expect(layer.getStats().pools.spend.allocated).toBe(7);
    const first = layer.entries.find(
      (entry) => entry.kind === 'spend',
    );
    expect(first.widget.root.position).toMatchObject({
      x: 286,
      y: 322,
    });
    expect(first.widget.sprite.width).toBeCloseTo(34.72);
    expect(first.durationMs).toBeCloseTo(
      (0.78 / 1.3) * 1_000,
    );

    first.widget.update(0.5, {
      delayed: false,
      elapsedMs: first.durationMs / 2,
    });
    expect(first.widget.root.position.y).toBeLessThan(322);
    expect(first.widget.root.scale.y).toBeCloseTo(1.16);
    expect(first.widget.root.alpha).toBe(1);

    ticker.tick(1_000);
    expect(layer.getStats().active.spend).toBe(0);
    layer.emitReward({
      visualOnly: true,
      spendBursts: [
        {
          anchor: { x: 120, y: 220 },
          resource: 'mana',
        },
      ],
    });
    expect(layer.getStats().pools.spend.allocated).toBe(7);

    layer.clear();
    layer.bind({ reducedMotion: true });
    layer.emitReward({
      visualOnly: true,
      spendBursts: [
        {
          anchor: { x: 120, y: 220 },
          resource: 'mana',
        },
      ],
    });
    expect(layer.getStats().active.spend).toBe(0);
  });

  it('keeps semantic spend anchors in source space on portrait and wide screens', () => {
    const records = {
      'research.mint': {
        bounds: { x: 750, y: 900, width: 216, height: 126 },
      },
    };
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      semanticRegistry: createSemanticRegistry(records),
    });

    layer.layout({
      sourceScale: 3,
      authoredOffsetX: 0,
      sourceWidth: 360,
      sourceHeight: 844,
    });
    expect(layer.resolveAnchor('research.mint')).toEqual({
      x: 286,
      y: 321,
    });

    records['research.mint'].bounds = {
      x: 2_190,
      y: 900,
      width: 216,
      height: 126,
    };
    layer.layout({
      sourceScale: 3,
      authoredOffsetX: 1_440,
      sourceWidth: 360,
      sourceHeight: 844,
    });
    expect(layer.resolveAnchor('research.mint')).toEqual({
      x: 286,
      y: 321,
    });
  });

  it('falls back from a hidden sold-price anchor to the visible stall', () => {
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      semanticRegistry: createSemanticRegistry({
        'shop.stall.1.price': {
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          state: { visible: false },
        },
        'shop.stall.1': {
          bounds: { x: 30, y: 120, width: 330, height: 84 },
          state: { visible: true },
        },
      }),
    });
    layer.layout({
      sourceScale: 1,
      authoredOffsetX: 0,
      sourceWidth: 390,
      sourceHeight: 844,
    });

    expect(
      layer.resolveAnchor([
        'shop.stall.1.price',
        'shop.stall.1',
      ]),
    ).toEqual({ x: 195, y: 162 });
  });
});

describe('PooledPixiNotificationBadges', () => {
  it('reconciles explicit parents and tutorial visibility policy', () => {
    const parent = new Container();
    const assets = createAssets();
    const badges = new PooledPixiNotificationBadges({
      assetManager: assets,
    });
    const [badge] = badges.reconcile([
      {
        key: 'summon',
        parent,
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        active: true,
        tone: 'orange',
        tutorialId: 'workshop:summon',
      },
    ]);
    expect(badge.root.x).toBe(94);
    expect(badge.root.y).toBe(6);
    expect(badge.sprite.width).toBe(12);
    expect(badge.sprite.texture).toBe(
      assets.getTexture('source:assets/ui/notification-circle-orange.png'),
    );
    expect(badge.root.visible).toBe(true);

    badges.setVisibilityPolicy({
      active: true,
      allowedTutorialIds: [],
    });
    expect(badge.root.visible).toBe(false);
    badges.setVisibilityPolicy(null);
    expect(badge.root.visible).toBe(true);
  });
});

describe('PixiRewardEventConsumer', () => {
  it('owns only one event subscription and releases it on unmount', () => {
    const unsubscribe = vi.fn();
    const source = {
      subscribeRewardEvents: vi.fn((listener) => {
        listener({ type: 'reward' });
        return unsubscribe;
      }),
    };
    const effects = { emitReward: vi.fn() };
    const consumer = new PixiRewardEventConsumer({
      effects,
      presentRewardEvent: () => ({ message: 'reward' }),
    });

    expect(consumer.mount(source)).toBe(true);
    expect(consumer.mount(source)).toBe(false);
    expect(source.subscribeRewardEvents).toHaveBeenCalledTimes(1);
    expect(effects.emitReward).toHaveBeenCalledTimes(1);
    consumer.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('reward flyout presenter', () => {
  it('ports item/resource rich-text parsing without DOM nodes', () => {
    const seedRuns = createRewardFlyoutRuns('sage seed found');
    expect(seedRuns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'icon',
          baseFrameName: 'seed:pack',
          itemFrameName: 'herb:sageHerb',
        }),
        expect.objectContaining({
          kind: 'text',
          text: 'sage seed',
          colorResource: 'seed',
        }),
      ]),
    );
    const reward = createRewardFlyoutPresentation({
      type: 'coin_collected',
      coin: 20,
    });
    expect(reward.message).toBe('collected 20 coin');
    expect(reward.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'icon',
          frameName: 'resource:coin',
        }),
      ]),
    );
    const crystalReward = createRewardFlyoutPresentation({
      type: 'crystal_collected',
      crystal: 1,
      source: 'shop_daily_crystal_offer',
    });
    expect(crystalReward.message).toBe('collected 1 amber');
    expect(crystalReward.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'icon',
          frameName: 'resource:crystal',
        }),
      ]),
    );
  });

  it('maps summon, harvest, and brew events to bounded retained item drops', () => {
    const seedReward = createRewardFlyoutPresentation({
      type: 'seed_summoned',
      eventId: 'summon-1',
      quantity: 3,
      seedCounts: [
        {
          seed: { key: 'sageSeed', label: 'sage seed' },
          quantity: 2,
        },
        {
          seed: { key: 'mintSeed', label: 'mint seed' },
          quantity: 1,
        },
      ],
    });
    expect(seedReward.itemDrops).toHaveLength(3);
    expect(seedReward.itemDrops).toEqual([
      expect.objectContaining({
        id: 'summon-1:seed:0',
        kind: 'seed',
        baseFrameName: 'seed:pack',
        itemFrameName: 'herb:sageHerb',
        anchorId: 'workshop.summonArea',
        anchorYRatio: 0.5,
      }),
      expect.objectContaining({
        itemFrameName: 'herb:sageHerb',
      }),
      expect.objectContaining({
        itemFrameName: 'herb:mintHerb',
      }),
    ]);
    expect(seedReward.itemDrops.every((drop) => drop.size === undefined)).toBe(
      true,
    );

    const plantedSeedReward = createRewardFlyoutPresentation({
      type: 'garden_seed_planted',
      eventId: 'plant-2',
      seed: { key: 'mintSeed', label: 'mint seed' },
      quantity: 9,
      tileNumber: 2,
    });
    expect(plantedSeedReward.itemDrops).toEqual([
      expect.objectContaining({
        id: 'plant-2:seed:0',
        kind: 'seed',
        baseFrameName: 'seed:pack',
        itemFrameName: 'herb:mintHerb',
        anchorId: 'garden.plot.2',
        anchorYRatio: 0.5,
        size: 28.9,
        motion: 'garden-plant-drop',
        delayMs: 0,
        durationMs: 500,
      }),
    ]);

    expect(
      createRewardVisualPresentation({
        type: 'herb_harvested',
        herb: { key: 'sageHerb', label: 'sage' },
        quantity: 20,
        tileNumber: 2,
      }).itemDrops,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'herb',
          frameName: 'herb:sageHerb',
          anchorId: [
            'garden.plot.2.plant.1',
            'garden.plot.2',
          ],
          spread: 0,
        }),
      ]),
    );
    expect(
      createRewardVisualPresentation({
        type: 'herb_harvested',
        herb: { key: 'sageHerb', label: 'sage' },
        quantity: 20,
        tileNumber: 2,
      }).itemDrops,
    ).toHaveLength(12);

    expect(
      createRewardVisualPresentation({
        type: 'potion_collected',
        cauldronIndex: 1,
        potion: { key: 'briarWard', label: 'briar ward' },
        quantity: 2,
      }).itemDrops,
    ).toEqual([
      expect.objectContaining({
        kind: 'potion',
        frameName: 'potion:briarWard',
        anchorId: 'brewing.cauldron.liquid',
        anchorYRatio: 91.5 / 486,
      }),
      expect.objectContaining({
        kind: 'potion',
        frameName: 'potion:briarWard',
        anchorId: 'brewing.cauldron.liquid',
        anchorYRatio: 91.5 / 486,
      }),
    ]);
  });

  it('starts automated Garden harvest drops at the matching herb slots', () => {
    const records = {
      'garden.plot.2': {
        bounds: { x: 0, y: 100, width: 300, height: 80 },
      },
      'garden.plot.2.plant.1': {
        bounds: { x: 20, y: 110, width: 20, height: 40 },
      },
      'garden.plot.2.plant.2': {
        bounds: { x: 80, y: 110, width: 20, height: 40 },
      },
      'garden.plot.2.plant.3': {
        bounds: { x: 140, y: 110, width: 20, height: 40 },
      },
    };
    const layer = new PixiTransientEffectsLayer({
      assets: createAssets(),
      semanticRegistry: createSemanticRegistry(records),
      random: () => 0.5,
    });
    layer.layout({
      sourceScale: 1,
      authoredOffsetX: 0,
      sourceWidth: 390,
      sourceHeight: 844,
    });

    layer.emitReward(
      createRewardFlyoutPresentation({
        type: 'herb_harvested',
        eventId: 'harvest-2',
        herb: { key: 'sageHerb', label: 'sage' },
        quantity: 3,
        tileNumber: 2,
      }),
    );

    const drops = layer.entries.filter((entry) => entry.kind === 'item');
    expect(drops.map(({ widget }) => widget.model.anchorId)).toEqual([
      ['garden.plot.2.plant.1', 'garden.plot.2'],
      ['garden.plot.2.plant.2', 'garden.plot.2'],
      ['garden.plot.2.plant.3', 'garden.plot.2'],
    ]);
    expect(drops.map(({ widget }) => widget.model.anchor)).toEqual([
      { x: 30, y: 130 },
      { x: 90, y: 130 },
      { x: 150, y: 130 },
    ]);
    expect(drops.map(({ widget }) => widget.root.x)).toEqual([30, 90, 150]);
  });

  it('maps shop and task rewards to stable retained visual origins', () => {
    expect(
      createRewardVisualPresentation({
        type: 'item_sold',
        item: { key: 'sageSeed', label: 'sage seed', kind: 'seed' },
        quantity: 1,
        coin: 12,
        slotNumber: 2,
      }),
    ).toEqual({
      coinTravel: {
        amount: 12,
        fromId: [
          'shop.stall.2.price',
          'shop.stall.2',
        ],
        toId: 'top.coin',
        showParticles: true,
        title: 'sold sage seed for 12 coin',
      },
    });

    const bought = createRewardVisualPresentation({
      type: 'item_bought',
      eventId: 'buy-1',
      source: 'npc_stock',
      item: { key: 'sageSeed', label: 'sage seed', kind: 'seed' },
      quantity: 20,
      coin: 40,
    });
    expect(bought.itemDrops).toHaveLength(12);
    expect(bought.itemDrops[0]).toMatchObject({
      id: 'buy-1:seed:0',
      kind: 'seed',
      baseFrameName: 'seed:pack',
      itemFrameName: 'herb:sageHerb',
      anchorId: [
        'shop.ledger.item.sageSeed',
        'shop.ledger.open',
        'shop.tab.traders',
      ],
    });
    expect(bought.spendBursts).toEqual([
      {
        anchorId: [
          'shop.ledger.item.sageSeed',
          'shop.ledger.open',
          'shop.tab.traders',
        ],
        resource: 'coin',
      },
    ]);

    expect(
      createRewardVisualPresentation({
        type: 'coin_collected',
        coin: 20,
        source: 'shop_coin_offer',
      }),
    ).toEqual({
      coinTravel: {
        amount: 20,
        fromId: [
          'shop.coinOffer.collect',
          'shop.tab.crystals',
        ],
        toId: 'top.coin',
        showParticles: true,
        title: 'collected 20 coin',
      },
    });

    expect(
      createRewardVisualPresentation({
        type: 'crystal_collected',
        crystal: 1,
        source: 'shop_daily_crystal_offer',
      }),
    ).toEqual({
      coinTravel: {
        amount: 1,
        resource: 'crystal',
        fromId: [
          'shop.dailyCrystalOffer.collect',
          'shop.tab.crystals',
        ],
        toId: 'top.contextCurrency',
        showParticles: true,
        title: 'collected 1 amber',
      },
    });

    expect(
      createRewardVisualPresentation({
        type: 'personal_task_reward_claimed',
        periodType: 'daily',
        taskId: 'task-1',
        coin: 15,
        crystal: 1,
      }),
    ).toEqual({
      coinTravel: {
        amount: 15,
        fromId: [
          'workshop.personalTasks.daily.task.task-1',
          'workshop.feature.personalTasks',
        ],
        toId: 'top.coin',
        showParticles: true,
        title: '+15 coin, +1 amber',
      },
    });
  });
});

function createAssets() {
  return {
    loaded: true,
    getTexture: () => Texture.EMPTY,
    getAtlasTexture: () => Texture.EMPTY,
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

function createSemanticRegistry(records) {
  return {
    get(id) {
      const record = records[id];
      return record
        ? {
            semanticId: id,
            displayObject: record.displayObject ?? {},
          }
        : null;
    },
    resolve(id) {
      const record = records[id];
      if (!record) {
        throw new Error(`unknown semantic target: ${id}`);
      }
      return {
        semanticId: id,
        displayObject: record.displayObject ?? {},
        bounds: record.bounds,
        state: {
          active: true,
          visible: true,
          enabled: true,
          interactive: false,
          ...(record.state ?? {}),
        },
      };
    },
  };
}
