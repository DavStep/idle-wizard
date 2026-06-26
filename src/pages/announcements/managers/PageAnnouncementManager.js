import {
  createAssetAtlasMaskedSprite,
  createAssetAtlasSprite,
} from '../../../assets/atlas/atlasSprite.js';
import { getPotionIconFrameName } from '../../../assets/items/potions/potionIcons.js';
import { getSeedIconFrameName } from '../../../assets/items/seeds/seedIcons.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { getLevelPayoffRows } from '../../workshop/managers/levelPayoffSummary.js';

const DISPLAY_MS = 4200;
const RESOURCE_ICON_FRAMES = Object.freeze({
  coin: 'resource:coin',
  crystal: 'resource:crystal',
  emerald: 'resource:emerald',
  mana: 'resource:mana',
  ruby: 'resource:ruby',
});

export class PageAnnouncementManager {
  constructor({ gameplayFacade, displayMs = DISPLAY_MS } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.displayMs = displayMs;
    this.layer = null;
    this.panel = null;
    this.title = null;
    this.body = null;
    this.unsubscribe = null;
    this.previousFocus = null;
    this.previousLevel = null;
    this.previousCompletedResearchIds = null;
    this.queue = [];
    this.current = null;
    this.hideTimeoutId = null;
  }

  mount(stage) {
    if (!stage || this.layer) {
      return this.layer;
    }

    this.layer = this.createLayer();
    stage.append(this.layer);
    this.unsubscribe =
      this.gameplayFacade?.subscribe?.((snapshot) => this.handleSnapshot(snapshot)) ?? null;

    const baselineSnapshot = this.gameplayFacade?.getSnapshot?.();

    if (this.previousCompletedResearchIds === null && baselineSnapshot) {
      this.captureBaseline(baselineSnapshot);
    }

    return this.layer;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearHideTimeout();
    this.layer?.remove();
    this.layer = null;
    this.panel = null;
    this.title = null;
    this.body = null;
    this.previousFocus = null;
    this.previousLevel = null;
    this.previousCompletedResearchIds = null;
    this.queue = [];
    this.current = null;
  }

  createLayer() {
    const layer = document.createElement('section');
    layer.className = 'room-announcement-layer';
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');

    this.panel = document.createElement('section');
    this.panel.className = 'room-announcement';
    this.panel.setAttribute('aria-label', 'announcement');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('role', 'dialog');
    this.panel.tabIndex = -1;

    this.title = document.createElement('div');
    this.title.className = 'room-announcement__title';

    this.body = document.createElement('div');
    this.body.className = 'room-announcement__body';

    this.panel.append(this.title, this.body);
    layer.append(this.panel);
    return layer;
  }

  handleSnapshot(snapshot) {
    if (this.previousCompletedResearchIds === null) {
      this.captureBaseline(snapshot);
      return;
    }

    this.queueLevelAnnouncement(snapshot);
    this.queueResearchAnnouncements(snapshot);
    this.captureBaseline(snapshot);
    this.showNext();
  }

  captureBaseline(snapshot = {}) {
    this.previousLevel = this.getPlayerLevel(snapshot);
    this.previousCompletedResearchIds = this.getCompletedResearchIds(snapshot);
  }

  queueLevelAnnouncement(snapshot = {}) {
    const nextLevel = this.getPlayerLevel(snapshot);

    if (!Number.isInteger(this.previousLevel) || !Number.isInteger(nextLevel)) {
      return;
    }

    if (nextLevel <= this.previousLevel) {
      return;
    }

    this.queue.push({
      kind: 'level',
      fromLevel: this.previousLevel,
      toLevel: nextLevel,
      rows: getLevelPayoffRows(snapshot, {
        fromLevel: this.previousLevel,
        toLevel: nextLevel,
      }),
    });
  }

