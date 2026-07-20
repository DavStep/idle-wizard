import {
  createAssetAtlasMaskedSprite,
  createAssetAtlasSprite,
} from '../../../assets/atlas/atlasSprite.js';
import { getPotionIconFrameName } from '../../../assets/items/potions/potionIcons.js';
import { createSeedPackIcon, getSeedIconFrameName } from '../../../assets/items/seeds/seedIcons.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import { appendTextWithItemIcons } from '../../shared/itemIconLabel.js';
import { createPageIcon } from '../../shared/pageIcons.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { getLevelPayoffRows } from '../../workshop/managers/levelPayoffSummary.js';
import {
  FEATURE_UNLOCK_FLYOUT_EVENT,
  getFeatureUnlockIconFrame,
  getFeatureUnlockTarget,
} from '../featureUnlockEvents.js';

const DISPLAY_MS = 2100;
const RESOURCE_ICON_FRAMES = Object.freeze({
  coin: 'resource:coin',
  crystal: 'resource:crystal',
  emerald: 'resource:emerald',
  mana: 'resource:mana',
  research: 'resource:research',
  ruby: 'resource:ruby',
});
const RESEARCH_ICON_FRAMES = Object.freeze({
  autoBottle: 'research:autoBottle',
  autoBrew: 'research:autoBrew',
  autoHarvest: 'research:autoHarvest',
  autoPlant: 'research:autoPlant',
  autoSeedSpawn: 'research:autoSeedSpawn',
  automationReserve: 'research:automationReserve',
  cauldronBrewing: 'research:cauldronBrewing',
  cauldronCapacity: 'research:cauldronCapacity',
  cauldronLevel: 'research:cauldronLevel',
  fastSell: 'research:fastSell',
  plotCapacity: 'research:plotCapacity',
  plotGrowth: 'research:plotGrowth',
  plotLevel: 'research:plotLevel',
  researchCost: 'research:researchCost',
  researchTime: 'research:researchTime',
  summonMultiplier: 'research:summonMultiplier',
});
const WHILE_AWAY_VISIBLE_ROW_TYPES = new Set([
  'auto_seed_summoned',
  'garden_harvested',
  'brewing_complete',
  'market_sold',
  'npc_market_sold',
]);

