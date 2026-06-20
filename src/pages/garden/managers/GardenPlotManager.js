import {
  isItemResearched,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { createAssetAtlasSprite } from '../../../assets/atlas/atlasSprite.js';
import {
  getHerbIconFrameName,
  getHerbIconKeyByLabel,
} from '../../../assets/items/herbs/herbIcons.js';
import { normalizePlayerPlotView } from '../../../player/playerPlotViews.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';
import { formatGoldPriceText } from '../../../shared/goldPrice.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { setProgressFill, stopProgressFill } from '../../shared/progressFill.js';
import { hasGardenTileNotification } from '../../notifications/managers/PageNotificationStateManager.js';
import { GardenCancelDialogManager } from './GardenCancelDialogManager.js';
import { GardenSeedSwapDialogManager } from './GardenSeedSwapDialogManager.js';

const TOUCH_DRAG_DISTANCE = 8;
const TOUCH_LIKE_PRESS_START_DEDUPE_MS = 80;
const TOUCH_LIKE_CLICK_DEDUPE_RESET_MS = 500;
const NATIVE_SEED_DRAG_QUERY = '(hover: hover) and (pointer: fine)';
const BOX_PLOT_COLUMNS = 3;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export class GardenPlotManager {
  constructor({ gameplayFacade, playerFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerFacade = playerFacade;
    this.cancelDialogManager = new GardenCancelDialogManager({
      onConfirm: (tileNumber) => this.onConfirmCancel(tileNumber),
    });
    this.swapDialogManager = new GardenSeedSwapDialogManager({
      onConfirm: (swap) => this.onConfirmSeedSwap(swap),
    });
    this.root = null;
    this.unsubscribe = null;
    this.playerUnsubscribe = null;
    this.latestSnapshot = null;
    this.plotView = normalizePlayerPlotView(playerFacade?.getSnapshot?.().plotView);
    this.refs = {};
    this.tileRefs = new Map();
    this.seedRefs = new Map();
    this.emptySeedRef = null;
    this.seedRowOrderKey = '';
    this.selectedTileNumber = null;
    this.openSeedPopupAfterCancelTileNumber = null;
    this.visible = false;
    this.previousFocus = null;
    this.handledTileLabelPressStartTileNumber = null;
    this.handledTileLabelPressStartReset = null;
    this.handledSeedPressStartKey = null;
    this.handledSeedPressStartReset = null;
    this.draggedSeedItemTypeId = null;
    this.pointerSeedDrag = null;
    this.lastTouchLikePressStart = {
      key: null,
      timeStamp: Number.NEGATIVE_INFINITY,
    };
    this.handleDocumentSeedPointerMove = (event) => this.onDocumentSeedPointerMove(event);
    this.handleDocumentSeedPointerUp = (event) => this.onDocumentSeedPointerUp(event);
    this.handleDocumentSeedPointerCancel = () => this.cancelSeedPointerDrag();
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        if (this.handledTileLabelPressStartTileNumber !== null) {
          event.preventDefault();
          event.stopPropagation();
          this.clearHandledTileLabelPressStartTileNumber();
          return;
        }

        this.hideSeedPopup();
      }
    };
    this.handlePlotRowsScroll = () => this.updateOverflowCue(this.refs.rows);
    this.handleSeedRowsScroll = () => this.updateOverflowCue(this.refs.seedRows);
    this.handleKeydown = (event) => {
      if (!this.visible) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        this.hideSeedPopup();
        return;
      }

      if (event.key === 'Tab') {
        this.trapDialogTab(event);
      }
    };
  }

  mount(parent, popupParent = parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'garden-page__plot style-box';
    this.root.setAttribute('aria-label', 'Garden plot');

    this.refs.title = this.createTitle();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'garden-page__plot-rows';
    this.refs.popup = this.createSeedPopup();
    this.refs.rows.addEventListener('scroll', this.handlePlotRowsScroll);
    this.refs.seedRows.addEventListener('scroll', this.handleSeedRowsScroll);

    this.root.append(this.refs.title, this.refs.rows);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    this.cancelDialogManager.mount(popupParent);
    this.swapDialogManager.mount(popupParent);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.playerUnsubscribe =
      this.playerFacade?.subscribe?.((snapshot) => this.renderPlayerSnapshot(snapshot)) ?? null;
    this.render(this.gameplayFacade.getSnapshot());
    this.renderPlayerSnapshot(this.playerFacade?.getSnapshot?.());
    this.applyPopupVisibility();

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.playerUnsubscribe?.();
    this.playerUnsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.rows?.removeEventListener('scroll', this.handlePlotRowsScroll);
    this.refs.seedRows?.removeEventListener('scroll', this.handleSeedRowsScroll);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.clearHandledTileLabelPressStartTileNumber();
    this.clearHandledSeedPressStartKey();
    this.cancelSeedPointerDrag();
    this.cancelDialogManager.unmount();
    this.swapDialogManager.unmount();
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.latestSnapshot = null;
    this.refs = {};
    this.tileRefs.clear();
    this.seedRefs.clear();
    this.emptySeedRef = null;
    this.seedRowOrderKey = '';
    this.selectedTileNumber = null;
    this.openSeedPopupAfterCancelTileNumber = null;
    this.visible = false;
    this.previousFocus = null;
    this.handledTileLabelPressStartTileNumber = null;
    this.handledTileLabelPressStartReset = null;
    this.handledSeedPressStartKey = null;
    this.handledSeedPressStartReset = null;
    this.draggedSeedItemTypeId = null;
    this.pointerSeedDrag = null;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'plots';
    return title;
  }

  createSeedPopup() {
    const popup = document.createElement('section');
    popup.className = 'garden-page__seed-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'garden-page__seed-dialog style-dialog';
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.id = 'garden-seed-dialog-title';
    title.textContent = 'choose seed';
    dialog.setAttribute('aria-labelledby', title.id);

    this.refs.seedRows = document.createElement('div');
    this.refs.seedRows.className = 'garden-page__seed-rows';
    dialog.append(title, this.refs.seedRows);
    popup.append(dialog);
    this.refs.dialog = dialog;

    return popup;
  }

  createTile(tileNumber) {
    const button = document.createElement('button');
    button.className = 'garden-page__plot-row';
    button.type = 'button';
    button.dataset.gardenTileNumber = String(tileNumber);
    button.dataset.tutorialId = `garden:plot:${tileNumber}`;
    button.addEventListener('click', (event) => this.onTileClick(tileNumber, event));
    button.addEventListener('dragover', (event) => this.onTileDragOver(tileNumber, event));
    button.addEventListener('dragleave', () => this.onTileDragLeave(tileNumber));
    button.addEventListener('drop', (event) => this.onTileDrop(tileNumber, event));

    const number = document.createElement('span');
    number.className = 'garden-page__plot-number';
    number.textContent = String(tileNumber);

    const label = document.createElement('span');
    label.className = 'garden-page__plot-label';
    label.dataset.tutorialId = `garden:plot:${tileNumber}:label`;
    label.addEventListener('pointerdown', (event) =>
      this.onTileLabelPressStart(tileNumber, event),
    );
    label.addEventListener('touchstart', (event) => this.onTileLabelPressStart(tileNumber, event), {
      passive: false,
    });
    label.addEventListener('click', (event) => this.onTileLabelClick(tileNumber, event));

    const state = document.createElement('span');
    state.className = 'garden-page__plot-state';

    const action = document.createElement('span');
    action.className = 'garden-page__plot-action';

    const actionLabel = document.createElement('span');
    actionLabel.className = 'garden-page__plot-action-label';

    const actionGap = document.createTextNode('');

    const actionTimer = document.createElement('span');
    actionTimer.className = 'garden-page__plot-action-timer';

    const progress = document.createElement('span');
    progress.className = 'style-progress style-progress--timer garden-page__plot-progress';
    progress.setAttribute('aria-hidden', 'true');

    const fill = document.createElement('span');
    fill.className = 'style-progress__fill garden-page__plot-progress-fill';

    const progressText = document.createElement('span');
    progressText.className = 'style-progress__text garden-page__plot-progress-text';

    const boxFrame = document.createElement('span');
    boxFrame.className = 'garden-page__plot-box-frame';
    boxFrame.setAttribute('aria-hidden', 'true');

    const boxNumber = document.createElement('span');
    boxNumber.className = 'garden-page__plot-box-number';

    const boxLabel = document.createElement('span');
    boxLabel.className = 'garden-page__plot-box-label';
    boxLabel.addEventListener('pointerdown', (event) =>
      this.onTileLabelPressStart(tileNumber, event),
    );
    boxLabel.addEventListener(
      'touchstart',
      (event) => this.onTileLabelPressStart(tileNumber, event),
      {
        passive: false,
      },
    );
    boxLabel.addEventListener('click', (event) => this.onTileLabelClick(tileNumber, event));

    const boxPlant = document.createElement('span');
    boxPlant.className = 'garden-page__plot-plant';

    const boxScissors = this.createScissorsIcon();

    const boxAction = document.createElement('span');
    boxAction.className = 'garden-page__plot-action garden-page__plot-box-action';

    const boxActionLabel = document.createElement('span');
    boxActionLabel.className = 'garden-page__plot-box-action-label';

    const boxActionGap = document.createTextNode('');

    const boxTimer = document.createElement('span');
    boxTimer.className = 'garden-page__plot-box-timer';

    progress.append(fill, progressText);
    action.append(actionLabel, actionGap, actionTimer);
    boxAction.append(boxActionLabel, boxActionGap, boxTimer);
    boxFrame.append(boxNumber, boxLabel, boxPlant, boxScissors, boxAction);
    button.append(number, label, state, action, boxFrame, progress);
    this.tileRefs.set(tileNumber, {
      button,
      label,
      state,
      action,
      actionLabel,
      actionGap,
      actionTimer,
      progress,
      fill,
      progressText,
      boxFrame,
      boxNumber,
      boxLabel,
      boxPlant,
      boxScissors,
      boxAction,
      boxActionLabel,
      boxActionGap,
      boxTimer,
    });
    this.refs.rows.append(button);
  }

  createScissorsIcon() {
    const scissors = document.createElementNS(SVG_NAMESPACE, 'svg');
    scissors.setAttribute('class', 'garden-page__plot-scissors');
    scissors.setAttribute('viewBox', '0 0 14 14');
    scissors.setAttribute('aria-hidden', 'true');
    scissors.setAttribute('focusable', 'false');

    const firstCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
    firstCircle.setAttribute('cx', '3.5');
    firstCircle.setAttribute('cy', '10.5');
    firstCircle.setAttribute('r', '2');

    const secondCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
    secondCircle.setAttribute('cx', '10.5');
    secondCircle.setAttribute('cy', '10.5');
    secondCircle.setAttribute('r', '2');

    const firstBlade = document.createElementNS(SVG_NAMESPACE, 'path');
    firstBlade.setAttribute('d', 'M5 9 12 2');

    const secondBlade = document.createElementNS(SVG_NAMESPACE, 'path');
    secondBlade.setAttribute('d', 'M9 9 2 2');

    scissors.append(firstCircle, secondCircle, firstBlade, secondBlade);
    return scissors;
  }

  createSeedRow(seed) {
    const row = document.createElement('div');
    row.className = 'garden-page__seed-row';
    setResourceColor(row, 'seed');

    const button = document.createElement('button');
    button.className = 'garden-page__seed-button';
    button.type = 'button';
    setResourceColor(button, 'seed');
    this.bindTouchLikePressStart(button, `seed:${seed.itemTypeId}`, (event) =>
      this.onSelectSeedPressStart(event, seed.itemTypeId),
    );
    button.addEventListener('click', (event) => this.onSelectSeedClick(event, seed.itemTypeId));

    const label = document.createElement('span');
    label.className = 'row_key';
    label.dataset.tutorialId = `garden:seed:${seed.key}`;

    const quantity = document.createElement('span');
    quantity.className = 'row_val';

    button.append(label, quantity);
    row.append(button);
    this.seedRefs.set(seed.itemTypeId, { row, button, label, quantity });
    this.refs.seedRows.append(row);
  }

  createEmptySeedRow() {
    const row = document.createElement('div');
    row.className = 'garden-page__seed-row';

    const button = document.createElement('button');
    button.className = 'garden-page__seed-button';
    button.type = 'button';
    this.bindTouchLikePressStart(button, 'seed:empty', (event) =>
      this.onSelectSeedPressStart(event, null),
    );
    button.addEventListener('click', (event) => this.onSelectSeedClick(event, null));

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'empty';

    const quantity = document.createElement('span');
    quantity.className = 'row_val';

    button.append(label, quantity);
    row.append(button);
    this.emptySeedRef = { row, button, label, quantity };
    this.refs.seedRows.append(row);
  }

  renderPlayerSnapshot(snapshot) {
    const nextPlotView = normalizePlayerPlotView(snapshot?.plotView);

    if (this.plotView === nextPlotView) {
      this.applyPlotView();
      return;
    }

    this.plotView = nextPlotView;
    this.applyPlotView();

    if (this.latestSnapshot) {
      this.render(this.latestSnapshot);
    }
  }

  applyPlotView() {
    if (!this.root || !this.refs.rows) {
      return;
    }

    this.root.dataset.plotView = this.plotView;
    this.refs.rows.dataset.plotView = this.plotView;
    this.refs.rows.style.setProperty('--garden-page-plot-columns', String(BOX_PLOT_COLUMNS));
  }

  render(snapshot) {
    this.latestSnapshot = snapshot;
    this.applyPlotView();
    const garden = snapshot.garden;
    const seeds = this.getSeedRows(snapshot);
    const seedQuantityById = new Map(
      seeds.map((seed) => [seed.itemTypeId, seed.quantity]),
    );
    const hasPlantableSeed = seeds.some((seed) => seed.quantity > 0);
    this.ensureTiles(garden.plot.maxTiles);
    this.ensureEmptySeedRow();
    this.ensureSeedRows(seeds);

    for (const tile of garden.plot.tiles) {
      this.renderTile({
        tile,
        plot: garden.plot,
        gold: snapshot.gold,
        seedQuantityById,
        hasPlantableSeed,
      });
    }

    this.renderSeeds(snapshot, seeds);
    this.cancelDialogManager.sync(snapshot);
    this.swapDialogManager.sync(snapshot);
    this.updateOverflowCues();
  }

  getSeedRows(snapshot) {
    return (snapshot.garden?.seeds ?? [])
      .map((seed) => ({
        ...seed,
        researched: isItemResearched(snapshot, seed),
      }))
      .filter((seed) => shouldShowItemInActionList(snapshot, seed, seed.quantity));
  }

  renderTile({ tile, plot, gold, seedQuantityById, hasPlantableSeed }) {
    const refs = this.tileRefs.get(tile.tileNumber);
    const isNextLockedTile = tile.tileNumber === plot.nextTileNumber;
    const selectedSeedQuantity = tile.selectedSeedItemTypeId
      ? (seedQuantityById.get(tile.selectedSeedItemTypeId) ?? 0)
      : 0;
    const hasSelectedSeed = Boolean(tile.selectedSeedItemTypeId);
    const selected = this.visible && this.selectedTileNumber === tile.tileNumber;

    refs.button.hidden = !tile.unlocked && !isNextLockedTile;
    refs.button.classList.toggle('is-selected', selected);
    refs.button.classList.toggle('is-locked', !tile.unlocked);
    refs.button.classList.toggle('is-empty', tile.unlocked && tile.phase === 'empty');
    refs.button.classList.toggle(
      'is-plantable',
      tile.unlocked && tile.phase === 'empty' && hasSelectedSeed && selectedSeedQuantity > 0,
    );
    refs.button.classList.toggle(
      'is-selected-without-seeds',
      tile.unlocked && tile.phase === 'empty' && hasSelectedSeed && selectedSeedQuantity <= 0,
    );
    refs.button.classList.toggle('is-ready', tile.phase === 'ready');
    refs.button.classList.toggle('is-processing', Boolean(tile.process));
    setNotificationBadge(
      refs.button,
      hasGardenTileNotification({
        tile,
        plot,
        gold,
        seedQuantityById,
        hasPlantableSeed,
      }),
    );

    if (!tile.unlocked) {
      const lockedTileAction = isNextLockedTile ? this.formatLockedTileAction(plot) : '';
      const lockedTileDisabled =
        !isNextLockedTile ||
        plot.nextTileLockedByLevel ||
        plot.nextTileLockedByResearch ||
        gold.current < plot.nextTileCost;
      const lockedTileLabel = isNextLockedTile ? `plot ${tile.tileNumber}` : '';
      this.setText(refs.label, lockedTileLabel);
      setItemIconLabel(refs.label, null);
      setResourceColor(refs.label, null);
      this.setText(refs.state, '');
      this.setTileAction(refs, {
        label: lockedTileAction,
        colorResource: !lockedTileDisabled,
      });
      this.setBoxTile(refs, tile, {
        label: lockedTileLabel,
        action: lockedTileAction,
        actionColorResource: !lockedTileDisabled,
      });
      refs.button.disabled = lockedTileDisabled;
      refs.button.setAttribute(
        'aria-label',
        isNextLockedTile
          ? this.formatLockedTileAriaLabel(tile, plot)
          : `locked tile ${tile.tileNumber}`,
      );
      refs.button.setAttribute('aria-disabled', refs.button.disabled ? 'true' : 'false');
      this.hideProgress(refs);
      return;
    }

    refs.button.disabled = false;
    refs.button.setAttribute('aria-disabled', 'false');

    if (tile.phase === 'empty') {
      const emptyTileDisplay = this.getPlotLabelDisplay(tile);
      const emptyTileAction = hasSelectedSeed
        ? selectedSeedQuantity > 0
          ? 'plant'
          : 'no seeds'
        : 'choose';
      this.setText(refs.label, emptyTileDisplay.label);
      setItemIconLabel(
        refs.label,
        emptyTileDisplay.itemKind,
        emptyTileDisplay.itemKey,
      );
      setResourceColor(refs.label, emptyTileDisplay.resource);
      this.setText(refs.state, '');
      this.setTileAction(refs, {
        label: emptyTileAction,
      });
      this.setBoxTile(refs, tile, {
        label: emptyTileDisplay.label,
        labelResource: emptyTileDisplay.resource,
        action: emptyTileAction,
      });
      refs.button.setAttribute(
        'aria-label',
        hasSelectedSeed
          ? `change ${tile.selectedSeedLabel} for tile ${tile.tileNumber}`
          : `choose seed for tile ${tile.tileNumber}`,
      );
      this.hideProgress(refs);
      return;
    }

    const activeTileDisplay = this.getPlotLabelDisplay(tile);
    const activeTileAction = this.formatTileAction(tile);
    this.setText(refs.label, activeTileDisplay.label);
    setItemIconLabel(
      refs.label,
      activeTileDisplay.itemKind,
      activeTileDisplay.itemKey,
    );
    setResourceColor(refs.label, activeTileDisplay.resource);
    this.setText(refs.state, '');
    this.setTileAction(refs, activeTileAction);
    this.setBoxTile(refs, tile, {
      label: activeTileDisplay.label,
      labelResource: activeTileDisplay.resource,
      action: activeTileAction.label,
      timer: this.formatBoxTimer(tile),
      herbKey: tile.herbKey,
    });
    const activeSeedLabel = tile.seedLabel ?? tile.selectedSeedLabel ?? 'seed';
    refs.button.setAttribute(
      'aria-label',
      tile.process
        ? `cancel ${activeSeedLabel} on tile ${tile.tileNumber}`
        : tile.phase === 'ready'
          ? `start harvesting ${tile.herbLabel}`
          : `${tile.herbLabel} ${tile.phase}`,
    );

    if (tile.process) {
      this.renderProgress(refs, tile.process);
    } else if (tile.phase === 'ready') {
      this.renderProgress(refs, 1);
    } else {
      this.hideProgress(refs);
    }
  }

  getPlotLabelDisplay(tile) {
    if (!tile?.selectedSeedItemTypeId && !tile?.seedItemTypeId && !tile?.herbItemTypeId) {
      return {
        label: 'empty',
        itemKind: null,
        itemKey: null,
        resource: null,
      };
    }

    const herbLabel =
      tile.herbLabel ??
      tile.selectedHerbLabel ??
      this.stripSeedSuffix(tile.seedLabel ?? tile.selectedSeedLabel);
    const herbKey =
      tile.herbKey ??
      tile.selectedHerbKey ??
      getHerbIconKeyByLabel(herbLabel);

    return {
      label: herbLabel ?? tile.seedLabel ?? tile.selectedSeedLabel ?? 'empty',
      itemKind: herbLabel ? 'herb' : null,
      itemKey: herbKey,
      resource: herbLabel ? 'herb' : null,
    };
  }

  stripSeedSuffix(label) {
    const value = String(label ?? '').trim();

    if (!value) {
      return null;
    }

    return value.replace(/\s+seed$/i, '');
  }

  formatLockedTileAction(plot) {
    if (plot.nextTileLockedByLevel) {
      return `level ${plot.nextTileRequiresLevel}`;
    }

    if (plot.nextTileLockedByResearch) {
      return 'research';
    }

    return `buy ${this.formatGold(plot.nextTileCost)}`;
  }

  formatLockedTileAriaLabel(tile, plot) {
    if (plot.nextTileLockedByLevel) {
      return `garden tile ${tile.tileNumber} requires level ${plot.nextTileRequiresLevel}`;
    }

    if (plot.nextTileLockedByResearch) {
      return `garden tile ${tile.tileNumber} requires research`;
    }

    return `buy garden tile ${tile.tileNumber}`;
  }

  renderProgress(refs, progress) {
    const progressValue =
      progress && typeof progress === 'object' ? progress.progress : progress;
    const remainingMs =
      progress && typeof progress === 'object' && Number.isFinite(progress.remainingMs)
        ? progress.remainingMs
        : 0;

    refs.progress.hidden = false;
    setProgressFill(refs.fill, progressValue, {
      smooth: remainingMs > 0,
      remainingMs,
    });
    this.setText(refs.progressText, '');
  }

  hideProgress(refs) {
    refs.progress.hidden = true;
    stopProgressFill(refs.fill, 0);
    this.setText(refs.progressText, '');
  }

  setBoxTile(
    refs,
    tile,
    {
      label = '',
      labelResource = null,
      action = '',
      timer = '',
      actionColorResource = true,
      herbKey = null,
    } = {},
  ) {
    this.setText(refs.boxNumber, String(tile.tileNumber));
    this.setText(refs.boxLabel, label);
    setResourceColor(refs.boxLabel, labelResource);
    this.setResourceText(refs.boxActionLabel, action);

    if (actionColorResource) {
      setResourceColorFromText(refs.boxActionLabel, action);
    } else {
      setResourceColor(refs.boxActionLabel, null);
    }

    this.setText(refs.boxTimer, timer);
    this.setText(refs.boxActionGap, timer ? ' ' : '');
    refs.boxTimer.hidden = !timer;
    refs.boxFrame.classList.toggle('has-plant', Boolean(herbKey));
    refs.boxFrame.classList.toggle('is-harvesting', tile.phase === 'harvesting');
    refs.boxFrame.classList.toggle('is-ready', tile.phase === 'ready');
    refs.boxFrame.style.setProperty(
      '--garden-page-plot-growth-scale',
      this.formatGrowthScale(tile),
    );
    refs.boxFrame.style.setProperty(
      '--garden-page-plot-ready-delay',
      `${-((tile.tileNumber - 1) % BOX_PLOT_COLUMNS) * 140}ms`,
    );
    refs.boxScissors.toggleAttribute('hidden', tile.phase !== 'harvesting');
    this.renderPlantIcon(refs, herbKey);
  }

  renderPlantIcon(refs, herbKey) {
    const normalizedHerbKey = String(herbKey ?? '').trim();

    if (refs.boxPlant.dataset.herbKey === normalizedHerbKey) {
      refs.boxPlant.hidden = !normalizedHerbKey || !refs.boxPlant.firstChild;
      return;
    }

    refs.boxPlant.dataset.herbKey = normalizedHerbKey;
    refs.boxPlant.replaceChildren();

    const frameName = getHerbIconFrameName(normalizedHerbKey);
    const icon = frameName
      ? createAssetAtlasSprite('garden-page__plot-plant-icon', frameName)
      : null;

    if (icon) {
      refs.boxPlant.append(icon);
    }

    refs.boxPlant.hidden = !icon;
  }

  formatGrowthScale(tile) {
    if (tile.phase !== 'growing') {
      return '1';
    }

    const progress = Number.isFinite(tile.process?.progress)
      ? tile.process.progress
      : Number.isFinite(tile.progress)
        ? tile.progress
        : 0;
    const clamped = Math.max(0, Math.min(1, progress));
    return String(Number((0.42 + clamped * 0.58).toFixed(3)));
  }

  formatBoxTimer(tile) {
    if (tile.process) {
      return this.formatProcessTimer(tile.process);
    }

    return '';
  }

  renderSeeds(snapshot, seeds) {
    const selectedTile = this.getSelectedTile(snapshot);
    const selectedSeedItemTypeId = selectedTile?.selectedSeedItemTypeId ?? null;

    if (this.emptySeedRef) {
      this.emptySeedRef.button.setAttribute(
        'aria-pressed',
        selectedTile && !selectedSeedItemTypeId ? 'true' : 'false',
      );
      this.emptySeedRef.button.disabled = false;
      this.emptySeedRef.button.setAttribute('aria-disabled', 'false');
      this.emptySeedRef.button.setAttribute('aria-label', 'set plot seed to empty');
      setNotificationBadge(this.emptySeedRef.button, false);
    }

    for (const seed of seeds) {
      const refs = this.seedRefs.get(seed.itemTypeId);
      refs.row.classList.toggle('is-empty', seed.quantity <= 0);
      refs.row.classList.toggle('is-unresearched', false);
      this.setText(refs.label, seed.label);
      setItemIconLabel(refs.label, 'seed', seed.key);
      this.setText(refs.quantity, String(seed.quantity));
      refs.button.disabled = false;
      refs.button.setAttribute('aria-disabled', 'false');
      refs.button.setAttribute(
        'aria-pressed',
        selectedSeedItemTypeId === seed.itemTypeId ? 'true' : 'false',
      );
      refs.button.setAttribute('aria-label', `select ${seed.label}, owned ${seed.quantity}`);
      setNotificationBadge(refs.button, seed.quantity > 0);
    }

    this.applySeedRowOrder(seeds);
  }

  applySeedRowOrder(seeds) {
    const ownedSeeds = seeds.filter((seed) => seed.quantity > 0);
    const researchedEmptySeeds = seeds.filter((seed) => seed.quantity <= 0 && seed.researched);
    const selectableSeeds = [...ownedSeeds, ...researchedEmptySeeds];
    const orderedEntries = [
      'empty',
      ...selectableSeeds.map((seed) => `seed:${seed.itemTypeId}`),
    ];
    const orderKey = orderedEntries.join('|');

    if (this.seedRowOrderKey === orderKey) {
      return;
    }

    this.seedRowOrderKey = orderKey;
    const orderedRows = orderedEntries
      .map((entry) => {
        if (entry === 'empty') {
          return this.emptySeedRef?.row;
        }

        if (entry === 'divider') {
          return this.getSeedDivider();
        }

        const itemTypeId = Number(entry.slice('seed:'.length));
        return this.seedRefs.get(itemTypeId)?.row;
      })
      .filter(Boolean);

    this.refs.seedRows.replaceChildren(...orderedRows);
  }

  getSeedDivider() {
    if (!this.refs.seedDivider) {
      this.refs.seedDivider = document.createElement('div');
      this.refs.seedDivider.className = 'garden-page__seed-divider';
      this.refs.seedDivider.setAttribute('aria-hidden', 'true');
    }

    return this.refs.seedDivider;
  }

  ensureTiles(maxTiles) {
    while (this.tileRefs.size < maxTiles) {
      this.createTile(this.tileRefs.size + 1);
    }
  }

  ensureEmptySeedRow() {
    if (!this.emptySeedRef) {
      this.createEmptySeedRow();
    }
  }

  ensureSeedRows(seeds) {
    let createdRow = false;

    for (const seed of seeds) {
      if (!this.seedRefs.has(seed.itemTypeId)) {
        this.createSeedRow(seed);
        createdRow = true;
      }
    }

    if (createdRow) {
      this.seedRowOrderKey = null;
    }
  }

  onTileClick(tileNumber, event) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const garden = snapshot.garden;
    const tile = garden.plot.tiles.find((candidate) => candidate.tileNumber === tileNumber);
    const refs = this.tileRefs.get(tileNumber);
    const clickedLabel = this.isTileLabelClick(event);
    const clickedAction = this.isTileActionClick(event, refs);
    const keyboardRowAction =
      event?.target === event?.currentTarget && event?.detail === 0;

    if (!tile) {
      return;
    }

    if (event?.type === 'click' && this.handledTileLabelPressStartTileNumber === tileNumber) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!tile.unlocked) {
      if (tileNumber === garden.plot.nextTileNumber) {
        this.gameplayFacade.buyGardenTile();
      }

      this.render(this.gameplayFacade.getSnapshot());
      return;
    }

    if (tile.phase === 'empty') {
      if (clickedLabel) {
        this.showSeedPopup(tileNumber);
        return;
      }

      if (!clickedAction && !keyboardRowAction) {
        return;
      }

      if (tile.selectedSeedItemTypeId) {
        const result = this.gameplayFacade.plantSelectedGardenSeed(tileNumber);

        if (result.ok) {
          this.render(this.gameplayFacade.getSnapshot());
        }

        return;
      }

      this.showSeedPopup(tileNumber);
      return;
    }

    if (tile.process) {
      if (clickedAction || keyboardRowAction) {
        this.openSeedPopupAfterCancelTileNumber = null;
        this.cancelDialogManager.show(tile);
      }

      return;
    }

    if (tile.phase === 'ready') {
      if (clickedAction || keyboardRowAction) {
        this.gameplayFacade.startGardenHarvest(tileNumber);
        this.render(this.gameplayFacade.getSnapshot());
      }
    }
  }

  isTileLabelClick(event) {
    return Boolean(
      event?.target?.closest?.('.garden-page__plot-label, .garden-page__plot-box-label'),
    );
  }

  isTileActionClick(event, refs) {
    if (event?.target?.closest?.('.garden-page__plot-action')) {
      return true;
    }

    const clientX = event?.clientX;
    const clientY = event?.clientY;

    if (!refs?.action || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return false;
    }

    const rect = refs.action.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  onTileLabelClick(tileNumber, event) {
    if (event?.type === 'click' && this.handledTileLabelPressStartTileNumber === tileNumber) {
      event.preventDefault();
      event.stopPropagation();
      this.clearHandledTileLabelPressStartTileNumber();
      return;
    }

    if (this.handleTileLabelIntent(tileNumber)) {
      event.stopPropagation();
    }
  }

  onTileLabelPressStart(tileNumber, event) {
    if (this.isMousePressStart(event)) {
      return;
    }

    if (this.isDuplicateTouchLikePressStart(event, `tile-label:${tileNumber}`)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (this.handleTileLabelIntent(tileNumber)) {
      event.preventDefault();
      event.stopPropagation();
      this.setHandledTileLabelPressStartTileNumber(tileNumber);
    }
  }

  handleTileLabelIntent(tileNumber) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const tile = snapshot.garden?.plot?.tiles.find(
      (candidate) => candidate.tileNumber === tileNumber,
    );

    if (!tile?.unlocked) {
      return false;
    }

    if (tile.phase === 'empty') {
      this.showSeedPopup(tileNumber);
      return true;
    }

    if (tile.process) {
      this.openSeedPopupAfterCancelTileNumber = tileNumber;
      this.cancelDialogManager.show(tile);
      return true;
    }

    return false;
  }

  onSeedNativeDragStart(event, seed) {
    if (!this.canStartSeedDrag(seed)) {
      event.preventDefault();
      return;
    }

    this.draggedSeedItemTypeId = seed.itemTypeId;
    event.dataTransfer?.setData('text/plain', String(seed.itemTypeId));
    event.dataTransfer?.setDragImage?.(event.currentTarget, 8, 8);
  }

  onSeedNativeDragEnd() {
    this.draggedSeedItemTypeId = null;
    this.clearSeedDragState();
  }

  onSeedPointerDown(event, seed) {
    if (
      event.pointerType === 'mouse' ||
      event.currentTarget?.getAttribute?.('aria-disabled') === 'true' ||
      !this.canStartSeedDrag(seed)
    ) {
      return;
    }

    this.pointerSeedDrag = {
      seedTypeId: seed.itemTypeId,
      source: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      ghost: null,
    };
    document.addEventListener('pointermove', this.handleDocumentSeedPointerMove);
    document.addEventListener('pointerup', this.handleDocumentSeedPointerUp);
    document.addEventListener('pointercancel', this.handleDocumentSeedPointerCancel);
  }

  onDocumentSeedPointerMove(event) {
    if (!this.pointerSeedDrag) {
      return;
    }

    if (!this.pointerSeedDrag.dragging) {
      const deltaX = event.clientX - this.pointerSeedDrag.startX;
      const deltaY = event.clientY - this.pointerSeedDrag.startY;

      if (Math.hypot(deltaX, deltaY) < TOUCH_DRAG_DISTANCE) {
        return;
      }

      this.startSeedPointerDrag(event);
    }

    event.preventDefault();
    this.moveSeedGhost(event.clientX, event.clientY);
    this.syncSeedPointerDragTarget(event.clientX, event.clientY);
  }

  onDocumentSeedPointerUp(event) {
    if (!this.pointerSeedDrag) {
      return;
    }

    const { seedTypeId, dragging, ghost } = this.pointerSeedDrag;
    const tileNumber = dragging
      ? this.getDropTileNumberAtPoint(event.clientX, event.clientY, seedTypeId)
      : null;
    ghost?.remove();
    this.pointerSeedDrag = null;
    this.removeSeedPointerDragListeners();
    this.clearSeedDragState();

    if (dragging) {
      event.preventDefault();
    }

    if (tileNumber !== null) {
      this.dropSeedOnTile(tileNumber, seedTypeId);
    }
  }

  cancelSeedPointerDrag() {
    this.pointerSeedDrag?.ghost?.remove();
    this.pointerSeedDrag = null;
    this.removeSeedPointerDragListeners();
    this.clearSeedDragState();
  }

  removeSeedPointerDragListeners() {
    document.removeEventListener('pointermove', this.handleDocumentSeedPointerMove);
    document.removeEventListener('pointerup', this.handleDocumentSeedPointerUp);
    document.removeEventListener('pointercancel', this.handleDocumentSeedPointerCancel);
  }

  startSeedPointerDrag(event) {
    const ghost = this.pointerSeedDrag.source.cloneNode(true);
    ghost.className = 'garden-page__seed-drag-ghost';
    document.body.append(ghost);
    this.pointerSeedDrag.dragging = true;
    this.pointerSeedDrag.ghost = ghost;
    this.moveSeedGhost(event.clientX, event.clientY);
  }

  moveSeedGhost(clientX, clientY) {
    if (!this.pointerSeedDrag?.ghost) {
      return;
    }

    this.pointerSeedDrag.ghost.style.left = `${clientX + 6}px`;
    this.pointerSeedDrag.ghost.style.top = `${clientY + 6}px`;
  }

  syncSeedPointerDragTarget(clientX, clientY) {
    const seedTypeId = this.pointerSeedDrag?.seedTypeId ?? null;
    const targetTileNumber = this.getDropTileNumberAtPoint(clientX, clientY, seedTypeId);

    this.setSeedDragOverTile(targetTileNumber);
  }

  onTileDragOver(tileNumber, event) {
    const seedTypeId = this.getDragSeedItemTypeId(event);

    if (!this.canDropSeedOnTile(tileNumber, seedTypeId)) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    this.setSeedDragOverTile(tileNumber);
  }

  onTileDragLeave(tileNumber) {
    this.tileRefs.get(tileNumber)?.button.classList.remove('is-seed-drag-over');
  }

  onTileDrop(tileNumber, event) {
    const seedTypeId = this.getDragSeedItemTypeId(event);

    if (!this.canDropSeedOnTile(tileNumber, seedTypeId)) {
      return;
    }

    event.preventDefault();
    this.draggedSeedItemTypeId = null;
    this.clearSeedDragState();
    this.dropSeedOnTile(tileNumber, seedTypeId);
  }

  dropSeedOnTile(tileNumber, seedTypeId) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const tile = snapshot.garden?.plot?.tiles.find(
      (candidate) => candidate.tileNumber === tileNumber,
    );
    const seed = snapshot.garden?.seeds?.find(
      (candidate) => candidate.itemTypeId === seedTypeId,
    );

    if (!this.canDropSeedOnTile(tileNumber, seedTypeId, snapshot) || !tile || !seed) {
      return null;
    }

    if (tile.phase === 'empty') {
      const result = this.gameplayFacade.selectGardenSeed(tileNumber, seedTypeId);
      this.render(this.gameplayFacade.getSnapshot());
      return result;
    }

    this.swapDialogManager.show({ tile, seed });
    return {
      ok: true,
      pendingSwap: true,
    };
  }

  canStartSeedDrag(seed) {
    return Number.isInteger(seed?.itemTypeId) && seed.itemTypeId > 0 && seed.quantity > 0;
  }

  canDropSeedOnTile(tileNumber, seedTypeId, snapshot = this.gameplayFacade.getSnapshot()) {
    const tile = snapshot.garden?.plot?.tiles.find(
      (candidate) => candidate.tileNumber === tileNumber,
    );
    const seed = snapshot.garden?.seeds?.find(
      (candidate) => candidate.itemTypeId === seedTypeId,
    );

    if (!tile?.unlocked || !seed || seed.quantity <= 0) {
      return false;
    }

    return tile.phase === 'empty' || tile.phase === 'growing';
  }

  getDropTileNumberAtPoint(clientX, clientY, seedTypeId) {
    for (const [tileNumber, refs] of this.tileRefs.entries()) {
      if (!this.canDropSeedOnTile(tileNumber, seedTypeId) || refs.button.hidden) {
        continue;
      }

      const rect = refs.button.getBoundingClientRect();

      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return tileNumber;
      }
    }

    return null;
  }

  getDragSeedItemTypeId(event) {
    const transferred = Number(event?.dataTransfer?.getData?.('text/plain'));

    if (Number.isInteger(transferred) && transferred > 0) {
      return transferred;
    }

    return this.draggedSeedItemTypeId;
  }

  setSeedDragOverTile(tileNumber) {
    for (const [candidateTileNumber, refs] of this.tileRefs.entries()) {
      refs.button.classList.toggle(
        'is-seed-drag-over',
        tileNumber !== null && candidateTileNumber === tileNumber,
      );
    }
  }

  clearSeedDragState() {
    this.setSeedDragOverTile(null);
  }

  canUseNativeSeedDrag() {
    const view = this.root?.ownerDocument?.defaultView ?? globalThis.window;

    if (typeof view?.matchMedia !== 'function') {
      return true;
    }

    return view.matchMedia(NATIVE_SEED_DRAG_QUERY).matches;
  }

  onConfirmCancel(tileNumber) {
    const openSeedPopupAfterCancel =
      this.openSeedPopupAfterCancelTileNumber === tileNumber;
    this.openSeedPopupAfterCancelTileNumber = null;
    const result = this.gameplayFacade.cancelGardenPlanting(tileNumber);
    this.render(this.gameplayFacade.getSnapshot());

    if (openSeedPopupAfterCancel && result?.ok) {
      this.showSeedPopup(tileNumber);
    }
  }

  onConfirmSeedSwap({ tileNumber, seedTypeId }) {
    const result = this.gameplayFacade.replaceGardenSeed(tileNumber, seedTypeId);

    if (result?.ok) {
      this.render(this.gameplayFacade.getSnapshot());
    }
  }

  onSelectSeedClick(event, seedTypeId) {
    const handledKey = this.getSeedPressStartKey(seedTypeId);

    if (event?.type === 'click' && this.handledSeedPressStartKey === handledKey) {
      event.preventDefault();
      this.clearHandledSeedPressStartKey();
      return;
    }

    this.onSelectSeed(seedTypeId);
  }

  onSelectSeedPressStart(event, seedTypeId) {
    if (event.currentTarget?.disabled) {
      return;
    }

    event.preventDefault();
    this.setHandledSeedPressStartKey(this.getSeedPressStartKey(seedTypeId));
    this.onSelectSeed(seedTypeId);
  }

  onSelectSeed(seedTypeId) {
    if (!this.selectedTileNumber) {
      return;
    }

    const result = this.gameplayFacade.selectGardenSeed(this.selectedTileNumber, seedTypeId);

    if (result.ok) {
      this.hideSeedPopup();
    }

    this.render(this.gameplayFacade.getSnapshot());
  }

  showSeedPopup(tileNumber) {
    this.selectedTileNumber = tileNumber;
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.render(this.gameplayFacade.getSnapshot());
    this.applyPopupVisibility();
    this.queueOverflowCue(this.refs.seedRows);
    this.focusFirstPlantableSeed();
  }

  hideSeedPopup() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyPopupVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.selectedTileNumber = null;
    this.previousFocus = null;
    this.render(this.gameplayFacade.getSnapshot());
  }

  getSelectedTile(snapshot) {
    if (!this.visible || !this.selectedTileNumber) {
      return null;
    }

    return (
      snapshot?.garden?.plot?.tiles?.find(
        (tile) => tile.tileNumber === this.selectedTileNumber,
      ) ?? null
    );
  }

  applyPopupVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  focusFirstPlantableSeed() {
    const firstButton = this.refs.dialog?.querySelector('.garden-page__seed-button:not(:disabled)');
    (firstButton ?? this.refs.dialog)?.focus();
  }

  trapDialogTab(event) {
    const focusable = [
      ...(this.refs.dialog?.querySelectorAll('.garden-page__seed-button:not(:disabled)') ?? []),
    ];

    if (focusable.length === 0) {
      event.preventDefault();
      this.refs.dialog?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!this.refs.dialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  updateOverflowCues() {
    this.queueOverflowCue(this.refs.rows);
    this.queueOverflowCue(this.refs.seedRows);
  }

  queueOverflowCue(element) {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.updateOverflowCue(element));
      return;
    }

    this.updateOverflowCue(element);
  }

  updateOverflowCue(element) {
    if (!element) {
      return;
    }

    const hasOverflow = element.scrollHeight > element.clientHeight + 1;
    const isAtEnd = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
    element.classList.toggle('has-overflow', hasOverflow && !isAtEnd);
  }

  bindTouchLikePressStart(target, key, handler) {
    target.addEventListener('pointerdown', (event) =>
      this.onTouchLikePressStart(event, key, handler),
    );
    target.addEventListener(
      'touchstart',
      (event) => this.onTouchLikePressStart(event, key, handler),
      { passive: false },
    );
  }

  onTouchLikePressStart(event, key, handler) {
    if (this.isMousePressStart(event) || this.isDuplicateTouchLikePressStart(event, key)) {
      return;
    }

    handler(event);
  }

  isMousePressStart(event) {
    return event.type === 'pointerdown' && event.pointerType === 'mouse';
  }

  isDuplicateTouchLikePressStart(event, key) {
    const timeStamp = Number.isFinite(event?.timeStamp) ? event.timeStamp : Date.now();
    const isDuplicate =
      this.lastTouchLikePressStart.key === key &&
      Math.abs(timeStamp - this.lastTouchLikePressStart.timeStamp) <=
        TOUCH_LIKE_PRESS_START_DEDUPE_MS;

    this.lastTouchLikePressStart = { key, timeStamp };
    return isDuplicate;
  }

  getSeedPressStartKey(seedTypeId) {
    return seedTypeId === null ? 'seed:empty' : `seed:${seedTypeId}`;
  }

  setHandledTileLabelPressStartTileNumber(tileNumber) {
    this.clearHandledTileLabelPressStartTileNumber();
    this.handledTileLabelPressStartTileNumber = tileNumber;
    this.handledTileLabelPressStartReset = globalThis.setTimeout(() => {
      if (this.handledTileLabelPressStartTileNumber === tileNumber) {
        this.handledTileLabelPressStartTileNumber = null;
      }

      this.handledTileLabelPressStartReset = null;
    }, TOUCH_LIKE_CLICK_DEDUPE_RESET_MS);
    this.handledTileLabelPressStartReset?.unref?.();
  }

  clearHandledTileLabelPressStartTileNumber() {
    if (this.handledTileLabelPressStartReset !== null) {
      globalThis.clearTimeout(this.handledTileLabelPressStartReset);
      this.handledTileLabelPressStartReset = null;
    }

    this.handledTileLabelPressStartTileNumber = null;
  }

  setHandledSeedPressStartKey(key) {
    this.clearHandledSeedPressStartKey();
    this.handledSeedPressStartKey = key;
    this.handledSeedPressStartReset = globalThis.setTimeout(() => {
      if (this.handledSeedPressStartKey === key) {
        this.handledSeedPressStartKey = null;
      }

      this.handledSeedPressStartReset = null;
    }, TOUCH_LIKE_CLICK_DEDUPE_RESET_MS);
    this.handledSeedPressStartReset?.unref?.();
  }

  clearHandledSeedPressStartKey() {
    if (this.handledSeedPressStartReset !== null) {
      globalThis.clearTimeout(this.handledSeedPressStartReset);
      this.handledSeedPressStartReset = null;
    }

    this.handledSeedPressStartKey = null;
  }

  formatGold(value) {
    if (value === 0) {
      return 'free';
    }

    return formatGoldPriceText(value);
  }

  formatTileStatus(phase) {
    if (phase === 'ready') {
      return 'ready';
    }

    if (phase === 'harvesting') {
      return 'harvesting';
    }

    return 'growing';
  }

  setTileAction(refs, { label, timer = '', colorResource = true }) {
    this.setResourceText(refs.actionLabel, label);
    this.setText(refs.actionGap, timer ? ' ' : '');
    this.setText(refs.actionTimer, timer);
    if (colorResource) {
      setResourceColorFromText(refs.actionLabel, label);
      return;
    }

    setResourceColor(refs.actionLabel, null);
  }

  formatTileAction(tile) {
    if (tile.phase === 'ready') {
      return { label: 'harvest' };
    }

    const status = this.formatTileStatus(tile.phase);
    if (!tile.process) {
      return { label: status };
    }

    return {
      label: status,
      timer: this.formatProcessTimer(tile.process),
    };
  }

  formatProcessTimer(process) {
    const remainingMs = Number.isFinite(process?.remainingMs) ? process.remainingMs : 0;
    return `${Math.max(0, Math.ceil(remainingMs / 1_000))}s`;
  }

  setText(node, value) {
    if (node.textContent !== value) {
      node.textContent = value;
    }
  }

  setResourceText(node, value) {
    if (node.textContent !== value) {
      setResourceIconText(node, value);
    }
  }
}
