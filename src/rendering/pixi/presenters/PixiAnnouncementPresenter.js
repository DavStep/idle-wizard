import {
  getHerbIconFrameName,
  getHerbIconKeyByLabel,
} from '../../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
  getPotionIconKeyByLabel,
} from '../../../assets/items/potions/potionIcons.js';
import {
  formatCoinPriceText,
  normalizeCoinPrice,
} from '../../../shared/coinPrice.js';
import { getLevelPayoffRows } from '../../../pages/workshop/managers/levelPayoffSummary.js';

export const PIXI_ANNOUNCEMENT_DIALOG_ID =
  'global.announcement';

export const PIXI_ANNOUNCEMENT_TIMING = Object.freeze({
  displayMs: 2100,
  levelRewardRevealDelayMs: 1180,
});

export const PIXI_ANNOUNCEMENT_MOTION = Object.freeze({
  overlayDurationMs: 225,
  panelDurationMs: 130,
  levelPanelDurationMs: 205,
  levelTitleDelayMs: 1220,
  levelRowDelayMs: 1260,
  levelRowStaggerMs: 55,
  rowDurationMs: 215,
  researchTitleDurationMs: 260,
  researchSilhouetteDurationMs: 380,
  researchIconDurationMs: 390,
  researchIconDelayMs: 180,
  researchLabelDelayMs: 540,
  researchDetailDelayMs: 610,
  unlockIconStaggerMs: 45,
  fallbackIconDurationMs: 310,
});

export const FEATURE_UNLOCK_PREVIEW_VALUES = Object.freeze([
  'garden',
  'research',
  'brewing',
  'prestige',
  'leaderboard',
  'discoveries',
  'alliance',
  'inbox',
]);

export const FEATURE_UNLOCK_PREVIEW_PAGE_IDS = Object.freeze({
  brewing: 'brewing',
  garden: 'garden',
  prestige: 'prestige',
  research: 'research',
});

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
  stallStaffing: 'research:fastSell',
  plotCapacity: 'research:plotCapacity',
  plotGrowth: 'research:plotGrowth',
  plotLevel: 'research:plotLevel',
  researchCost: 'research:researchCost',
  researchTime: 'research:researchTime',
  summonMultiplier: 'research:summonMultiplier',
});

const FEATURE_ICON_PRESENTATIONS = Object.freeze({
  alliance: Object.freeze({
    assetId:
      'source:assets/icons/icon-alliance-banner-base.webp',
    maskAssetId:
      'source:assets/icons/icon-alliance-banner-cloth-mask.webp',
  }),
  brewing: Object.freeze({
    assetId:
      'source:assets/icons/icon-brewing-cauldron-tab.webp',
  }),
  discoveries: Object.freeze({
    assetId:
      'source:assets/icons/icon-discoveries-journal.webp',
  }),
  garden: Object.freeze({
    assetId:
      'source:assets/icons/icon-garden-plot-tab.webp',
  }),
  inbox: Object.freeze({
    assetId:
      'source:assets/icons/icon-mail-envelope.webp',
  }),
  leaderboard: Object.freeze({
    assetId:
      'source:assets/icons/icon-leaderboard-trophy.webp',
  }),
  market: Object.freeze({
    assetId:
      'source:assets/icons/icon-shop-market-stall-tab.webp',
  }),
  prestige: Object.freeze({
    assetId: 'source:assets/icons/icon-crystal.png',
  }),
  research: Object.freeze({
    assetId:
      'source:assets/icons/icon-research-telescope-tab.webp',
  }),
});

const WHILE_AWAY_VISIBLE_ROW_TYPES = new Set([
  'auto_seed_summoned',
  'garden_harvested',
  'brewing_complete',
  'market_sold',
  'npc_market_sold',
]);

/**
 * Renderer-neutral controller for retained Pixi announcements.
 *
 * Gameplay remains authoritative. This presenter only detects state deltas,
 * queues presentation records, binds the already-registered retained dialog,
 * and emits renderer-only transient models after feature unlocks.
 */
export class PixiAnnouncementPresenter {
  static explain =
    'Queues level, research, unlock, and while-away notices and presents them through one retained Pixi dialog.';

