import {
  Container,
  Graphics,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  getHerbIconFrameName,
  getHerbIconKeyByLabel,
} from '../../../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
  getPotionIconKeyByLabel,
} from '../../../../assets/items/potions/potionIcons.js';
import {
  getSeedIconFrameName,
  getSeedPackBaseFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import { formatCoinPriceText } from '../../../../shared/coinPrice.js';
import {
  BasePixiRetainedView,
  PixiTextLabel,
} from '../../primitives/index.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  projectSemanticBoundsToSource,
  resolveSemanticTutorialTarget,
} from '../tutorial/TutorialPixiGeometry.js';
import { createRewardFlyoutRuns } from './RewardFlyoutRuns.js';

export const PIXI_TRANSIENT_LIMITS = Object.freeze({
  textFlyouts: 10,
  // x5 hold summoning can overlap fourteen 100ms batches while the oldest
  // delayed drops are still inside their 1200ms animation lifetime.
  itemDrops: 70,
  itemDropsPerReward: 12,
  coinParticles: 8,
  coinAmounts: 4,
  spendParticles: 28,
});

export const PIXI_TRANSIENT_TIMING = Object.freeze({
  flyoutLifetimeMs: 1200,
  flyoutStaggerMs: 55,
  flyoutBurstWindowMs: 90,
  flyoutMaxStaggerIndex: 5,
  itemDropLifetimeMs: 1200,
  coinAmountLifetimeMs: 820,
  coinParticleBaseMs: 540,
  coinParticleVarianceMs: 150,
  coinParticleStaggerMs: 24,
  coinTargetPulseMs: 340,
  coinTargetPulseLeadMs: 140,
});

const SPEND_BURST = Object.freeze({
  count: 7,
  gravity: 760,
  sizeScale: 1.12,
  timeScale: 1.3,
  spreadScale: 1.5,
});
const SPEND_RESOURCE_FRAMES = Object.freeze({
  coin: 'resource:coin',
  crystal: 'resource:crystal',
  amethyst: 'resource:amethyst',
  emerald: 'resource:emerald',
  herb: 'herb:sageHerb',
  mana: 'resource:mana',
  ruby: 'resource:ruby',
  seed: 'seed:pack',
});
const ITEM_DROP_SIZES = Object.freeze({
  seed: 34,
  herb: 38,
  potion: 36,
});
const GARDEN_MAX_VISUAL_SEED_DROPS = 6;
const GARDEN_SEED_DROP_SIZE = ITEM_DROP_SIZES.seed * 0.75;
const REWARD_FLYOUT_VISUALS = Object.freeze({
  backgroundColor: 0x000000,
  backgroundAlpha: 0.62,
  height: 24,
  horizontalPadding: 8,
  radius: 8,
  textColor: '#ffffff',
  textStroke: Object.freeze({
    color: '#0a0a0a',
    width: 2,
    join: 'round',
  }),
});
/**
 * Bounded pooled transient layer. The single ticker registration is active
 * only while retained effects are alive.
 */
export class PixiTransientEffectsLayer extends BasePixiRetainedView {
  constructor({
    assets,
    semanticRegistry = null,
    application = null,
    parent = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    counters = null,
    random = Math.random,
    timeSource = () => Date.now(),
    reducedMotion = null,
  } = {}) {
    if (!assets?.getTexture && !assets?.getAtlasTexture) {
      throw new Error(
        'PixiTransientEffectsLayer requires preloaded Pixi assets.',
      );
    }
    super({ label: 'transientEffects' });
    this.assets = assets;
    this.semanticRegistry = semanticRegistry;
    this.application = application;
    this.random = random;
    this.timeSource = timeSource;
    this.reducedMotion =
      reducedMotion === null
        ? null
        : Boolean(reducedMotion);
    this.sequence = 0;
    this.lastTextFlyoutAtMs = Number.NEGATIVE_INFINITY;
    this.textFlyoutBurstIndex = 0;
    this.entries = [];
    this.tickerAttached = false;
    this.handleTick = (ticker) => this.tick(ticker?.deltaMS ?? ticker);

    this.textRoot = new Container();
    this.textRoot.label = 'transient:textFlyouts';
    this.visualRoot = new Container();
    this.visualRoot.label = 'transient:visuals';
    this.root.addChild(this.textRoot, this.visualRoot);
    parent?.addChild?.(this.root);

    this.textPool = new WidgetPool({
      name: 'Pixi reward flyouts',
      counters,
      maxSize: PIXI_TRANSIENT_LIMITS.textFlyouts,
      create: () =>
        new RewardFlyoutWidget({
          assets: this.assets,
          parent: this.textRoot,
        }),
      reset: (widget) => widget.reset(),
      dispose: (widget) => widget.destroy(),
    });
    this.itemPool = new WidgetPool({
      name: 'Pixi item drops',
      counters,
      maxSize: PIXI_TRANSIENT_LIMITS.itemDrops,
      create: () =>
        new ItemDropWidget({
          assets: this.assets,
          parent: this.visualRoot,
        }),
      reset: (widget) => widget.reset(),
      dispose: (widget) => widget.destroy(),
    });
    this.coinPool = new WidgetPool({
      name: 'Pixi coin particles',
      counters,
      maxSize: PIXI_TRANSIENT_LIMITS.coinParticles,
      create: () =>
        new CoinParticleWidget({
          assets: this.assets,
          parent: this.visualRoot,
        }),
      reset: (widget) => widget.reset(),
      dispose: (widget) => widget.destroy(),
    });
    this.amountPool = new WidgetPool({
      name: 'Pixi coin amount pops',
      counters,
      maxSize: PIXI_TRANSIENT_LIMITS.coinAmounts,
      create: () =>
        new CoinAmountWidget({ parent: this.visualRoot }),
      reset: (widget) => widget.reset(),
      dispose: (widget) => widget.destroy(),
    });
    this.spendPool = new WidgetPool({
      name: 'Pixi spend burst particles',
      counters,
      maxSize: PIXI_TRANSIENT_LIMITS.spendParticles,
      create: () =>
        new SpendBurstParticleWidget({
          assets: this.assets,
          parent: this.visualRoot,
        }),
      reset: (widget) => widget.reset(),
      dispose: (widget) => widget.destroy(),
    });
    this.coinTargetPulse = new CoinTargetPulseWidget();
    this.applyTheme(theme);
    this.layout({
      sourceScale: PIXI_UI_GEOMETRY.sourceScale,
      authoredOffsetX: 0,
      sourceWidth: PIXI_UI_GEOMETRY.sourceWidth,
      sourceHeight: PIXI_UI_GEOMETRY.sourceHeight,
    });
  }

  onBind(viewModel = {}) {
    if (viewModel.clear === true) {
      this.clear();
    }
    if (viewModel.reducedMotion !== undefined) {
      this.reducedMotion = Boolean(viewModel.reducedMotion);
    }
  }

  onApplyTheme(theme) {
    const nextTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    for (const entry of this.entries) {
      entry.widget.applyTheme?.(nextTheme);
    }
  }

  onLayout(projection = {}) {
    this.projection = {
      ...projection,
      sourceScale: Number(projection.sourceScale) || 3,
      authoredOffsetX: Number(projection.authoredOffsetX) || 0,
    };
  }

  onActivate() {
    this.syncTicker();
  }

  onDeactivate() {
    this.stopTicker();
    this.clear();
  }

  onDestroy() {
    this.stopTicker();
    this.clear();
    this.textPool.destroy();
    this.itemPool.destroy();
    this.coinPool.destroy();
    this.amountPool.destroy();
    this.spendPool.destroy();
    this.coinTargetPulse.destroy();
  }

  /**
   * @param {{
   *   id?: string,
   *   message?: string,
   *   runs?: Array<object>,
   *   flyoutKey?: string,
   *   delayMs?: number,
   *   visualOnly?: boolean,
   *   keepMessageVisible?: boolean,
   *   itemDrops?: Array<object>,
   *   coinTravel?: object,
   *   spendBursts?: Array<object>,
   * }} model
   */
  emitReward(model = {}) {
    const normalized = normalizeRewardModel(model);
    let visualCount = 0;
    if (!this.prefersReducedMotion() && this.theme?.iconMode === 'icons') {
      visualCount += this.emitItemDrops(normalized.itemDrops);
      visualCount += this.emitCoinTravel(normalized.coinTravel);
      visualCount += this.emitSpendBursts(normalized.spendBursts);
    }
    const visualOnly =
      normalized.visualOnly ??
      (visualCount > 0 && !normalized.keepMessageVisible);
    if (
      !visualOnly &&
      (normalized.message || normalized.runs.length > 0)
    ) {
      this.emitTextFlyout({
        ...normalized,
        delayMs:
          normalized.delayMs ??
          this.getTextBurstDelay(),
      });
    }
    return Object.freeze({
      visualCount,
      textShown: !visualOnly,
    });
  }