export class PageAnnouncementManager {
  constructor({
    gameplayFacade,
    playerFacade,
    displayMs = DISPLAY_MS,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerFacade = playerFacade;
    this.displayMs = displayMs;
    this.layer = null;
    this.panel = null;
    this.title = null;
    this.body = null;
    this.closeButton = null;
    this.unsubscribe = null;
    this.previousFocus = null;
    this.previousLevel = null;
    this.previousCompletedResearchIds = null;
    this.previousPersistenceLoadRevision = null;
    this.previousAwayReportRevision = null;
    this.queue = [];
    this.current = null;
    this.hideTimeoutId = null;
    this.handleLayerClick = (event) => {
      if (event.target === this.layer) {
        this.dismissCurrentReport();
      }
    };
    this.handleKeydown = (event) => {
      if (event.key === 'Escape') {
        this.dismissCurrentReport();
      }
    };
  }

  mount(stage) {
    if (!stage || this.layer) {
      return this.layer;
    }

    this.layer = this.createLayer();
    stage.append(this.layer);
    stage.ownerDocument?.addEventListener?.('keydown', this.handleKeydown);
    this.unsubscribe =
      this.gameplayFacade?.subscribe?.((snapshot) => this.handleSnapshot(snapshot)) ?? null;

    const baselineSnapshot = this.gameplayFacade?.getSnapshot?.();

    if (this.previousCompletedResearchIds === null && baselineSnapshot) {
      this.captureBaseline(baselineSnapshot);
    }

    this.queuePendingWhileAwayReports();
    this.showNext();

    return this.layer;
  }

  showFeatureUnlockPreview({ values = [], pageIds = {}, notices = {} } = {}) {
    const normalizedValues = (Array.isArray(values) ? values : []).filter(
      (value) => typeof value === 'string' && value.trim(),
    );

    if (!this.layer || normalizedValues.length <= 0) {
      return { ok: false, reason: this.layer ? 'features_missing' : 'announcements_not_mounted' };
    }

    this.clearHideTimeout();
    this.queue = [];
    this.current = {
      kind: 'unlock',
      preview: true,
      values: normalizedValues,
      pageIds,
      notices,
    };
    this.previousFocus = document.activeElement;
    this.renderAnnouncement(this.current);
    this.layer.hidden = false;
    this.layer.setAttribute('aria-hidden', 'false');
    this.focusWithoutScroll(this.panel);
    this.updateLayerTimingMetadata();

    return { ok: true, dialogId: 'featureUnlockAnnouncement' };
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearHideTimeout();
    this.layer?.ownerDocument?.removeEventListener?.('keydown', this.handleKeydown);
    this.layer?.remove();
    this.layer = null;
    this.panel = null;
    this.title = null;
    this.body = null;
    this.closeButton = null;
    this.previousFocus = null;
    this.previousLevel = null;
    this.previousCompletedResearchIds = null;
    this.previousPersistenceLoadRevision = null;
    this.previousAwayReportRevision = null;
    this.queue = [];
    this.current = null;
  }

  createLayer() {
    const layer = document.createElement('section');
    layer.className = 'room-announcement-layer';
    layer.dataset.tutorialBlocker = 'true';
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');
    layer.addEventListener('click', this.handleLayerClick);

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
      this.queuePendingWhileAwayReports();
      this.showNext();
      return;
    }

    if (this.hasPersistenceLoadRevisionChanged(snapshot)) {
      this.resetAnnouncementsToBaseline(snapshot);
      this.queuePendingWhileAwayReports();
      this.showNext();
      return;
    }

    if (this.hasAwayReportRevisionChanged(snapshot)) {
      this.resetAnnouncementsToBaseline(snapshot);
      this.queuePendingWhileAwayReports();
      this.showNext();
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
    this.previousPersistenceLoadRevision = this.getPersistenceLoadRevision(snapshot);
    this.previousAwayReportRevision = this.getAwayReportRevision(snapshot);
  }

  hasPersistenceLoadRevisionChanged(snapshot = {}) {
    const nextRevision = this.getPersistenceLoadRevision(snapshot);

    return (
      this.previousPersistenceLoadRevision !== null &&
      nextRevision !== null &&
      nextRevision !== this.previousPersistenceLoadRevision
    );
  }

  resetAnnouncementsToBaseline(snapshot = {}) {
    const previousFocus = this.previousFocus;

    this.clearHideTimeout();
    this.queue = [];
    this.current = null;
    this.previousFocus = null;

    if (this.layer) {
      this.layer.hidden = true;
      this.layer.setAttribute('aria-hidden', 'true');
      delete this.layer.dataset.announcementUnlockDelayMs;
    }

    this.body?.replaceChildren();
    this.captureBaseline(snapshot);

    if (previousFocus && document.contains(previousFocus)) {
      this.focusWithoutScroll(previousFocus);
    }
  }

  getPersistenceLoadRevision(snapshot = {}) {
    const revision = Number(snapshot?.persistence?.loadRevision);

    return Number.isInteger(revision) && revision >= 0 ? revision : null;
  }

  hasAwayReportRevisionChanged(snapshot = {}) {
    const nextRevision = this.getAwayReportRevision(snapshot);

    return (
      this.previousAwayReportRevision !== null &&
      nextRevision !== null &&
      nextRevision !== this.previousAwayReportRevision
    );
  }

  getAwayReportRevision(snapshot = {}) {
    const revision = Number(snapshot?.persistence?.awayReportRevision);

    return Number.isInteger(revision) && revision >= 0 ? revision : null;
  }

  queuePendingWhileAwayReports() {
    const reports = this.gameplayFacade?.consumeWhileAwayReports?.() ?? [];

    for (const report of reports) {
      if (report?.kind !== 'whileAway' || !Array.isArray(report.rows) || report.rows.length <= 0) {
        continue;
      }

      const rows = this.getVisibleWhileAwayRows(report.rows);

      if (rows.length > 0) {
        this.queue.push({ ...report, rows });
      }
    }
  }

  getVisibleWhileAwayRows(rows = []) {
    return (Array.isArray(rows) ? rows : []).filter((row) =>
      WHILE_AWAY_VISIBLE_ROW_TYPES.has(row?.type),
    );
  }

  queueLevelAnnouncement(snapshot = {}) {
    const nextLevel = this.getPlayerLevel(snapshot);

    if (!Number.isInteger(this.previousLevel) || !Number.isInteger(nextLevel)) {
      return;
    }

    if (nextLevel <= this.previousLevel) {
      return;
    }

    const rows = getLevelPayoffRows(snapshot, {
      fromLevel: this.previousLevel,
      toLevel: nextLevel,
    });

    this.queue.push({
      kind: 'level',
      fromLevel: this.previousLevel,
      toLevel: nextLevel,
      rows,
    });

    const unlockAnnouncement = this.getFeatureUnlockAnnouncement(rows);

    if (unlockAnnouncement) {
      this.queue.push(unlockAnnouncement);
    }
  }

  getFeatureUnlockAnnouncement(rows = []) {
    const unlockRow = rows.find(
      (row) => row?.label === 'unlocks' && Array.isArray(row.valueLines),
    );
    const values = unlockRow?.valueLines?.filter(
      (value) => typeof value === 'string' && value.trim(),
    );

    if (!values?.length) {
      return null;
    }

    const pageIds = unlockRow.valueLinePageIds ?? {};
    const notices = unlockRow.valueLineNotices ?? {};

    return {
      kind: 'unlock',
      values,
      pageIds,
      notices: values.reduce((result, value) => {
        result[value] = notices[value] ?? `${value} unlocked`;
        return result;
      }, {}),
    };
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

    return Number.isInteger(level) && level >= 0 ? level : null;
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
      this.getResearches(snapshot).find((candidate) => candidate?.id === researchId) ??
      this.gameplayFacade?.researchFacade?.getResearchAnnouncementSnapshot?.(researchId) ??
      {};

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
      this.updateLayerTimingMetadata();
      return;
    }

    this.current = this.queue.shift();
    this.previousFocus = document.activeElement;
    this.renderAnnouncement(this.current);
    this.layer.hidden = false;
    this.layer.setAttribute('aria-hidden', 'false');
    this.focusWithoutScroll(this.panel);
    this.clearHideTimeout();
    if (this.current.kind !== 'whileAway' && !this.current.preview) {
      this.hideTimeoutId = window.setTimeout(() => this.hideCurrent(), this.displayMs);
    }
    this.updateLayerTimingMetadata();
  }