  constructor({
    renderFacade,
    gameplayFacade = null,
    playerFacade = null,
    displayMs = PIXI_ANNOUNCEMENT_TIMING.displayMs,
    levelRewardRevealDelayMs =
      PIXI_ANNOUNCEMENT_TIMING.levelRewardRevealDelayMs,
    prefersReducedMotion = () => false,
    setTimeoutFn = (callback, delay) =>
      globalThis.setTimeout(callback, delay),
    clearTimeoutFn = (handle) =>
      globalThis.clearTimeout(handle),
    scheduleTask = defaultScheduleTask,
    presentTransientEffect = null,
  } = {}) {
    if (!renderFacade) {
      throw new Error(
        'PixiAnnouncementPresenter requires the production RenderFacade.',
      );
    }

    this.renderFacade = renderFacade;
    this.gameplayFacade = gameplayFacade;
    this.playerFacade = playerFacade;
    this.displayMs = Math.max(0, Number(displayMs) || 0);
    this.levelRewardRevealDelayMs = Math.max(
      0,
      Number(levelRewardRevealDelayMs) || 0,
    );
    this.prefersReducedMotion =
      typeof prefersReducedMotion === 'function'
        ? prefersReducedMotion
        : () => Boolean(prefersReducedMotion);
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.scheduleTask =
      typeof scheduleTask === 'function'
        ? scheduleTask
        : defaultScheduleTask;
    this.presentTransientEffect =
      typeof presentTransientEffect === 'function'
        ? presentTransientEffect
        : null;

    this.runtime = null;
    this.dialogInstance = null;
    this.gameplaySnapshot = null;
    this.playerSnapshot = {};
    this.previousLevel = null;
    this.previousCompletedResearchIds = null;
    this.previousPersistenceLoadRevision = null;
    this.previousAwayReportRevision = null;
    this.queue = [];
    this.queuedKeys = new Set();
    this.current = null;
    this.currentPresentation = null;
    this.lastCompletionPresentation = null;
    this.hideTimeoutId = null;
    this.unsubscribeGameplay = null;
    this.unsubscribePlayer = null;
    this.deferredRevision = 0;
    this.sequence = 0;
    this.mounted = false;

    this.dialogActions = Object.freeze({
      advance: (details) => this.handleDialogAdvance(details),
    });
  }

  mount() {
    if (this.mounted) {
      return false;
    }

    this.runtime = this.requireRuntime();
    this.gameplaySnapshot =
      this.gameplayFacade?.getSnapshot?.() ?? null;
    this.playerSnapshot =
      this.playerFacade?.getSnapshot?.() ?? {};

    if (this.gameplaySnapshot) {
      this.captureBaseline(this.gameplaySnapshot);
    }

    this.mounted = true;
    this.queuePendingWhileAwayReports();
    this.unsubscribeGameplay = normalizeUnsubscribe(
      this.gameplayFacade?.subscribe?.((snapshot) =>
        this.handleSnapshot(snapshot),
      ),
    );
    this.unsubscribePlayer = normalizeUnsubscribe(
      this.playerFacade?.subscribe?.((snapshot) => {
        this.playerSnapshot = snapshot ?? {};
      }),
    );
    this.showNext();
    return true;
  }

  unmount() {
    if (!this.mounted) {
      return false;
    }

    this.mounted = false;
    this.deferredRevision += 1;
    this.unsubscribePlayer?.();
    this.unsubscribeGameplay?.();
    this.unsubscribePlayer = null;
    this.unsubscribeGameplay = null;
    this.clearHideTimeout();
    this.closeDialog();
    this.clearAnnouncementState();
    this.gameplaySnapshot = null;
    this.playerSnapshot = {};
    this.previousLevel = null;
    this.previousCompletedResearchIds = null;
    this.previousPersistenceLoadRevision = null;
    this.previousAwayReportRevision = null;
    this.runtime = null;
    return true;
  }

  handleSnapshot(snapshot = {}) {
    if (!this.mounted) {
      return false;
    }

    this.gameplaySnapshot = snapshot ?? {};

    if (this.previousCompletedResearchIds === null) {
      this.captureBaseline(this.gameplaySnapshot);
      this.queuePendingWhileAwayReports();
      this.showNext();
      return true;
    }

    if (
      this.hasPersistenceLoadRevisionChanged(
        this.gameplaySnapshot,
      ) ||
      this.hasAwayReportRevisionChanged(this.gameplaySnapshot)
    ) {
      this.resetAnnouncementsToBaseline(this.gameplaySnapshot);
      this.queuePendingWhileAwayReports();
      this.showNext();
      return true;
    }

    this.queueLevelAnnouncement(this.gameplaySnapshot);
    this.queueResearchAnnouncements(this.gameplaySnapshot);
    this.captureBaseline(this.gameplaySnapshot);
    this.showNext();
    return true;
  }

  showFeatureUnlockPreview({
    values = FEATURE_UNLOCK_PREVIEW_VALUES,
    pageIds = FEATURE_UNLOCK_PREVIEW_PAGE_IDS,
    notices = {},
  } = {}) {
    const normalizedValues = (
      Array.isArray(values) ? values : []
    ).filter(
      (value) =>
        typeof value === 'string' && value.trim(),
    );

    if (!this.mounted || normalizedValues.length === 0) {
      return {
        ok: false,
        reason: this.mounted
          ? 'features_missing'
          : 'announcements_not_mounted',
      };
    }

    this.deferredRevision += 1;
    this.clearHideTimeout();
    this.clearAnnouncementState();
    this.current = {
      key: `preview:${++this.sequence}`,
      kind: 'unlock',
      preview: true,
      values: normalizedValues,
      pageIds: { ...(pageIds ?? {}) },
      notices: { ...(notices ?? {}) },
    };
    this.queuedKeys.add(this.current.key);
    const presentation = this.presentCurrent();

    return {
      ok: true,
      dialogId: 'featureUnlockAnnouncement',
      pixiDialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
      presentation,
    };
  }

