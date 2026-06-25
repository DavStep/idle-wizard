import { appendTextWithItemIcons } from './itemIconLabel.js';
import { createAssetAtlasSprite } from '../../assets/atlas/atlasSprite.js';
import { getHerbIconFrameName, getHerbIconKeyByLabel } from '../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
  getPotionIconKeyByLabel,
} from '../../assets/items/potions/potionIcons.js';
import { getSeedIconFrameName, seedIconVariantFrameNames } from '../../assets/items/seeds/seedIcons.js';
import { formatCoinPriceText } from '../../shared/coinPrice.js';

const FLYOUT_LIFETIME_MS = 1200;
const FLYOUT_LIST_STAGGER_MS = 55;
const FLYOUT_BURST_WINDOW_MS = 90;
const MAX_FLYOUT_STAGGER_INDEX = 5;
const MAX_ACTIVE_TEXT_FLYOUTS = 10;
const MAX_POOLED_FLYOUTS = MAX_ACTIVE_TEXT_FLYOUTS;
const ITEM_DROP_LIFETIME_MS = 1300;
const COIN_TARGET_PULSE_MS = 340;
const COIN_AMOUNT_POP_MS = 820;
const COIN_PARTICLE_MIN_COUNT = 3;
const COIN_PARTICLE_MAX_COUNT = 4;
const COIN_PARTICLE_ACTIVE_CAP = 8;
const COIN_PARTICLE_BASE_DURATION_MS = 540;
const COIN_PARTICLE_DURATION_VARIANCE_MS = 150;
const COIN_PARTICLE_STAGGER_MS = 24;
const COIN_PARTICLE_DELAY_VARIANCE_MS = 18;
const MAX_VISUAL_ITEM_DROPS = 12;

export class RewardFlyoutManager {
  constructor({ rootClassName = 'room-reward-flyouts', flyoutClassName = 'room-reward-flyout' } = {}) {
    this.rootClassName = rootClassName;
    this.flyoutClassName = flyoutClassName;
    this.root = null;
    this.timeouts = new Set();
    this.visualNodes = new Set();
    this.flyoutPool = [];
    this.flyoutTimeouts = new Map();
    this.lastTextFlyoutAtMs = Number.NEGATIVE_INFINITY;
    this.textFlyoutBurstIndex = 0;
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = this.rootClassName;
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-atomic', 'false');
    parent.append(this.root);

    return this.root;
  }

  show(message, { flyoutKey = null, visualOnly = false, delayMs = null } = {}) {
    if (!this.root || !message) {
      return null;
    }

    if (!visualOnly) {
      this.releaseOldestActiveTextFlyoutIfNeeded();
    }

    const flyout = this.acquireFlyout();
    const safeDelayMs =
      delayMs === null || delayMs === undefined
        ? this.getBurstDelay({ visualOnly })
        : this.normalizeDelay(delayMs);
    this.prepareFlyout(flyout, message, { flyoutKey, visualOnly, delayMs: safeDelayMs });
    this.root.append(flyout);

    const timeoutId = window.setTimeout(() => {
      this.flyoutTimeouts.delete(flyout);
      this.timeouts.delete(timeoutId);
      this.releaseFlyout(flyout);
    }, FLYOUT_LIFETIME_MS + safeDelayMs);

    this.timeouts.add(timeoutId);
    this.flyoutTimeouts.set(flyout, timeoutId);
    return flyout;
  }

  showList(items, { staggerMs = FLYOUT_LIST_STAGGER_MS } = {}) {
    if (!Array.isArray(items)) {
      return [];
    }

    const flyouts = [];
    const safeStaggerMs = this.normalizeDelay(staggerMs);
    let displayIndex = 0;

    for (const item of items) {
      const { message, options } = this.normalizeListItem(item);

      if (!message) {
        continue;
      }

      const delayMs = this.normalizeDelay(options.delayMs) + displayIndex * safeStaggerMs;
      const flyout = this.show(message, { ...options, delayMs });

      if (flyout) {
        flyouts.push(flyout);
        displayIndex += 1;
      }
    }

    return flyouts;
  }

  normalizeListItem(item) {
    if (typeof item === 'string') {
      return { message: item, options: {} };
    }

    if (!item || typeof item !== 'object') {
      return { message: '', options: {} };
    }

    const { message = '', ...options } = item;
    return {
      message: String(message),
      options,
    };
  }