  emitTextFlyout(model) {
    for (const run of model.runs ?? []) {
      if (run.kind === 'icon') {
        validateInlineIconTexture(this.assets, run);
      }
    }
    this.releaseOldestAtLimit(
      'text',
      PIXI_TRANSIENT_LIMITS.textFlyouts,
    );
    const widget = acquireBoundWidget(this.textPool, (candidate) => {
      candidate.applyTheme(this.theme);
      candidate.bind(
        model.flyoutKey ??
          model.id ??
          `flyout-${++this.sequence}`,
        model,
      );
    });
    const durationMs = this.prefersReducedMotion()
      ? 1
      : PIXI_TRANSIENT_TIMING.flyoutLifetimeMs;
    this.addEntry({
      kind: 'text',
      widget,
      pool: this.textPool,
      delayMs: Math.max(0, Number(model.delayMs) || 0),
      durationMs,
    });
    return widget;
  }

  emitItemDrops(drops) {
    const normalizedDrops = (drops ?? []).slice(
      0,
      PIXI_TRANSIENT_LIMITS.itemDropsPerReward,
    );
    let count = 0;
    for (const [index, drop] of normalizedDrops.entries()) {
      const anchor = this.resolveAnchor(
        drop.anchor ?? drop.anchorId,
        {
          yRatio: Number.isFinite(drop.anchorYRatio)
            ? drop.anchorYRatio
            : 0.5,
        },
      );
      if (!anchor) {
        continue;
      }
      validateItemDropTexture(this.assets, drop);
      this.releaseOldestAtLimit(
        'item',
        PIXI_TRANSIENT_LIMITS.itemDrops,
      );
      const widget = acquireBoundWidget(
        this.itemPool,
        (candidate) => {
          candidate.applyTheme(this.theme);
          candidate.bind(
            drop.id ?? `item-${++this.sequence}`,
            {
              ...drop,
              anchor,
              random: this.random,
              index,
              count: normalizedDrops.length,
            },
          );
        },
      );
      this.addEntry({
        kind: 'item',
        widget,
        pool: this.itemPool,
        delayMs: Math.max(
          0,
          Number(drop.delayMs) ||
            (drop.kind === 'seed' ? this.random() * 140 : index * 60),
        ),
        durationMs: PIXI_TRANSIENT_TIMING.itemDropLifetimeMs,
      });
      count += 1;
    }
    return count;
  }

  emitCoinTravel(model) {
    if (!model) {
      return 0;
    }
    const amount = Math.max(0, Number(model.amount) || 0);
    const from = this.resolveAnchor(
      model.from ?? model.fromId,
      { yRatio: 0.44 },
    );
    const to = this.resolveAnchor(
      model.to ?? model.toId ?? 'top.coin',
      { yRatio: 0.55 },
    );
    if (amount <= 0 || !from || !to) {
      return 0;
    }
    const resource = normalizeTravelResource(model.resource);
    const desired = model.showParticles === false
      ? 0
      : Math.max(
          3,
          Math.min(
            4,
            Math.round(
              2 + Math.log10(Math.max(1, amount)) * 0.9,
            ),
          ),
        );
    const available = Math.max(
      0,
      PIXI_TRANSIENT_LIMITS.coinParticles -
        this.countEntries('coin'),
    );
    const count = Math.min(desired, available);
    let maxLifeMs = 0;
    for (let index = 0; index < count; index += 1) {
      const widget = acquireBoundWidget(
        this.coinPool,
        (candidate) => {
          candidate.applyTheme(this.theme);
          candidate.bind(`coin-${++this.sequence}`, {
            from,
            to,
            index,
            count,
            random: this.random,
            resource,
          });
        },
      );
      const delayMs =
        index * PIXI_TRANSIENT_TIMING.coinParticleStaggerMs +
        this.random() * 18;
      const durationMs =
        PIXI_TRANSIENT_TIMING.coinParticleBaseMs +
        this.random() *
          PIXI_TRANSIENT_TIMING.coinParticleVarianceMs;
      this.addEntry({
        kind: 'coin',
        widget,
        pool: this.coinPool,
        delayMs,
        durationMs,
      });
      maxLifeMs = Math.max(maxLifeMs, delayMs + durationMs);
    }

    this.releaseOldestAtLimit(
      'amount',
      PIXI_TRANSIENT_LIMITS.coinAmounts,
    );
    const amountWidget = acquireBoundWidget(
      this.amountPool,
      (candidate) => {
        candidate.applyTheme(this.theme);
        candidate.bind(`amount-${++this.sequence}`, {
          amount,
          title: model.title ?? '',
          anchor: { x: from.x, y: from.y - 4 },
          resource,
        });
      },
    );
    this.addEntry({
      kind: 'amount',
      widget: amountWidget,
      pool: this.amountPool,
      delayMs: 0,
      durationMs: PIXI_TRANSIENT_TIMING.coinAmountLifetimeMs,
    });
    this.startCoinTargetPulse({
      targetId: model.to ?? model.toId ?? 'top.coin',
      delayMs: Math.max(
        0,
        maxLifeMs -
          PIXI_TRANSIENT_TIMING.coinTargetPulseLeadMs,
      ),
    });
    return count + 1;
  }

  emitSpendBursts(bursts) {
    let count = 0;
    for (const burst of bursts ?? []) {
      const anchor = this.resolveAnchor(
        burst.anchor ?? burst.anchorId,
      );
      if (!anchor) {
        continue;
      }
      const textureModel = normalizeSpendTextureModel(burst);
      validateSpendTexture(this.assets, textureModel);
      for (let index = 0; index < SPEND_BURST.count; index += 1) {
        this.releaseOldestAtLimit(
          'spend',
          PIXI_TRANSIENT_LIMITS.spendParticles,
        );
        const widget = acquireBoundWidget(
          this.spendPool,
          (candidate) => {
            candidate.bind(`spend-${++this.sequence}`, {
              ...textureModel,
              anchor,
              random: this.random,
            });
          },
        );
        this.addEntry({
          kind: 'spend',
          widget,
          pool: this.spendPool,
          delayMs: 0,
          durationMs: widget.durationMs,
        });
        count += 1;
      }
    }
    return count;
  }

  startCoinTargetPulse({
    targetId = 'top.coin',
    delayMs = 0,
  } = {}) {
    const target = resolveSemanticDisplayObject(
      this.semanticRegistry,
      targetId,
    );
    if (!target) {
      return false;
    }
    for (const entry of [...this.entries]) {
      if (entry.kind === 'coinTarget') {
        this.releaseEntry(entry);
      }
    }
    this.coinTargetPulse.bind(target);
    this.addEntry({
      kind: 'coinTarget',
      widget: this.coinTargetPulse,
      pool: null,
      delayMs,
      durationMs: PIXI_TRANSIENT_TIMING.coinTargetPulseMs,
    });
    return true;
  }

  addEntry({ kind, widget, pool, delayMs, durationMs }) {
    const entry = {
      sequence: ++this.sequence,
      kind,
      widget,
      pool,
      delayMs,
      durationMs,
      elapsedMs: 0,
    };
    this.entries.push(entry);
    widget.update?.(0, {
      delayed: delayMs > 0,
      durationMs,
    });
    this.syncTicker();
    return entry;
  }

  tick(deltaMs) {
    if (!this.active) {
      this.stopTicker();
      return;
    }
    const delta = Math.max(0, Number(deltaMs) || 0);
    for (const entry of [...this.entries]) {
      entry.elapsedMs += delta;
      const localMs = entry.elapsedMs - entry.delayMs;
      if (localMs < 0) {
        entry.widget.update?.(0, {
          delayed: true,
          durationMs: entry.durationMs,
        });
        continue;
      }
      const progress = Math.min(
        1,
        localMs / Math.max(1, entry.durationMs),
      );
      entry.widget.update?.(progress, {
        delayed: false,
        elapsedMs: localMs,
        durationMs: entry.durationMs,
      });
      if (progress >= 1) {
        this.releaseEntry(entry);
      }
    }
    this.syncTicker();
  }

  releaseOldestAtLimit(kind, limit) {
    const matches = this.entries
      .filter((entry) => entry.kind === kind)
      .sort((left, right) => left.sequence - right.sequence);
    while (matches.length >= limit) {
      const oldest = matches.shift();
      this.releaseEntry(oldest);
    }
  }

  releaseEntry(entry) {
    const index = this.entries.indexOf(entry);
    if (index < 0) {
      return false;
    }
    this.entries.splice(index, 1);
    if (entry.pool?.release) {
      entry.pool.release(entry.widget);
    } else {
      entry.widget.reset?.();
    }
    return true;
  }

  countEntries(kind) {
    return this.entries.filter((entry) => entry.kind === kind).length;
  }

  clear() {
    for (const entry of [...this.entries]) {
      this.releaseEntry(entry);
    }
    this.syncTicker();
  }