  isOpen() {
    if (!this.mounted || !this.current) {
      return false;
    }
    const openDialogIds =
      this.runtime?.getOpenDialogIds?.();
    return Array.isArray(openDialogIds)
      ? openDialogIds.includes(PIXI_ANNOUNCEMENT_DIALOG_ID)
      : true;
  }

  dismissCurrent(source = 'dismiss') {
    if (
      this.current?.preview !== true &&
      this.current?.kind !== 'whileAway'
    ) {
      return false;
    }
    return Boolean(
      this.completeCurrent({
        source,
        closeDialog: true,
      }),
    );
  }

  getCurrentPresentation() {
    return this.currentPresentation;
  }

  getLastCompletionPresentation() {
    return this.lastCompletionPresentation;
  }

  getPendingDelayMs() {
    const currentDelay =
      this.current && this.current.kind !== 'whileAway'
        ? this.getAnnouncementDuration(this.current)
        : 0;
    const queuedDelay = this.queue
      .filter(
        (announcement) =>
          announcement?.kind !== 'whileAway',
      )
      .reduce(
        (total, announcement) =>
          total + this.getAnnouncementDuration(announcement),
        0,
      );
    return currentDelay + queuedDelay;
  }

  captureBaseline(snapshot = {}) {
    this.previousLevel = getPlayerLevel(snapshot);
    this.previousCompletedResearchIds =
      getCompletedResearchIds(snapshot);
    this.previousPersistenceLoadRevision =
      getPersistenceLoadRevision(snapshot);
    this.previousAwayReportRevision =
      getAwayReportRevision(snapshot);
  }

  hasPersistenceLoadRevisionChanged(snapshot = {}) {
    const nextRevision =
      getPersistenceLoadRevision(snapshot);
    return (
      this.previousPersistenceLoadRevision !== null &&
      nextRevision !== null &&
      nextRevision !==
        this.previousPersistenceLoadRevision
    );
  }

  hasAwayReportRevisionChanged(snapshot = {}) {
    const nextRevision = getAwayReportRevision(snapshot);
    return (
      this.previousAwayReportRevision !== null &&
      nextRevision !== null &&
      nextRevision !== this.previousAwayReportRevision
    );
  }

  resetAnnouncementsToBaseline(snapshot = {}) {
    this.deferredRevision += 1;
    this.clearHideTimeout();
    this.closeDialog();
    this.clearAnnouncementState();
    this.captureBaseline(snapshot);
  }

  clearAnnouncementState() {
    this.queue = [];
    this.queuedKeys.clear();
    this.current = null;
    this.currentPresentation = null;
  }

  queuePendingWhileAwayReports() {
    const reports =
      this.gameplayFacade?.consumeWhileAwayReports?.() ?? [];
    const revision =
      getAwayReportRevision(this.gameplaySnapshot ?? {}) ??
      this.previousAwayReportRevision ??
      0;

    for (const [index, report] of (
      Array.isArray(reports) ? reports : []
    ).entries()) {
      if (
        report?.kind !== 'whileAway' ||
        !Array.isArray(report.rows) ||
        report.rows.length === 0
      ) {
        continue;
      }

      const rows = getVisibleWhileAwayRows(report.rows);
      if (rows.length === 0) {
        continue;
      }

      this.enqueue({
        ...report,
        key:
          report.id ??
          `whileAway:${revision}:${index}:${++this.sequence}`,
        rows,
      });
    }
  }

  queueLevelAnnouncement(snapshot = {}) {
    const nextLevel = getPlayerLevel(snapshot);

    if (
      !Number.isInteger(this.previousLevel) ||
      !Number.isInteger(nextLevel) ||
      nextLevel <= this.previousLevel
    ) {
      return false;
    }

    const fromLevel = this.previousLevel;
    const rows = getLevelPayoffRows(snapshot, {
      fromLevel,
      toLevel: nextLevel,
    });
    const levelKey = `level:${fromLevel}:${nextLevel}`;

    this.enqueue({
      key: levelKey,
      kind: 'level',
      fromLevel,
      toLevel: nextLevel,
      rows,
    });

    const unlockAnnouncement =
      getFeatureUnlockAnnouncement(rows, {
        key: `${levelKey}:unlock`,
      });
    if (unlockAnnouncement) {
      this.enqueue(unlockAnnouncement);
    }
    return true;
  }

  queueResearchAnnouncements(snapshot = {}) {
    const completedResearchIds =
      getCompletedResearchIds(snapshot);
    const previousIds =
      this.previousCompletedResearchIds ?? new Set();

    for (const researchId of completedResearchIds) {
      if (previousIds.has(researchId)) {
        continue;
      }
      this.enqueue({
        key: `research:${researchId}`,
        kind: 'research',
        research: getResearchSnapshot(
          snapshot,
          researchId,
          this.gameplayFacade,
        ),
      });
    }
  }

  enqueue(announcement) {
    const key =
      announcement?.key ??
      `announcement:${++this.sequence}`;
    if (this.queuedKeys.has(key)) {
      return false;
    }
    this.queuedKeys.add(key);
    this.queue.push({ ...announcement, key });
    return true;
  }