  queueResearchAnnouncements(snapshot = {}) {
    const completedResearchIds = this.getCompletedResearchIds(snapshot);
    const previousIds = this.previousCompletedResearchIds ?? new Set();

    for (const researchId of completedResearchIds) {
      if (previousIds.has(researchId)) {
        continue;
      }

      this.queue.push({
        kind: 'research',
        research: this.getResearchSnapshot(snapshot, researchId),
      });
    }
  }

  getPlayerLevel(snapshot = {}) {
    const level = Math.floor(
      Number(snapshot?.tasks?.currentLevel ?? snapshot?.playerLevel?.currentLevel),
    );

    return Number.isInteger(level) && level > 0 ? level : null;
  }

  getCompletedResearchIds(snapshot = {}) {
    const ids = new Set(
      (snapshot?.research?.completedResearchIds ?? []).filter(
        (researchId) => typeof researchId === 'string' && researchId.trim(),
      ),
    );

    for (const research of this.getResearches(snapshot)) {
      if (research?.completed && typeof research.id === 'string') {
        ids.add(research.id);
      }
    }

    return ids;
  }

  getResearchSnapshot(snapshot, researchId) {
    const research =
      this.getResearches(snapshot).find((candidate) => candidate?.id === researchId) ?? {};

    return {
      id: researchId,
      label: research.label ?? this.formatResearchId(researchId),
      effect: research.effect ?? '',
      value: research.value ?? '',
      actionType: research.actionType ?? 'research',
      costCurrency: research.costCurrency ?? this.inferResearchCurrency(research),
      starLevel: research.starLevel ?? null,
    };
  }

  getResearches(snapshot = {}) {
    const tabs = snapshot?.research?.tabs;

    if (Array.isArray(tabs)) {
      return tabs.flatMap((tab) => tab.boxes ?? []).flatMap((box) => box.researches ?? []);
    }

    return (snapshot?.research?.boxes ?? []).flatMap((box) => box.researches ?? []);
  }

  inferResearchCurrency(research = {}) {
    const value = String(research.value ?? research.effect ?? '').toLowerCase();

    if (value.includes('crystal')) {
      return 'crystal';
    }

    if (value.includes('ruby')) {
      return 'ruby';
    }

    if (value.includes('emerald')) {
      return 'emerald';
    }

    if (value.includes('mana')) {
      return 'mana';
    }

    return 'coin';
  }

  formatResearchId(researchId) {
    return String(researchId ?? 'research')
      .split(':')
      .at(-1)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase();
  }

  showNext() {
    if (this.current || this.queue.length <= 0 || !this.layer) {
      return;
    }

    this.current = this.queue.shift();
    this.previousFocus = document.activeElement;
    this.renderAnnouncement(this.current);
    this.layer.hidden = false;
    this.layer.setAttribute('aria-hidden', 'false');
    this.focusWithoutScroll(this.panel);
    this.clearHideTimeout();
    this.hideTimeoutId = window.setTimeout(() => this.hideCurrent(), this.displayMs);
  }

  hideCurrent() {
    if (!this.current || !this.layer) {
      return;
    }

    this.clearHideTimeout();
    this.layer.hidden = true;
    this.layer.setAttribute('aria-hidden', 'true');
    this.body.replaceChildren();
    this.current = null;

    if (this.previousFocus && document.contains(this.previousFocus)) {
      this.focusWithoutScroll(this.previousFocus);
    }

    this.previousFocus = null;
    this.showNext();
  }

  clearHideTimeout() {
    if (!this.hideTimeoutId) {
      return;
    }

    window.clearTimeout(this.hideTimeoutId);
    this.hideTimeoutId = null;
  }

  renderAnnouncement(announcement) {
    this.panel.dataset.announcementKind = announcement.kind;

    if (announcement.kind === 'level') {
      this.renderLevelAnnouncement(announcement);
      return;
    }

    this.renderResearchAnnouncement(announcement);
  }

  renderLevelAnnouncement({ fromLevel, toLevel, rows = [] }) {
    this.setText(this.title, 'level up!');
    this.panel.setAttribute('aria-label', `level up level ${fromLevel} to ${toLevel}`);

    const range = this.createLevelFlow({ fromLevel, toLevel });

    const rowsRoot = this.createRows(rows);
    this.body.replaceChildren(range, rowsRoot);
  }

