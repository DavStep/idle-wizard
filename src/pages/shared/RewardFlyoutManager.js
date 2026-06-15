import { appendTextWithItemIcons } from './itemIconLabel.js';
import goldIconUrl from '../../assets/icons/icon-gold-coin.png';
import { getHerbIconKeyByLabel, getHerbIconUrl } from '../../assets/items/herbs/herbIcons.js';
import { getPotionIconKeyByLabel, getPotionIconUrl } from '../../assets/items/potions/potionIcons.js';
import { getSeedIconUrl, seedIconVariantUrls } from '../../assets/items/seeds/seedIcons.js';
import { formatGoldPriceText } from '../../shared/goldPrice.js';

const FLYOUT_LIFETIME_MS = 1200;
const ITEM_DROP_LIFETIME_MS = 1300;
const GOLD_TARGET_PULSE_MS = 520;

export class RewardFlyoutManager {
  constructor({ rootClassName = 'room-reward-flyouts', flyoutClassName = 'room-reward-flyout' } = {}) {
    this.rootClassName = rootClassName;
    this.flyoutClassName = flyoutClassName;
    this.root = null;
    this.timeouts = new Set();
    this.visualNodes = new Set();
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

  show(message) {
    if (!this.root || !message) {
      return null;
    }

    const flyout = document.createElement('div');
    flyout.className = this.flyoutClassName;
    flyout.setAttribute('role', 'status');
    appendTextWithItemIcons(flyout, message);
    this.root.append(flyout);

    const timeoutId = window.setTimeout(() => {
      this.timeouts.delete(timeoutId);
      flyout.remove();
    }, FLYOUT_LIFETIME_MS);

    this.timeouts.add(timeoutId);
    return flyout;
  }

  showReward(event) {
    const flyout = this.show(this.formatRewardMessage(event));

    if (this.shouldPlayVisualDrops()) {
      this.playRewardVisual(event);
    }

    return flyout;
  }

  shouldPlayVisualDrops() {
    return document.documentElement.dataset.styleIcons === 'icons' && !this.prefersReducedMotion();
  }

  prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  playRewardVisual(event) {
    if (!event) {
      return;
    }

    if (event.type === 'seed_summoned') {
      this.playItemDrop(this.getSeedDropSources(event), this.getAnchorForEvent(event), 'seed');
      return;
    }

    if (event.type === 'herb_harvested') {
      this.playItemDrop(this.getItemDropSource(event.herb, 'herb'), this.getAnchorForEvent(event), 'herb');
      return;
    }

    if (event.type === 'potion_collected') {
      this.playItemDrop(
        this.getItemDropSource(event.potion, 'potion'),
        this.getAnchorForEvent(event),
        'potion',
      );
      return;
    }

    if (event.type === 'item_sold') {
      const itemAnchor = this.getAnchorForEvent(event);
      const goldAnchor = this.getShopSlotGoldAnchor(event.slotNumber) ?? itemAnchor;
      this.playItemDrop(
        this.getItemDropSource(event.item, event.item?.kind),
        itemAnchor,
        event.item?.kind,
      );
      this.animateCoinsToGold(goldAnchor, event.gold ?? 0, this.formatRewardMessage(event));
    }

    if (event.type === 'gold_collected') {
      const anchor = this.getAnchorForEvent(event);
      this.animateCoinsToGold(anchor, event.gold ?? 0, this.formatRewardMessage(event));
    }
  }

  getAnchorForEvent(event) {
    if (!this.root) {
      return null;
    }

    if (event.type === 'seed_summoned') {
      return (
        this.root.parentElement?.querySelector('.workshop-page__summon-circle') ??
        this.root.parentElement?.querySelector('.workshop-page__summon-button')
      );
    }

    if (event.type === 'herb_harvested' && Number.isInteger(event.tileNumber)) {
      return this.getGardenHarvestAnchor(event.tileNumber);
    }

    if (event.type === 'potion_collected') {
      return (
        this.root.parentElement?.querySelector('.brewing-page__action-button[data-action="collect"]') ??
        this.root.parentElement?.querySelector('.brewing-page__cauldron')
      );
    }

    if (event.type === 'item_sold' && Number.isInteger(event.slotNumber)) {
      return this.getShopSlotItemAnchor(event.slotNumber);
    }

    if (event.type === 'gold_collected') {
      return this.getGoldCollectionAnchor(event.source);
    }

    return this.root.parentElement;
  }

  getGoldCollectionAnchor(source) {
    if (source === 'shop_gold_offer') {
      return (
        this.root?.parentElement?.querySelector('.shop-page__gold-offer-action') ??
        this.root?.parentElement?.querySelector('.shop-page__gold-offer-reward')
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

  getShopSlotGoldAnchor(slotNumber) {
    if (!Number.isInteger(slotNumber)) {
      return null;
    }

    return this.root?.parentElement?.querySelector(
      `.shop-page__slot-row[data-shop-slot-number="${slotNumber}"] .shop-page__slot-price-value`,
    );
  }

  getGardenHarvestAnchor(tileNumber) {
    const row = this.root?.parentElement?.querySelector(
      `.garden-page__plot-row[data-garden-tile-number="${tileNumber}"]`,
    );
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

  getSeedDropSources(event) {
    const sources = [];
    const seedCounts = Array.isArray(event.seedCounts) ? event.seedCounts : [];

    for (const seedCount of seedCounts) {
      const quantity = this.normalizeQuantity(seedCount.quantity);
      const source = this.getSeedDropSource(seedCount.seed);

      for (let index = 0; index < quantity; index += 1) {
        sources.push(source);
      }
    }

    if (sources.length > 0) {
      return sources.slice(0, this.normalizeQuantity(event.quantity));
    }

    return Array.from({ length: this.normalizeQuantity(event.quantity) }, () =>
      this.getSeedDropSource(event.seed),
    );
  }

  getSeedDropSource(seed) {
    const herbKey = this.getHerbKeyForSeed(seed);
    const itemSrc = herbKey ? getHerbIconUrl(herbKey) : null;

    if (!itemSrc) {
      return getSeedIconUrl();
    }

    return {
      packSrc: this.getSeedPackBaseSrc(seed),
      itemSrc,
    };
  }

  getSeedPackBaseSrc(seed) {
    if (seed?.rarity === 'legendary') {
      return seedIconVariantUrls.black;
    }

    if (seed?.rarity === 'rare') {
      return seedIconVariantUrls.gray;
    }

    return seedIconVariantUrls.regular;
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
      return getHerbIconUrl(key);
    }

    if (normalizedKind === 'potion') {
      const key = item?.key ?? getPotionIconKeyByLabel(item?.label);
      return getPotionIconUrl(key);
    }

    return null;
  }

  playItemDrop(src, anchor, kind) {
    if (!src || !anchor) {
      return;
    }

    const rawSources = Array.isArray(src) ? src : [src];
    const sources = rawSources.filter((source) => {
      if (typeof source === 'string') {
        return source.length > 0;
      }

      return source?.packSrc && source?.itemSrc;
    });

    if (sources.length === 0) {
      return;
    }

    const anchorPoint = this.getAnchorPoint(anchor);
    if (!anchorPoint) {
      return;
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
      dropAnchor.style.left = `${baseX + xOffset}px`;
      dropAnchor.style.top = `${baseY}px`;

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
      this.appendVisualNode(dropAnchor);
      const remove = () => this.removeVisualNode(dropAnchor);
      drop.addEventListener('animationend', remove, { once: true });
      this.setManagedTimeout(remove, ITEM_DROP_LIFETIME_MS + delay);
    }
  }

  getAnchorPoint(anchor) {
    if (Number.isFinite(anchor?.x) && Number.isFinite(anchor?.y)) {
      return {
        x: anchor.x,
        y: anchor.y,
      };
    }

    const rect = this.getElementRect(anchor);

    if (!rect) {
      return null;
    }

    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
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
      const image = document.createElement('img');
      image.className = dropClassName;
      image.src = source;
      image.alt = '';
      image.draggable = false;
      return image;
    }

    const compositeDrop = document.createElement('span');
    compositeDrop.className = `${dropClassName} room-seed-pack-composite`;

    const pack = document.createElement('img');
    pack.className = 'room-seed-pack-base';
    pack.src = source.packSrc;
    pack.alt = '';
    pack.draggable = false;

    const item = document.createElement('img');
    item.className = 'room-seed-pack-item';
    item.src = source.itemSrc;
    item.alt = '';
    item.draggable = false;

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

  animateCoinsToGold(source, amount, title) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) {
      return;
    }

    const target =
      document.querySelector('.room-top-panel__resource[aria-label="gold"]') ??
      document.querySelector('.room-top-panel__resource-val');

    if (!target) {
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const sourceRect = source?.getBoundingClientRect();
    const hasSource = Boolean(sourceRect && sourceRect.width > 0 && sourceRect.height > 0);
    const from = hasSource
      ? {
          x: sourceRect.left + sourceRect.width * 0.5,
          y: sourceRect.top + sourceRect.height * 0.44,
        }
      : {
          x: targetRect.left + targetRect.width * 0.56,
          y: targetRect.bottom + Math.max(58, targetRect.height * 1.9),
        };
    const to = {
      x: targetRect.left + targetRect.width * 0.5,
      y: targetRect.top + targetRect.height * 0.55,
    };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const coinCount = Math.max(3, Math.min(6, Math.round(2 + Math.log10(Math.max(1, safeAmount)) * 1.35)));
    let maxLife = 0;
    const keyframeBlocks = [];
    const eventUid = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

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
      const dur = 760 + Math.random() * 230;
      const delay = index * 34 + Math.random() * 32;
      maxLife = Math.max(maxLife, delay + dur);

      const name = `room-coin-fly-${eventUid}-${index}`;
      keyframeBlocks.push(this.buildCoinFlyKeyframes(name, bx, by, ctrlX, ctrlY, dx, dy, rot));

      const coin = document.createElement('div');
      coin.className = 'room-coin-particle';
      coin.style.left = `${from.x}px`;
      coin.style.top = `${from.y}px`;
      coin.style.backgroundImage = `url(${goldIconUrl})`;
      coin.style.animationName = name;
      coin.style.animationDuration = `${dur}ms`;
      coin.style.animationDelay = `${delay}ms`;
      this.appendVisualNode(coin);
      const removeCoin = () => this.removeVisualNode(coin);
      coin.addEventListener('animationend', removeCoin, { once: true });
      this.setManagedTimeout(removeCoin, delay + dur + 250);
    }

    const style = document.createElement('style');
    style.textContent = keyframeBlocks.join('\n');
    this.appendVisualNode(style, document.head);
    this.setManagedTimeout(() => this.removeVisualNode(style), maxLife + 600);

    const amountPop = document.createElement('div');
    amountPop.className = 'room-coin-amt-pop';
    amountPop.style.left = `${from.x}px`;
    amountPop.style.top = `${from.y - 4}px`;
    amountPop.title = title;
    amountPop.textContent = `+${this.formatCoinFlyoutAmount(safeAmount)}G`;
    this.appendVisualNode(amountPop);
    const removeAmount = () => this.removeVisualNode(amountPop);
    amountPop.addEventListener('animationend', removeAmount, { once: true });
    this.setManagedTimeout(removeAmount, 1200);

    this.setManagedTimeout(() => this.pulseGoldTarget(target), Math.max(0, maxLife - 210));
  }

  buildCoinFlyKeyframes(name, bx, by, ctrlX, ctrlY, dx, dy, rot) {
    const stops = [];
    const tx = (x, y, scale, r, opacity) =>
      `opacity: ${opacity.toFixed(2)}; transform: translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${r.toFixed(1)}deg);`;
    stops.push(`0% { ${tx(0, 0, 0.3, 0, 0)} }`);
    stops.push(`9% { ${tx(bx * 0.45, by * 0.45, 1.2, rot * 0.12, 1)} }`);
    stops.push(`18% { ${tx(bx, by, 1, rot * 0.22, 1)} }`);

    const samples = 10;
    for (let sample = 1; sample <= samples; sample += 1) {
      const u = sample / samples;
      const omu = 1 - u;
      const x = omu * omu * bx + 2 * omu * u * ctrlX + u * u * dx;
      const y = omu * omu * by + 2 * omu * u * ctrlY + u * u * dy;
      const pct = 18 + (100 - 18) * u;
      const shrinkStart = 0.72;
      const scale =
        u <= shrinkStart ? 1 : 1 - Math.pow((u - shrinkStart) / (1 - shrinkStart), 1.4) * 0.45;
      const opacity = u < 0.88 ? 1 : Math.max(0, 1 - (u - 0.88) / 0.12) * 0.9;
      const r = rot * (0.22 + 0.78 * u);
      stops.push(`${pct.toFixed(2)}% { ${tx(x, y, scale, r, opacity)} }`);
    }

    return `@keyframes ${name} {\n  ${stops.join('\n  ')}\n}`;
  }

  pulseGoldTarget(target) {
    target.classList.remove('is-receiving-coins');
    void target.offsetWidth;
    target.classList.add('is-receiving-coins');
    this.setManagedTimeout(() => target.classList.remove('is-receiving-coins'), GOLD_TARGET_PULSE_MS);
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
      return `sold ${event.item?.label ?? 'item'} for ${formatGoldPriceText(event.gold ?? 0)}`;
    }

    if (event.type === 'gold_collected') {
      return `collected ${formatGoldPriceText(event.gold ?? 0)}`;
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

  formatItemQuantity(prefix, item, quantity = 1) {
    const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
    const suffix = safeQuantity > 1 ? ` x${safeQuantity}` : '';
    return `${prefix} ${item?.label ?? 'item'}${suffix}`;
  }

  unmount() {
    for (const timeoutId of this.timeouts) {
      window.clearTimeout(timeoutId);
    }

    this.timeouts.clear();
    for (const node of this.visualNodes) {
      node.remove();
    }
    this.visualNodes.clear();
    this.root?.remove();
    this.root = null;
  }
}