  showNext() {
    if (
      !this.mounted ||
      this.current ||
      this.queue.length === 0
    ) {
      return null;
    }

    this.current = this.queue.shift();
    return this.presentCurrent();
  }

  presentCurrent() {
    if (!this.current || !this.mounted) {
      return null;
    }

    this.currentPresentation =
      createPixiAnnouncementPresentation(this.current, {
        actions: this.dialogActions,
        durationMs: this.getAnnouncementDuration(
          this.current,
        ),
        levelRevealDelayMs:
          this.current.kind === 'level'
            ? this.getAnnouncementDuration(this.current) -
              this.displayMs
            : 0,
        pendingDelayMs: this.getPendingDelayMs(),
        playerSnapshot: this.playerSnapshot,
      });
    const instance = this.runtime.openDialog(
      PIXI_ANNOUNCEMENT_DIALOG_ID,
      this.currentPresentation,
    );

    if (
      instance &&
      this.dialogInstance &&
      instance !== this.dialogInstance
    ) {
      throw new Error(
        'global.announcement must retain one dialog instance.',
      );
    }
    this.dialogInstance ??= instance ?? null;

    this.clearHideTimeout();
    if (
      this.current.kind !== 'whileAway' &&
      !this.current.preview
    ) {
      this.hideTimeoutId = this.setTimeoutFn(
        () => {
          this.hideTimeoutId = null;
          this.completeCurrent({
            source: 'timer',
            closeDialog: true,
          });
        },
        this.getAnnouncementDuration(this.current),
      );
      this.hideTimeoutId?.unref?.();
    }
    return this.currentPresentation;
  }

  handleDialogAdvance({ source = 'dialog' } = {}) {
    if (
      this.current?.preview !== true &&
      this.current?.kind !== 'whileAway'
    ) {
      return false;
    }

    const result = this.completeCurrent({
      source,
      closeDialog: false,
      deferNext: true,
    });
    return Boolean(result);
  }

  completeCurrent({
    source = 'complete',
    closeDialog = true,
    deferNext = false,
  } = {}) {
    const announcement = this.current;
    if (!announcement) {
      return null;
    }
    const featureSourceBounds =
      announcement.kind === 'unlock'
        ? this.dialogInstance?.getFeatureSourceBounds?.() ?? []
        : [];

    this.clearHideTimeout();
    this.current = null;
    this.currentPresentation = null;
    this.queuedKeys.delete(announcement.key);

    if (closeDialog) {
      this.closeDialog();
    }

    const transient =
      announcement.kind === 'unlock'
        ? createFeatureUnlockTransientPresentation(
            announcement,
            { featureSourceBounds },
          )
        : null;
    this.lastCompletionPresentation = Object.freeze({
      source,
      dialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
      announcement,
      transient,
    });

    for (const effect of transient?.effects ?? []) {
      this.presentTransientEffect?.(effect);
    }

    if (deferNext && this.queue.length > 0) {
      this.deferShowNext();
    } else {
      this.showNext();
    }
    return this.lastCompletionPresentation;
  }

  deferShowNext() {
    const revision = ++this.deferredRevision;
    this.scheduleTask(() => {
      if (
        this.mounted &&
        revision === this.deferredRevision
      ) {
        this.showNext();
      }
    });
  }

  getAnnouncementDuration(announcement) {
    const revealDelay =
      announcement?.kind === 'level' &&
      !this.getPrefersReducedMotion()
        ? this.levelRewardRevealDelayMs
        : 0;
    return this.displayMs + revealDelay;
  }

  getPrefersReducedMotion() {
    try {
      return Boolean(this.prefersReducedMotion());
    } catch {
      return false;
    }
  }

  clearHideTimeout() {
    if (this.hideTimeoutId === null) {
      return;
    }
    this.clearTimeoutFn(this.hideTimeoutId);
    this.hideTimeoutId = null;
  }

  closeDialog() {
    if (
      this.runtime
        ?.getOpenDialogIds?.()
        ?.includes?.(PIXI_ANNOUNCEMENT_DIALOG_ID)
    ) {
      return this.runtime.closeDialog(
        PIXI_ANNOUNCEMENT_DIALOG_ID,
      );
    }
    return false;
  }

  requireRuntime() {
    const runtime = this.renderFacade.getUiRuntime?.();
    if (!runtime?.initialized) {
      throw new Error(
        'PixiAnnouncementPresenter requires RenderFacade.initialize() before mounting.',
      );
    }
    if (
      typeof runtime.openDialog !== 'function' ||
      typeof runtime.closeDialog !== 'function'
    ) {
      throw new Error(
        'PixiAnnouncementPresenter requires the retained Pixi dialog runtime.',
      );
    }
    return runtime;
  }
}

