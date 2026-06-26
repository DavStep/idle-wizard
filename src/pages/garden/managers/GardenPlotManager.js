import {
  isItemResearched,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import {
  createAssetAtlasSprite,
} from '../../../assets/atlas/atlasSprite.js';
import {
  getHerbIconFrameName,
  getHerbIconKeyByLabel,
} from '../../../assets/items/herbs/herbIcons.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import {
  STAR_LEVEL_LABEL_CLASS,
  setStarLevelLabel,
} from '../../shared/starLevelLabel.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { setProgressFill } from '../../shared/progressFill.js';
import { setTimerProgressFill, stopTimerProgressFill } from '../../shared/timerProgress.js';
import { formatRemainingTime } from '../../shared/timerDisplay.js';
import {
  addNativeWorldGestureDefaultGuards,
  preventNativeWorldGestureDefault,
} from '../../shared/worldGestureDefaultGuard.js';
import { hasGardenTileNotification } from '../../notifications/managers/PageNotificationStateManager.js';
import { GardenCancelDialogManager } from './GardenCancelDialogManager.js';
import { GardenSeedSwapDialogManager } from './GardenSeedSwapDialogManager.js';

const TOUCH_LIKE_PRESS_START_DEDUPE_MS = 80;
const TOUCH_LIKE_CLICK_DEDUPE_RESET_MS = 500;
const TOUCH_LIKE_TAP_MOVE_TOLERANCE_PX = 10;
const BOX_PLOT_COLUMNS = 3;
const MAX_PLOT_SOIL_LEVEL = 5;
const WORLD_EDGE_EXTENSION = 16;
const WORLD_WIDTH = 328 + WORLD_EDGE_EXTENSION * 2;
const WORLD_MIN_HEIGHT = 560;
const WORLD_ROW_HEIGHT = 92;
const WORLD_ROW_GAP = 12;
const WORLD_ROWS_PADDING_TOP = 18;
const WORLD_DRAG_THRESHOLD = 4;
const WORLD_TAP_ACTION_DRAG_THRESHOLD = 12;
const WORLD_MIN_ZOOM = 0.62;
const WORLD_MAX_ZOOM = 1.16;
const WORLD_ZOOM_RUBBER_LIMIT = 0.12;
const WORLD_PAN_RUBBER_LIMIT = 54;
const WORLD_SETTLE_CLASS_MS = 240;
const SCISSORS_CLOSED_FRAME = 'tool:herbCuttingScissorsClosed';
const SCISSORS_OPEN_FRAME = 'tool:herbCuttingScissorsOpen';

export class GardenPlotManager {
  constructor({ gameplayFacade, pixiProgressOverlayManager = null } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.pixiProgressOverlayManager = pixiProgressOverlayManager;
    this.cancelDialogManager = new GardenCancelDialogManager({
      onConfirm: (tileNumber) => this.onConfirmCancel(tileNumber),
    });
    this.swapDialogManager = new GardenSeedSwapDialogManager({
      onConfirm: (swap) => this.onConfirmSeedSwap(swap),
    });
    this.root = null;
    this.unsubscribe = null;
    this.latestSnapshot = null;
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
    this.pendingSeedPress = null;
    this.worldPan = { x: 0, y: 0 };
    this.worldZoom = 1;
    this.worldSize = {
      width: WORLD_WIDTH,
      height: WORLD_MIN_HEIGHT,
    };
    this.worldPointers = new Map();
    this.worldGesture = null;
    this.worldSettleClassTimeout = null;
    this.removeWorldGestureDefaultGuards = null;
    this.suppressWorldClickUntilMs = 0;
    this.boughtTileAnimationResets = new Map();
    this.handlePendingSeedPressMove = (event) => this.onPendingSeedPressMove(event);
    this.handlePendingSeedPressEnd = (event) => this.onPendingSeedPressEnd(event);
    this.handlePendingSeedPressCancel = () => this.clearPendingSeedPress();
    this.handleWorldGestureDefault = (event) => preventNativeWorldGestureDefault(event);
    this.lastTouchLikePressStart = {
      key: null,
      timeStamp: Number.NEGATIVE_INFINITY,
    };
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
    this.root.className = 'garden-page__plot garden-page__plot-world';
    this.root.dataset.pageSwipeBlock = 'true';
    this.root.setAttribute('aria-label', 'Garden world');

    this.refs.world = this.createWorld();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'garden-page__plot-rows';
    this.refs.rows.style.setProperty('--garden-page-plot-columns', String(BOX_PLOT_COLUMNS));
    this.refs.popup = this.createSeedPopup();
    this.refs.rows.addEventListener('scroll', this.handlePlotRowsScroll);
    this.refs.seedRows.addEventListener('scroll', this.handleSeedRowsScroll);

    this.refs.world.world.append(this.refs.rows);
    this.root.append(this.refs.world.shell);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    this.cancelDialogManager.mount(popupParent);
    this.swapDialogManager.mount(popupParent);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyPopupVisibility();

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.rows?.removeEventListener('scroll', this.handlePlotRowsScroll);
    this.refs.seedRows?.removeEventListener('scroll', this.handleSeedRowsScroll);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.clearHandledTileLabelPressStartTileNumber();
    this.clearHandledSeedPressStartKey();
    this.clearPendingSeedPress();
    this.cancelDialogManager.unmount();
    this.swapDialogManager.unmount();
    for (const refs of this.tileRefs.values()) {
      stopTimerProgressFill(refs.fill, 0);
      refs.pixiProgressBar?.unregister?.();
    }
    this.clearBoughtTileAnimations();
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
    this.worldPointers.clear();
    this.worldGesture = null;
    this.removeWorldGestureDefaultGuards?.();
    this.removeWorldGestureDefaultGuards = null;
    this.clearWorldSettleTimers();
    this.suppressWorldClickUntilMs = 0;
    this.boughtTileAnimationResets.clear();
  }