  resolveAnchor(anchor, { yRatio = 0.5 } = {}) {
    if (Array.isArray(anchor)) {
      for (const candidate of anchor) {
        const resolved = this.resolveAnchor(candidate, { yRatio });
        if (resolved) {
          return resolved;
        }
      }
      return null;
    }
    if (
      anchor &&
      Number.isFinite(anchor.x) &&
      Number.isFinite(anchor.y) &&
      !Number.isFinite(anchor.width)
    ) {
      return { x: Number(anchor.x), y: Number(anchor.y) };
    }
    let bounds = null;
    if (typeof anchor === 'string') {
      const snapshot = resolveSemanticTutorialTarget(
        this.semanticRegistry,
        anchor,
      );
      bounds = snapshot
        ? projectSemanticBoundsToSource(
            snapshot.bounds,
            this.projection,
          )
        : null;
    } else if (anchor) {
      bounds = anchor;
    }
    if (!bounds) {
      return null;
    }
    return {
      x: Number(bounds.x) + Number(bounds.width) * 0.5,
      y: Number(bounds.y) + Number(bounds.height) * yRatio,
    };
  }

  getTextBurstDelay() {
    const now = this.timeSource();
    if (
      now - this.lastTextFlyoutAtMs >
      PIXI_TRANSIENT_TIMING.flyoutBurstWindowMs
    ) {
      this.textFlyoutBurstIndex = 0;
    } else {
      this.textFlyoutBurstIndex += 1;
    }
    this.lastTextFlyoutAtMs = now;
    return (
      Math.min(
        this.textFlyoutBurstIndex,
        PIXI_TRANSIENT_TIMING.flyoutMaxStaggerIndex,
      ) * PIXI_TRANSIENT_TIMING.flyoutStaggerMs
    );
  }

  prefersReducedMotion() {
    if (this.reducedMotion !== null) {
      return this.reducedMotion;
    }
    return (
      globalThis.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      )?.matches === true
    );
  }

  syncTicker() {
    const shouldAttach = this.active && this.entries.length > 0;
    if (shouldAttach && !this.tickerAttached) {
      this.application?.ticker?.add?.(this.handleTick);
      this.tickerAttached = Boolean(this.application?.ticker?.add);
    } else if (!shouldAttach) {
      this.stopTicker();
    }
  }

  stopTicker() {
    if (!this.tickerAttached) {
      return;
    }
    this.application?.ticker?.remove?.(this.handleTick);
    this.tickerAttached = false;
  }

  getStats() {
    return Object.freeze({
      active: Object.freeze({
        text: this.countEntries('text'),
        item: this.countEntries('item'),
        coin: this.countEntries('coin'),
        amount: this.countEntries('amount'),
        coinTarget: this.countEntries('coinTarget'),
        spend: this.countEntries('spend'),
      }),
      pools: Object.freeze({
        text: this.textPool.getStats(),
        item: this.itemPool.getStats(),
        coin: this.coinPool.getStats(),
        amount: this.amountPool.getStats(),
        spend: this.spendPool.getStats(),
      }),
    });
  }
}

/**
 * Owns the one gameplay reward-event subscription feeding the retained layer.
 * The injected presenter maps gameplay events to renderer-only models.
 */
export class PixiRewardEventConsumer {
  constructor({
    effects,
    presentRewardEvent,
  } = {}) {
    if (!effects?.emitReward) {
      throw new Error(
        'PixiRewardEventConsumer requires a transient effects layer.',
      );
    }
    if (typeof presentRewardEvent !== 'function') {
      throw new Error(
        'PixiRewardEventConsumer requires presentRewardEvent(event).',
      );
    }
    this.effects = effects;
    this.presentRewardEvent = presentRewardEvent;
    this.unsubscribe = null;
  }