export function createPixiAnnouncementPresentation(
  announcement = {},
  {
    actions = {},
    durationMs = 0,
    levelRevealDelayMs = 0,
    pendingDelayMs = durationMs,
    playerSnapshot = {},
  } = {},
) {
  const shared = {
    announcementId:
      announcement.key ?? announcement.id ?? null,
    kind: announcement.kind ?? 'research',
    framed: false,
    dismissible: false,
    durationMs: Math.max(0, Number(durationMs) || 0),
    pendingDelayMs: Math.max(
      0,
      Number(pendingDelayMs) || 0,
    ),
    player: createPlayerPresentation(playerSnapshot),
    actions,
  };

  if (announcement.kind === 'level') {
    return {
      ...shared,
      title: 'rewards',
      ariaLabel: `level ${announcement.toLevel} rewards`,
      rows: createLevelPresentationRows(
        announcement.rows,
        announcement.toLevel,
      ),
      level: {
        from: announcement.fromLevel,
        to: announcement.toLevel,
      },
      animation: {
        kind: 'level-rewards',
        revealDelayMs: Math.max(
          0,
          Number(levelRevealDelayMs) || 0,
        ),
      },
    };
  }

  if (announcement.kind === 'whileAway') {
    return {
      ...shared,
      title: 'while away',
      ariaLabel: 'while away report',
      variant: 'report',
      framed: true,
      dismissible: true,
      showClose: true,
      report: {
        source: announcement.source ?? null,
        offlineSeconds: Math.max(
          0,
          Number(announcement.offlineSeconds) || 0,
        ),
      },
      rows: createWhileAwayPresentationRows(
        announcement.rows,
      ),
    };
  }

  if (announcement.kind === 'unlock') {
    return createFeatureUnlockScreenPresentation(
      announcement,
      shared,
    );
  }

  return createResearchDialogPresentation(
    announcement,
    shared,
  );
}

export function createFeatureUnlockTransientPresentation(
  announcement = {},
  { featureSourceBounds = [] } = {},
) {
  const sourceBoundsByValue = new Map(
    (Array.isArray(featureSourceBounds)
      ? featureSourceBounds
      : []
    ).map((source) => [source?.value, source?.bounds]),
  );
  const values = Array.isArray(announcement.values)
    ? announcement.values
    : [];
  const features = values.map((value, index) => {
    const pageId = announcement.pageIds?.[value] ?? null;
    const targetId = getFeatureUnlockTargetId({
      value,
      pageId,
    });
    const notice =
      announcement.notices?.[value] ??
      `${value} unlocked`;
    return {
      id: `${announcement.key ?? 'feature-unlock'}:${index}`,
      value,
      pageId,
      targetId,
      icon: getFeatureUnlockIconPresentation({
        value,
        pageId,
      }),
      sourceBounds:
        normalizeFeatureSourceBounds(
          sourceBoundsByValue.get(value),
        ),
      notice,
    };
  });
  const effects = features.map((feature, index) => ({
    id: feature.id,
    type: 'feature_unlocked',
    message: feature.notice,
    runs: [{ kind: 'text', text: feature.notice }],
    flyoutKey: `feature-unlock:${feature.value}`,
    delayMs: index * 55,
    feature: feature.value,
    pageId: feature.pageId,
    targetId: feature.targetId,
    icon: feature.icon,
    sourceBounds: feature.sourceBounds,
  }));

  return Object.freeze({
    kind: 'featureUnlock',
    sourceDialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
    features: Object.freeze(features),
    pageIds: Object.freeze([
      ...new Set(
        features.map(({ pageId }) => pageId).filter(Boolean),
      ),
    ]),
    effects: Object.freeze(effects),
  });
}

export function getFeatureUnlockTargetId({
  value,
  pageId,
} = {}) {
  if (typeof pageId === 'string' && pageId.trim()) {
    return `page.${pageId}`;
  }
  const feature = String(value ?? '').trim();
  return feature ? `workshop.feature.${feature}` : null;
}

function normalizeFeatureSourceBounds(bounds) {
  if (
    !bounds ||
    ![
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    ].every(Number.isFinite)
  ) {
    return null;
  }
  return Object.freeze({
    x: Number(bounds.x),
    y: Number(bounds.y),
    width: Math.max(0, Number(bounds.width)),
    height: Math.max(0, Number(bounds.height)),
  });
}

export function getFeatureUnlockIconPresentation({
  value,
  pageId,
} = {}) {
  const feature = String(value ?? '').trim();
  const presentation =
    FEATURE_ICON_PRESENTATIONS[feature] ??
    FEATURE_ICON_PRESENTATIONS[pageId] ??
    null;
  return presentation ? { ...presentation } : null;
}

export function getResearchIconPresentation(
  research = {},
) {
  const researchId = String(research.id ?? '');
  const frameName = getResearchIconFrameName(research);
  if (!frameName) {
    return {
      fallbackLabel: 'research',
    };
  }
  if (researchId.startsWith('unlockSeed:')) {
    const seedKey = researchId.slice('unlockSeed:'.length);
    return {
      frameName,
      silhouetteFrameName: frameName,
      itemFrameName: getHerbIconFrameName(
        seedKey.endsWith('Seed')
          ? `${seedKey.slice(0, -'Seed'.length)}Herb`
          : seedKey,
      ),
      label: research.label ?? '',
    };
  }
  return {
    frameName,
    silhouetteFrameName: frameName,
    label: research.label ?? '',
  };
}