  normalizeDelay(delayMs) {
    const numericDelay = Number(delayMs);
    return Number.isFinite(numericDelay) ? Math.max(0, numericDelay) : 0;
  }

  getBurstDelay({ visualOnly }) {
    if (visualOnly) {
      return 0;
    }

    const now = Date.now();

    if (now - this.lastTextFlyoutAtMs > FLYOUT_BURST_WINDOW_MS) {
      this.textFlyoutBurstIndex = 0;
    } else {
      this.textFlyoutBurstIndex += 1;
    }

    this.lastTextFlyoutAtMs = now;
    return Math.min(this.textFlyoutBurstIndex, MAX_FLYOUT_STAGGER_INDEX) * FLYOUT_LIST_STAGGER_MS;
  }

  acquireFlyout() {
    return this.flyoutPool.pop() ?? document.createElement('div');
  }

  releaseOldestActiveTextFlyoutIfNeeded() {
    if (!this.root) {
      return false;
    }

    const textFlyouts = [...this.root.children].filter((child) =>
      this.isActiveTextFlyout(child),
    );

    if (textFlyouts.length < MAX_ACTIVE_TEXT_FLYOUTS) {
      return false;
    }

    this.releaseFlyout(textFlyouts[0]);
    return true;
  }

  isActiveTextFlyout(node) {
    return node instanceof window.HTMLElement && !node.classList.contains('is-visual-only');
  }

  prepareFlyout(flyout, message, { flyoutKey, visualOnly, delayMs }) {
    flyout.replaceChildren();
    flyout.removeAttribute('style');
    flyout.className = this.flyoutClassName;
    flyout.setAttribute('role', 'status');

    if (flyoutKey) {
      flyout.dataset.flyoutKey = flyoutKey;
    } else {
      delete flyout.dataset.flyoutKey;
    }

    flyout.classList.toggle('is-visual-only', visualOnly);

    if (delayMs > 0) {
      flyout.style.animationDelay = `${delayMs}ms`;
    }

    appendTextWithItemIcons(flyout, message);
  }

  releaseFlyout(flyout) {
    const timeoutId = this.flyoutTimeouts.get(flyout);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      this.timeouts.delete(timeoutId);
      this.flyoutTimeouts.delete(flyout);
    }

    flyout.remove();
    flyout.replaceChildren();
    flyout.removeAttribute('style');
    delete flyout.dataset.flyoutKey;
    flyout.className = this.flyoutClassName;