  mount(eventSource) {
    if (this.unsubscribe) {
      return false;
    }
    const subscribe =
      eventSource?.subscribeRewardEvents ??
      eventSource?.subscribe;
    this.unsubscribe =
      subscribe?.call?.(eventSource, (event) => {
        const models = this.presentRewardEvent(event);
        for (const model of Array.isArray(models)
          ? models
          : models
            ? [models]
            : []) {
          this.effects.emitReward(model);
        }
      }) ?? null;
    return Boolean(this.unsubscribe);
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

export function createPixiTransientEffectsLayer(options = {}) {
  return new PixiTransientEffectsLayer(options);
}

export function createPixiRewardEventConsumer(options = {}) {
  return new PixiRewardEventConsumer(options);
}

export function formatRewardEventMessage(event) {
  if (!event) {
    return '';
  }
  if (event.message) {
    return String(event.message);
  }
  if (event.type === 'seed_summoned') {
    const quantity = Number.isFinite(event.quantity)
      ? event.quantity
      : 1;
    const counts = Array.isArray(event.seedCounts)
      ? event.seedCounts
      : [];
    if (quantity <= 1 || counts.length === 0) {
      return `${event.seed?.label ?? 'seed'} found`;
    }
    if (counts.length === 1) {
      return `${counts[0].seed?.label ?? 'seed'} x${quantity} found`;
    }
    return `${counts
      .map(
        ({ seed, quantity: count = 1 }) =>
          `${seed?.label ?? 'seed'}${count > 1 ? ` x${count}` : ''}`,
      )
      .join(', ')} found`;
  }
  if (event.type === 'potion_collected') {
    return formatItemQuantity(
      'collected',
      event.potion,
      event.quantity,
    );
  }
  if (event.type === 'herb_harvested') {
    return formatItemQuantity(
      'harvested',
      event.herb,
      event.quantity,
    );
  }
  if (event.type === 'item_sold') {
    return formatItemQuantity(
      'sold',
      event.item,
      event.quantity,
      ` for ${formatCoinPriceText(event.coin ?? 0)}`,
    );
  }
  if (event.type === 'item_bought') {
    return formatItemQuantity(
      'bought',
      event.item,
      event.quantity,
      Number.isFinite(event.coin)
        ? ` for ${formatCoinPriceText(event.coin)}`
        : '',
    );
  }
  if (event.type === 'coin_collected') {
    return `collected ${formatCoinPriceText(event.coin ?? 0)}`;
  }
  if (event.type === 'crystal_collected') {
    const crystal = Math.max(
      0,
      Math.floor(Number(event.crystal) || 0),
    );
    return `collected ${crystal} amber`;
  }
  if (event.type === 'personal_task_reward_claimed') {
    const coin = Math.max(0, Math.floor(Number(event.coin) || 0));
    const crystal = Math.max(
      0,
      Math.floor(Number(event.crystal) || 0),
    );
    const parts = [];
    if (coin > 0) {
      parts.push(`+${formatCoinPriceText(coin)}`);
    }
    if (crystal > 0) {
      parts.push(`+${crystal} amber`);
    }
    return parts.join(', ') || 'reward claimed';
  }
  return '';
}

export function createRewardFlyoutPresentation(
  event,
  overrides = {},
) {
  const message =
    overrides.message ?? formatRewardEventMessage(event);
  const visualPresentation =
    createRewardVisualPresentation(event);
  return {
    id: overrides.id ?? event?.id ?? event?.eventId ?? null,
    message,
    runs:
      overrides.runs ?? createRewardFlyoutRuns(message),
    keepMessageVisible:
      overrides.keepMessageVisible ??
      (event?.type === 'personal_task_reward_claimed'),
    ...visualPresentation,
    ...overrides,
  };
}

/**
 * Converts gameplay reward events into renderer-only motion models. Semantic
 * anchors keep the retained layer independent from page implementation and
 * preserve the legacy summon/harvest/brew origins.
 */
export function createRewardVisualPresentation(event) {
  if (!event) {
    return {};
  }
  if (event.type === 'seed_summoned') {
    return {
      itemDrops: createSeedSummonDrops(event),
    };
  }
  if (
    event.type === 'garden_seed_planted' &&
    Number.isInteger(event.tileNumber)
  ) {
    const quantity = Math.min(
      GARDEN_MAX_VISUAL_SEED_DROPS,
      normalizeItemQuantity(event.quantity),
    );
    return {
      itemDrops: Array.from({ length: quantity }, (_, index) =>
        createSeedDrop({
          event,
          seed: event.seed,
          index,
          anchorId: `garden.plot.${event.tileNumber}`,
          size: GARDEN_SEED_DROP_SIZE,
        }),
      ),
    };
  }
  if (
    event.type === 'herb_harvested' &&
    Number.isInteger(event.tileNumber)
  ) {
    const herb = event.herb;
    const key =
      herb?.key ??
      getHerbIconKeyByLabel(herb?.label);
    const frameName = getHerbIconFrameName(key);
    return frameName
      ? {
          itemDrops: createRepeatedItemDrops({
            event,
            kind: 'herb',
            frameName,
            anchorId: `garden.plot.${event.tileNumber}`,
            anchorYRatio: 0.5,
          }),
        }
      : {};
  }
  if (event.type === 'potion_collected') {
    const potion = event.potion;
    const key =
      potion?.key ??
      getPotionIconKeyByLabel(potion?.label);
    const frameName = getPotionIconFrameName(key);
    return frameName
      ? {
          itemDrops: createRepeatedItemDrops({
            event,
            kind: 'potion',
            frameName,
            anchorId: 'brewing.cauldron.liquid',
            anchorYRatio: 91.5 / 486,
          }),
        }
      : {};
  }
  if (
    event.type === 'item_sold' &&
    Number(event.coin) > 0
  ) {
    const slotNumber = Number(event.slotNumber);
    return {
      coinTravel: {
        amount: event.coin,
        fromId: Number.isInteger(slotNumber)
          ? [
              `shop.stall.${slotNumber}.price`,
              `shop.stall.${slotNumber}`,
            ]
          : 'shop.tab.traders',
        toId: 'top.coin',
        showParticles: true,
        title: formatRewardEventMessage(event),
      },
    };
  }
  if (event.type === 'item_bought') {
    const kind = normalizeItemDropKind(event.item?.kind);
    const textureModel = createItemDropTextureModel(
      event.item,
      kind,
    );
    const anchorId = createBoughtItemAnchorIds(event);
    return {
      ...(textureModel
        ? {
            itemDrops: Array.from(
              {
                length: getVisualDropQuantity(event.quantity),
              },
              (_, index) => ({
                id: createRewardVisualId(event, kind, index),
                kind,
                ...textureModel,
                anchorId,
                anchorYRatio: 0.5,
              }),
            ),
          }
        : {}),
      ...(Number(event.coin) > 0
        ? {
            spendBursts: [
              {
                anchorId,
                resource: 'coin',
              },
            ],
          }
        : {}),
    };
  }
  if (
    event.type === 'coin_collected' &&
    Number(event.coin) > 0
  ) {
    return {
      coinTravel: {
        amount: event.coin,
        fromId: createCoinCollectionAnchorIds(event.source),
        toId: 'top.coin',
        showParticles: true,
        title: formatRewardEventMessage(event),
      },
    };
  }
  if (
    event.type === 'crystal_collected' &&
    Number(event.crystal) > 0
  ) {
    return {
      coinTravel: {
        amount: event.crystal,
        resource: 'crystal',
        fromId: [
          'shop.dailyCrystalOffer.collect',
          'shop.tab.crystals',
        ],
        toId: 'top.contextCurrency',
        showParticles: true,
        title: formatRewardEventMessage(event),
      },
    };
  }
  if (
    event.type === 'personal_task_reward_claimed' &&
    Number(event.coin) > 0
  ) {
    return {
      coinTravel: {
        amount: event.coin,
        fromId: [
          createPersonalTaskRewardAnchorId(event),
          'workshop.feature.personalTasks',
        ],
        toId: 'top.coin',
        showParticles: true,
        title: formatRewardEventMessage(event),
      },
    };
  }
  return {};
}

export class RewardFlyoutWidget {
  constructor({ assets, parent }) {
    this.assets = assets;
    this.root = new Container();
    this.root.label = 'rewardFlyout';
    this.root.eventMode = 'none';
    this.background = new Graphics({
      label: 'rewardFlyout:background',
    });
    this.slots = Array.from({ length: 16 }, (_, index) => {
      const root = new Container();
      root.label = `rewardFlyout:run:${index}`;
      const text = new PixiTextLabel({
        text: '',
        fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
        anchor: { x: 0, y: 0.5 },
        color: REWARD_FLYOUT_VISUALS.textColor,
        stroke: REWARD_FLYOUT_VISUALS.textStroke,
        label: `rewardFlyout:text:${index}`,
      });
      const icon = new Sprite({
        texture: Texture.EMPTY,
        roundPixels: true,
      });
      icon.label = `rewardFlyout:icon:${index}`;
      icon.anchor.set(0, 0.5);
      const iconOverlay = new Sprite({
        texture: Texture.EMPTY,
        roundPixels: true,
      });
      iconOverlay.label = `rewardFlyout:iconOverlay:${index}`;
      iconOverlay.anchor.set(0, 0.5);
      root.addChild(text, icon, iconOverlay);
      return { root, text, icon, iconOverlay };
    });
    this.root.addChild(
      this.background,
      ...this.slots.map((slot) => slot.root),
    );
    parent.addChild(this.root);
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
  }

  bind(_key, model) {
    const runs =
      model.runs.length > 0
        ? model.runs
        : [{ kind: 'text', text: model.message }];
    let x = 0;
    for (const [index, slot] of this.slots.entries()) {
      const run = runs[index];
      slot.root.visible = Boolean(run);
      slot.root.renderable = Boolean(run);
      if (!run) {
        continue;
      }
      slot.root.position.set(x, 0);
      if (run.kind === 'icon') {
        slot.text.visible = false;
        slot.icon.visible = true;
        const size = Number(run.size) || 14;
        if (run.baseFrameName && run.itemFrameName) {
          slot.icon.texture = resolveTexture(this.assets, {
            frameName: run.baseFrameName,
          });
          slot.iconOverlay.texture = resolveTexture(this.assets, {
            frameName: run.itemFrameName,
          });
          slot.iconOverlay.visible = true;
          layoutPixiSeedPackIcon({
            base: slot.icon,
            item: slot.iconOverlay,
            x: 0,
            y: 0,
            width: size,
            height: size,
            anchorX: 0,
            anchorY: 0.5,
            fitPositionX: 0,
          });
          slot.iconOverlay.__baseScaleX =
            slot.iconOverlay.scale.x;
          slot.iconOverlay.__baseScaleY =
            slot.iconOverlay.scale.y;
          slot.iconOverlay.__baseY = slot.iconOverlay.y;
        } else {
          slot.icon.texture = resolveTexture(this.assets, run);
          slot.iconOverlay.visible = false;
          slot.icon.anchor.set(0, 0.5);
          slot.icon.position.set(0, 0);
          slot.icon.rotation = 0;
        }
        if (!slot.iconOverlay.visible) {
          slot.icon.width = size;
          slot.icon.height = size;
        }
        slot.icon.__baseScaleX = slot.icon.scale.x;
        slot.icon.__baseScaleY = slot.icon.scale.y;
        x += size + (Number(run.gap) || 2);
      } else {
        slot.icon.visible = false;
        slot.iconOverlay.visible = false;
        slot.text.visible = true;
        slot.text.setText(run.text ?? '');
        slot.text.setColor(REWARD_FLYOUT_VISUALS.textColor);
        x += slot.text.measuredWidth;
      }
    }
    this.background
      .clear()
      .roundRect(
        -REWARD_FLYOUT_VISUALS.horizontalPadding,
        -REWARD_FLYOUT_VISUALS.height / 2,
        x + REWARD_FLYOUT_VISUALS.horizontalPadding * 2,
        REWARD_FLYOUT_VISUALS.height,
        REWARD_FLYOUT_VISUALS.radius,
      )
      .fill({
        color: REWARD_FLYOUT_VISUALS.backgroundColor,
        alpha: REWARD_FLYOUT_VISUALS.backgroundAlpha,
      });
    this.root.pivot.set(x / 2, 0);
    this.root.position.set(
      PIXI_UI_GEOMETRY.sourceWidth / 2,
      PIXI_UI_GEOMETRY.roomContentTop + 182,
    );
    this.root.visible = true;
    this.root.renderable = true;
    this.root.alpha = 0;
    this.root.scale.set(0.985);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    for (const slot of this.slots) {
      slot.text.applyTheme(this.theme);
    }
  }

  update(progress, { delayed }) {
    if (delayed) {
      this.root.alpha = 0;
      return;
    }
    let alpha;
    let y;
    let scale;
    if (progress <= 0.16) {
      const local = progress / 0.16;
      alpha = local;
      y = lerp(5, -1, local);
      scale = lerp(0.985, 1.025, local);
    } else if (progress <= 0.4) {
      const local = (progress - 0.16) / 0.24;
      alpha = 1;
      y = lerp(-1, -2, local);
      scale = lerp(1.025, 1, local);
    } else {
      const local = (progress - 0.4) / 0.6;
      alpha = 1 - local;
      y = lerp(-2, -18, local);
      scale = 1;
    }
    this.root.alpha = alpha;
    this.root.position.y =
      PIXI_UI_GEOMETRY.roomContentTop + 182 + y;
    this.root.scale.set(scale);
    const iconProgress = Math.min(
      1,
      (progress * PIXI_TRANSIENT_TIMING.flyoutLifetimeMs) / 460,
    );
    const iconFrame = interpolateRewardIconFrame(iconProgress);
    for (const slot of this.slots) {
      if (!slot.root.visible || !slot.icon.visible) {
        continue;
      }
      slot.icon.alpha = iconFrame.alpha;
      slot.icon.position.y = iconFrame.y;
      slot.icon.scale.set(
        (slot.icon.__baseScaleX ?? 1) * iconFrame.scaleX,
        (slot.icon.__baseScaleY ?? 1) * iconFrame.scaleY,
      );
      if (slot.iconOverlay.visible) {
        slot.iconOverlay.alpha = iconFrame.alpha;
        slot.iconOverlay.position.y =
          (slot.iconOverlay.__baseY ?? 0) + iconFrame.y;
        slot.iconOverlay.scale.set(
          (slot.iconOverlay.__baseScaleX ?? 1) *
            iconFrame.scaleX,
          (slot.iconOverlay.__baseScaleY ?? 1) *
            iconFrame.scaleY,
        );
      }
    }
  }

  reset() {
    this.root.visible = false;
    this.root.renderable = false;
    this.root.alpha = 0;
    this.root.scale.set(1);
    this.background.clear();
    for (const slot of this.slots) {
      slot.root.visible = false;
      slot.text.setText('');
      slot.icon.texture = Texture.EMPTY;
      slot.iconOverlay.texture = Texture.EMPTY;
      slot.iconOverlay.visible = false;
      slot.iconOverlay.alpha = 1;
      slot.iconOverlay.position.set(0, 0);
      slot.iconOverlay.rotation = 0;
      slot.iconOverlay.scale.set(1);
      slot.icon.alpha = 1;
      slot.icon.position.set(0, 0);
      slot.icon.scale.set(1);
    }
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class ItemDropWidget {
  constructor({ assets, parent }) {
    this.assets = assets;
    this.root = new Container();
    this.root.label = 'itemDrop';
    this.root.eventMode = 'none';
    this.primary = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
    });
    this.primary.anchor.set(0.5);
    this.secondary = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
    });
    this.secondary.anchor.set(0.5);
    this.root.addChild(this.primary, this.secondary);
    parent.addChild(this.root);
    this.model = {};
    this.seedFrame = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      alpha: 0,
    };
  }

  bind(_key, model) {
    this.model = model;
    const kind = ['seed', 'herb', 'potion'].includes(model.kind)
      ? model.kind
      : 'seed';
    this.kind = kind;
    const index = Number(model.index) || 0;
    const count = Math.max(1, Number(model.count) || 1);
    const t = count === 1 ? 0.5 : index / (count - 1);
    const spread =
      kind === 'seed' ? 0 : Math.min(56, 18 + count * 8);
    this.baseX = model.anchor.x + (t - 0.5) * spread;
    this.root.position.set(this.baseX, model.anchor.y);
    this.root.visible = true;
    this.root.renderable = true;
    const size = Number(model.size) || ITEM_DROP_SIZES[kind];
    if (model.baseFrameName && model.itemFrameName) {
      this.primary.texture = resolveTexture(this.assets, {
        frameName: model.baseFrameName,
      });
      this.secondary.texture = resolveTexture(this.assets, {
        frameName: model.itemFrameName,
      });
      layoutPixiSeedPackIcon({
        base: this.primary,
        item: this.secondary,
        x: 0,
        y: 0,
        width: size,
        height: size * (128 / 119),
      });
      this.secondary.visible = true;
    } else {
      this.primary.texture = resolveTexture(this.assets, model);
      const ratio =
        this.primary.texture.height /
        Math.max(1, this.primary.texture.width);
      this.primary.width = size;
      this.primary.height = size * ratio;
      this.secondary.visible = false;
    }
    this.seedBurst = kind === 'seed';
    this.angleSign =
      model.angleSign ??
      (model.random() < 0.5 ? -1 : 1);
    const sliceCenter = count === 1 ? 0 : (t - 0.5) * 2;
    const angleDeg =
      sliceCenter * 50 + (model.random() - 0.5) * 70;
    const distance = 40 + model.random() * 60;
    this.tossX =
      Math.sin((angleDeg * Math.PI) / 180) * distance;
    this.tossPeak = -(22 + model.random() * 34);
    this.tossRotation =
      ((model.random() - 0.5) * 90 * Math.PI) / 180;
  }

  applyTheme() {}

  update(progress, { delayed }) {
    if (delayed) {
      this.root.alpha = 0;
      return;
    }
    if (this.seedBurst) {
      const frame = interpolateSeedBurstFrame(
        progress,
        this.tossX,
        this.tossPeak,
        this.tossRotation,
        this.seedFrame,
      );
      this.root.position.x =
        this.baseX + frame.x;
      this.root.position.y =
        this.model.anchor.y + frame.y;
      this.root.rotation = frame.rotation;
      this.root.alpha = frame.alpha;
      this.root.scale.set(frame.scaleX, frame.scaleY);
      return;
    }
    const frame = interpolateItemDropFrame(progress, this.angleSign);
    this.root.alpha = frame.alpha;
    this.root.position.y =
      this.model.anchor.y + frame.y;
    this.root.position.x = this.baseX;
    this.root.scale.set(frame.scaleX, frame.scaleY);
    this.root.rotation = frame.rotation;
  }

  reset() {
    this.root.visible = false;
    this.root.renderable = false;
    this.root.alpha = 0;
    this.root.scale.set(1);
    this.root.rotation = 0;
    this.primary.texture = Texture.EMPTY;
    this.secondary.texture = Texture.EMPTY;
    this.model = {};
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class CoinParticleWidget {
  constructor({ assets, parent }) {
    this.assets = assets;
    this.root = new Container();
    this.root.label = 'coinParticle';
    this.root.eventMode = 'none';
    this.sprite = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
    });
    this.sprite.anchor.set(0.5);
    this.sprite.width = 19.2;
    this.sprite.height = 19.2;
    this.root.addChild(this.sprite);
    parent.addChild(this.root);
    this.resource = 'coin';
  }

  bind(_key, model) {
    this.resource = normalizeTravelResource(model.resource);
    this.sprite.texture = resolveTexture(this.assets, {
      frameName: SPEND_RESOURCE_FRAMES[this.resource],
    });
    this.model = model;
    const t =
      model.count === 1
        ? 0.5
        : model.index / Math.max(1, model.count - 1);
    const burstAngle =
      -Math.PI / 2 +
      (t - 0.5) * (Math.PI * 0.82) +
      (model.random() - 0.5) * 0.28;
    const burstDistance = 30 + model.random() * 34;
    this.burst = {
      x: Math.cos(burstAngle) * burstDistance,
      y: Math.sin(burstAngle) * burstDistance,
    };
    const dx = model.to.x - model.from.x;
    const dy = model.to.y - model.from.y;
    const lift =
      64 +
      Math.abs(dx - this.burst.x) * 0.16 +
      model.random() * 30;
    this.control = {
      x:
        (this.burst.x + dx) * 0.5 +
        (model.random() - 0.5) * 38,
      y: (this.burst.y + dy) * 0.5 - lift,
    };
    this.rotation =
      ((model.random() - 0.5) * 680 * Math.PI) / 180;
    this.delta = { x: dx, y: dy };
    this.root.position.set(model.from.x, model.from.y);
    this.root.visible = true;
    this.root.renderable = true;
  }

  applyTheme() {}

  update(progress, { delayed }) {
    if (delayed) {
      this.root.alpha = 0;
      return;
    }
    if (progress <= 0.18) {
      const local = progress / 0.18;
      this.root.position.set(
        this.model.from.x + this.burst.x * local,
        this.model.from.y + this.burst.y * local,
      );
      this.root.alpha = Math.min(1, local / 0.5);
      this.root.scale.set(lerp(0.3, 1, local));
      this.root.rotation = this.rotation * 0.22 * local;
      return;
    }
    const u = (progress - 0.18) / 0.82;
    const oneMinus = 1 - u;
    const x =
      oneMinus * oneMinus * this.burst.x +
      2 * oneMinus * u * this.control.x +
      u * u * this.delta.x;
    const y =
      oneMinus * oneMinus * this.burst.y +
      2 * oneMinus * u * this.control.y +
      u * u * this.delta.y;
    this.root.position.set(
      this.model.from.x + x,
      this.model.from.y + y,
    );
    this.root.rotation = this.rotation * (0.22 + 0.78 * u);
    const shrinkStart = 0.72;
    const scale =
      u <= shrinkStart
        ? 1
        : 1 -
          Math.pow(
            (u - shrinkStart) / (1 - shrinkStart),
            1.4,
          ) *
            0.45;
    this.root.scale.set(scale);
    this.root.alpha =
      u < 0.88
        ? 1
        : Math.max(0, 1 - (u - 0.88) / 0.12) * 0.9;
  }

  reset() {
    this.root.visible = false;
    this.root.renderable = false;
    this.root.alpha = 0;
    this.root.scale.set(1);
    this.root.rotation = 0;
    this.sprite.texture = Texture.EMPTY;
    this.resource = 'coin';
    this.model = null;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class SpendBurstParticleWidget {
  constructor({ assets, parent }) {
    this.assets = assets;
    this.root = new Container();
    this.root.label = 'spendBurstParticle';
    this.root.eventMode = 'none';
    this.sprite = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
    });
    this.sprite.anchor.set(0.5);
    this.root.addChild(this.sprite);
    parent.addChild(this.root);
    this.durationMs = 1;
    this.model = null;
  }

  bind(_key, model) {
    const random = model.random;
    const size =
      randomBetween(26, 36, random) * SPEND_BURST.sizeScale;
    const lifetimeSeconds = randomBetween(0.68, 0.88, random);
    this.model = {
      anchor: model.anchor,
      startX:
        model.anchor.x +
        randomBetween(-16, 16, random) *
          SPEND_BURST.spreadScale,
      startY:
        model.anchor.y + randomBetween(-6, 8, random),
      startRotation: randomBetween(-0.3, 0.3, random),
      velocityX:
        randomBetween(-125, 125, random) *
        SPEND_BURST.spreadScale,
      velocityY: randomBetween(-270, -165, random),
      spin: randomBetween(-6.5, 6.5, random),
      lifetimeSeconds,
    };
    this.durationMs =
      (lifetimeSeconds / SPEND_BURST.timeScale) * 1_000;
    this.sprite.texture = resolveTexture(this.assets, model);
    this.sprite.width = size;
    this.sprite.height = size;
    this.root.position.set(
      this.model.startX,
      this.model.startY,
    );
    this.root.rotation = this.model.startRotation;
    this.root.scale.set(1);
    this.root.alpha = 1;
    this.root.visible = true;
    this.root.renderable = true;
  }

  applyTheme() {}

  update(progress, { delayed, elapsedMs = 0 }) {
    if (delayed || !this.model) {
      this.root.alpha = 0;
      return;
    }
    const elapsedSeconds =
      Math.max(0, elapsedMs) /
      1_000 *
      SPEND_BURST.timeScale;
    const boundedProgress = Math.min(1, Math.max(0, progress));
    this.root.position.set(
      this.model.startX +
        this.model.velocityX * elapsedSeconds,
      this.model.startY +
        this.model.velocityY * elapsedSeconds +
        0.5 *
          SPEND_BURST.gravity *
          elapsedSeconds *
          elapsedSeconds,
    );
    this.root.rotation =
      this.model.startRotation +
      this.model.spin * elapsedSeconds;
    const pop =
      1 + Math.sin(boundedProgress * Math.PI) * 0.16;
    const flip =
      0.32 +
      Math.abs(
        Math.cos(boundedProgress * Math.PI * 3.5),
      ) *
        0.68;
    this.root.scale.set(pop * flip, pop);
    this.root.alpha =
      boundedProgress < 0.58
        ? 1
        : 1 -
          (boundedProgress - 0.58) / 0.42;
  }

  reset() {
    this.root.visible = false;
    this.root.renderable = false;
    this.root.alpha = 0;
    this.root.scale.set(1);
    this.root.rotation = 0;
    this.sprite.texture = Texture.EMPTY;
    this.model = null;
    this.durationMs = 1;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class CoinAmountWidget {
  constructor({ parent }) {
    this.root = new Container();
    this.root.label = 'coinAmount';
    this.root.eventMode = 'none';
    this.label = new PixiTextLabel({
      text: '',
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: (theme) => theme.resourceColors.coin,
      stroke: {
        color: '#0a0a0a',
        width: 2,
        join: 'round',
      },
      label: 'coinAmount:label',
    });
    this.root.addChild(this.label);
    parent.addChild(this.root);
    this.resource = 'coin';
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
  }

  bind(_key, model) {
    this.model = model;
    this.resource = normalizeTravelResource(model.resource);
    const amount = Number.isInteger(model.amount)
      ? model.amount
      : Number(model.amount.toFixed(2));
    this.label.setText(
      `+${amount}${this.resource === 'coin' ? 'G' : ''}`,
    );
    this.label.setColor(
      this.theme.resourceColors[this.resource] ?? this.theme.text,
    );
    this.root.position.set(model.anchor.x, model.anchor.y);
    this.root.visible = true;
    this.root.renderable = true;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.label.applyTheme(this.theme);
    this.label.setColor(
      this.theme.resourceColors[this.resource] ?? this.theme.text,
    );
  }

  update(progress, { delayed }) {
    if (delayed) {
      this.root.alpha = 0;
      return;
    }
    const frames = [
      [0, 0, 0.5, 0],
      [0.14, -10, 1.14, 1],
      [0.32, -18, 0.995, 1],
      [0.42, -22, 1, 1],
      [0.78, -34, 0.97, 1],
      [1, -48, 0.88, 0],
    ];
    const frame = interpolateFrames(frames, progress);
    this.root.position.y = this.model.anchor.y + frame[1];
    this.root.scale.set(frame[2]);
    this.root.alpha = frame[3];
  }

  reset() {
    this.root.visible = false;
    this.root.renderable = false;
    this.root.alpha = 0;
    this.root.scale.set(1);
    this.label.setText('');
    this.resource = 'coin';
    this.model = null;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

const COIN_TARGET_PULSE_FRAMES = Object.freeze([
  Object.freeze([0, 0, 1]),
  Object.freeze([0.45, -1, 1.02]),
  Object.freeze([0.78, 0, 0.997]),
  Object.freeze([1, 0, 1]),
]);

/**
 * Pulses the existing retained top-coin target without creating a wrapper.
 * Position compensation keeps scaling centered while leaving the target's
 * pivot untouched, and reset restores either the original transform or a
 * newer layout position observed while the pulse was active.
 */
class CoinTargetPulseWidget {
  constructor() {
    this.target = null;
    this.base = null;
    this.lastApplied = null;
  }

  bind(target) {
    this.reset();
    this.target = target;
    this.base = snapshotDisplayTransform(target);
    this.lastApplied = null;
  }

  update(progress, { delayed }) {
    if (delayed || !this.target || this.target.destroyed) {
      return;
    }
    this.captureExternalTransform();
    const eased = cubicBezier(progress, 0.22, 1, 0.36, 1);
    const frame = interpolateFrames(
      COIN_TARGET_PULSE_FRAMES,
      eased,
    );
    const offsetY = frame[1];
    const scaleFactor = frame[2];
    const center = getDisplayLocalCenter(this.target);
    const pivot = this.target.pivot ?? { x: 0, y: 0 };
    const relativeX = center.x - Number(pivot.x || 0);
    const relativeY = center.y - Number(pivot.y || 0);
    const linear = getDisplayLinearTransform(this.base);
    const compensationX =
      (linear.a * relativeX + linear.c * relativeY) *
      (1 - scaleFactor);
    const compensationY =
      (linear.b * relativeX + linear.d * relativeY) *
      (1 - scaleFactor);
    const nextX = this.base.x + compensationX;
    const nextY = this.base.y + compensationY + offsetY;
    const nextScaleX = this.base.scaleX * scaleFactor;
    const nextScaleY = this.base.scaleY * scaleFactor;
    this.target.position.set(nextX, nextY);
    this.target.scale.set(nextScaleX, nextScaleY);
    this.lastApplied = {
      x: nextX,
      y: nextY,
      scaleX: nextScaleX,
      scaleY: nextScaleY,
    };
  }

  captureExternalTransform() {
    if (!this.lastApplied || !this.base || !this.target) {
      return;
    }
    if (
      !nearlyEqual(this.target.position.x, this.lastApplied.x) ||
      !nearlyEqual(this.target.position.y, this.lastApplied.y)
    ) {
      this.base.x = this.target.position.x;
      this.base.y = this.target.position.y;
    }
    if (
      !nearlyEqual(this.target.scale.x, this.lastApplied.scaleX) ||
      !nearlyEqual(this.target.scale.y, this.lastApplied.scaleY)
    ) {
      this.base.scaleX = this.target.scale.x;
      this.base.scaleY = this.target.scale.y;
    }
  }

  reset() {
    if (this.target && !this.target.destroyed && this.base) {
      this.captureExternalTransform();
      this.target.position.set(this.base.x, this.base.y);
      this.target.scale.set(this.base.scaleX, this.base.scaleY);
    }
    this.target = null;
    this.base = null;
    this.lastApplied = null;
  }

  destroy() {
    this.reset();
  }
}

function normalizeRewardModel(model) {
  return {
    id: model.id ? String(model.id) : null,
    message: String(model.message ?? ''),
    runs: Array.isArray(model.runs)
      ? model.runs.slice(0, 16)
      : [],
    flyoutKey: model.flyoutKey
      ? String(model.flyoutKey)
      : null,
    delayMs: Number.isFinite(model.delayMs)
      ? Math.max(0, model.delayMs)
      : null,
    visualOnly:
      model.visualOnly === undefined
        ? null
        : Boolean(model.visualOnly),
    keepMessageVisible: model.keepMessageVisible === true,
    itemDrops: Array.isArray(model.itemDrops)
      ? model.itemDrops
      : [],
    coinTravel: model.coinTravel ?? null,
    spendBursts: Array.isArray(model.spendBursts)
      ? model.spendBursts
      : [],
  };
}

function normalizeSpendTextureModel(model) {
  if (
    model?.texture ||
    model?.frameName ||
    model?.textureId ||
    model?.assetId
  ) {
    return model;
  }
  const resource = String(model?.resource ?? 'coin')
    .trim()
    .toLowerCase();
  return {
    ...model,
    frameName:
      SPEND_RESOURCE_FRAMES[resource] ??
      SPEND_RESOURCE_FRAMES.coin,
  };
}

function normalizeTravelResource(resource) {
  const normalized = String(resource ?? 'coin')
    .trim()
    .toLowerCase();
  return SPEND_RESOURCE_FRAMES[normalized]
    ? normalized
    : 'coin';
}

function createItemDropTextureModel(item, kind) {
  const normalizedKind = normalizeItemDropKind(kind ?? item?.kind);
  if (normalizedKind === 'seed') {
    const itemFrameName = getSeedPackItemFrameName(item);
    return itemFrameName
      ? {
          baseFrameName: getSeedPackBaseFrameName(),
          itemFrameName,
        }
      : { frameName: getSeedIconFrameName() };
  }
  if (normalizedKind === 'herb') {
    const key =
      item?.key ??
      getHerbIconKeyByLabel(item?.label);
    const frameName = getHerbIconFrameName(key);
    return frameName ? { frameName } : null;
  }
  if (normalizedKind === 'potion') {
    const key =
      item?.key ??
      getPotionIconKeyByLabel(item?.label);
    const frameName = getPotionIconFrameName(key);
    return frameName ? { frameName } : null;
  }
  return null;
}

function normalizeItemDropKind(kind) {
  const normalized = String(kind ?? '').trim().toLowerCase();
  return ['seed', 'herb', 'potion'].includes(normalized)
    ? normalized
    : null;
}

function createBoughtItemAnchorIds(event) {
  const itemIdentity =
    event.item?.key ??
    event.item?.itemTypeId ??
    'item';
  if (event.source === 'npc_stock') {
    return [
      `shop.ledger.item.${itemIdentity}`,
      'shop.ledger.open',
      'shop.tab.traders',
    ];
  }
  if (event.source === 'player_market') {
    return [
      event.listingKey
        ? `shop.market.listing.${event.listingKey}`
        : null,
      `shop.market.item.${itemIdentity}`,
      'shop.tab.players',
    ].filter(Boolean);
  }
  return ['shop.tab.players', 'shop.tab.traders'];
}

function createCoinCollectionAnchorIds(source) {
  if (source === 'shop_coin_offer') {
    return ['shop.coinOffer.collect', 'shop.tab.crystals'];
  }
  if (source === 'player_shop_proceeds') {
    return ['shop.tab.players'];
  }
  return ['shop.tab.traders', 'shop.tab.players'];
}

function createPersonalTaskRewardAnchorId(event) {
  if (event.milestoneThreshold !== null &&
      event.milestoneThreshold !== undefined) {
    return `workshop.personalTasks.${event.periodType}.milestone.${event.milestoneThreshold}`;
  }
  if (event.fullClear === true) {
    return `workshop.personalTasks.${event.periodType}.fullClear`;
  }
  return `workshop.personalTasks.${event.periodType}.task.${event.taskId}`;
}

function createSeedSummonDrops(event) {
  const limit = getVisualDropQuantity(event.quantity);
  const drops = [];
  const seedCounts = Array.isArray(event.seedCounts)
    ? event.seedCounts
    : [];
  for (const seedCount of seedCounts) {
    const remaining = limit - drops.length;
    if (remaining <= 0) {
      break;
    }
    const quantity = Math.min(
      normalizeItemQuantity(seedCount?.quantity),
      remaining,
    );
    for (let index = 0; index < quantity; index += 1) {
      drops.push(
        createSeedDrop({
          event,
          seed: seedCount?.seed,
          index: drops.length,
        }),
      );
    }
  }
  if (drops.length > 0) {
    return drops.slice(0, limit);
  }
  return Array.from({ length: limit }, (_, index) =>
    createSeedDrop({
      event,
      seed: event.seed,
      index,
    }),
  );
}

function createSeedDrop({
  event,
  seed,
  index,
  anchorId = 'workshop.summonArea',
  size,
}) {
  const itemFrameName = getSeedPackItemFrameName(seed);
  const textureModel = itemFrameName
    ? {
        baseFrameName: getSeedPackBaseFrameName(),
        itemFrameName,
      }
    : {
        frameName: getSeedIconFrameName(),
      };
  return {
    id: createRewardVisualId(event, 'seed', index),
    kind: 'seed',
    ...textureModel,
    anchorId,
    anchorYRatio: 0.5,
    ...(Number.isFinite(size) ? { size } : {}),
  };
}

function createRepeatedItemDrops({
  event,
  kind,
  frameName,
  anchorId,
  anchorYRatio,
}) {
  return Array.from(
    { length: getVisualDropQuantity(event.quantity) },
    (_, index) => ({
      id: createRewardVisualId(event, kind, index),
      kind,
      frameName,
      anchorId,
      anchorYRatio,
    }),
  );
}

function createRewardVisualId(event, kind, index) {
  const eventId =
    event?.id ??
    event?.eventId ??
    event?.type ??
    'reward';
  return `${eventId}:${kind}:${index}`;
}

function getVisualDropQuantity(quantity) {
  return Math.min(
    PIXI_TRANSIENT_LIMITS.itemDropsPerReward,
    normalizeItemQuantity(quantity),
  );
}

function normalizeItemQuantity(quantity) {
  return Number.isFinite(quantity)
    ? Math.max(1, Math.floor(quantity))
    : 1;
}

function resolveSemanticDisplayObject(registry, targetId) {
  const targetIds = Array.isArray(targetId)
    ? targetId
    : [targetId];
  for (const candidate of targetIds) {
    if (typeof candidate !== 'string' || !candidate) {
      continue;
    }
    const displayObject = registry?.get?.(candidate)?.displayObject;
    if (displayObject && displayObject.destroyed !== true) {
      return displayObject;
    }
  }
  return null;
}

function snapshotDisplayTransform(displayObject) {
  const scaleX = Number(displayObject?.scale?.x);
  const scaleY = Number(displayObject?.scale?.y);
  return {
    x: Number(displayObject?.position?.x) || 0,
    y: Number(displayObject?.position?.y) || 0,
    scaleX: Number.isFinite(scaleX) ? scaleX : 1,
    scaleY: Number.isFinite(scaleY) ? scaleY : 1,
    rotation: Number(displayObject?.rotation) || 0,
    skewX: Number(displayObject?.skew?.x) || 0,
    skewY: Number(displayObject?.skew?.y) || 0,
  };
}

function getDisplayLinearTransform(transform) {
  const rotation = transform.rotation;
  const skewX = transform.skewX;
  const skewY = transform.skewY;
  return {
    a: Math.cos(rotation + skewY) * transform.scaleX,
    b: Math.sin(rotation + skewY) * transform.scaleX,
    c: -Math.sin(rotation - skewX) * transform.scaleY,
    d: Math.cos(rotation - skewX) * transform.scaleY,
  };
}

function getDisplayLocalCenter(displayObject) {
  const bounds = displayObject.getLocalBounds?.();
  const x = Number(bounds?.x ?? bounds?.minX) || 0;
  const y = Number(bounds?.y ?? bounds?.minY) || 0;
  const width = Number(
    bounds?.width ??
      (Number(bounds?.maxX) - Number(bounds?.minX)),
  );
  const height = Number(
    bounds?.height ??
      (Number(bounds?.maxY) - Number(bounds?.minY)),
  );
  return {
    x: x + (Number.isFinite(width) ? width * 0.5 : 0),
    y: y + (Number.isFinite(height) ? height * 0.5 : 0),
  };
}

function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) <= 0.000001;
}

function resolveTexture(assets, model) {
  if (model.texture) {
    return model.texture;
  }
  if (model.frameName) {
    return assets.getAtlasTexture(model.frameName);
  }
  if (model.textureId ?? model.assetId) {
    return assets.getTexture(model.textureId ?? model.assetId);
  }
  throw new Error(
    'Transient icon models require texture, textureId/assetId, or frameName.',
  );
}

function validateItemDropTexture(assets, model) {
  if (model.baseFrameName && model.itemFrameName) {
    resolveTexture(assets, { frameName: model.baseFrameName });
    resolveTexture(assets, { frameName: model.itemFrameName });
    return;
  }
  resolveTexture(assets, model);
}

function validateSpendTexture(assets, model) {
  resolveTexture(assets, model);
}

function validateInlineIconTexture(assets, model) {
  if (model.baseFrameName && model.itemFrameName) {
    resolveTexture(assets, { frameName: model.baseFrameName });
    resolveTexture(assets, { frameName: model.itemFrameName });
    return;
  }
  resolveTexture(assets, model);
}

function randomBetween(minimum, maximum, random = Math.random) {
  return minimum + random() * (maximum - minimum);
}

function formatItemQuantity(
  prefix,
  item,
  quantity = 1,
  trailingText = '',
) {
  const count = Number.isFinite(quantity)
    ? Math.max(1, Math.floor(quantity))
    : 1;
  return `${prefix} ${item?.label ?? 'item'}${count > 1 ? ` x${count}` : ''}${trailingText}`;
}

const ITEM_DROP_FRAMES = Object.freeze([
  Object.freeze([0, 0, 0.7, 0.7, -10, 0]),
  Object.freeze([0.04, 0, 1, 1, -10, 1]),
  Object.freeze([0.09, -19, 1, 1, -7, 1]),
  Object.freeze([0.14, -33, 1, 1, -4, 1]),
  Object.freeze([0.19, -41, 1, 1, -1, 1]),
  Object.freeze([0.24, -44, 1, 1, 2, 1]),
  Object.freeze([0.28, -43, 1, 1, 3, 1]),
  Object.freeze([0.33, -40, 1, 1, 5, 1]),
  Object.freeze([0.38, -34, 1, 1, 6, 1]),
  Object.freeze([0.42, -27, 1, 1, 8, 1]),
  Object.freeze([0.47, -17, 1, 1, 10, 1]),
  Object.freeze([0.51, -7, 1, 1, 11, 1]),
  Object.freeze([0.56, 8, 1, 1, 13, 1]),
  Object.freeze([0.6, 22, 1.1, 0.9, 14, 1]),
  Object.freeze([0.66, 12, 1, 1, 14, 1]),
  Object.freeze([0.71, 22, 1.05, 0.95, 14, 1]),
  Object.freeze([0.74, 22, 1, 1, 14, 1]),
  Object.freeze([0.85, 22, 1, 1, 14, 1]),
  Object.freeze([1, 22, 0.95, 0.95, 14, 0]),
]);

const SEED_BURST_EASING = Object.freeze({
  pop: Object.freeze([0.61, 1, 0.88, 1]),
  bounceUp: Object.freeze([0.61, 1, 0.88, 1]),
  bounceDown: Object.freeze([0.12, 0, 0.39, 0]),
  settle: Object.freeze([0.37, 0, 0.63, 1]),
});

const SEED_BURST_FRAMES = Object.freeze([
  seedBurstFrame(0, 0, 0, false, 0.7, 0.7, 0, 0, SEED_BURST_EASING.pop),
  seedBurstFrame(0.04, 0, 0, false, 1, 1, 0, 1),
  seedBurstFrame(0.09, 0.089, 0.43, false, 1, 1, 0.07, 1),
  seedBurstFrame(0.14, 0.179, 0.75, false, 1, 1, 0.16, 1),
  seedBurstFrame(0.19, 0.268, 0.93, false, 1, 1, 0.27, 1),
  seedBurstFrame(0.24, 0.357, 1, false, 1, 1, 0.4, 1),
  seedBurstFrame(0.28, 0.429, 0.98, false, 1, 1, 0.47, 1),
  seedBurstFrame(0.33, 0.518, 0.91, false, 1, 1, 0.55, 1),
  seedBurstFrame(0.38, 0.607, 0.77, false, 1, 1, 0.62, 1),
  seedBurstFrame(0.42, 0.679, 0.61, false, 1, 1, 0.7, 1),
  seedBurstFrame(0.47, 0.768, 0.39, false, 1, 1, 0.78, 1),
  seedBurstFrame(0.51, 0.839, 0.16, false, 1, 1, 0.85, 1),
  seedBurstFrame(0.56, 0.929, -0.18, false, 1, 1, 0.93, 1),
  seedBurstFrame(
    0.6,
    1,
    22,
    true,
    1.1,
    0.9,
    1,
    1,
    SEED_BURST_EASING.bounceUp,
  ),
  seedBurstFrame(
    0.66,
    1,
    12,
    true,
    1,
    1,
    1,
    1,
    SEED_BURST_EASING.bounceDown,
  ),
  seedBurstFrame(
    0.71,
    1,
    22,
    true,
    1.05,
    0.95,
    1,
    1,
    SEED_BURST_EASING.settle,
  ),
  seedBurstFrame(0.74, 1, 22, true, 1, 1, 1, 1),
  seedBurstFrame(
    0.85,
    1,
    22,
    true,
    1,
    1,
    1,
    1,
    SEED_BURST_EASING.settle,
  ),
  seedBurstFrame(1, 1, 22, true, 0.95, 0.95, 1, 0),
]);

function seedBurstFrame(
  progress,
  xFactor,
  yValue,
  yAbsolute,
  scaleX,
  scaleY,
  rotationFactor,
  alpha,
  easing = null,
) {
  return Object.freeze({
    progress,
    xFactor,
    yValue,
    yAbsolute,
    scaleX,
    scaleY,
    rotationFactor,
    alpha,
    easing,
  });
}

function interpolateSeedBurstFrame(
  progress,
  tossX,
  tossPeak,
  tossRotation,
  target,
) {
  const safeProgress = Math.max(0, Math.min(1, progress));
  let rightIndex = SEED_BURST_FRAMES.findIndex(
    (frame) => frame.progress >= safeProgress,
  );
  if (rightIndex < 0) {
    rightIndex = SEED_BURST_FRAMES.length - 1;
  }
  const right = SEED_BURST_FRAMES[rightIndex];
  const left =
    SEED_BURST_FRAMES[Math.max(0, rightIndex - 1)];
  const duration = right.progress - left.progress;
  const linear =
    duration <= 0
      ? 0
      : (safeProgress - left.progress) / duration;
  const local = left.easing
    ? cubicBezier(linear, ...left.easing)
    : linear;
  const leftY = left.yAbsolute
    ? left.yValue
    : tossPeak * left.yValue;
  const rightY = right.yAbsolute
    ? right.yValue
    : tossPeak * right.yValue;
  target.x =
    tossX * interpolateValue(left.xFactor, right.xFactor, local);
  target.y = interpolateValue(leftY, rightY, local);
  target.scaleX = interpolateValue(
    left.scaleX,
    right.scaleX,
    local,
  );
  target.scaleY = interpolateValue(
    left.scaleY,
    right.scaleY,
    local,
  );
  target.rotation =
    tossRotation *
    interpolateValue(
      left.rotationFactor,
      right.rotationFactor,
      local,
    );
  target.alpha = interpolateValue(
    left.alpha,
    right.alpha,
    local,
  );
  return target;
}

function interpolateItemDropFrame(progress, sign) {
  const frame = interpolateFrames(ITEM_DROP_FRAMES, progress);
  return {
    y: frame[1],
    scaleX: frame[2],
    scaleY: frame[3],
    rotation: ((frame[4] * sign) * Math.PI) / 180,
    alpha: frame[5],
  };
}

function interpolateRewardIconFrame(progress) {
  const frame = interpolateFrames(
    [
      [0, -6, 0.94, 0.94, 0],
      [0.5, 1, 1.035, 0.97, 1],
      [0.78, 0, 0.995, 1.005, 1],
      [1, 0, 1, 1, 1],
    ],
    progress,
  );
  return {
    y: frame[1],
    scaleX: frame[2],
    scaleY: frame[3],
    alpha: frame[4],
  };
}

function interpolateFrames(frames, progress) {
  const safeProgress = Math.max(0, Math.min(1, progress));
  let right = frames.findIndex((frame) => frame[0] >= safeProgress);
  if (right <= 0) {
    return frames[Math.max(0, right)];
  }
  if (right < 0) {
    return frames.at(-1);
  }
  const leftFrame = frames[right - 1];
  const rightFrame = frames[right];
  const local =
    (safeProgress - leftFrame[0]) /
    Math.max(0.0001, rightFrame[0] - leftFrame[0]);
  return leftFrame.map((value, index) =>
    index === 0
      ? safeProgress
      : lerp(value, rightFrame[index], local),
  );
}

function cubicBezier(progress, x1, y1, x2, y2) {
  const target = Math.max(0, Math.min(1, progress));
  let low = 0;
  let high = 1;
  let time = target;
  for (let index = 0; index < 10; index += 1) {
    const x = cubicPoint(time, x1, x2);
    if (Math.abs(x - target) < 0.00001) {
      break;
    }
    if (x < target) {
      low = time;
    } else {
      high = time;
    }
    time = (low + high) / 2;
  }
  return cubicPoint(time, y1, y2);
}

function cubicPoint(time, first, second) {
  const inverse = 1 - time;
  return (
    3 * inverse * inverse * time * first +
    3 * inverse * time * time * second +
    time * time * time
  );
}

function interpolateValue(from, to, progress) {
  return from + (to - from) * progress;
}

function lerp(from, to, progress) {
  return from + (to - from) * Math.max(0, Math.min(1, progress));
}

function acquireBoundWidget(pool, bind) {
  const widget = pool.acquire();
  try {
    bind(widget);
    return widget;
  } catch (error) {
    pool.release(widget);
    throw error;
  }
}