  createWorld() {
    const shell = document.createElement('section');
    shell.className = 'garden-page__world-shell';
    shell.setAttribute('aria-label', 'Garden map');
    shell.addEventListener('pointerdown', (event) => this.onWorldPointerDown(event));
    shell.addEventListener('pointermove', (event) => this.onWorldPointerMove(event));
    shell.addEventListener('pointerup', (event) => this.onWorldPointerUp(event));
    shell.addEventListener('pointercancel', (event) => this.onWorldPointerUp(event));
    shell.addEventListener('touchstart', this.handleWorldGestureDefault, { passive: false });
    shell.addEventListener('touchmove', this.handleWorldGestureDefault, { passive: false });
    shell.addEventListener('gesturestart', this.handleWorldGestureDefault, { passive: false });
    shell.addEventListener('gesturechange', this.handleWorldGestureDefault, { passive: false });
    this.removeWorldGestureDefaultGuards = addNativeWorldGestureDefaultGuards(
      this.handleWorldGestureDefault,
      shell.ownerDocument,
    );

    const world = document.createElement('div');
    world.className = 'garden-page__world';
    world.style.setProperty('--garden-page-world-width', `${this.worldSize.width}px`);
    world.style.setProperty('--garden-page-world-height', `${this.worldSize.height}px`);
    world.style.setProperty('--garden-page-world-pan-x', `${this.worldPan.x}px`);
    world.style.setProperty('--garden-page-world-pan-y', `${this.worldPan.y}px`);
    world.style.setProperty('--garden-page-world-zoom', String(this.worldZoom));

    shell.append(world);
    return { shell, world };
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

    const pixiProgressBar = this.pixiProgressOverlayManager?.registerBar?.(
      `garden:plot:${tileNumber}`,
      {
        progressElement: progress,
        fillElement: fill,
      },
    );

    const boxFrame = document.createElement('span');
    boxFrame.className = 'garden-page__plot-box-frame';
    boxFrame.setAttribute('aria-hidden', 'true');

    const boxNumber = document.createElement('span');
    boxNumber.className = 'garden-page__plot-box-number';

    const boxLevel = document.createElement('span');
    boxLevel.className = 'garden-page__plot-box-level';

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
    boxFrame.append(boxNumber, boxLevel, boxLabel, boxPlant, boxScissors, boxAction);
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
      pixiProgressBar,
      boxFrame,
      boxNumber,
      boxLevel,
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
    const scissors = document.createElement('span');
    scissors.className = 'garden-page__plot-scissors';
    scissors.setAttribute('aria-hidden', 'true');

    const closedFrame = createAssetAtlasSprite(
      'garden-page__plot-scissors-frame garden-page__plot-scissors-frame--closed',
      SCISSORS_CLOSED_FRAME,
    );
    const openFrame = createAssetAtlasSprite(
      'garden-page__plot-scissors-frame garden-page__plot-scissors-frame--open',
      SCISSORS_OPEN_FRAME,
    );

    if (closedFrame) {
      scissors.append(closedFrame);
    }

    if (openFrame) {
      scissors.append(openFrame);
    }

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
    this.bindTouchLikeValidatedPress(button, `seed:${seed.itemTypeId}`, (event) =>
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
    this.bindTouchLikeValidatedPress(button, 'seed:empty', (event) =>
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

  render(snapshot) {
    this.latestSnapshot = snapshot;
    const garden = snapshot.garden;
    const seeds = this.getSeedRows(snapshot);
    const seedQuantityById = new Map(
      seeds.map((seed) => [seed.itemTypeId, seed.quantity]),
    );
    const hasPlantableSeed = seeds.some((seed) => seed.quantity > 0);
    this.ensureTiles(garden.plot.maxTiles);
    this.syncWorldSize(garden.plot.maxTiles);
    this.ensureEmptySeedRow();
    this.ensureSeedRows(seeds);

    for (const tile of garden.plot.tiles) {
      this.renderTile({
        tile,
        plot: garden.plot,
        coin: snapshot.coin,
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

  renderTile({ tile, plot, coin, seedQuantityById, hasPlantableSeed }) {
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
    refs.button.classList.toggle('is-buy-slot', !tile.unlocked && isNextLockedTile);
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
    refs.button.classList.toggle(
      'has-herb-label',
      tile.unlocked &&
        (tile.phase === 'empty' ||
          Boolean(tile.selectedSeedItemTypeId || tile.seedItemTypeId || tile.herbItemTypeId)),
    );
    setNotificationBadge(
      refs.button,
      hasGardenTileNotification({
        tile,
        plot,
        coin,
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
        coin.current < plot.nextTileCost;
      this.setText(refs.label, '');
      setItemIconLabel(refs.label, null);
      setResourceColor(refs.label, null);
      this.clearPlotLevel(refs.state);
      this.setTileAction(refs, {
        label: lockedTileAction,
        colorResource: !lockedTileDisabled,
      });
      this.setBoxTile(refs, tile, {
        label: '',
        action: lockedTileAction,
        actionColorResource: !lockedTileDisabled,
        showNumber: false,
        showLevel: false,
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
          ? this.formatPlantAction(tile)
          : 'no seeds'
        : 'choose';
      this.setText(refs.label, emptyTileDisplay.label);
      setItemIconLabel(
        refs.label,
        emptyTileDisplay.itemKind,
        emptyTileDisplay.itemKey,
      );
      setResourceColor(refs.label, emptyTileDisplay.resource);
      this.setPlotLevel(refs.state, tile);
      this.setTileAction(refs, {
        label: emptyTileAction,
      });
      this.setBoxTile(refs, tile, {
        label: hasSelectedSeed ? emptyTileDisplay.label : 'choose',
        labelResource: emptyTileDisplay.resource,
        action: hasSelectedSeed ? emptyTileAction : 'empty',
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
    this.setPlotLevel(refs.state, tile);
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

    return `buy ${this.formatCoin(plot.nextTileCost)}`;
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

    refs.progress.hidden = false;

    if (progress && typeof progress === 'object') {
      refs.pixiProgressBar?.hide?.();
      setTimerProgressFill(refs.fill, progress, {
        onUpdate: ({ remainingMs: currentRemainingMs }) => {
          const timer = formatRemainingTime(currentRemainingMs);
          this.setText(refs.actionGap, refs.actionLabel.textContent && timer ? ' ' : '');
          this.setText(refs.actionTimer, timer);
          this.setText(
            refs.boxActionGap,
            refs.boxActionLabel.textContent && timer ? ' ' : '',
          );
          this.setText(refs.boxTimer, timer);
        },
      });
    } else {
      stopTimerProgressFill(refs.fill, progressValue);
      setProgressFill(refs.fill, progressValue);
      refs.pixiProgressBar?.setProgress?.(progressValue, { visible: true });
    }

    this.setText(refs.progressText, '');
  }

  hideProgress(refs) {
    refs.progress.hidden = true;
    stopTimerProgressFill(refs.fill, 0);
    refs.pixiProgressBar?.hide?.();
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
      showNumber = true,
      showLevel = true,
    } = {},
  ) {
    refs.boxNumber.hidden = !showNumber;
    refs.boxLevel.hidden = !showLevel;
    this.setText(refs.boxNumber, showNumber ? String(tile.tileNumber) : '');
    if (showLevel) {
      this.setPlotLevel(refs.boxLevel, tile);
      refs.boxFrame.dataset.plotStarTone = refs.boxLevel.dataset.starTone ?? 'empty';
    } else {
      this.clearPlotLevel(refs.boxLevel);
      delete refs.boxFrame.dataset.plotStarTone;
    }
    this.setText(refs.boxLabel, label);
    setResourceColor(refs.boxLabel, labelResource === 'seed' ? labelResource : null);
    this.setResourceText(refs.boxActionLabel, action);

    if (actionColorResource) {
      setResourceColorFromText(refs.boxActionLabel, action);
    } else {
      setResourceColor(refs.boxActionLabel, null);
    }

    this.setText(refs.boxTimer, timer);
    this.setText(refs.boxActionGap, action && timer ? ' ' : '');
    refs.boxTimer.hidden = !timer;
    refs.boxFrame.classList.toggle('has-plant', Boolean(herbKey));
    refs.boxFrame.classList.toggle('is-harvesting', tile.phase === 'harvesting');
    refs.boxFrame.classList.toggle(
      'is-ready',
      tile.phase === 'ready' || tile.phase === 'harvesting',
    );
    refs.boxFrame.dataset.plotSoilLevel = this.formatPlotSoilLevel(tile);
    refs.boxFrame.style.setProperty(
      '--garden-page-plot-growth-scale',
      this.formatGrowthScale(tile),
    );
    refs.boxFrame.style.setProperty(
      '--garden-page-plot-ready-delay',
      `${-(((tile.tileNumber - 1) * 317) % 1080)}ms`,
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

  formatPlantAction(tile) {
    const level = Math.max(1, Math.floor(Number(tile?.level) || 1));
    return level > 1 ? `plant x${level}` : 'plant';
  }

  formatPlotSoilLevel(tile) {
    const level = Math.max(1, Math.floor(Number(tile?.level) || 1));
    return String(Math.min(level, MAX_PLOT_SOIL_LEVEL));
  }

  setPlotLevel(element, tile) {
    const level = Math.max(1, Math.floor(Number(tile?.level) || 1));
    setStarLevelLabel(element, level - 1);
  }

  clearPlotLevel(element) {
    if (!element) {
      return;
    }

    element.classList.remove(STAR_LEVEL_LABEL_CLASS);
    delete element.dataset.starTone;
    delete element.dataset.starCount;
    delete element.dataset.starSlots;
    this.setText(element, '');
    element.removeAttribute('aria-label');
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

  syncWorldSize(maxTiles = 0) {
    const rowCount = Math.max(1, Math.ceil(Number(maxTiles || 0) / BOX_PLOT_COLUMNS));
    const contentHeight =
      WORLD_ROWS_PADDING_TOP +
      rowCount * WORLD_ROW_HEIGHT +
      Math.max(0, rowCount - 1) * WORLD_ROW_GAP +
      WORLD_EDGE_EXTENSION * 2;
    const nextSize = {
      width: WORLD_WIDTH,
      height: Math.max(WORLD_MIN_HEIGHT, contentHeight),
    };

    if (
      nextSize.width === this.worldSize.width &&
      nextSize.height === this.worldSize.height
    ) {
      return;
    }

    this.worldSize = nextSize;
    this.setWorldViewport(this.worldPan.x, this.worldPan.y, this.worldZoom);
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
    if (event?.type === 'click' && this.isWorldClickSuppressed()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const snapshot = this.gameplayFacade.getSnapshot();
    const garden = snapshot.garden;
    const tile = garden.plot.tiles.find((candidate) => candidate.tileNumber === tileNumber);
    const refs = this.tileRefs.get(tileNumber);
    const clickedLabel = this.isTileLabelClick(event);
    const clickedPlant = this.isTilePlantClick(event);
    const clickedAction = this.isTileActionClick(event, refs);
    const clickedHarvestArea = this.isTileHarvestAreaClick(event, refs);
    const canPlantSelectedSeed = this.canPlantSelectedSeed(tile, snapshot);
    const keyboardRowAction =
      event?.target === event?.currentTarget && event?.detail === 0;

    if (!tile) {
      return;
    }

    if (event?.type === 'click' && this.handledSeedPressStartKey !== null) {
      event.preventDefault();
      event.stopPropagation();
      this.clearHandledSeedPressStartKey();
      return;
    }

    if (event?.type === 'click' && this.handledTileLabelPressStartTileNumber === tileNumber) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!tile.unlocked) {
      this.buyGardenTile(tileNumber);
      return;
    }

    if (tile.phase === 'empty') {
      if (clickedLabel) {
        this.showSeedPopup(tileNumber);
        return;
      }

      if (!clickedAction && !keyboardRowAction && !canPlantSelectedSeed) {
        return;
      }

      if (tile.selectedSeedItemTypeId) {
        this.startPlantSelectedGardenSeed(tileNumber);
        return;
      }

      this.showSeedPopup(tileNumber);
      return;
    }

    if (tile.process) {
      if (clickedLabel && this.canReplaceActiveSeed(tile)) {
        this.showSeedPopup(tileNumber);
        return;
      }

      this.openSeedPopupAfterCancelTileNumber = null;
      this.cancelDialogManager.show(tile);
      return;
    }

    if (tile.phase === 'ready') {
      if (clickedAction || clickedPlant || clickedHarvestArea || keyboardRowAction) {
        this.startGardenHarvest(tileNumber);
      }
    }
  }

  buyGardenTile(tileNumber) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const plot = snapshot.garden?.plot;
    const tile = plot?.tiles.find((candidate) => candidate.tileNumber === tileNumber);
    const refs = this.tileRefs.get(tileNumber);

    if (!tile || tile.unlocked || tileNumber !== plot?.nextTileNumber || refs?.button?.disabled) {
      return { ok: false };
    }

    const result = this.gameplayFacade.buyGardenTile();

    this.render(this.gameplayFacade.getSnapshot());

    if (result?.ok) {
      this.playBoughtTileAnimation(result.tileNumber ?? tileNumber);
    }

    return result;
  }

  startGardenHarvest(tileNumber) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const tile = snapshot.garden?.plot?.tiles.find(
      (candidate) => candidate.tileNumber === tileNumber,
    );

    if (!tile?.unlocked || tile.phase !== 'ready') {
      return { ok: false };
    }

    const result = this.gameplayFacade.startGardenHarvest(tileNumber);

    if (result?.ok !== false) {
      this.render(this.gameplayFacade.getSnapshot());
    }

    return result;
  }

  startPlantSelectedGardenSeed(tileNumber) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const tile = snapshot.garden?.plot?.tiles.find(
      (candidate) => candidate.tileNumber === tileNumber,
    );

    if (!this.canPlantSelectedSeed(tile, snapshot)) {
      return { ok: false };
    }

    const result = this.gameplayFacade.plantSelectedGardenSeed(tileNumber);

    if (result.ok) {
      this.render(this.gameplayFacade.getSnapshot());
    }

    return result;
  }

  canPlantSelectedSeed(tile, snapshot) {
    if (!tile?.selectedSeedItemTypeId || tile.phase !== 'empty') {
      return false;
    }

    const selectedSeed = snapshot.garden?.seeds?.find(
      (seed) => seed.itemTypeId === tile.selectedSeedItemTypeId,
    );

    return (selectedSeed?.quantity ?? 0) > 0;
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

  isTilePlantClick(event) {
    return Boolean(event?.target?.closest?.('.garden-page__plot-plant'));
  }

  isTileHarvestAreaClick(event, refs) {
    return Boolean(refs?.boxFrame && event?.target && refs.boxFrame.contains(event.target));
  }

  getReadyHarvestTileNumberFromEvent(event) {
    const row = event?.target?.closest?.('.garden-page__plot-row');
    const tileNumber = Number.parseInt(row?.dataset?.gardenTileNumber ?? '', 10);

    if (!Number.isInteger(tileNumber)) {
      return null;
    }

    const snapshot = this.gameplayFacade.getSnapshot();
    const tile = snapshot.garden?.plot?.tiles.find(
      (candidate) => candidate.tileNumber === tileNumber,
    );
    const refs = this.tileRefs.get(tileNumber);

    if (!tile?.unlocked || tile.phase !== 'ready' || !refs?.button || refs.button.disabled) {
      return null;
    }

    return this.isTileActionClick(event, refs) ||
      this.isTilePlantClick(event) ||
      this.isTileHarvestAreaClick(event, refs)
      ? tileNumber
      : null;
  }

  getPlantableTileNumberFromEvent(event) {
    const row = event?.target?.closest?.('.garden-page__plot-row');
    const tileNumber = Number.parseInt(row?.dataset?.gardenTileNumber ?? '', 10);

    if (!Number.isInteger(tileNumber) || this.isTileLabelClick(event)) {
      return null;
    }

    const snapshot = this.gameplayFacade.getSnapshot();
    const tile = snapshot.garden?.plot?.tiles.find(
      (candidate) => candidate.tileNumber === tileNumber,
    );
    const refs = this.tileRefs.get(tileNumber);

    if (!tile?.unlocked || tile.phase !== 'empty' || !refs?.button || refs.button.disabled) {
      return null;
    }

    return this.canPlantSelectedSeed(tile, snapshot) ? tileNumber : null;
  }

  getBuyableTileNumberFromEvent(event) {
    const row = event?.target?.closest?.('.garden-page__plot-row');
    const tileNumber = Number.parseInt(row?.dataset?.gardenTileNumber ?? '', 10);

    if (!Number.isInteger(tileNumber)) {
      return null;
    }

    const snapshot = this.gameplayFacade.getSnapshot();
    const plot = snapshot.garden?.plot;
    const tile = plot?.tiles.find((candidate) => candidate.tileNumber === tileNumber);
    const refs = this.tileRefs.get(tileNumber);
    const cost = plot?.nextTileCost;

    if (
      tile?.unlocked ||
      tileNumber !== plot?.nextTileNumber ||
      !refs?.button ||
      refs.button.disabled ||
      plot.nextTileLockedByLevel ||
      plot.nextTileLockedByResearch ||
      !Number.isFinite(cost)
    ) {
      return null;
    }

    return (snapshot.coin?.current ?? 0) >= cost ? tileNumber : null;
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
      if (this.canReplaceActiveSeed(tile)) {
        this.showSeedPopup(tileNumber);
        return true;
      }

      this.openSeedPopupAfterCancelTileNumber = tileNumber;
      this.cancelDialogManager.show(tile);
      return true;
    }

    return false;
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
    this.onSelectSeed(seedTypeId, { suppressNextDialogBackdropClick: true });
  }

  onSelectSeed(seedTypeId, { suppressNextDialogBackdropClick = false } = {}) {
    if (!this.selectedTileNumber) {
      return;
    }

    const snapshot = this.gameplayFacade.getSnapshot();
    const selectedTile = this.getSelectedTile(snapshot);

    if (selectedTile && !this.isTileEmpty(selectedTile)) {
      this.onSelectSeedForActiveTile(selectedTile, seedTypeId, snapshot, {
        suppressNextDialogBackdropClick,
      });
      return;
    }

    const result = this.gameplayFacade.selectGardenSeed(this.selectedTileNumber, seedTypeId);

    if (result.ok) {
      this.hideSeedPopup();
    }

    this.render(this.gameplayFacade.getSnapshot());
  }

  onSelectSeedForActiveTile(
    tile,
    seedTypeId,
    snapshot,
    { suppressNextDialogBackdropClick = false } = {},
  ) {
    if (seedTypeId === null) {
      this.hideSeedPopup();
      this.openSeedPopupAfterCancelTileNumber = null;
      this.cancelDialogManager.show(tile, {
        suppressNextBackdropClick: suppressNextDialogBackdropClick,
      });
      return;
    }

    if (!this.canReplaceActiveSeed(tile)) {
      return;
    }

    if (seedTypeId === tile.seedItemTypeId) {
      this.hideSeedPopup();
      return;
    }

    const seed = (snapshot.garden?.seeds ?? []).find(
      (candidate) => candidate.itemTypeId === seedTypeId,
    );

    if (!seed || (seed.quantity ?? 0) <= 0) {
      return;
    }

    this.hideSeedPopup();
    this.swapDialogManager.show({
      tile,
      seed,
      suppressNextBackdropClick: suppressNextDialogBackdropClick,
    });
  }

  isTileEmpty(tile) {
    return tile?.phase === 'empty';
  }

  canReplaceActiveSeed(tile) {
    return tile?.phase === 'growing';
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

  bindTouchLikeValidatedPress(target, key, handler) {
    target.addEventListener('pointerdown', (event) =>
      this.onTouchLikeValidatedPressStart(event, key, handler),
    );
    target.addEventListener(
      'touchstart',
      (event) => this.onTouchLikeValidatedPressStart(event, key, handler),
      { passive: true },
    );
  }

  onTouchLikeValidatedPressStart(event, key, handler) {
    if (
      this.isMousePressStart(event) ||
      this.isDisabledControl(event.currentTarget) ||
      this.isDuplicateTouchLikePressStart(event, key)
    ) {
      return;
    }

    const point = this.getTouchLikePoint(event);
    if (!point) {
      return;
    }

    this.clearPendingSeedPress();
    this.pendingSeedPress = {
      key,
      handler,
      target: event.currentTarget,
      pointerId: event.pointerId,
      startX: point.clientX,
      startY: point.clientY,
      moved: false,
      type: event.type === 'pointerdown' ? 'pointer' : 'touch',
    };
    this.addPendingSeedPressListeners(this.pendingSeedPress.type);
  }

  addPendingSeedPressListeners(type) {
    const document = this.root?.ownerDocument ?? globalThis.document;
    if (!document) {
      return;
    }

    if (type === 'pointer') {
      document.addEventListener('pointermove', this.handlePendingSeedPressMove, {
        passive: true,
      });
      document.addEventListener('pointerup', this.handlePendingSeedPressEnd, true);
      document.addEventListener('pointercancel', this.handlePendingSeedPressCancel, true);
      return;
    }

    document.addEventListener('touchmove', this.handlePendingSeedPressMove, {
      passive: true,
    });
    document.addEventListener('touchend', this.handlePendingSeedPressEnd, true);
    document.addEventListener('touchcancel', this.handlePendingSeedPressCancel, true);
  }

  removePendingSeedPressListeners(type) {
    const document = this.root?.ownerDocument ?? globalThis.document;
    if (!document) {
      return;
    }

    if (type === 'pointer') {
      document.removeEventListener('pointermove', this.handlePendingSeedPressMove);
      document.removeEventListener('pointerup', this.handlePendingSeedPressEnd, true);
      document.removeEventListener('pointercancel', this.handlePendingSeedPressCancel, true);
      return;
    }

    document.removeEventListener('touchmove', this.handlePendingSeedPressMove);
    document.removeEventListener('touchend', this.handlePendingSeedPressEnd, true);
    document.removeEventListener('touchcancel', this.handlePendingSeedPressCancel, true);
  }

  onPendingSeedPressMove(event) {
    const pending = this.pendingSeedPress;
    if (!pending || !this.eventMatchesPendingSeedPress(event, pending)) {
      return;
    }

    const point = this.getTouchLikePoint(event);
    if (!point) {
      return;
    }

    if (
      Math.hypot(point.clientX - pending.startX, point.clientY - pending.startY) >
      TOUCH_LIKE_TAP_MOVE_TOLERANCE_PX
    ) {
      pending.moved = true;
    }
  }

  onPendingSeedPressEnd(event) {
    const pending = this.pendingSeedPress;
    if (!pending || !this.eventMatchesPendingSeedPress(event, pending)) {
      return;
    }

    this.clearPendingSeedPress();

    if (
      pending.moved ||
      this.isDisabledControl(pending.target) ||
      !pending.target.contains(event.target)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pending.handler(event);
  }

  clearPendingSeedPress() {
    if (!this.pendingSeedPress) {
      return;
    }

    const type = this.pendingSeedPress.type;
    this.pendingSeedPress = null;
    this.removePendingSeedPressListeners(type);
  }

  eventMatchesPendingSeedPress(event, pending) {
    return (
      pending.type !== 'pointer' ||
      event.pointerId === undefined ||
      pending.pointerId === undefined ||
      event.pointerId === pending.pointerId
    );
  }

  getTouchLikePoint(event) {
    const touch = event.changedTouches?.[0] ?? event.touches?.[0];
    if (touch) {
      return {
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
    }

    if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      return {
        clientX: event.clientX,
        clientY: event.clientY,
      };
    }

    return null;
  }

  isDisabledControl(control) {
    return control?.disabled || control?.getAttribute?.('aria-disabled') === 'true';
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

  playBoughtTileAnimation(tileNumber) {
    const refs = this.tileRefs.get(tileNumber);

    if (!refs?.button || refs.button.hidden) {
      return;
    }

    const previousReset = this.boughtTileAnimationResets.get(tileNumber);
    if (previousReset !== undefined) {
      globalThis.clearTimeout(previousReset);
    }

    refs.button.classList.remove('is-newly-bought');
    void refs.button.offsetWidth;
    refs.button.classList.add('is-newly-bought');

    const reset = globalThis.setTimeout(() => {
      refs.button.classList.remove('is-newly-bought');
      this.boughtTileAnimationResets.delete(tileNumber);
    }, 260);
    reset?.unref?.();
    this.boughtTileAnimationResets.set(tileNumber, reset);
  }

  clearBoughtTileAnimations() {
    for (const [tileNumber, reset] of this.boughtTileAnimationResets) {
      globalThis.clearTimeout(reset);
      this.tileRefs.get(tileNumber)?.button?.classList.remove('is-newly-bought');
    }

    this.boughtTileAnimationResets.clear();
  }

  onWorldPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    const pointerId = this.getPointerId(event);
    this.clearWorldSettleTimers();
    this.refs.world?.world?.classList.remove('is-settling');
    this.refs.world?.shell?.classList.add('is-dragging');
    this.worldPointers.set(pointerId, {
      pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    const readyHarvestTileNumber = this.getReadyHarvestTileNumberFromEvent(event);
    const plantableTileNumber = this.getPlantableTileNumberFromEvent(event);
    const buyableTileNumber = this.getBuyableTileNumberFromEvent(event);

    if (this.worldPointers.size >= 2) {
      this.startWorldPinchGesture();
      event.preventDefault();
    } else {
      this.worldGesture = {
        type: 'pan',
        pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: this.worldPan.x,
        panY: this.worldPan.y,
        didDrag: false,
        dragThreshold:
          readyHarvestTileNumber !== null ||
          plantableTileNumber !== null ||
          buyableTileNumber !== null
            ? WORLD_TAP_ACTION_DRAG_THRESHOLD
            : WORLD_DRAG_THRESHOLD,
        readyHarvestTileNumber,
        plantableTileNumber,
        buyableTileNumber,
      };
    }

    if (event.pointerId !== undefined) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  }

  onWorldPointerMove(event) {
    const pointerId = this.getPointerId(event);

    if (!this.worldPointers.has(pointerId)) {
      return;
    }

    this.worldPointers.set(pointerId, {
      pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (this.worldGesture?.type === 'pinch') {
      this.updateWorldPinchGesture(event);
      return;
    }

    if (!this.worldGesture || this.worldGesture.pointerId !== pointerId) {
      return;
    }

    const scale = this.getUiScale();
    const deltaX = (event.clientX - this.worldGesture.startX) / scale;
    const deltaY = (event.clientY - this.worldGesture.startY) / scale;

    const dragThreshold = this.worldGesture.dragThreshold ?? WORLD_DRAG_THRESHOLD;

    if (!this.worldGesture.didDrag && Math.hypot(deltaX, deltaY) < dragThreshold) {
      return;
    }

    this.worldGesture.didDrag = true;
    this.suppressWorldClick();
    this.setWorldPan(this.worldGesture.panX + deltaX, this.worldGesture.panY + deltaY, {
      rubber: true,
    });
    event.preventDefault();
  }

  onWorldPointerUp(event) {
    const pointerId = this.getPointerId(event);

    if (!this.worldPointers.has(pointerId)) {
      return;
    }

    const tapHarvestTileNumber =
      event.type !== 'pointercancel' &&
      this.worldPointers.size === 1 &&
      this.worldGesture?.type === 'pan' &&
      this.worldGesture.pointerId === pointerId &&
      this.worldGesture.didDrag !== true &&
      Number.isInteger(this.worldGesture.readyHarvestTileNumber)
        ? this.worldGesture.readyHarvestTileNumber
        : null;
    const tapPlantTileNumber =
      event.type !== 'pointercancel' &&
      this.worldPointers.size === 1 &&
      this.worldGesture?.type === 'pan' &&
      this.worldGesture.pointerId === pointerId &&
      this.worldGesture.didDrag !== true &&
      Number.isInteger(this.worldGesture.plantableTileNumber)
        ? this.worldGesture.plantableTileNumber
        : null;
    const tapBuyTileNumber =
      event.type !== 'pointercancel' &&
      this.worldPointers.size === 1 &&
      this.worldGesture?.type === 'pan' &&
      this.worldGesture.pointerId === pointerId &&
      this.worldGesture.didDrag !== true &&
      Number.isInteger(this.worldGesture.buyableTileNumber)
        ? this.worldGesture.buyableTileNumber
        : null;

    if (event.pointerId !== undefined) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    this.worldPointers.delete(pointerId);

    if (this.worldPointers.size >= 2) {
      this.startWorldPinchGesture();
      return;
    }

    if (this.worldPointers.size === 1) {
      const remainingPointer = [...this.worldPointers.values()][0];
      this.worldGesture = {
        type: 'pan',
        pointerId: remainingPointer.pointerId,
        startX: remainingPointer.clientX,
        startY: remainingPointer.clientY,
        panX: this.worldPan.x,
        panY: this.worldPan.y,
        didDrag: true,
      };
      return;
    }

    this.refs.world?.shell?.classList.remove('is-dragging');
    this.worldGesture = null;
    this.settleWorldViewport();

    if (tapBuyTileNumber !== null) {
      this.suppressWorldClick();
      event.preventDefault();
      event.stopPropagation();
      this.buyGardenTile(tapBuyTileNumber);
      return;
    }

    if (tapHarvestTileNumber !== null) {
      this.suppressWorldClick();
      event.preventDefault();
      event.stopPropagation();
      this.startGardenHarvest(tapHarvestTileNumber);
      return;
    }

    if (tapPlantTileNumber !== null) {
      this.suppressWorldClick();
      event.preventDefault();
      event.stopPropagation();
      this.startPlantSelectedGardenSeed(tapPlantTileNumber);
    }
  }

  startWorldPinchGesture() {
    const points = [...this.worldPointers.values()].slice(-2);

    if (points.length < 2) {
      return;
    }

    const midpoint = this.getPointerMidpoint(points[0], points[1]);
    const sourceMidpoint = this.getShellSourcePoint(midpoint.clientX, midpoint.clientY);
    const startZoom = this.worldZoom;

    this.worldGesture = {
      type: 'pinch',
      pointerIds: [points[0].pointerId, points[1].pointerId],
      startDistance: Math.max(1, this.getPointerDistance(points[0], points[1])),
      startWorldX: (sourceMidpoint.x - this.worldPan.x) / startZoom,
      startWorldY: (sourceMidpoint.y - this.worldPan.y) / startZoom,
      startZoom,
      didDrag: true,
    };
    this.suppressWorldClick();
  }

  updateWorldPinchGesture(event) {
    const [firstId, secondId] = this.worldGesture.pointerIds;
    const firstPointer = this.worldPointers.get(firstId);
    const secondPointer = this.worldPointers.get(secondId);

    if (!firstPointer || !secondPointer) {
      return;
    }

    const distance = Math.max(1, this.getPointerDistance(firstPointer, secondPointer));
    const rawZoom =
      this.worldGesture.startZoom * (distance / this.worldGesture.startDistance);
    const zoom = this.getRubberZoom(rawZoom);
    const midpoint = this.getPointerMidpoint(firstPointer, secondPointer);
    const sourceMidpoint = this.getShellSourcePoint(midpoint.clientX, midpoint.clientY);

    this.setWorldViewport(
      sourceMidpoint.x - this.worldGesture.startWorldX * zoom,
      sourceMidpoint.y - this.worldGesture.startWorldY * zoom,
      zoom,
      { rubber: true },
    );
    event.preventDefault();
  }

  getPointerId(event) {
    return event.pointerId ?? 'mouse';
  }

  getPointerDistance(firstPointer, secondPointer) {
    return Math.hypot(
      secondPointer.clientX - firstPointer.clientX,
      secondPointer.clientY - firstPointer.clientY,
    );
  }

  getPointerMidpoint(firstPointer, secondPointer) {
    return {
      clientX: (firstPointer.clientX + secondPointer.clientX) / 2,
      clientY: (firstPointer.clientY + secondPointer.clientY) / 2,
    };
  }

  getShellSourcePoint(clientX, clientY) {
    const shellRect = this.refs.world?.shell?.getBoundingClientRect?.();
    const scale = this.getUiScale();

    return {
      x: ((clientX ?? 0) - (shellRect?.left ?? 0)) / scale,
      y: ((clientY ?? 0) - (shellRect?.top ?? 0)) / scale,
    };
  }

  setWorldPan(x, y, { rubber = false } = {}) {
    this.setWorldViewport(x, y, this.worldZoom, { rubber });
  }

  setWorldViewport(x, y, zoom = this.worldZoom, { rubber = false, animate = false } = {}) {
    const nextZoom = rubber ? this.getRubberZoom(zoom) : this.clampWorldZoom(zoom);
    const nextPan = rubber
      ? this.getRubberPan(x, y, nextZoom)
      : this.clampWorldPan(x, y, nextZoom);

    this.worldPan = nextPan;
    this.worldZoom = nextZoom;
    this.applyWorldViewport({ animate });
  }

  applyWorldViewport({ animate = false } = {}) {
    const world = this.refs.world?.world;

    if (!world) {
      return;
    }

    world.style.setProperty('--garden-page-world-width', `${this.worldSize.width}px`);
    world.style.setProperty('--garden-page-world-height', `${this.worldSize.height}px`);
    world.style.setProperty('--garden-page-world-pan-x', `${this.worldPan.x}px`);
    world.style.setProperty('--garden-page-world-pan-y', `${this.worldPan.y}px`);
    world.style.setProperty('--garden-page-world-zoom', String(this.worldZoom));

    if (!animate) {
      return;
    }

    world.classList.add('is-settling');
    window.clearTimeout(this.worldSettleClassTimeout);
    this.worldSettleClassTimeout = window.setTimeout(() => {
      world.classList.remove('is-settling');
      this.worldSettleClassTimeout = null;
    }, WORLD_SETTLE_CLASS_MS);
  }

  settleWorldViewport() {
    this.setWorldViewport(this.worldPan.x, this.worldPan.y, this.worldZoom, {
      rubber: false,
      animate: true,
    });
  }

  suppressWorldClick() {
    this.suppressWorldClickUntilMs = Date.now() + 450;
  }

  isWorldClickSuppressed() {
    if (Date.now() > this.suppressWorldClickUntilMs) {
      this.suppressWorldClickUntilMs = 0;
      return false;
    }

    return true;
  }

  clearWorldSettleTimers() {
    window.clearTimeout(this.worldSettleClassTimeout);
    this.worldSettleClassTimeout = null;
  }

  getWorldPanBounds(zoom = this.worldZoom) {
    const shellRect = this.refs.world?.shell?.getBoundingClientRect?.();
    const scale = this.getUiScale();
    const shellWidth = Math.max(0, (shellRect?.width ?? 0) / scale);
    const shellHeight = Math.max(0, (shellRect?.height ?? 0) / scale);
    const xBounds = this.getWorldAxisPanBounds(shellWidth, this.worldSize.width, zoom);
    const yBounds = this.getWorldAxisPanBounds(shellHeight, this.worldSize.height, zoom);

    return {
      minX: xBounds.min,
      maxX: xBounds.max,
      minY: yBounds.min,
      maxY: yBounds.max,
    };
  }

  getWorldAxisPanBounds(shellSize, worldSize, zoom = this.worldZoom) {
    const freeSpace = Math.max(0, shellSize) - worldSize * zoom;

    return {
      min: Math.min(0, freeSpace),
      max: Math.max(0, freeSpace),
    };
  }

  clampWorldPan(x, y, zoom = this.worldZoom) {
    const bounds = this.getWorldPanBounds(zoom);

    return {
      x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
      y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
    };
  }

  getRubberPan(x, y, zoom = this.worldZoom) {
    const bounds = this.getWorldPanBounds(zoom);

    return {
      x: this.rubberClampValue(
        x,
        bounds.minX,
        bounds.maxX,
        WORLD_PAN_RUBBER_LIMIT,
      ),
      y: this.rubberClampValue(
        y,
        bounds.minY,
        bounds.maxY,
        WORLD_PAN_RUBBER_LIMIT,
      ),
    };
  }

  clampWorldZoom(zoom) {
    return Math.min(WORLD_MAX_ZOOM, Math.max(WORLD_MIN_ZOOM, zoom));
  }

  getRubberZoom(zoom) {
    return this.rubberClampValue(
      zoom,
      WORLD_MIN_ZOOM,
      WORLD_MAX_ZOOM,
      WORLD_ZOOM_RUBBER_LIMIT,
    );
  }

  rubberClampValue(value, min, max, limit) {
    if (value < min) {
      return Math.max(min - limit, min - this.getRubberDistance(min - value, limit));
    }

    if (value > max) {
      return Math.min(max + limit, max + this.getRubberDistance(value - max, limit));
    }

    return value;
  }

  getRubberDistance(distance, limit) {
    if (limit <= 0) {
      return 0;
    }

    return limit * (1 - 1 / (distance / limit + 1));
  }

  getUiScale() {
    const rawScale =
      this.root?.computedStyleMap?.()?.get?.('--style-ui-scale')?.value ??
      window.getComputedStyle(this.root ?? document.documentElement)
        .getPropertyValue('--style-ui-scale')
        .trim();
    const scale = Number.parseFloat(rawScale);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  formatCoin(value) {
    if (value === 0) {
      return 'free';
    }

    return formatCoinPriceText(value);
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
    this.setText(refs.actionGap, label && timer ? ' ' : '');
    this.setText(refs.actionTimer, timer);
    if (colorResource) {
      setResourceColorFromText(refs.actionLabel, label);
      return;
    }

    setResourceColor(refs.actionLabel, null);
  }

  formatTileAction(tile) {
    if (tile.phase === 'ready') {
      return { label: '' };
    }

    const status = this.formatTileStatus(tile.phase);
    if (!tile.process) {
      return {
        label: tile.phase === 'growing' || tile.phase === 'harvesting' ? '' : status,
      };
    }

    return {
      label: '',
      timer: this.formatProcessTimer(tile.process),
    };
  }

  formatProcessTimer(process) {
    const remainingMs = Number.isFinite(process?.remainingMs) ? process.remainingMs : 0;
    return formatRemainingTime(remainingMs);
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