    if (this.flyoutPool.length < MAX_POOLED_FLYOUTS) {
      this.flyoutPool.push(flyout);
    }
  }

  showReward(event) {
    const visualPlayed = this.shouldPlayVisualDrops()
      ? this.playRewardVisual(event) > 0
      : false;
    const flyout = this.show(this.formatRewardMessage(event), {
      visualOnly: visualPlayed && !this.shouldKeepRewardMessageVisible(event),
    });

    return flyout;
  }

  shouldKeepRewardMessageVisible(event) {
    return event?.type === 'personal_task_reward_claimed';
  }

  shouldPlayVisualDrops() {
    return document.documentElement.dataset.styleIcons === 'icons' && !this.prefersReducedMotion();
  }

  prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  playRewardVisual(event) {
    if (!event) {
      return 0;
    }

    if (event.type === 'seed_summoned') {
      return this.playItemDrop(
        this.getSeedDropSources(event),
        this.getAnchorForEvent(event),
        'seed',
      );
    }

    if (event.type === 'herb_harvested') {
      return this.playItemDrop(
        this.getItemDropSource(event.herb, 'herb'),
        this.getAnchorForEvent(event),
        'herb',
      );
    }

    if (event.type === 'potion_collected') {
      return this.playItemDrop(
        this.getItemDropSource(event.potion, 'potion'),
        this.getAnchorForEvent(event),
        'potion',
      );
    }

    if (event.type === 'item_sold') {
      const itemAnchor = this.getAnchorForEvent(event);
      const coinAnchor = this.getShopSlotCoinAnchor(event.slotNumber) ?? itemAnchor;
      const itemDropCount = this.playItemDrop(
        this.getItemDropSource(event.item, event.item?.kind),
        itemAnchor,
        event.item?.kind,
      );
      const coinCount = this.animateCoinsToCoin(
        coinAnchor,
        event.coin ?? 0,
        this.formatRewardMessage(event),
      );
      return itemDropCount + coinCount;
    }

    if (event.type === 'item_bought') {
      return this.playItemDrop(
        this.getRepeatedItemDropSources(event.item, event.item?.kind, event.quantity),
        this.getAnchorForEvent(event),
        event.item?.kind,
      );
    }

    if (event.type === 'coin_collected') {
      const anchor = this.getAnchorForEvent(event);
      return this.animateCoinsToCoin(
        anchor,
        event.coin ?? 0,
        this.formatRewardMessage(event),
      );
    }

    if (event.type === 'personal_task_reward_claimed') {
      return this.animateCoinsToCoin(
        this.getAnchorForEvent(event),
        event.coin ?? 0,
        this.formatRewardMessage(event),
      );
    }

    return 0;
  }

  getAnchorForEvent(event) {
    if (!this.root) {
      return null;
    }

    if (event.type === 'seed_summoned') {
      return this.getWorkshopSummonAnchor();
    }

    if (event.type === 'herb_harvested' && Number.isInteger(event.tileNumber)) {
      return this.getGardenHarvestAnchor(event.tileNumber);
    }

    if (event.type === 'potion_collected') {
      return this.getBrewingPotionAnchor(event);
    }

    if (event.type === 'item_sold' && Number.isInteger(event.slotNumber)) {
      return this.getShopSlotItemAnchor(event.slotNumber);
    }

    if (event.type === 'item_bought') {
      return this.getShopBoughtItemAnchor(event);
    }

    if (event.type === 'coin_collected') {
      return this.getCoinCollectionAnchor(event.source);
    }

    if (event.type === 'personal_task_reward_claimed') {
      return this.getPersonalTaskRewardAnchor(event);
    }

    return this.root.parentElement;
  }

  getPersonalTaskRewardAnchor(event) {
    const root = this.root?.closest('.game-stage') ?? document;
    const periodType = String(event?.periodType ?? '');
    const taskId = String(event?.taskId ?? '');
    const claimButtons = [...root.querySelectorAll('.workshop-page__personal-task-claim')];

    return (
      claimButtons.find((button) => {
        if (button.dataset.personalTaskPeriodType !== periodType) {
          return false;
        }

        if (event?.fullClear === true) {
          return button.dataset.personalTaskFullClear === 'true';
        }

        return button.dataset.personalTaskId === taskId;
      }) ??
      root.querySelector('.workshop-page__personal-tasks-dialog') ??
      root.querySelector('.workshop-page__personal-tasks-open') ??
      this.root?.parentElement
    );
  }

  getWorkshopSummonAnchor() {
    const summonAnchor =
      this.root?.parentElement?.querySelector('.workshop-page__summon-circle') ??
      this.root?.parentElement?.querySelector('.workshop-page__summon-button');
    const rect = this.getElementRect(summonAnchor);

    if (!rect) {
      return summonAnchor;
    }

    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height * 0.3,
    };
  }

  getCoinCollectionAnchor(source) {
    if (source === 'shop_coin_offer') {
      return (
        this.root?.parentElement?.querySelector('.shop-page__coin-offer-action') ??
        this.root?.parentElement?.querySelector('.shop-page__coin-offer-reward')
      );
    }

    if (source === 'player_shop_proceeds') {
      return this.root?.parentElement?.querySelector('.shop-page__claim-proceeds-button');
    }

    return this.root?.parentElement ?? null;
  }

  getShopSlotItemAnchor(slotNumber) {
    if (!Number.isInteger(slotNumber)) {
      return null;
    }

    return this.root?.parentElement?.querySelector(
      `.shop-page__slot-row[data-shop-slot-number="${slotNumber}"] .shop-page__slot-item-value`,
    );
  }

  getShopSlotCoinAnchor(slotNumber) {
    if (!Number.isInteger(slotNumber)) {
      return null;
    }

    return this.root?.parentElement?.querySelector(
      `.shop-page__slot-row[data-shop-slot-number="${slotNumber}"] .shop-page__slot-price-value`,
    );
  }

  getShopBoughtItemAnchor(event) {
    if (event.source === 'npc_stock') {
      return (
        this.getNpcStockBuyDialogAnchor(event.item?.key) ??
        this.getNpcStockRowAnchor(event.item?.key) ??
        this.root?.parentElement?.querySelector('.shop-page__stock')
      );
    }

    if (event.source === 'player_market') {
      return (
        this.getPlayerMarketListingAnchor(event.listingKey) ??
        this.getPlayerMarketItemAnchor(event.item?.key) ??
        this.root?.parentElement?.querySelector('.shop-page__market-dialog')
      );
    }

    return this.root?.parentElement ?? null;
  }

  getNpcStockBuyDialogAnchor(itemKey) {
    const popup = this.root?.parentElement?.querySelector(
      '.shop-page__stock-buy-popup:not([hidden])',
    );
    return this.findElementByDataset(
      popup,
      '[data-shop-stock-item-key]',
      'shopStockItemKey',
      itemKey,
    );
  }

  getNpcStockRowAnchor(itemKey) {
    const row = this.findElementByDataset(
      this.root?.parentElement,
      '.shop-page__stock-row',
      'shopStockItemKey',
      itemKey,
    );
    return row?.querySelector('.row_key') ?? row;
  }

  getPlayerMarketListingAnchor(listingKey) {
    const row = this.findElementByDataset(
      this.root?.parentElement,
      '.shop-page__market-row',
      'shopMarketListingKey',
      listingKey,
    );
    return row?.querySelector('.row_key') ?? row;
  }

  getPlayerMarketItemAnchor(itemKey) {
    const row = this.findElementByDataset(
      this.root?.parentElement,
      '.shop-page__market-row',
      'shopMarketItemKey',
      itemKey,
    );
    return row?.querySelector('.row_key') ?? row;
  }

  findElementByDataset(root, selector, datasetKey, value) {
    if (!root || value === null || value === undefined) {
      return null;
    }

    const expectedValue = String(value);
    return (
      [...root.querySelectorAll(selector)].find(
        (element) => element.dataset?.[datasetKey] === expectedValue,
      ) ?? null
    );
  }

  getGardenHarvestAnchor(tileNumber) {
    const row = this.root?.parentElement?.querySelector(
      `.garden-page__plot-row[data-garden-tile-number="${tileNumber}"]`,
    );
    const plant = row?.querySelector('.garden-page__plot-plant:not([hidden])');
    const plantRect = this.getElementRect(plant);

    if (plantRect) {
      return {
        x: plantRect.left + plantRect.width / 2,
        y: plantRect.top + plantRect.height / 2,
      };
    }

    const boxFrame = row?.querySelector('.garden-page__plot-box-frame');
    const boxFrameRect = this.getElementRect(boxFrame);

    if (boxFrameRect) {
      return {
        x: boxFrameRect.left + boxFrameRect.width / 2,
        y: boxFrameRect.top + boxFrameRect.height * 0.62,
      };
    }

    const progress = row?.querySelector('.garden-page__plot-progress');
    const progressRect =
      progress && !progress.hidden ? this.getElementRect(progress) : null;

    if (progressRect) {
      return {
        x: progressRect.right,
        y: progressRect.top + progressRect.height / 2,
      };
    }

    return row;
  }

  getBrewingPotionAnchor(event) {
    const cauldronIndex = Number(event?.cauldronIndex);
    const root = this.root?.parentElement;
    const cauldronSelector = Number.isInteger(cauldronIndex)
      ? `.brewing-page__cauldron[data-cauldron-index="${cauldronIndex}"]`
      : '.brewing-page__cauldron';
    const cauldron = root?.querySelector(cauldronSelector);

    return (
      cauldron?.querySelector('.brewing-page__cauldron-potion-icon:not([hidden])') ??
      cauldron ??
      root?.querySelector('.brewing-page__cauldron-potion-icon:not([hidden])') ??
      root?.querySelector('.brewing-page__cauldron') ??
      root
    );
  }

  getSeedDropSources(event) {
    const sources = [];
    const seedCounts = Array.isArray(event.seedCounts) ? event.seedCounts : [];
    const visualQuantity = this.getVisualDropQuantity(event.quantity);

    for (const seedCount of seedCounts) {
      const remaining = visualQuantity - sources.length;
      const quantity = Math.min(this.normalizeQuantity(seedCount.quantity), remaining);
      const source = this.getSeedDropSource(seedCount.seed);

      for (let index = 0; index < quantity; index += 1) {
        sources.push(source);
      }

      if (sources.length >= visualQuantity) {
        break;
      }
    }

    if (sources.length > 0) {
      return sources.slice(0, visualQuantity);
    }

    return Array.from({ length: visualQuantity }, () =>
      this.getSeedDropSource(event.seed),
    );
  }

  getSeedDropSource(seed) {
    const herbKey = this.getHerbKeyForSeed(seed);
    const itemFrameName = herbKey ? getHerbIconFrameName(herbKey) : null;

    if (!itemFrameName) {
      return getSeedIconFrameName();
    }

    return {
      packFrameName: this.getSeedPackBaseFrameName(seed),
      itemFrameName,
    };
  }

  getSeedPackBaseFrameName(seed) {
    if (seed?.rarity === 'legendary') {
      return seedIconVariantFrameNames.black;
    }

    if (seed?.rarity === 'rare') {
      return seedIconVariantFrameNames.gray;
    }

    return seedIconVariantFrameNames.regular;
  }

  getHerbKeyForSeed(seed) {
    const key = String(seed?.key ?? '');

    if (key.endsWith('Seed')) {
      return `${key.slice(0, -'Seed'.length)}Herb`;
    }

    const label = String(seed?.label ?? '').replace(/\s+seed$/i, '');
    return getHerbIconKeyByLabel(label);
  }

  getItemDropSource(item, kind) {
    const normalizedKind = String(kind ?? item?.kind ?? '').trim();

    if (normalizedKind === 'seed') {
      return this.getSeedDropSource(item);
    }

    if (normalizedKind === 'herb') {
      const key = item?.key ?? getHerbIconKeyByLabel(item?.label);
      return getHerbIconFrameName(key);
    }

    if (normalizedKind === 'potion') {
      const key = item?.key ?? getPotionIconKeyByLabel(item?.label);
      return getPotionIconFrameName(key);
    }

    return null;
  }

  getRepeatedItemDropSources(item, kind, quantity = 1) {
    const source = this.getItemDropSource(item, kind);

    if (!source) {
      return [];
    }

    return Array.from({ length: this.getVisualDropQuantity(quantity) }, () => source);
  }

  playItemDrop(src, anchor, kind) {
    if (!src || !anchor) {
      return 0;
    }

    const rawSources = Array.isArray(src) ? src : [src];
    const sources = rawSources.filter((source) => {
      if (typeof source === 'string') {
        return source.length > 0;
      }

      return source?.packFrameName && source?.itemFrameName;
    }).slice(0, MAX_VISUAL_ITEM_DROPS);

    if (sources.length === 0) {
      return 0;
    }

    const visualParent = this.getVisualNodeParent();
    const anchorPoint = this.getAnchorPoint(anchor, { relativeTo: visualParent });
    if (!anchorPoint) {
      return 0;
    }

    const normalizedKind = ['seed', 'herb', 'potion'].includes(kind) ? kind : 'seed';
    const baseX = anchorPoint.x;
    const baseY = anchorPoint.y;
    const count = sources.length;

    for (const [index, source] of sources.entries()) {
      const t = count === 1 ? 0.5 : index / (count - 1);
      const seedBurst = normalizedKind === 'seed';
      const spread = seedBurst ? 0 : Math.min(56, 18 + count * 8);
      const xOffset = seedBurst ? 0 : (t - 0.5) * spread;
      const delay = seedBurst ? Math.random() * 140 : index * 60;
      const dropAnchor = document.createElement('span');
      dropAnchor.className = `room-item-drop-anchor is-${normalizedKind}`;
      this.positionVisualNode(dropAnchor, visualParent, {
        x: baseX + xOffset,
        y: baseY,
      });

      const drop = this.createItemDropElement({
        source,
        seedBurst,
      });

      if (seedBurst) {
        this.setSeedBurstProperties(drop, count, t);
      }

      if (delay > 0) {
        drop.style.animationDelay = `${delay}ms`;
      }

      dropAnchor.append(drop);
      this.appendVisualNode(dropAnchor, visualParent);
      const remove = () => this.removeVisualNode(dropAnchor);
      drop.addEventListener('animationend', remove, { once: true });
      this.setManagedTimeout(remove, ITEM_DROP_LIFETIME_MS + delay);
    }

    return sources.length;
  }

  getAnchorPoint(anchor, { relativeTo = null } = {}) {
    const origin = this.getCoordinateSpaceOrigin(relativeTo);

    if (Number.isFinite(anchor?.x) && Number.isFinite(anchor?.y)) {
      return {
        x: anchor.x - origin.left,
        y: anchor.y - origin.top,
      };
    }

    const rect = this.getElementRect(anchor);

    if (!rect) {
      return null;
    }

    return {
      x: rect.left - origin.left + rect.width / 2,
      y: rect.top - origin.top + rect.height / 2,
    };
  }

  getVisualNodeParent() {
    return this.root?.closest('.game-stage') ?? document.body;
  }

  getCoordinateSpaceOrigin(parent) {
    if (!parent || parent === document.body) {
      return { left: 0, top: 0 };
    }

    const rect = parent.getBoundingClientRect?.();

    if (!rect) {
      return { left: 0, top: 0 };
    }

    return {
      left: rect.left + (parent.clientLeft ?? 0),
      top: rect.top + (parent.clientTop ?? 0),
    };
  }

  positionVisualNode(node, parent, point) {
    node.style.position = parent === document.body ? 'fixed' : 'absolute';
    node.style.left = `${point.x}px`;
    node.style.top = `${point.y}px`;
  }

  getElementRect(element) {
    const rect = element?.getBoundingClientRect?.();

    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return rect;
  }

  createItemDropElement({ source, seedBurst }) {
    const dropClassName = seedBurst
      ? 'room-item-drop is-seed-burst'
      : `room-item-drop${Math.random() < 0.5 ? ' is-angle-left' : ''}`;

    if (typeof source === 'string') {
      return createAssetAtlasSprite(dropClassName, source);
    }

    const compositeDrop = document.createElement('span');
    compositeDrop.className = `${dropClassName} room-seed-pack-composite`;

    const pack = createAssetAtlasSprite('room-seed-pack-base', source.packFrameName);
    const item = createAssetAtlasSprite('room-seed-pack-item', source.itemFrameName);

    compositeDrop.append(pack, item);
    return compositeDrop;
  }

  setSeedBurstProperties(drop, count, t) {
    const sliceCenter = count === 1 ? 0 : (t - 0.5) * 2;
    const angleDeg = sliceCenter * 50 + (Math.random() - 0.5) * 70;
    const distance = 40 + Math.random() * 60;
    const tx = Math.sin((angleDeg * Math.PI) / 180) * distance;
    const peak = -(22 + Math.random() * 34);
    const ry = (Math.random() - 0.5) * 90;
    drop.style.setProperty('--toss-tx', `${tx.toFixed(1)}px`);
    drop.style.setProperty('--toss-ry', `${ry.toFixed(1)}deg`);
    drop.style.setProperty('--toss-peak', `${peak.toFixed(1)}px`);
  }

  animateCoinsToCoin(source, amount, title) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) {
      return 0;
    }

    const target =
      document.querySelector('.room-top-panel__resource[aria-label="coin"]') ??
      document.querySelector('.room-top-panel__resource-val');

    if (!target) {
      return 0;
    }

    const visualParent = this.getVisualNodeParent();
    const origin = this.getCoordinateSpaceOrigin(visualParent);
    const targetRect = target.getBoundingClientRect();
    const sourceRect = source?.getBoundingClientRect();
    const hasSource = Boolean(sourceRect && sourceRect.width > 0 && sourceRect.height > 0);
    const from = hasSource
      ? {
          x: sourceRect.left - origin.left + sourceRect.width * 0.5,
          y: sourceRect.top - origin.top + sourceRect.height * 0.44,
        }
      : {
          x: targetRect.left - origin.left + targetRect.width * 0.56,
          y: targetRect.bottom - origin.top + Math.max(58, targetRect.height * 1.9),
        };
    const to = {
      x: targetRect.left - origin.left + targetRect.width * 0.5,
      y: targetRect.top - origin.top + targetRect.height * 0.55,
    };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const coinCount = this.getCoinParticleCount(safeAmount, visualParent);
    let maxLife = 0;

    for (let index = 0; index < coinCount; index += 1) {
      const t = coinCount === 1 ? 0.5 : index / (coinCount - 1);
      const burstAngle =
        -Math.PI / 2 + (t - 0.5) * (Math.PI * 0.82) + (Math.random() - 0.5) * 0.28;
      const burstDist = 30 + Math.random() * 34;
      const bx = Math.cos(burstAngle) * burstDist;
      const by = Math.sin(burstAngle) * burstDist;
      const midX = (bx + dx) * 0.5;
      const midY = (by + dy) * 0.5;
      const lift = 64 + Math.abs(dx - bx) * 0.16 + Math.random() * 30;
      const ctrlX = midX + (Math.random() - 0.5) * 38;
      const ctrlY = midY - lift;
      const rot = (Math.random() - 0.5) * 680;
      const dur = COIN_PARTICLE_BASE_DURATION_MS + Math.random() * COIN_PARTICLE_DURATION_VARIANCE_MS;
      const delay = index * COIN_PARTICLE_STAGGER_MS + Math.random() * COIN_PARTICLE_DELAY_VARIANCE_MS;
      maxLife = Math.max(maxLife, delay + dur);

      const coin = createAssetAtlasSprite('room-coin-particle', 'resource:coin');
      this.positionVisualNode(coin, visualParent, from);
      this.appendVisualNode(coin, visualParent);
      const removeCoin = () => this.removeVisualNode(coin);
      const animation = this.animateElement(
        coin,
        this.buildCoinFlyKeyframes(bx, by, ctrlX, ctrlY, dx, dy, rot),
        {
          duration: dur,
          delay,
          easing: 'linear',
          fill: 'both',
        },
      );
      animation?.finished?.then(removeCoin, () => undefined);
      this.setManagedTimeout(removeCoin, delay + dur + 120);
    }

    const amountPop = document.createElement('div');
    amountPop.className = 'room-coin-amt-pop';
    amountPop.title = title;
    amountPop.textContent = `+${this.formatCoinFlyoutAmount(safeAmount)}G`;
    amountPop.style.animationDuration = `${COIN_AMOUNT_POP_MS}ms`;
    this.positionVisualNode(amountPop, visualParent, {
      x: from.x,
      y: from.y - 4,
    });
    this.appendVisualNode(amountPop, visualParent);
    const removeAmount = () => this.removeVisualNode(amountPop);
    amountPop.addEventListener('animationend', removeAmount, { once: true });
    this.setManagedTimeout(removeAmount, COIN_AMOUNT_POP_MS + 160);

    this.setManagedTimeout(() => this.pulseCoinTarget(target), Math.max(0, maxLife - 140));
    return coinCount + 1;
  }

  getCoinParticleCount(amount, visualParent) {
    const desiredCount = Math.max(
      COIN_PARTICLE_MIN_COUNT,
      Math.min(
        COIN_PARTICLE_MAX_COUNT,
        Math.round(2 + Math.log10(Math.max(1, amount)) * 0.9),
      ),
    );
    const activeCount = visualParent.querySelectorAll?.('.room-coin-particle').length ?? 0;
    const availableCount = Math.max(1, COIN_PARTICLE_ACTIVE_CAP - activeCount);

    return Math.min(desiredCount, availableCount);
  }

  buildCoinFlyKeyframes(bx, by, ctrlX, ctrlY, dx, dy, rot) {
    const stops = [];
    const createFrame = (offset, x, y, scale, r, opacity) => ({
      offset,
      opacity: Number(opacity.toFixed(2)),
      transform: `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${r.toFixed(1)}deg)`,
    });

    stops.push(createFrame(0, 0, 0, 0.3, 0, 0));
    stops.push(createFrame(0.09, bx * 0.45, by * 0.45, 1.2, rot * 0.12, 1));
    stops.push(createFrame(0.18, bx, by, 1, rot * 0.22, 1));

    const samples = 10;
    for (let sample = 1; sample <= samples; sample += 1) {
      const u = sample / samples;
      const omu = 1 - u;
      const x = omu * omu * bx + 2 * omu * u * ctrlX + u * u * dx;
      const y = omu * omu * by + 2 * omu * u * ctrlY + u * u * dy;
      const offset = 0.18 + (1 - 0.18) * u;
      const shrinkStart = 0.72;
      const scale =
        u <= shrinkStart ? 1 : 1 - Math.pow((u - shrinkStart) / (1 - shrinkStart), 1.4) * 0.45;
      const opacity = u < 0.88 ? 1 : Math.max(0, 1 - (u - 0.88) / 0.12) * 0.9;
      const r = rot * (0.22 + 0.78 * u);
      stops.push(createFrame(offset, x, y, scale, r, opacity));
    }

    return stops;
  }

  pulseCoinTarget(target) {
    const animation = this.animateElement(
      target,
      [
        { transform: 'scale(1)' },
        { offset: 0.45, transform: 'translateY(-1px) scale(1.02)' },
        { offset: 0.78, transform: 'translateY(0) scale(0.997)' },
        { transform: 'scale(1)' },
      ],
      {
        duration: COIN_TARGET_PULSE_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    );

    if (animation) {
      return;
    }

    target.classList.remove('is-receiving-coins');
    void target.offsetWidth;
    target.classList.add('is-receiving-coins');
    this.setManagedTimeout(() => target.classList.remove('is-receiving-coins'), COIN_TARGET_PULSE_MS);
  }

  animateElement(element, keyframes, options) {
    if (typeof element?.animate !== 'function') {
      return null;
    }

    return element.animate(keyframes, options);
  }

  formatCoinFlyoutAmount(amount) {
    return Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
  }

  appendVisualNode(node, parent = document.body) {
    parent.append(node);
    this.visualNodes.add(node);
  }

  removeVisualNode(node) {
    node.remove();
    this.visualNodes.delete(node);
  }

  setManagedTimeout(callback, delay) {
    const timeoutId = window.setTimeout(() => {
      this.timeouts.delete(timeoutId);
      callback();
    }, delay);

    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  normalizeQuantity(quantity) {
    return Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
  }

  getVisualDropQuantity(quantity) {
    return Math.min(MAX_VISUAL_ITEM_DROPS, this.normalizeQuantity(quantity));
  }

  formatRewardMessage(event) {
    if (!event) {
      return '';
    }

    if (event.message) {
      return String(event.message);
    }

    if (event.type === 'seed_summoned') {
      return this.formatSeedSummonMessage(event);
    }

    if (event.type === 'potion_collected') {
      return this.formatItemQuantity('collected', event.potion, event.quantity);
    }

    if (event.type === 'herb_harvested') {
      return this.formatItemQuantity('harvested', event.herb, event.quantity);
    }

    if (event.type === 'item_sold') {
      return this.formatItemQuantity(
        'sold',
        event.item,
        event.quantity,
        ` for ${formatCoinPriceText(event.coin ?? 0)}`,
      );
    }

    if (event.type === 'item_bought') {
      const trailingText = Number.isFinite(event.coin)
        ? ` for ${formatCoinPriceText(event.coin)}`
        : '';
      return this.formatItemQuantity('bought', event.item, event.quantity, trailingText);
    }

    if (event.type === 'coin_collected') {
      return `collected ${formatCoinPriceText(event.coin ?? 0)}`;
    }

    if (event.type === 'personal_task_reward_claimed') {
      return this.formatCurrencyRewardMessage(event);
    }

    return '';
  }

  formatSeedSummonMessage(event) {
    const quantity = Number.isFinite(event.quantity) ? event.quantity : 1;
    const seedCounts = Array.isArray(event.seedCounts) ? event.seedCounts : [];

    if (quantity <= 1 || seedCounts.length === 0) {
      return `${event.seed?.label ?? 'seed'} found`;
    }

    if (seedCounts.length === 1) {
      return `${seedCounts[0].seed?.label ?? 'seed'} x${quantity} found`;
    }

    return `${seedCounts
      .map((seedCount) => this.formatSeedCount(seedCount))
      .join(', ')} found`;
  }

  formatSeedCount({ seed, quantity = 1 } = {}) {
    const suffix = quantity > 1 ? ` x${quantity}` : '';
    return `${seed?.label ?? 'seed'}${suffix}`;
  }

  formatItemQuantity(prefix, item, quantity = 1, trailingText = '') {
    const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
    const suffix = safeQuantity > 1 ? ` x${safeQuantity}` : '';
    return `${prefix} ${item?.label ?? 'item'}${suffix}${trailingText}`;
  }

  formatCurrencyRewardMessage(event) {
    const parts = [];
    const coin = Math.max(0, Math.floor(Number(event?.coin) || 0));
    const crystal = Math.max(0, Math.floor(Number(event?.crystal) || 0));

    if (coin > 0) {
      parts.push(`+${formatCoinPriceText(coin)}`);
    }

    if (crystal > 0) {
      parts.push(`+${crystal} crystal`);
    }

    return parts.join(', ') || 'reward claimed';
  }

  unmount() {
    for (const timeoutId of this.timeouts) {
      window.clearTimeout(timeoutId);
    }

    this.timeouts.clear();
    this.flyoutTimeouts.clear();
    this.flyoutPool = [];
    for (const node of this.visualNodes) {
      node.remove();
    }
    this.visualNodes.clear();
    this.root?.remove();
    this.root = null;
  }
}