  createLevelFlow({ fromLevel, toLevel }) {
    const range = document.createElement('div');
    range.className = 'room-announcement__level-flow';
    range.setAttribute('aria-label', `level ${fromLevel} > ${toLevel}`);

    const from = document.createElement('span');
    from.className = 'room-announcement__level-from';
    from.textContent = `level ${fromLevel}`;

    const to = document.createElement('span');
    to.className = 'room-announcement__level-to';
    to.textContent = `> ${toLevel}`;

    range.append(from, to);
    return range;
  }

  renderResearchAnnouncement({ research }) {
    const actionLabel = research.actionType === 'levelUp' ? 'level up complete' : 'research complete';
    this.setText(this.title, actionLabel);
    this.panel.setAttribute('aria-label', `${research.label} ${actionLabel}`);

    const iconStage = this.createResearchIconStage(research);
    const label = document.createElement('div');
    label.className = 'room-announcement__research-label';
    label.textContent = research.label;

    const detail = document.createElement('div');
    detail.className = 'room-announcement__research-detail';
    const detailText = this.getResearchDetailText(research);
    setResourceIconText(detail, detailText);
    detail.hidden = detailText.length <= 0;

    this.body.replaceChildren(iconStage, label, detail);
  }

  createRows(rows = []) {
    const root = document.createElement('div');
    root.className = 'room-announcement__rows';

    const displayRows =
      rows.length > 0
        ? rows
        : [
            {
              label: 'rewards',
              value: 'none',
            },
          ];

    root.replaceChildren(
      ...displayRows.slice(0, 5).map((row, index) => this.createRow(row, index)),
    );
    return root;
  }

  createRow(row, index = 0) {
    const root = document.createElement('div');
    root.className = 'room-announcement__row';
    root.style.setProperty('--room-announcement-row-index', index);

    const label = document.createElement('span');
    label.className = 'room-announcement__row-label';
    label.textContent = row.label;

    const value = document.createElement('span');
    value.className = 'room-announcement__row-value';
    const valueText = Array.isArray(row.valueLines) ? row.valueLines.join(' / ') : row.value;
    setResourceIconText(value, valueText);

    root.append(label, value);
    return root;
  }

  createResearchIconStage(research) {
    const stage = document.createElement('div');
    stage.className = 'room-announcement__research-icon-stage';
    stage.setAttribute('aria-hidden', 'true');

    const frameName = this.getResearchIconFrameName(research);
    const silhouette = frameName
      ? createAssetAtlasMaskedSprite('room-announcement__research-silhouette', frameName)
      : null;
    const icon = frameName
      ? createAssetAtlasSprite('room-announcement__research-icon', frameName)
      : null;

    if (silhouette && icon) {
      stage.append(silhouette, icon);
      return stage;
    }

    const fallback = document.createElement('span');
    fallback.className = 'room-announcement__research-fallback-icon';
    fallback.textContent = 'research';
    stage.append(fallback);
    return stage;
  }

  getResearchIconFrameName(research = {}) {
    if (research.id?.startsWith('unlockSeed:')) {
      return getSeedIconFrameName();
    }

    if (research.id?.startsWith('unlockRecipe:')) {
      return getPotionIconFrameName(research.id.slice('unlockRecipe:'.length));
    }

    return RESOURCE_ICON_FRAMES[research.costCurrency] ?? RESOURCE_ICON_FRAMES.coin;
  }

  getResearchDetailText(research = {}) {
    if (research.value === 'researched') {
      return research.effect || '';
    }

    if (research.effect && research.value && research.effect !== research.value) {
      return `${research.effect} ${research.value}`;
    }

    return research.effect || research.value || '';
  }

  setText(element, value) {
    if (element && element.textContent !== value) {
      element.textContent = value;
    }
  }

  focusWithoutScroll(element) {
    if (!element || typeof element.focus !== 'function') {
      return;
    }

    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }
}