  hideCurrent() {
    if (!this.current || !this.layer) {
      return;
    }

    this.clearHideTimeout();
    this.dispatchFeatureUnlockFlyout();
    this.layer.hidden = true;
    this.layer.setAttribute('aria-hidden', 'true');
    this.body.replaceChildren();
    this.current = null;
    this.updateLayerTimingMetadata();

    if (this.previousFocus && document.contains(this.previousFocus)) {
      this.focusWithoutScroll(this.previousFocus);
    }

    this.previousFocus = null;
    this.showNext();
  }

  dispatchFeatureUnlockFlyout() {
    if (this.current?.kind !== 'unlock' || !this.layer) {
      return;
    }

    const pageIds = [...new Set(Object.values(this.current.pageIds ?? {}))].filter(
      (pageId) => typeof pageId === 'string' && pageId.trim(),
    );

    if (!Array.isArray(this.current.values) || this.current.values.length <= 0) {
      return;
    }

    const sourceStages = new Map(
      [...(this.body?.querySelectorAll('.room-announcement__unlock-icon-stage') ?? [])].map(
        (stage) => [stage.dataset.featureUnlockValue, stage],
      ),
    );
    const fallbackSource = this.panel;
    const sourceRect = this.serializeRect(fallbackSource?.getBoundingClientRect?.());
    const EventCtor = this.layer.ownerDocument?.defaultView?.CustomEvent ?? globalThis.CustomEvent;

    if (typeof EventCtor !== 'function') {
      return;
    }

    this.layer.dispatchEvent(
      new EventCtor(FEATURE_UNLOCK_FLYOUT_EVENT, {
        bubbles: true,
        detail: {
          features: this.current.values.map((value) => {
            const source = sourceStages.get(value) ?? fallbackSource;

            return {
              value,
              pageId: this.current.pageIds?.[value] ?? null,
              sourceRect: this.serializeRect(source?.getBoundingClientRect?.()),
            };
          }),
          pageIds,
          sourceRect,
        },
      }),
    );
  }

  serializeRect(rect) {
    if (!rect) {
      return null;
    }

    const left = Number(rect.left);
    const top = Number(rect.top);
    const width = Number(rect.width);
    const height = Number(rect.height);

    if (![left, top, width, height].every(Number.isFinite)) {
      return null;
    }

    return { left, top, width, height };
  }