function createFeatureUnlockScreenPresentation(
  announcement,
  shared,
) {
  const values = Array.isArray(announcement.values)
    ? announcement.values
    : [];
  const firstValue = values[0] ?? 'feature';
  const singleUnlock = values.length === 1;
  const title = singleUnlock
    ? announcement.notices?.[firstValue] ??
      `${firstValue} unlocked`
    : 'features unlocked';
  const items = values.map((value, index) => {
    const pageId = announcement.pageIds?.[value] ?? null;
    return {
      id: `${announcement.key ?? 'unlock'}:${index}`,
      kind: 'row',
      label: value,
      value: singleUnlock
        ? pageId
          ? 'new room available'
          : 'new feature available'
        : '',
      feature: value,
      pageId,
      targetId: getFeatureUnlockTargetId({
        value,
        pageId,
      }),
      icon: getFeatureUnlockIconPresentation({
        value,
        pageId,
      }),
      compact: !singleUnlock,
    };
  });
  return {
    ...shared,
    title,
    ariaLabel: title,
    dismissible: announcement.preview === true,
    showClose: false,
    preview: announcement.preview === true,
    values,
    pageIds: { ...(announcement.pageIds ?? {}) },
    notices: { ...(announcement.notices ?? {}) },
    items,
    rows: items,
    animation: {
      kind: 'feature-unlock',
      overlayDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.overlayDurationMs,
      panelDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.panelDurationMs,
      iconDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.researchIconDurationMs,
      iconDelayMs:
        PIXI_ANNOUNCEMENT_MOTION.researchIconDelayMs,
      iconStaggerMs:
        PIXI_ANNOUNCEMENT_MOTION.unlockIconStaggerMs,
      labelDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.rowDurationMs,
      labelDelayMs:
        PIXI_ANNOUNCEMENT_MOTION.researchLabelDelayMs,
      detailDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.rowDurationMs,
      detailDelayMs:
        PIXI_ANNOUNCEMENT_MOTION.researchDetailDelayMs,
    },
  };
}

function createResearchDialogPresentation(
  announcement,
  shared,
) {
  const research = announcement.research ?? {};
  const actionLabel =
    research.actionType === 'levelUp'
      ? 'level up complete'
      : 'research complete';
  const detail = getResearchDetailText(research);
  return {
    ...shared,
    title: actionLabel,
    ariaLabel: `${research.label} ${actionLabel}`,
    copy: research.label ?? '',
    rows: detail
      ? [
          {
            id: `${announcement.key ?? 'research'}:detail`,
            kind: 'message',
            text: detail,
            valueRuns: createResourceRuns(detail),
          },
        ]
      : [],
    research,
    icon: getResearchIconPresentation(research),
    animation: {
      kind: 'research-complete',
      overlayDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.overlayDurationMs,
      panelDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.panelDurationMs,
      titleDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.researchTitleDurationMs,
      silhouetteDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.researchSilhouetteDurationMs,
      iconDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.researchIconDurationMs,
      iconDelayMs:
        PIXI_ANNOUNCEMENT_MOTION.researchIconDelayMs,
      labelDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.rowDurationMs,
      labelDelayMs:
        PIXI_ANNOUNCEMENT_MOTION.researchLabelDelayMs,
      detailDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.rowDurationMs,
      detailDelayMs:
        PIXI_ANNOUNCEMENT_MOTION.researchDetailDelayMs,
      fallbackIconDurationMs:
        PIXI_ANNOUNCEMENT_MOTION.fallbackIconDurationMs,
    },
  };
}

function createLevelPresentationRows(rows, toLevel) {
  const displayRows =
    Array.isArray(rows) && rows.length > 0
      ? rows
      : [{ label: 'rewards', value: 'none' }];
  return displayRows.slice(0, 5).map((row, index) => {
    const valueLines = Array.isArray(row.valueLines)
      ? row.valueLines
      : [];
    const value =
      valueLines.length > 0
        ? valueLines.join(' / ')
        : String(row.value ?? '');
    return {
      ...row,
      id: `level:${toLevel}:${index}`,
      kind: 'row',
      label: String(row.label ?? ''),
      value,
      mutedLabel: true,
      boldValue: true,
      resource: inferResource(value),
      valueRuns: createResourceRuns(value),
    };
  });
}

function createWhileAwayPresentationRows(rows) {
  return getVisibleWhileAwayRows(rows).map((row, index) => {
    const parts = getWhileAwayReportLineParts(row);
    return {
      id: `whileAway:${getWhileAwayReportRowType(row)}:${index}`,
      kind: 'row',
      reportRowType: getWhileAwayReportRowType(row),
      label: parts.label,
      value: parts.value,
      mutedLabel: true,
      boldValue: true,
      resource: parts.resource ?? inferResource(parts.value),
      icon: parts.icon ?? null,
      valueRuns: createResourceRuns(
        parts.value,
        parts.icon,
      ),
    };
  });
}

function getFeatureUnlockAnnouncement(
  rows = [],
  { key = null } = {},
) {
  const unlockRow = rows.find(
    (row) =>
      row?.label === 'unlocks' &&
      Array.isArray(row.valueLines),
  );
  const values = unlockRow?.valueLines?.filter(
    (value) =>
      typeof value === 'string' && value.trim(),
  );
  if (!values?.length) {
    return null;
  }

  const pageIds = unlockRow.valueLinePageIds ?? {};
  const sourceNotices = unlockRow.valueLineNotices ?? {};
  return {
    key,
    kind: 'unlock',
    values,
    pageIds,
    notices: values.reduce((notices, value) => {
      notices[value] =
        sourceNotices[value] ?? `${value} unlocked`;
      return notices;
    }, {}),
  };
}

function getVisibleWhileAwayRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    WHILE_AWAY_VISIBLE_ROW_TYPES.has(row?.type),
  );
}

function getPlayerLevel(snapshot = {}) {
  const level = Math.floor(
    Number(
      snapshot?.tasks?.currentLevel ??
        snapshot?.playerLevel?.currentLevel,
    ),
  );
  return Number.isInteger(level) && level >= 0
    ? level
    : null;
}

function getCompletedResearchIds(snapshot = {}) {
  const ids = new Set(
    (
      snapshot?.research?.completedResearchIds ?? []
    ).filter(
      (researchId) =>
        typeof researchId === 'string' &&
        researchId.trim(),
    ),
  );
  for (const research of getResearches(snapshot)) {
    if (
      research?.completed &&
      typeof research.id === 'string'
    ) {
      ids.add(research.id);
    }
  }
  return ids;
}

function getPersistenceLoadRevision(snapshot = {}) {
  const revision = Number(
    snapshot?.persistence?.loadRevision,
  );
  return Number.isInteger(revision) && revision >= 0
    ? revision
    : null;
}

function getAwayReportRevision(snapshot = {}) {
  const revision = Number(
    snapshot?.persistence?.awayReportRevision,
  );
  return Number.isInteger(revision) && revision >= 0
    ? revision
    : null;
}

function getResearchSnapshot(
  snapshot,
  researchId,
  gameplayFacade,
) {
  const research =
    getResearches(snapshot).find(
      (candidate) => candidate?.id === researchId,
    ) ??
    gameplayFacade?.researchFacade
      ?.getResearchAnnouncementSnapshot?.(researchId) ??
    {};
  return {
    id: researchId,
    label:
      research.label ?? formatResearchId(researchId),
    effect: research.effect ?? '',
    value: research.value ?? '',
    actionType: research.actionType ?? 'research',
    costCurrency:
      research.costCurrency ??
      inferResearchCurrency(research),
    starLevel: research.starLevel ?? null,
  };
}

function getResearches(snapshot = {}) {
  const tabs = snapshot?.research?.tabs;
  if (Array.isArray(tabs)) {
    return tabs
      .flatMap((tab) => tab.boxes ?? [])
      .flatMap((box) => box.researches ?? []);
  }
  return (snapshot?.research?.boxes ?? []).flatMap(
    (box) => box.researches ?? [],
  );
}

function inferResearchCurrency(research = {}) {
  const value = String(
    research.value ?? research.effect ?? '',
  ).toLowerCase();
  for (const currency of [
    'crystal',
    'ruby',
    'emerald',
    'mana',
  ]) {
    if (value.includes(currency)) {
      return currency;
    }
  }
  return 'coin';
}