  updateLayerTimingMetadata() {
    if (!this.layer) {
      return;
    }

    const timedAnnouncementCount =
      (this.current && this.current.kind !== 'whileAway' && !this.layer.hidden ? 1 : 0) +
      this.queue.filter((announcement) => announcement?.kind !== 'whileAway').length;
    const delayMs = timedAnnouncementCount * this.displayMs;

    if (delayMs > 0) {
      this.layer.dataset.announcementUnlockDelayMs = String(delayMs);
      return;
    }

    delete this.layer.dataset.announcementUnlockDelayMs;
  }

  dismissCurrentReport() {
    if (this.current?.preview) {
      this.hideCurrent();
      return true;
    }

    if (this.current?.kind !== 'whileAway') {
      return false;
    }

    this.hideCurrent();
    return true;
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
      this.renderStandardAnnouncementChrome();
      this.renderLevelAnnouncement(announcement);
      return;
    }

    if (announcement.kind === 'whileAway') {
      this.renderWhileAwayReport(announcement);
      return;
    }

    if (announcement.kind === 'unlock') {
      this.renderStandardAnnouncementChrome();
      this.renderFeatureUnlockAnnouncement(announcement);
      return;
    }

    this.renderStandardAnnouncementChrome();
    this.renderResearchAnnouncement(announcement);
  }

  renderStandardAnnouncementChrome() {
    this.panel.classList.remove('style-dialog', 'room-announcement--report');
    this.title.className = 'room-announcement__title';
    this.body.className = 'room-announcement__body';
    this.closeButton?.remove();
    this.closeButton = null;
  }

  renderLevelAnnouncement({ fromLevel, toLevel, rows = [] }) {
    this.setText(this.title, 'level up!');
    this.panel.setAttribute(
      'aria-label',
      fromLevel <= 0 ? `level up level ${toLevel}` : `level up level ${fromLevel} to ${toLevel}`,
    );

    const range = this.createLevelFlow({ fromLevel, toLevel });

    const rowsRoot = this.createRows(rows);
    this.body.replaceChildren(range, rowsRoot);
  }

  createLevelFlow({ fromLevel, toLevel }) {
    const firstPlayableLevel = fromLevel <= 0;
    const range = document.createElement('div');
    range.className = 'room-announcement__level-flow';
    range.setAttribute(
      'aria-label',
      firstPlayableLevel ? `level ${toLevel} reached` : `level ${fromLevel} > ${toLevel}`,
    );

    const from = document.createElement('span');
    from.className = 'room-announcement__level-from';
    from.textContent = firstPlayableLevel ? `level ${toLevel}` : `level ${fromLevel}`;

    const to = document.createElement('span');
    to.className = 'room-announcement__level-to';
    to.textContent = firstPlayableLevel ? '' : `> ${toLevel}`;
    to.hidden = firstPlayableLevel;

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

  renderFeatureUnlockAnnouncement({ values = [], pageIds = {}, notices = {} } = {}) {
    const firstValue = values[0] ?? 'feature';
    const singleUnlock = values.length === 1;
    const titleText = singleUnlock
      ? notices[firstValue] ?? `${firstValue} unlocked`
      : 'features unlocked';
    this.setText(this.title, titleText);
    this.panel.setAttribute('aria-label', titleText);

    const items = document.createElement('div');
    items.className = 'room-announcement__unlock-items';
    items.classList.toggle('room-announcement__unlock-items--multiple', !singleUnlock);
    items.replaceChildren(
      ...values.map((value, index) =>
        this.createFeatureUnlockItem({
          value,
          pageId: pageIds[value],
          singleUnlock,
          index,
        }),
      ),
    );
    this.body.replaceChildren(items);
  }

  createFeatureUnlockItem({ value, pageId, singleUnlock, index }) {
    const item = document.createElement('div');
    item.className = 'room-announcement__unlock-item';
    item.style.setProperty('--room-announcement-unlock-index', index);

    const iconStage = this.createFeatureUnlockIconStage({ value, pageId, compact: !singleUnlock });
    const label = document.createElement('div');
    label.className = 'room-announcement__research-label room-announcement__unlock-label';
    label.textContent = value;

    const detail = document.createElement('div');
    detail.className = 'room-announcement__research-detail room-announcement__unlock-detail';
    detail.textContent = pageId ? 'new room available' : 'new feature available';
    detail.hidden = !singleUnlock;

    item.append(iconStage, label, detail);
    return item;
  }

  createFeatureUnlockIconStage({ value, pageId, compact = false }) {
    const stage = document.createElement('div');
    stage.className = 'room-announcement__research-icon-stage room-announcement__unlock-icon-stage';
    stage.dataset.featureUnlockValue = value;
    stage.setAttribute('aria-hidden', 'true');

    const target = getFeatureUnlockTarget(this.layer?.parentElement, { value, pageId });
    const targetIconFrame = getFeatureUnlockIconFrame(target);

    if (targetIconFrame) {
      const iconFrame = targetIconFrame.cloneNode(true);
      iconFrame.classList.add('room-announcement__unlock-icon-source');
      iconFrame.style.position = 'relative';
      iconFrame.style.inset = 'auto';
      iconFrame.style.width = compact ? '52px' : '76px';
      iconFrame.style.height = compact ? '60px' : '86px';
      iconFrame.style.scale = '1';
      iconFrame.style.translate = 'none';
      iconFrame.style.transform = 'none';
      stage.append(iconFrame);
      return stage;
    }

    const icon = createPageIcon(
      pageId,
      'room-announcement__research-icon room-announcement__unlock-icon',
    );

    if (icon) {
      stage.append(icon);
      return stage;
    }

    const fallback = document.createElement('span');
    fallback.className =
      'room-announcement__research-fallback-icon room-announcement__unlock-fallback-icon';
    fallback.textContent = 'feature';
    stage.append(fallback);
    return stage;
  }

  renderWhileAwayReport(report = {}) {
    this.panel.classList.add('style-dialog', 'room-announcement--report');
    this.panel.setAttribute('aria-label', 'while away report');
    this.title.className = 'style-box__title room-announcement__report-title';
    this.setText(this.title, 'while away');
    this.body.className = 'room-announcement__body room-announcement__body--report';

    const closeButton = this.ensureCloseButton();
    if (!closeButton.isConnected) {
      this.panel.insertBefore(closeButton, this.body);
    }

    const rowsRoot = document.createElement('div');
    rowsRoot.className = 'room-announcement__report-rows';
    rowsRoot.replaceChildren(
      ...report.rows.map((row) => this.createWhileAwayReportLine(row)),
    );

    this.body.replaceChildren(rowsRoot);
  }

  ensureCloseButton() {
    if (this.closeButton) {
      return this.closeButton;
    }

    const button = document.createElement('button');
    button.className = 'style-button room-announcement__close';
    button.type = 'button';
    button.textContent = 'close';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.dismissCurrentReport();
    });
    this.closeButton = button;
    return button;
  }

  createWhileAwayReportLine(row = {}) {
    const line = document.createElement('div');
    const rowType = this.getWhileAwayReportRowType(row);
    line.className = `room-announcement__report-line room-announcement__report-line--${rowType}`;
    line.dataset.reportRowType = rowType;

    const label = document.createElement('span');
    label.className = 'room-announcement__report-label';

    const value = document.createElement('span');
    value.className = 'room-announcement__report-value';
    this.renderWhileAwayReportLineContent({ label, value, row });

    line.append(label, value);
    return line;
  }

  renderWhileAwayReportLineContent({ label, value, row } = {}) {
    const parts = this.getWhileAwayReportLineParts(row);

    if (label) {
      label.textContent = parts.label;
    }

    if (!value) {
      return;
    }

    if (!parts.value) {
      value.hidden = true;
      value.textContent = '';
      return;
    }

    appendTextWithItemIcons(value, parts.value);
  }

  getWhileAwayReportRowType(row = {}) {
    return String(row.type ?? 'updated')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'updated';
  }

  getWhileAwayReportLineParts(row = {}) {
    switch (row.type) {
      case 'garden_harvested':
        return {
          label: 'garden harvested',
          value: `${this.getPositiveCount(row.quantity)} ${this.getReportLabel(
            row.label,
            'herbs',
          )}`,
        };
      case 'brewing_complete':
        return {
          label: 'brewing complete',
          value: `${this.getPositiveCount(row.quantity)} ${this.getReportLabel(
            row.label,
            'potions',
          )}`,
        };
      case 'market_sold':
      case 'npc_market_sold':
        return {
          label: 'traders bought',
          value: formatCoinPriceText(this.getPositiveCoin(row.coin)),
        };
      case 'auto_seed_summoned':
        return {
          label: 'auto seed summoned',
          value: `${this.getPositiveCount(row.quantity)} ${this.pluralize(
            'seed',
            row.quantity,
          )}`,
        };
      default:
        return {
          label: this.getReportLabel(row.label ?? row.type, 'updated'),
          value: '',
        };
    }
  }

  getReportLabel(value, fallback) {
    return (
      String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim() || fallback
    );
  }

  getPositiveCount(value) {
    const count = Math.floor(Number(value) || 0);
    return Math.max(1, count);
  }

  getPositiveCoin(value) {
    const coin = Math.round((Number(value) || 0) * 100) / 100;
    return coin > 0 ? coin : 0;
  }

  pluralize(label, count) {
    return this.getPositiveCount(count) === 1 ? label : `${label}s`;
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
    const valueLines = Array.isArray(row.valueLines) ? row.valueLines : [];
    root.className = 'room-announcement__row';
    root.classList.toggle('room-announcement__row--list', valueLines.length > 1);
    root.style.setProperty('--room-announcement-row-index', index);

    const label = document.createElement('span');
    label.className = 'room-announcement__row-label';
    label.textContent = row.label;

    const value = document.createElement('span');
    value.className = 'room-announcement__row-value';
    const valueText = valueLines.length > 0 ? valueLines.join(' / ') : row.value;
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
    const icon = this.createResearchIcon(research, frameName);

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

  createResearchIcon(research = {}, frameName = null) {
    if (research.id?.startsWith('unlockSeed:')) {
      return createSeedPackIcon('room-announcement__research-icon', {
        key: research.id.slice('unlockSeed:'.length),
        label: research.label ?? '',
      });
    }

    return frameName ? createAssetAtlasSprite('room-announcement__research-icon', frameName) : null;
  }

  getResearchIconFrameName(research = {}) {
    const researchId = String(research.id ?? '');

    if (researchId.startsWith('unlockSeed:')) {
      return getSeedIconFrameName(researchId.slice('unlockSeed:'.length));
    }

    if (researchId.startsWith('unlockRecipe:')) {
      return getPotionIconFrameName(researchId.slice('unlockRecipe:'.length));
    }

    const familyFrameName = this.getResearchFamilyIconFrameName(researchId);

    if (familyFrameName) {
      return familyFrameName;
    }

    if (research.actionType === 'levelUp') {
      return RESOURCE_ICON_FRAMES[research.costCurrency] ?? RESOURCE_ICON_FRAMES.coin;
    }

    return RESOURCE_ICON_FRAMES.research;
  }

  getResearchFamilyIconFrameName(researchId = '') {
    if (/^summonSeedsX\d+$/.test(researchId)) {
      return RESEARCH_ICON_FRAMES.summonMultiplier;
    }

    if (researchId === 'automation:autoSeedSpawn') {
      return RESEARCH_ICON_FRAMES.autoSeedSpawn;
    }

    if (researchId.startsWith('automation:autoPlantTile:')) {
      return RESEARCH_ICON_FRAMES.autoPlant;
    }

    if (researchId.startsWith('automation:autoHarvestPlant:')) {
      return RESEARCH_ICON_FRAMES.autoHarvest;
    }

    if (researchId.startsWith('automation:autoBrewCauldron:')) {
      return RESEARCH_ICON_FRAMES.autoBrew;
    }

    if (researchId.startsWith('automation:autoBottleCauldron:')) {
      return RESEARCH_ICON_FRAMES.autoBottle;
    }

    if (researchId.startsWith('fastSellPayout:')) {
      return RESEARCH_ICON_FRAMES.fastSell;
    }

    if (researchId.startsWith('advanced:researchTime:')) {
      return RESEARCH_ICON_FRAMES.researchTime;
    }

    if (researchId.startsWith('emerald:researchCost:')) {
      return RESEARCH_ICON_FRAMES.researchCost;
    }

    if (researchId.startsWith('advanced:automationReserve:')) {
      return RESEARCH_ICON_FRAMES.automationReserve;
    }

    if (researchId.startsWith('advanced:plotCapacity:')) {
      return RESEARCH_ICON_FRAMES.plotCapacity;
    }

    if (researchId.startsWith('advanced:cauldronCapacity:')) {
      return RESEARCH_ICON_FRAMES.cauldronCapacity;
    }

    if (researchId.startsWith('advanced:cauldronBrewing:')) {
      return RESEARCH_ICON_FRAMES.cauldronBrewing;
    }

    if (researchId.startsWith('advanced:plotGrowth:')) {
      return RESEARCH_ICON_FRAMES.plotGrowth;
    }

    if (researchId.startsWith('emerald:plotPlanting:')) {
      return RESEARCH_ICON_FRAMES.plotLevel;
    }

    if (researchId.startsWith('emerald:cauldronBrewing:')) {
      return RESEARCH_ICON_FRAMES.cauldronLevel;
    }

    return null;
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