function formatResearchId(researchId) {
  return String(researchId ?? 'research')
    .split(':')
    .at(-1)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

function getResearchDetailText(research = {}) {
  if (research.value === 'researched') {
    return research.effect || '';
  }
  if (
    research.effect &&
    research.value &&
    research.effect !== research.value
  ) {
    return `${research.effect} ${research.value}`;
  }
  return research.effect || research.value || '';
}

function getResearchIconFrameName(research = {}) {
  const researchId = String(research.id ?? '');
  if (researchId.startsWith('unlockSeed:')) {
    return 'seed:pack';
  }
  if (researchId.startsWith('unlockRecipe:')) {
    return getPotionIconFrameName(
      researchId.slice('unlockRecipe:'.length),
    );
  }
  const familyFrameName =
    getResearchFamilyIconFrameName(researchId);
  if (familyFrameName) {
    return familyFrameName;
  }
  if (research.actionType === 'levelUp') {
    return (
      RESOURCE_ICON_FRAMES[research.costCurrency] ??
      RESOURCE_ICON_FRAMES.coin
    );
  }
  return RESOURCE_ICON_FRAMES.research;
}

function getResearchFamilyIconFrameName(researchId = '') {
  if (/^summonSeedsX\d+$/.test(researchId)) {
    return RESEARCH_ICON_FRAMES.summonMultiplier;
  }
  const mappings = [
    ['automation:autoSeedSpawn', RESEARCH_ICON_FRAMES.autoSeedSpawn],
    ['automation:autoPlantTile:', RESEARCH_ICON_FRAMES.autoPlant],
    ['automation:autoHarvestPlant:', RESEARCH_ICON_FRAMES.autoHarvest],
    ['automation:autoBrewCauldron:', RESEARCH_ICON_FRAMES.autoBrew],
    ['automation:autoBottleCauldron:', RESEARCH_ICON_FRAMES.autoBottle],
    ['advanced:stallStaffing:', RESEARCH_ICON_FRAMES.stallStaffing],
    ['advanced:researchTime:', RESEARCH_ICON_FRAMES.researchTime],
    ['emerald:researchCost:', RESEARCH_ICON_FRAMES.researchCost],
    ['advanced:automationReserve:', RESEARCH_ICON_FRAMES.automationReserve],
    ['advanced:plotCapacity:', RESEARCH_ICON_FRAMES.plotCapacity],
    ['advanced:cauldronCapacity:', RESEARCH_ICON_FRAMES.cauldronCapacity],
    ['advanced:cauldronBrewing:', RESEARCH_ICON_FRAMES.cauldronBrewing],
    ['advanced:plotGrowth:', RESEARCH_ICON_FRAMES.plotGrowth],
    ['emerald:plotPlanting:', RESEARCH_ICON_FRAMES.plotLevel],
    ['emerald:cauldronBrewing:', RESEARCH_ICON_FRAMES.cauldronLevel],
  ];
  return (
    mappings.find(([prefix]) =>
      researchId.startsWith(prefix),
    )?.[1] ?? null
  );
}

function getWhileAwayReportLineParts(row = {}) {
  switch (row.type) {
    case 'garden_harvested': {
      const label = getReportLabel(row.label, 'herbs');
      return {
        label: 'garden harvested',
        value: `${getPositiveCount(row.quantity)} ${label}`,
        icon: {
          frameName: getHerbIconFrameName(
            getHerbIconKeyByLabel(label),
          ),
          kind: 'herb',
        },
      };
    }
    case 'brewing_complete': {
      const label = getReportLabel(
        row.label,
        'potions',
      );
      return {
        label: 'brewing complete',
        value: `${getPositiveCount(row.quantity)} ${label}`,
        icon: {
          frameName: getPotionIconFrameName(
            getPotionIconKeyByLabel(label),
          ),
          kind: 'potion',
        },
      };
    }
    case 'market_sold':
    case 'npc_market_sold':
      return {
        label: 'traders bought',
        value: formatCoinPriceText(
          getPositiveCoin(row.coin),
        ),
        resource: 'coin',
        icon: {
          frameName: RESOURCE_ICON_FRAMES.coin,
          kind: 'resource',
        },
      };
    case 'auto_seed_summoned':
      return {
        label: 'auto seed summoned',
        value: `${getPositiveCount(row.quantity)} ${
          getPositiveCount(row.quantity) === 1
            ? 'seed'
            : 'seeds'
        }`,
        resource: 'seed',
        icon: {
          frameName: 'seed:pack',
          kind: 'seed',
        },
      };
    default:
      return {
        label: getReportLabel(
          row.label ?? row.type,
          'updated',
        ),
        value: '',
      };
  }
}

function getWhileAwayReportRowType(row = {}) {
  return (
    String(row.type ?? 'updated')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'updated'
  );
}

function getReportLabel(value, fallback) {
  return (
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim() || fallback
  );
}

function getPositiveCount(value) {
  return Math.max(1, Math.floor(Number(value) || 0));
}

function getPositiveCoin(value) {
  const coin = normalizeCoinPrice(value) ?? 0;
  return coin > 0 ? coin : 0;
}

function inferResource(value) {
  const match = String(value ?? '')
    .toLowerCase()
    .match(
      /\b(coin|crystals?|emeralds?|mana|rub(?:y|ies)|seeds?|herbs?)\b/,
    );
  if (!match) {
    return null;
  }
  return match[1]
    .replace(/^crystals$/, 'crystal')
    .replace(/^emeralds$/, 'emerald')
    .replace(/^rubies$/, 'ruby')
    .replace(/^seeds$/, 'seed')
    .replace(/^herbs$/, 'herb');
}

function createResourceRuns(value, explicitIcon = null) {
  const text = String(value ?? '');
  if (!text) {
    return [];
  }
  const icon =
    explicitIcon ??
    (() => {
      const resource = inferResource(text);
      const frameName = RESOURCE_ICON_FRAMES[resource];
      return frameName
        ? { frameName, kind: 'resource' }
        : null;
    })();
  return icon
    ? [
        { kind: 'text', text },
        {
          kind: 'icon',
          frameName: icon.frameName,
          size: 14,
          gap: 2,
          label: icon.kind,
        },
      ]
    : [{ kind: 'text', text }];
}

function createPlayerPresentation(snapshot = {}) {
  return {
    username: String(snapshot?.username ?? '').trim(),
    character: snapshot?.character ?? null,
  };
}

function normalizeUnsubscribe(unsubscribe) {
  return typeof unsubscribe === 'function'
    ? unsubscribe
    : null;
}

function defaultScheduleTask(callback) {
  if (typeof globalThis.queueMicrotask === 'function') {
    globalThis.queueMicrotask(callback);
    return;
  }
  void Promise.resolve().then(callback);
}
