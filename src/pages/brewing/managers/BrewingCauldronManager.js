import {
  getCompletedResearchIds,
  isItemResearched,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { createStarLevelLabel, formatStarLevel } from '../../shared/starLevelLabel.js';
import { setTimerProgressFill, stopTimerProgressFill } from '../../shared/timerProgress.js';
import { formatRemainingTime } from '../../shared/timerDisplay.js';
import { preventNativeWorldGestureDefault } from '../../shared/worldGestureDefaultGuard.js';
import { createAssetAtlasSprite } from '../../../assets/atlas/atlasSprite.js';
import { getSeedIconFrameName } from '../../../assets/items/seeds/seedIcons.js';
import { getHerbIconFrameName } from '../../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
  getPotionLiquidColor,
} from '../../../assets/items/potions/potionIcons.js';
import { automationResearchIds } from '../../../gameplay/automation/automationResearchIds.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';

const cauldronEmptyImageUrl = new URL(
  '../assets/cauldron/cauldron-empty.png',
  import.meta.url,
).href;
const cauldronLiquidMaskImageUrl = new URL(
  '../assets/cauldron/cauldron-liquid-mask.png',
  import.meta.url,
).href;

const CAULDRON_BASE_ROW_COUNT = 3;
const HERB_COLUMN_COUNT = 2;
const COLLAPSED_HERB_ROW_COUNT = 3;
const COLLAPSED_HERB_COUNT = HERB_COLUMN_COUNT * COLLAPSED_HERB_ROW_COUNT;
const WORLD_EDGE_EXTENSION = 16;
const WORLD_WIDTH = 730 + WORLD_EDGE_EXTENSION * 2;
const WORLD_HEIGHT = 780 + WORLD_EDGE_EXTENSION * 2;
const WORLD_FIT_PADDING = 16;
const CAULDRON_BOX_WIDTH = 272;
const CAULDRON_BOX_HEIGHT = 150;
const HERB_DRAG_THRESHOLD = 22;
const ITEM_DRAG_SWAY_X_FACTOR = 0.45;
const ITEM_DRAG_SWAY_Y_FACTOR = 0.2;
const ITEM_DRAG_SWAY_ROTATION_FACTOR = 0.36;
const ITEM_DRAG_SWAY_ROTATION_ACCELERATION_FACTOR = 0.18;
const ITEM_DRAG_SWAY_SMOOTHING = 0.38;
const ITEM_DRAG_SWAY_SETTLE_ROTATION_FACTOR = 0.28;
const ITEM_DRAG_SWAY_X_MAX = 12;
const ITEM_DRAG_SWAY_Y_MAX = 6;
const ITEM_DRAG_SWAY_ROTATION_MAX = 14;
const ITEM_DRAG_SWAY_SETTLE_ROTATION_MAX = 3;
const ITEM_DRAG_SWAY_SETTLE_MS = 110;
const ITEM_DRAG_SWAY_REST_MS = 90;
const ITEM_DROP_CAULDRON_MS = 220;
const ITEM_DROP_RETURN_MS = 190;
const ITEM_BREW_DROP_MS = 240;
const ITEM_BREW_DROP_STAGGER_MS = 45;
const ITEM_DROP_RECEIVE_MS = 240;
const ITEM_DROP_FADE_MS = 80;
const WORLD_DRAG_THRESHOLD = 4;
const WORLD_CAULDRON_TAP_DRAG_THRESHOLD = 12;
const WORLD_MIN_ZOOM = 0.56;
const WORLD_MAX_ZOOM = 1.16;
const WORLD_ZOOM_RUBBER_LIMIT = 0.12;
const WORLD_PAN_RUBBER_LIMIT = 54;
const WORLD_SETTLE_CLASS_MS = 240;
const CAULDRON_WORLD_LEFT_OFFSET = 106;
const CAULDRON_WORLD_TOP_OFFSET = 96;
const CAULDRON_WORLD_COLUMN_GAP = 310;
const CAULDRON_WORLD_ROW_GAP = 168;

export class BrewingCauldronManager {
  constructor({
    gameplayFacade,
    getSelectedRecipeKey,
    onOpenSelectRecipe,
    onOpenRecipeChoice,
    onClearSelectedRecipe,
    onSelectBrewQuantity,
    onToggleAutoBrew,
    onCurrentCauldronChange,
    onRewardNotice,
    rewardEventsAvailable = false,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSelectedRecipeKey = getSelectedRecipeKey;
    this.onOpenSelectRecipe = onOpenSelectRecipe;
    this.onOpenRecipeChoice = onOpenRecipeChoice;
    this.onClearSelectedRecipe = onClearSelectedRecipe;
    this.onSelectBrewQuantity = onSelectBrewQuantity;
    this.onToggleAutoBrew = onToggleAutoBrew;
    this.onCurrentCauldronChange = onCurrentCauldronChange;
    this.onRewardNotice = onRewardNotice;
    this.rewardEventsAvailable = rewardEventsAvailable;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.herbRows = new Map();
    this.herbRowsSignature = '';
    this.cauldronRefs = new Map();
    this.cauldronRefsSignature = '';
    this.selectedCauldronIndex = 0;
    this.herbsExpanded = false;
    this.herbsVisible = false;
    this.message = null;
    this.suppressNextClick = false;
    this.suppressWorldClickUntilMs = 0;
    this.worldPan = { x: 0, y: 0 };
    this.worldZoom = 1;
    this.worldViewportTouched = false;
    this.worldPointers = new Map();
    this.worldGesture = null;
    this.worldDrag = null;
    this.worldSettleClassTimeout = null;
    this.herbDrag = null;
    this.transientAnimationTimeouts = new Set();
    this.transientAnimationTimeoutsByElement = new WeakMap();
    this.boughtCauldronAnimationResets = new Map();
    this.handleDocumentHerbPointerMove = (event) => this.onHerbPointerMove(event);
    this.handleDocumentHerbPointerUp = (event) => this.onHerbPointerUp(event);
    this.handleWorldGestureDefault = (event) => preventNativeWorldGestureDefault(event);
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'brewing-page__world-view';
    this.root.setAttribute('aria-label', 'Brewing workbench');

    this.refs.world = this.createWorld();
    this.refs.herbs = this.createHerbsBox();
    this.root.append(this.refs.world.shell, this.refs.herbs.root);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const refs of this.cauldronRefs.values()) {
      stopTimerProgressFill(refs.activeProgressFill, 0);
    }
    this.clearBoughtCauldronAnimations();
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.herbRows.clear();
    this.herbRowsSignature = '';
    this.cauldronRefs.clear();
    this.cauldronRefsSignature = '';
    this.herbsExpanded = false;
    this.herbsVisible = false;
    this.message = null;
    this.suppressNextClick = false;
    this.suppressWorldClickUntilMs = 0;
    this.worldPointers.clear();
    this.worldGesture = null;
    this.worldDrag = null;
    this.clearWorldSettleTimers();
    this.clearHerbDrag();
    this.clearTransientAnimationTimeouts();
    this.boughtCauldronAnimationResets.clear();
  }

  createWorld() {
    const shell = document.createElement('section');
    shell.className = 'brewing-page__world-shell';
    shell.dataset.pageSwipeBlock = 'true';
    shell.setAttribute('aria-label', 'Brewing world');
    shell.addEventListener('pointerdown', (event) => this.onWorldPointerDown(event));
    shell.addEventListener('pointermove', (event) => this.onWorldPointerMove(event));
    shell.addEventListener('pointerup', (event) => this.onWorldPointerUp(event));
    shell.addEventListener('pointercancel', (event) => this.onWorldPointerUp(event));
    shell.addEventListener('touchstart', this.handleWorldGestureDefault, { passive: false });
    shell.addEventListener('touchmove', this.handleWorldGestureDefault, { passive: false });
    shell.addEventListener('gesturestart', this.handleWorldGestureDefault, { passive: false });
    shell.addEventListener('gesturechange', this.handleWorldGestureDefault, { passive: false });

    const world = document.createElement('div');
    world.className = 'brewing-page__world';
    world.style.setProperty('--brewing-page-world-pan-x', `${this.worldPan.x}px`);
    world.style.setProperty('--brewing-page-world-pan-y', `${this.worldPan.y}px`);
    world.style.setProperty('--brewing-page-world-zoom', String(this.worldZoom));

    const boundary = document.createElement('div');
    boundary.className = 'brewing-page__world-boundary';
    boundary.setAttribute('aria-hidden', 'true');

    const cauldrons = document.createElement('div');
    cauldrons.className = 'brewing-page__cauldrons';

    world.append(boundary, cauldrons);
    shell.append(world);
    this.refs.cauldrons = cauldrons;

    return { shell, world, boundary, cauldrons };
  }

  createHerbsBox() {
    const root = document.createElement('section');
    root.className = 'brewing-page__herbs style-box';
    root.setAttribute('aria-label', 'Herbs');
    root.setAttribute('aria-hidden', 'true');
    root.hidden = true;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'herbs';

    const toggle = document.createElement('button');
    toggle.className = 'brewing-page__herbs-toggle';
    toggle.type = 'button';
    toggle.textContent = 'expand';

    const rows = document.createElement('div');
    rows.className = 'brewing-page__herb-rows';
    rows.id = 'brewing-page-herb-rows';
    toggle.setAttribute('aria-controls', rows.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => this.toggleHerbsExpanded());
    root.append(title, rows, toggle);

    return { root, rows, toggle };
  }

  createCauldronBox(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const root = document.createElement('section');
    root.className = 'brewing-page__cauldron';
    root.dataset.cauldronIndex = String(safeCauldronIndex);
    root.setAttribute('aria-label', `Cauldron ${safeCauldronIndex + 1}`);
    root.tabIndex = 0;
    root.addEventListener('pointerdown', () => {
      if (!this.isCauldronLocked(safeCauldronIndex)) {
        this.selectCauldron(safeCauldronIndex);
      }
    });
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      this.openCauldronOrBuy(safeCauldronIndex);
    });
    root.addEventListener('click', (event) =>
      this.onCauldronWorldClick(event, safeCauldronIndex),
    );

    const boxes = document.createElement('div');
    boxes.className = 'brewing-page__cauldron-boxes';

    const recipeBox = document.createElement('section');
    recipeBox.className = 'brewing-page__cauldron-recipe-box style-box';

    const potionBox = document.createElement('section');
    potionBox.className = 'brewing-page__cauldron-potion-box';

    const lockedBox = document.createElement('section');
    lockedBox.className = 'brewing-page__cauldron-locked-box style-box';
    lockedBox.hidden = true;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = `cauldron ${safeCauldronIndex + 1}`;

    const lockedTitle = document.createElement('div');
    lockedTitle.className = 'style-box__title';
    lockedTitle.textContent = `cauldron ${safeCauldronIndex + 1}`;

    const count = document.createElement('div');
    count.className = 'brewing-page__cauldron-count';
    count.textContent = '0/0';
    count.hidden = true;

    const bubble = document.createElement('div');
    bubble.className = 'brewing-page__cauldron-bubble';
    bubble.textContent = '';

    const selectRecipeButton = document.createElement('button');
    selectRecipeButton.className = 'brewing-page__cauldron-select-recipe-text';
    selectRecipeButton.type = 'button';
    selectRecipeButton.textContent = 'recipes';
    selectRecipeButton.setAttribute('aria-haspopup', 'dialog');
    selectRecipeButton.addEventListener('click', () => {
      this.selectCauldron(safeCauldronIndex);
      this.onOpenSelectRecipe?.(safeCauldronIndex);
    });

    const guide = document.createElement('div');
    guide.className = 'brewing-page__cauldron-guide';
    guide.hidden = true;

    const guideSequence = document.createElement('div');
    guideSequence.className = 'brewing-page__cauldron-guide-sequence';

    guide.append(guideSequence);

    const items = document.createElement('div');
    items.className = 'brewing-page__cauldron-items';

    const status = document.createElement('div');
    status.className = 'brewing-page__cauldron-status';

    const active = document.createElement('div');
    active.className = 'brewing-page__active-brew';

    const activeText = document.createElement('div');
    activeText.className = 'brewing-page__active-brew-text';

    const activeProgress = document.createElement('div');
    activeProgress.className = 'style-progress style-progress--timer brewing-page__active-progress';
    activeProgress.setAttribute('role', 'progressbar');
    activeProgress.setAttribute('aria-label', 'Brewing progress');
    activeProgress.setAttribute('aria-valuemin', '0');
    activeProgress.setAttribute('aria-valuemax', '100');

    const activeProgressFill = document.createElement('div');
    activeProgressFill.className =
      'style-progress__fill brewing-page__active-progress-fill';

    const activeProgressText = document.createElement('div');
    activeProgressText.className =
      'style-progress__text brewing-page__active-progress-text';

    const preview = document.createElement('div');
    preview.className = 'brewing-page__cauldron-preview';

    const cauldronArt = document.createElement('div');
    cauldronArt.className = 'brewing-page__cauldron-art';
    cauldronArt.setAttribute('aria-hidden', 'true');

    const cauldronImage = document.createElement('img');
    cauldronImage.className = 'brewing-page__cauldron-art-image';
    cauldronImage.src = cauldronEmptyImageUrl;
    cauldronImage.alt = '';
    cauldronImage.draggable = false;

    const cauldronLiquid = document.createElement('div');
    cauldronLiquid.className = 'brewing-page__cauldron-art-liquid';
    cauldronLiquid.hidden = true;
    cauldronLiquid.style.setProperty(
      '--brewing-page-cauldron-liquid-mask',
      `url("${cauldronLiquidMaskImageUrl}")`,
    );

    const previewLabel = document.createElement('div');
    previewLabel.className = 'brewing-page__cauldron-preview-label';

    const previewSummary = document.createElement('div');
    previewSummary.className = 'brewing-page__cauldron-preview-summary';
    previewSummary.hidden = true;

    const previewIcon = document.createElement('span');
    previewIcon.className = 'brewing-page__cauldron-preview-icon';
    previewIcon.setAttribute('aria-hidden', 'true');
    previewIcon.hidden = true;

    const actions = this.createActions(safeCauldronIndex);

    activeProgress.append(activeProgressFill, activeProgressText);
    active.append(activeText, activeProgress);
    cauldronArt.append(cauldronImage, cauldronLiquid);
    previewSummary.append(previewLabel, previewIcon);
    preview.append(cauldronArt, previewSummary);
    recipeBox.append(title, count, bubble, guide, status, items, active, selectRecipeButton);
    potionBox.append(preview);
    lockedBox.append(lockedTitle);
    boxes.append(potionBox, recipeBox, lockedBox);
    root.append(
      boxes,
      actions.root,
    );
    return {
      cauldronIndex: safeCauldronIndex,
      root,
      boxes,
      recipeBox,
      potionBox,
      lockedBox,
      title,
      lockedTitle,
      count,
      bubble,
      guide,
      guideSequence,
      preview,
      cauldronArt,
      cauldronImage,
      cauldronLiquid,
      previewLabel,
      previewSummary,
      previewIcon,
      status,
      selectRecipeButton,
      items,
      active,
      activeText,
      activeProgress,
      activeProgressFill,
      activeProgressText,
      actions,
      ingredientRows: [],
      cauldronGuideRows: [],
    };
  }

  createActions(cauldronIndex = 0) {
    const root = document.createElement('div');
    root.className = 'brewing-page__actions';
    root.setAttribute('aria-live', 'polite');

    const actionButton = document.createElement('button');
    actionButton.className = 'style-button brewing-page__action-button';
    actionButton.type = 'button';
    actionButton.addEventListener('click', () => this.onPrimaryAction(cauldronIndex));

    const actionButtonLabel = document.createElement('span');
    actionButtonLabel.className = 'brewing-page__action-button-label';

    const actionButtonCost = document.createElement('span');
    actionButtonCost.className = 'brewing-page__action-button-cost';
    setResourceColor(actionButtonCost, 'mana');

    const actionRow = document.createElement('div');
    actionRow.className = 'brewing-page__action-row';

    const quantityOptions = document.createElement('div');
    quantityOptions.className = 'brewing-page__quantity-options';
    quantityOptions.hidden = true;

    const autoButton = document.createElement('button');
    autoButton.className = 'style-button brewing-page__auto-button';
    autoButton.type = 'button';
    autoButton.hidden = true;
    autoButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onAutoBrewModeButtonClick(cauldronIndex);
    });

    actionButton.append(actionButtonLabel, actionButtonCost);
    actionRow.append(actionButton, quantityOptions, autoButton);

    const message = document.createElement('div');
    message.className = 'brewing-page__message';

    root.append(actionRow, message);
    return {
      root,
      actionRow,
      actionButton,
      actionButtonLabel,
      actionButtonCost,
      quantityOptions,
      autoButton,
      message,
    };
  }

  render(snapshot) {
    if (!snapshot) {
      return;
    }

    const brewing = {
      ...snapshot.brewing,
      herbs: this.getHerbRows(snapshot),
    };
    brewing.cauldrons = this.getCauldrons(brewing, snapshot);
    this.normalizeSelectedCauldron(brewing.cauldrons);
    const canSelectRecipe = (brewing.recipes ?? []).some((recipe) => recipe.unlocked);
    for (const cauldron of brewing.cauldrons) {
      cauldron.herbs = brewing.herbs;
      cauldron.canSelectRecipe = cauldron.unlocked !== false && canSelectRecipe;
      cauldron.autoBrewAvailable =
        cauldron.unlocked === false
          ? false
          : this.isAutoBrewAvailable(snapshot, cauldron.cauldronIndex);
      cauldron.autoBrewEnabled = cauldron.autoBrewEnabled === true;
      cauldron.selectedRecipe =
        cauldron.unlocked === false
          ? null
          : this.getSelectedRecipe(brewing.recipes ?? [], cauldron.cauldronIndex);
    }
    this.syncHerbRows(brewing.herbs);
    this.renderHerbs(snapshot, brewing);
    this.syncCauldrons(brewing.cauldrons);
    for (const cauldron of brewing.cauldrons) {
      const refs = this.cauldronRefs.get(cauldron.cauldronIndex);
      if (refs) {
        this.renderCauldron(refs, cauldron);
        this.renderActions(refs, cauldron);
      }
    }
  }

  getCauldrons(brewing, snapshot = {}) {
    const cauldrons = Array.isArray(brewing.cauldrons) ? brewing.cauldrons : [];
    const unlockedCauldrons =
      cauldrons.length > 0
        ? cauldrons.map((cauldron, index) => ({
            ...cauldron,
            unlocked: cauldron.unlocked !== false,
            cauldronIndex: this.normalizeCauldronIndex(cauldron.cauldronIndex ?? index),
            cauldronNumber: cauldron.cauldronNumber ?? index + 1,
          }))
        : [
            {
              ...brewing,
              unlocked: true,
              cauldronIndex: this.normalizeCauldronIndex(brewing.cauldronIndex ?? 0),
              cauldronNumber: brewing.cauldronNumber ?? 1,
            },
          ];
    const nextLockedCauldron = this.getNextLockedCauldron(brewing, snapshot);

    if (!nextLockedCauldron) {
      return unlockedCauldrons;
    }

    return [...unlockedCauldrons, nextLockedCauldron];
  }

  getNextLockedCauldron(brewing, snapshot = {}) {
    const cauldronNumber = brewing.nextCauldronNumber;

    if (!Number.isInteger(cauldronNumber)) {
      return null;
    }

    return {
      cauldronIndex: this.normalizeCauldronIndex(cauldronNumber - 1),
      cauldronNumber,
      level: this.normalizeCauldronLevel(brewing.cauldronLevels?.[cauldronNumber]),
      unlocked: false,
      ingredients: [],
      herbs: brewing.herbs ?? [],
      activeBrew: null,
      selectedRecipe: null,
      maxIngredients: brewing.maxIngredients ?? 0,
      manaCost: brewing.manaCost,
      nextCauldronCost: brewing.nextCauldronCost,
      nextCauldronLockedByLevel: brewing.nextCauldronLockedByLevel === true,
      nextCauldronLockedByResearch: brewing.nextCauldronLockedByResearch === true,
      nextCauldronRequiresLevel: brewing.nextCauldronRequiresLevel ?? null,
      nextCauldronRequiresResearchId: brewing.nextCauldronRequiresResearchId ?? null,
      canBuyCauldron:
        brewing.nextCauldronLockedByLevel !== true &&
        brewing.nextCauldronLockedByResearch !== true &&
        Number.isFinite(brewing.nextCauldronCost) &&
        (snapshot.coin?.current ?? 0) >= brewing.nextCauldronCost,
    };
  }

  syncCauldrons(cauldrons) {
    const signature = cauldrons
      .map((cauldron) => `${cauldron.cauldronIndex}:${cauldron.cauldronNumber}`)
      .join('|');

    if (signature === this.cauldronRefsSignature) {
      return;
    }

    const visibleIndexes = new Set(cauldrons.map((cauldron) => cauldron.cauldronIndex));

    for (const [cauldronIndex, refs] of this.cauldronRefs.entries()) {
      if (visibleIndexes.has(cauldronIndex)) {
        continue;
      }

      refs.root.remove();
      this.cauldronRefs.delete(cauldronIndex);
    }

    for (const cauldron of cauldrons) {
      if (this.cauldronRefs.has(cauldron.cauldronIndex)) {
        this.positionCauldronBox(
          this.cauldronRefs.get(cauldron.cauldronIndex),
          cauldron.cauldronIndex,
        );
        continue;
      }

      const refs = this.createCauldronBox(cauldron.cauldronIndex);
      this.positionCauldronBox(refs, cauldron.cauldronIndex);
      this.cauldronRefs.set(cauldron.cauldronIndex, refs);
    }

    this.refs.cauldrons.replaceChildren(
      ...cauldrons
        .map((cauldron) => this.cauldronRefs.get(cauldron.cauldronIndex)?.root)
        .filter(Boolean),
    );
    this.cauldronRefsSignature = signature;
    this.fitWorldViewportToCauldrons(cauldrons);
  }

  positionCauldronBox(refs, cauldronIndex = 0) {
    const position = this.getCauldronWorldPosition(cauldronIndex);

    refs.root.style.left = `${position.x}px`;
    refs.root.style.top = `${position.y}px`;
  }

  getCauldronWorldPosition(cauldronIndex = 0) {
    const safeIndex = this.normalizeCauldronIndex(cauldronIndex);
    const column = safeIndex % 2;
    const row = Math.floor(safeIndex / 2);

    return this.extendCauldronWorldPosition({
      x: CAULDRON_WORLD_LEFT_OFFSET + column * CAULDRON_WORLD_COLUMN_GAP,
      y: CAULDRON_WORLD_TOP_OFFSET + row * CAULDRON_WORLD_ROW_GAP,
    });
  }

  extendCauldronWorldPosition(position) {
    return {
      x: position.x + WORLD_EDGE_EXTENSION,
      y: position.y + WORLD_EDGE_EXTENSION,
    };
  }

  fitWorldViewportToCauldrons(cauldrons = []) {
    if (this.worldViewportTouched || cauldrons.length <= 0) {
      return;
    }

    const shellRect = this.refs.world?.shell?.getBoundingClientRect?.();
    const scale = this.getUiScale();
    const shellWidth = Math.max(0, (shellRect?.width ?? 0) / scale);

    if (shellWidth <= 0) {
      return;
    }

    const bounds = this.getCauldronContentBounds(cauldrons);
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const availableWidth = Math.max(1, shellWidth - WORLD_FIT_PADDING * 2);
    const nextZoom = this.clampWorldZoom(Math.min(1, availableWidth / contentWidth));
    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const nextPan = this.clampWorldPan(
      shellWidth / 2 - contentCenterX * nextZoom,
      this.worldPan.y,
      nextZoom,
    );

    this.worldPan = nextPan;
    this.worldZoom = nextZoom;
    this.applyWorldViewport();
  }

  getCauldronContentBounds(cauldrons = []) {
    return cauldrons.reduce(
      (bounds, cauldron) => {
        const position = this.getCauldronWorldPosition(cauldron.cauldronIndex);
        const refs = this.cauldronRefs.get(cauldron.cauldronIndex);
        const width = refs?.root?.offsetWidth || CAULDRON_BOX_WIDTH;
        const height = refs?.root?.offsetHeight || CAULDRON_BOX_HEIGHT;

        return {
          minX: Math.min(bounds.minX, position.x),
          maxX: Math.max(bounds.maxX, position.x + width),
          minY: Math.min(bounds.minY, position.y),
          maxY: Math.max(bounds.maxY, position.y + height),
        };
      },
      { minX: WORLD_WIDTH, maxX: 0, minY: WORLD_HEIGHT, maxY: 0 },
    );
  }

  normalizeSelectedCauldron(cauldrons) {
    if (
      cauldrons.some(
        (cauldron) =>
          cauldron.unlocked !== false && cauldron.cauldronIndex === this.selectedCauldronIndex,
      )
    ) {
      return;
    }

    const firstUnlocked = cauldrons.find((cauldron) => cauldron.unlocked !== false);
    this.selectCauldron(firstUnlocked?.cauldronIndex ?? 0);
  }

  normalizeCauldronLevel(level) {
    const safeLevel = Math.floor(Number(level));
    return Number.isInteger(safeLevel) && safeLevel > 0 ? safeLevel : 1;
  }

  selectCauldron(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (this.selectedCauldronIndex === safeCauldronIndex) {
      return;
    }

    this.selectedCauldronIndex = safeCauldronIndex;
    this.syncCurrentCauldronState();
    this.onCurrentCauldronChange?.(safeCauldronIndex);
  }

  syncCurrentCauldronState() {
    for (const [cauldronIndex, refs] of this.cauldronRefs.entries()) {
      refs.root.classList.toggle(
        'is-current',
        !refs.root.classList.contains('is-locked') &&
          cauldronIndex === this.selectedCauldronIndex,
      );
    }
  }

  getHerbRows(snapshot) {
    return (snapshot.brewing?.herbs ?? [])
      .map((herb) => ({
        ...herb,
        researched: isItemResearched(snapshot, herb),
      }))
      .filter((herb) => shouldShowItemInActionList(snapshot, herb, herb.quantity));
  }

  syncHerbRows(herbs) {
    const signature = herbs.map((herb) => herb.itemTypeId).join('|');

    if (signature === this.herbRowsSignature) {
      return;
    }

    const visibleIds = new Set(herbs.map((herb) => herb.itemTypeId));

    for (const [itemTypeId, refs] of this.herbRows.entries()) {
      if (visibleIds.has(itemTypeId)) {
        continue;
      }

      refs.row.remove();
      this.herbRows.delete(itemTypeId);
    }

    this.ensureHerbRows(herbs);
    this.refs.herbs.rows.replaceChildren(
      ...herbs.map((herb) => this.herbRows.get(herb.itemTypeId)?.row).filter(Boolean),
    );
    this.herbRowsSignature = signature;
  }

  ensureHerbRows(herbs) {
    for (const herb of herbs) {
      if (this.herbRows.has(herb.itemTypeId)) {
        continue;
      }

      const row = document.createElement('div');
      row.className = 'brewing-page__herb-row';
      setResourceColor(row, 'herb');

      const button = document.createElement('button');
      button.className = 'brewing-page__herb-button';
      button.type = 'button';
      button.dataset.tutorialId = `brewing:herb:${herb.key}`;
      setResourceColor(button, 'herb');
      button.addEventListener('pointerdown', (event) =>
        this.onHerbPointerDown(event, herb),
      );
      button.addEventListener('pointermove', (event) => this.onHerbPointerMove(event));
      button.addEventListener('pointerup', (event) => this.onHerbPointerUp(event));
      button.addEventListener('pointercancel', (event) => this.onHerbPointerUp(event));
      button.addEventListener('click', (event) => this.onHerbButtonClick(event, herb.itemTypeId));

      const label = document.createElement('span');
      label.className = 'brewing-page__herb-label row_key';

      const quantity = document.createElement('span');
      quantity.className = 'brewing-page__herb-quantity row_val';

      button.append(label, quantity);
      row.append(button);
      this.herbRows.set(herb.itemTypeId, { row, button, label, quantity });
      this.refs.herbs.rows.append(row);
    }
  }

  renderHerbs(snapshot, brewing) {
    const hiddenStartIndex = this.herbsExpanded
      ? brewing.herbs.length
      : COLLAPSED_HERB_COUNT;

    for (const herb of brewing.herbs) {
      const refs = this.herbRows.get(herb.itemTypeId);
      const targetCauldron = this.getAddTargetCauldron(
        brewing.cauldrons,
        herb.itemTypeId,
      );
      const disabled =
        herb.availableQuantity <= 0 || !targetCauldron;
      const rowIndex = brewing.herbs.indexOf(herb);

      refs.row.classList.toggle('is-empty', herb.availableQuantity <= 0);
      refs.row.classList.toggle('is-locked', false);
      this.setHidden(refs.row, rowIndex >= hiddenStartIndex);
      this.setText(refs.label, herb.label);
      setItemIconLabel(refs.label, 'herb', herb.key);
      const displayQuantity = this.getDisplayHerbQuantity(herb);
      refs.row.classList.toggle(
        'is-picked',
        this.herbDrag?.itemTypeId === herb.itemTypeId,
      );
      refs.quantity.classList.toggle(
        'is-previewing-pick',
        this.herbDrag?.itemTypeId === herb.itemTypeId,
      );
      this.setText(refs.quantity, String(displayQuantity));
      this.setDisabled(refs.button, disabled);
      this.setAttribute(refs.button, 'aria-disabled', disabled ? 'true' : 'false');
      this.setAttribute(refs.button, 'aria-label', `add ${herb.label} to cauldron`);
      setNotificationBadge(refs.button, false);
      setNotificationBadge(refs.label, !disabled);
    }

    this.renderHerbsToggle(brewing.herbs.length);
  }

  getDisplayHerbQuantity(herb) {
    const availableQuantity = Math.max(
      0,
      Math.floor(Number(herb?.availableQuantity) || 0),
    );

    if (this.herbDrag?.itemTypeId !== herb?.itemTypeId) {
      return availableQuantity;
    }

    return Math.max(0, availableQuantity - 1);
  }

  getCurrentHerbAvailableQuantity(itemTypeId) {
    const snapshot = this.gameplayFacade?.getSnapshot?.();
    const herb = (snapshot?.brewing?.herbs ?? []).find(
      (candidate) => candidate.itemTypeId === itemTypeId,
    );
    const availableQuantity = Math.max(
      0,
      Math.floor(Number(herb?.availableQuantity) || 0),
    );

    return availableQuantity;
  }

  setHerbDragSourceState(drag, picked) {
    if (!drag?.source) {
      return;
    }

    const row = drag.source.closest?.('.brewing-page__herb-row');
    const quantity = drag.source.querySelector?.('.brewing-page__herb-quantity');
    const availableQuantity = this.getCurrentHerbAvailableQuantity(drag.itemTypeId);

    row?.classList.toggle('is-picked', picked);
    quantity?.classList.toggle('is-previewing-pick', picked);
    this.setText(
      quantity,
      String(picked ? Math.max(0, availableQuantity - 1) : availableQuantity),
    );
  }

  getAddTargetCauldron(cauldrons = [], itemTypeId = null) {
    const selected = cauldrons.find(
      (cauldron) => cauldron.cauldronIndex === this.selectedCauldronIndex,
    );

    if (this.canUseCauldronForIngredient(selected, itemTypeId)) {
      return selected;
    }

    return (
      cauldrons.find((cauldron) =>
        this.canUseCauldronForIngredient(cauldron, itemTypeId),
      ) ??
      null
    );
  }

  canUseCauldronForIngredient(cauldron) {
    if (!cauldron?.canAddIngredient || cauldron.activeBrew) {
      return false;
    }

    return true;
  }

  canSelectedRecipeAcceptIngredient(brewing, itemTypeId = null) {
    if (!brewing?.selectedRecipe) {
      return true;
    }

    const remainingQuantities = this.getRemainingIngredientQuantities(
      brewing.selectedRecipe,
      brewing,
      this.getBrewQuantity(brewing),
    );

    if (itemTypeId === null) {
      return [...remainingQuantities.values()].some((quantity) => quantity > 0);
    }

    return (remainingQuantities.get(itemTypeId) ?? 0) > 0;
  }

  renderHerbsToggle(herbCount) {
    const canToggle = herbCount > COLLAPSED_HERB_COUNT;

    this.refs.herbs.root.classList.toggle('is-expanded', this.herbsExpanded);
    this.refs.herbs.root.classList.toggle('is-collapsed', !this.herbsExpanded);
    this.setHidden(this.refs.herbs.toggle, !canToggle);
    this.setText(this.refs.herbs.toggle, this.herbsExpanded ? 'collapse' : 'expand');
    this.setAttribute(
      this.refs.herbs.toggle,
      'aria-expanded',
      this.herbsExpanded ? 'true' : 'false',
    );
    this.setAttribute(
      this.refs.herbs.toggle,
      'aria-label',
      this.herbsExpanded ? 'collapse herbs' : 'expand herbs',
    );
    this.applyHerbsVisibility();
  }

  toggleHerbsExpanded() {
    this.herbsExpanded = !this.herbsExpanded;
    this.render(this.gameplayFacade.getSnapshot());
  }

  setHerbsVisible(visible) {
    const nextVisible = Boolean(visible);

    if (!nextVisible) {
      this.herbsExpanded = false;
    }

    this.herbsVisible = nextVisible;
    this.render(this.gameplayFacade?.getSnapshot?.());
    this.applyHerbsVisibility();
  }

  toggleHerbsVisible() {
    this.setHerbsVisible(!this.herbsVisible);
  }

  applyHerbsVisibility() {
    if (!this.refs.herbs?.root) {
      return;
    }

    this.refs.herbs.root.hidden = !this.herbsVisible;
    this.refs.herbs.root.setAttribute(
      'aria-hidden',
      this.herbsVisible ? 'false' : 'true',
    );
  }

  onWorldPointerDown(event) {
    if (
      event.button !== 0 ||
      event.target?.closest?.(
        '.brewing-page__herbs, button, [role="button"]',
      )
    ) {
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
    const cauldronIndex = this.getCauldronIndexFromElement(event.target);

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
          cauldronIndex !== null ? WORLD_CAULDRON_TAP_DRAG_THRESHOLD : WORLD_DRAG_THRESHOLD,
        cauldronIndex,
      };
      this.worldDrag = this.worldGesture;
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
    this.worldDrag = this.worldGesture;
    this.worldViewportTouched = true;
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

    const tapCauldronIndex =
      event.type !== 'pointercancel' &&
      this.worldPointers.size === 1 &&
      this.worldGesture?.type === 'pan' &&
      this.worldGesture.pointerId === pointerId &&
      this.worldGesture.didDrag !== true &&
      Number.isInteger(this.worldGesture.cauldronIndex)
        ? this.worldGesture.cauldronIndex
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
      this.worldDrag = this.worldGesture;
      return;
    }

    this.refs.world?.shell?.classList.remove('is-dragging');
    this.worldGesture = null;
    this.worldDrag = null;
    this.settleWorldViewport();

    if (tapCauldronIndex !== null) {
      this.suppressWorldClick();
      event.preventDefault();
      event.stopPropagation();
      this.openCauldronOrBuy(tapCauldronIndex);
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
    this.worldDrag = null;
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
    this.worldViewportTouched = true;
    event.preventDefault();
  }

  setWorldZoomAroundPoint(rawZoom, clientX, clientY, { rubber = false } = {}) {
    this.worldViewportTouched = true;
    const sourcePoint = this.getShellSourcePoint(clientX, clientY);
    const safeCurrentZoom = this.worldZoom > 0 ? this.worldZoom : 1;
    const zoom = rubber ? this.getRubberZoom(rawZoom) : this.clampWorldZoom(rawZoom);
    const worldX = (sourcePoint.x - this.worldPan.x) / safeCurrentZoom;
    const worldY = (sourcePoint.y - this.worldPan.y) / safeCurrentZoom;

    this.setWorldViewport(
      sourcePoint.x - worldX * zoom,
      sourcePoint.y - worldY * zoom,
      zoom,
      { rubber },
    );
  }

  getPointerId(event) {
    return event.pointerId ?? 'mouse';
  }

  getCauldronIndexFromElement(element) {
    const cauldron = element?.closest?.('.brewing-page__cauldron');
    const cauldronIndex = Number(cauldron?.dataset?.cauldronIndex);

    return Number.isInteger(cauldronIndex)
      ? this.normalizeCauldronIndex(cauldronIndex)
      : null;
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

    world.style.setProperty('--brewing-page-world-pan-x', `${this.worldPan.x}px`);
    world.style.setProperty('--brewing-page-world-pan-y', `${this.worldPan.y}px`);
    world.style.setProperty('--brewing-page-world-zoom', String(this.worldZoom));

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
    const xBounds = this.getWorldAxisPanBounds(shellWidth, WORLD_WIDTH, zoom);
    const yBounds = this.getWorldAxisPanBounds(shellHeight, WORLD_HEIGHT, zoom);

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

  onHerbPointerDown(event, herb) {
    if (event.button !== 0 || event.currentTarget.disabled) {
      return;
    }

    event.stopPropagation();
    this.herbDrag = {
      pointerId: event.pointerId,
      itemTypeId: herb?.itemTypeId,
      itemKind: herb?.kind ?? 'herb',
      itemKey: herb?.key ?? '',
      itemLabel: herb?.label ?? '',
      source: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      lastDeltaX: 0,
      swingX: 0,
      swayResetTimeout: null,
      swayRestTimeout: null,
      ghost: null,
      didDrag: false,
    };
    this.setHerbDragSourceState(this.herbDrag, true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.addEventListener('pointermove', this.handleDocumentHerbPointerMove);
    document.addEventListener('pointerup', this.handleDocumentHerbPointerUp);
    document.addEventListener('pointercancel', this.handleDocumentHerbPointerUp);
  }

  onHerbPointerMove(event) {
    if (!this.herbDrag || this.herbDrag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.herbDrag.startX;
    const deltaY = event.clientY - this.herbDrag.startY;

    if (
      !this.herbDrag.didDrag &&
      Math.hypot(deltaX, deltaY) < HERB_DRAG_THRESHOLD
    ) {
      return;
    }

    this.herbDrag.didDrag = true;
    this.suppressNextClick = true;
    this.ensureHerbDragGhost();
    this.moveHerbDragGhost(event.clientX, event.clientY);
    event.preventDefault();
  }

  onHerbPointerUp(event) {
    if (!this.herbDrag || this.herbDrag.pointerId !== event.pointerId) {
      return;
    }

    const drag = this.herbDrag;
    drag.source.releasePointerCapture?.(event.pointerId);
    let finishTarget = null;
    let finishType = 'return';

    if (drag.didDrag) {
      const targetCauldron = document
        .elementFromPoint?.(event.clientX, event.clientY)
        ?.closest?.('.brewing-page__cauldron');
      const cauldronIndex = Number(targetCauldron?.dataset?.cauldronIndex);

      if (Number.isInteger(cauldronIndex) && !this.isCauldronLocked(cauldronIndex)) {
        const result = this.onAddIngredient(drag.itemTypeId, cauldronIndex);

        if (result?.ok) {
          finishTarget = this.getCauldronDropTarget(result.cauldronIndex);
          finishType = 'cauldron';
          this.animateCauldronIngredientReceive(result.cauldronIndex);
        }
      }

      event.preventDefault();
    } else {
      finishType = 'none';
    }

    if (finishType === 'return') {
      finishTarget = this.getHerbReturnTarget(drag.itemTypeId) ?? drag.source;
      this.animateHerbSourceReturn(drag);
    }

    this.clearHerbDrag({
      keepGhost: Boolean(drag.ghost && finishTarget && finishType !== 'none'),
    });

    if (finishType === 'cauldron') {
      this.animateItemDragGhostToElement(drag.ghost, finishTarget, {
        type: 'cauldron',
        duration: ITEM_DROP_CAULDRON_MS,
      });
    } else if (finishType === 'return') {
      this.animateItemDragGhostToElement(drag.ghost, finishTarget, {
        type: 'return',
        duration: ITEM_DROP_RETURN_MS,
      });
    }
  }

  ensureHerbDragGhost() {
    if (!this.herbDrag || this.herbDrag.ghost) {
      return;
    }

    const ghost = this.createFloatingItemGhost(this.herbDrag, {
      className: 'brewing-page__herb-drag-ghost',
      fallbackLabel:
        this.herbDrag.source.querySelector('.brewing-page__herb-label')?.textContent ??
        this.herbDrag.itemLabel ??
        'herb',
    });
    document.body.append(ghost);
    this.herbDrag.ghost = ghost;
  }

  createFloatingItemGhost(item = {}, { className = '', fallbackLabel = 'item' } = {}) {
    const ghost = document.createElement('div');
    ghost.className = ['brewing-page__item-drag-ghost', className]
      .filter(Boolean)
      .join(' ');
    ghost.dataset.itemKind = item.itemKind ?? item.kind ?? '';
    ghost.dataset.itemKey = item.itemKey ?? item.key ?? '';
    ghost.setAttribute('aria-hidden', 'true');

    const icon = this.createItemDragIcon(item);

    if (icon) {
      ghost.append(icon);
      return ghost;
    }

    const fallback = document.createElement('span');
    fallback.className = 'brewing-page__item-drag-ghost-label';
    fallback.textContent = fallbackLabel;
    ghost.append(fallback);
    return ghost;
  }

  createItemDragIcon(item = {}) {
    const frameName = this.getItemDragFrameName(item);

    if (!frameName) {
      return null;
    }

    return createAssetAtlasSprite('brewing-page__item-drag-ghost-icon', frameName);
  }

  getItemDragFrameName(item = {}) {
    const kind = String(item.itemKind ?? item.kind ?? '').trim();
    const key = String(item.itemKey ?? item.key ?? '').trim();

    if (kind === 'seed') {
      return getSeedIconFrameName(key);
    }

    if (kind === 'herb') {
      return getHerbIconFrameName(key);
    }

    if (kind === 'potion') {
      return getPotionIconFrameName(key);
    }

    return null;
  }

  moveHerbDragGhost(clientX, clientY) {
    if (!this.herbDrag?.ghost) {
      return;
    }

    this.herbDrag.ghost.style.left = `${clientX}px`;
    this.herbDrag.ghost.style.top = `${clientY}px`;
    this.updateItemDragGhostMotion(clientX, clientY);
  }

  updateItemDragGhostMotion(clientX, clientY) {
    const drag = this.herbDrag;

    if (!drag?.ghost) {
      return;
    }

    const lastClientX = Number.isFinite(drag.lastClientX) ? drag.lastClientX : clientX;
    const lastClientY = Number.isFinite(drag.lastClientY) ? drag.lastClientY : clientY;
    const deltaX = clientX - lastClientX;
    const deltaY = clientY - lastClientY;

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    drag.lastClientX = clientX;
    drag.lastClientY = clientY;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true) {
      this.clearItemDragSwayTimers(drag);
      this.setItemDragGhostMotion(drag.ghost, 0, 0, 0);
      return;
    }

    const lastDeltaX = Number.isFinite(drag.lastDeltaX) ? drag.lastDeltaX : 0;
    const swingX =
      (Number.isFinite(drag.swingX) ? drag.swingX : 0) * ITEM_DRAG_SWAY_SMOOTHING +
      deltaX * (1 - ITEM_DRAG_SWAY_SMOOTHING);
    const accelerationX = deltaX - lastDeltaX;
    const swayX = this.clampItemDragMotion(
      -deltaX * ITEM_DRAG_SWAY_X_FACTOR,
      ITEM_DRAG_SWAY_X_MAX,
    );
    const swayY = this.clampItemDragMotion(
      -deltaY * ITEM_DRAG_SWAY_Y_FACTOR,
      ITEM_DRAG_SWAY_Y_MAX,
    );
    const rotation = this.clampItemDragMotion(
      -(swingX * ITEM_DRAG_SWAY_ROTATION_FACTOR +
        accelerationX * ITEM_DRAG_SWAY_ROTATION_ACCELERATION_FACTOR),
      ITEM_DRAG_SWAY_ROTATION_MAX,
    );

    drag.lastDeltaX = deltaX;
    drag.swingX = swingX;

    this.setItemDragGhostMotion(drag.ghost, swayX, swayY, rotation);
    this.scheduleItemDragSwaySettle(drag, rotation);
  }

  scheduleItemDragSwaySettle(drag, rotation) {
    this.clearItemDragSwayTimers(drag);
    drag.swayResetTimeout = window.setTimeout(() => {
      if (this.herbDrag?.ghost !== drag.ghost) {
        return;
      }

      const settleRotation = this.clampItemDragMotion(
        -rotation * ITEM_DRAG_SWAY_SETTLE_ROTATION_FACTOR,
        ITEM_DRAG_SWAY_SETTLE_ROTATION_MAX,
      );
      drag.lastDeltaX = 0;
      drag.swingX = 0;
      this.setItemDragGhostMotion(drag.ghost, 0, 0, settleRotation);
      drag.swayResetTimeout = null;
      drag.swayRestTimeout = window.setTimeout(() => {
        if (this.herbDrag?.ghost !== drag.ghost) {
          return;
        }

        this.setItemDragGhostMotion(drag.ghost, 0, 0, 0);
        drag.swayRestTimeout = null;
      }, ITEM_DRAG_SWAY_REST_MS);
    }, ITEM_DRAG_SWAY_SETTLE_MS);
  }

  setItemDragGhostMotion(ghost, x, y, rotation) {
    ghost.style.setProperty(
      '--brewing-page-item-drag-sway-x',
      `${this.formatCssNumber(x)}px`,
    );
    ghost.style.setProperty(
      '--brewing-page-item-drag-sway-y',
      `${this.formatCssNumber(y)}px`,
    );
    ghost.style.setProperty(
      '--brewing-page-item-drag-sway-rotation',
      `${this.formatCssNumber(rotation)}deg`,
    );
  }

  clampItemDragMotion(value, maxDistance) {
    const safeValue = Number(value);
    const safeMaxDistance = Math.max(0, Number(maxDistance) || 0);

    if (!Number.isFinite(safeValue)) {
      return 0;
    }

    return Math.min(safeMaxDistance, Math.max(-safeMaxDistance, safeValue));
  }

  formatCssNumber(value) {
    return String(Number((Number(value) || 0).toFixed(2)));
  }

  clearItemDragSwayTimers(drag = this.herbDrag) {
    window.clearTimeout(drag?.swayResetTimeout);
    window.clearTimeout(drag?.swayRestTimeout);
    if (drag) {
      drag.swayResetTimeout = null;
      drag.swayRestTimeout = null;
    }
  }

  clearHerbDrag({ keepGhost = false } = {}) {
    document.removeEventListener('pointermove', this.handleDocumentHerbPointerMove);
    document.removeEventListener('pointerup', this.handleDocumentHerbPointerUp);
    document.removeEventListener('pointercancel', this.handleDocumentHerbPointerUp);
    this.clearItemDragSwayTimers(this.herbDrag);
    this.setHerbDragSourceState(this.herbDrag, false);
    if (!keepGhost) {
      this.herbDrag?.ghost?.remove();
    }
    this.herbDrag = null;
  }

  getCauldronDropTarget(cauldronIndex = this.selectedCauldronIndex) {
    const refs = this.cauldronRefs.get(this.normalizeCauldronIndex(cauldronIndex));

    return refs?.cauldronArt ?? refs?.recipeBox ?? refs?.root ?? null;
  }

  getHerbReturnTarget(itemTypeId) {
    const refs = this.herbRows.get(itemTypeId);

    if (!this.refs.herbs?.root?.hidden && refs?.row && !refs.row.hidden) {
      return refs.button ?? refs.row;
    }

    if (!this.refs.herbs?.root?.hidden) {
      return this.refs.herbs.root;
    }

    return null;
  }

  animateHerbSourceReturn(drag) {
    const row = drag?.source?.closest?.('.brewing-page__herb-row');

    if (!row || this.prefersReducedMotion()) {
      return;
    }

    row.classList.add('is-returning');
    this.setTransientClassTimeout(row, 'is-returning', ITEM_DROP_RETURN_MS);
  }

  animateCauldronIngredientReceive(cauldronIndex) {
    const refs = this.cauldronRefs.get(this.normalizeCauldronIndex(cauldronIndex));

    if (!refs?.root || this.prefersReducedMotion()) {
      return;
    }

    refs.root.classList.remove('is-receiving-ingredient');
    void refs.root.offsetWidth;
    refs.root.classList.add('is-receiving-ingredient');
    this.setTransientClassTimeout(
      refs.root,
      'is-receiving-ingredient',
      ITEM_DROP_RECEIVE_MS,
    );
  }

  animateItemDragGhostToElement(
    ghost,
    target,
    {
      type = 'return',
      duration = ITEM_DROP_RETURN_MS,
      startRect = null,
      onFinish = null,
    } = {},
  ) {
    if (!ghost || !target) {
      ghost?.remove();
      return;
    }

    const resolvedStartRect = startRect ?? this.getElementRect(ghost);
    const targetRect = this.getElementRect(target);

    if (!resolvedStartRect || !targetRect) {
      ghost.remove();
      return;
    }

    this.prepareFloatingGhostForAnimation(ghost, resolvedStartRect);

    const isCauldronDrop = type === 'cauldron' || type === 'brew';
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY =
      isCauldronDrop
        ? targetRect.top + targetRect.height * 0.62
        : targetRect.top + targetRect.height / 2;
    const endLeft = targetCenterX - resolvedStartRect.width / 2;
    const endTop = targetCenterY - resolvedStartRect.height / 2;
    const deltaX = endLeft - resolvedStartRect.left;
    const deltaY = endTop - resolvedStartRect.top;

    if (this.prefersReducedMotion() || typeof ghost.animate !== 'function') {
      if (isCauldronDrop && typeof ghost.animate === 'function') {
        const fade = ghost.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          {
            duration: ITEM_DROP_FADE_MS,
            easing: 'linear',
            fill: 'forwards',
          },
        );
        fade.finished.then(
          () => this.finishFloatingGhostAnimation(ghost, onFinish),
          () => ghost.remove(),
        );
        return;
      }

      onFinish?.();
      ghost.remove();
      return;
    }

    const midLift = isCauldronDrop ? (type === 'brew' ? -22 : -18) : -8;
    const midScale = isCauldronDrop ? 0.92 : 0.96;
    const endScale = isCauldronDrop ? 0.58 : 0.72;
    const endOpacity = isCauldronDrop ? 0 : 0.35;
    const animation = ghost.animate(
      [
        {
          offset: 0,
          opacity: 1,
          transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
        },
        {
          offset: 0.58,
          opacity: 1,
          transform: this.formatItemDropTransform({
            x: deltaX * 0.58,
            y: deltaY * 0.58 + midLift,
            scale: midScale,
            rotation: isCauldronDrop ? '4deg' : '-3deg',
          }),
        },
        {
          offset: 1,
          opacity: endOpacity,
          transform: this.formatItemDropTransform({
            x: deltaX,
            y: deltaY,
            scale: endScale,
            rotation: '0deg',
          }),
        },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards',
      },
    );

    animation.finished.then(
      () => this.finishFloatingGhostAnimation(ghost, onFinish),
      () => ghost.remove(),
    );
  }

  finishFloatingGhostAnimation(ghost, onFinish = null) {
    onFinish?.();
    ghost.remove();
  }

  formatItemDropTransform({ x, y, scale, rotation }) {
    return `translate3d(${this.formatCssNumber(x)}px, ${this.formatCssNumber(
      y,
    )}px, 0) scale(${scale}) rotate(${rotation})`;
  }

  prepareFloatingGhostForAnimation(ghost, rect) {
    this.setItemDragGhostMotion(ghost, 0, 0, 0);
    ghost.classList.add('is-settling');
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.transform = 'none';
  }

  getElementRect(element) {
    const rect = element?.getBoundingClientRect?.();

    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  setTransientClassTimeout(element, className, duration) {
    if (!element || !className) {
      return;
    }

    let elementTimeouts = this.transientAnimationTimeoutsByElement.get(element);
    if (!elementTimeouts) {
      elementTimeouts = new Map();
      this.transientAnimationTimeoutsByElement.set(element, elementTimeouts);
    }

    const existingTimeout = elementTimeouts.get(className);
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout);
      this.transientAnimationTimeouts.delete(existingTimeout);
    }

    const timeout = window.setTimeout(() => {
      element?.classList?.remove(className);
      this.transientAnimationTimeouts.delete(timeout);
      elementTimeouts.delete(className);
    }, duration);

    elementTimeouts.set(className, timeout);
    this.transientAnimationTimeouts.add(timeout);
  }

  clearTransientAnimationTimeouts() {
    for (const timeout of this.transientAnimationTimeouts) {
      window.clearTimeout(timeout);
    }

    this.transientAnimationTimeouts.clear();
    this.transientAnimationTimeoutsByElement = new WeakMap();
  }

  prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  }

  renderCauldron(refs, brewing) {
    if (brewing.unlocked === false) {
      this.renderLockedCauldron(refs, brewing);
      return;
    }

    refs.root.classList.remove('is-locked', 'is-buyable');
    refs.root.classList.toggle('is-current', brewing.cauldronIndex === this.selectedCauldronIndex);
    refs.root.classList.toggle('has-active-brew', Boolean(brewing.activeBrew));
    this.setHidden(refs.recipeBox, false);
    this.setHidden(refs.potionBox, false);
    this.setHidden(refs.lockedBox, true);
    this.removeAttribute(refs.root, 'aria-disabled');
    this.renderCauldronTitle(refs.title, brewing);
    this.renderPlainCauldronTitle(refs.lockedTitle, brewing);
    this.setHidden(refs.count, false);
    this.setText(refs.count, this.formatCauldronCount(brewing));
    this.renderCauldronPreview(refs, brewing);
    const statusText = this.formatCauldronStatus(brewing);
    this.setHidden(refs.status, statusText === '');
    this.setText(refs.status, statusText);
    this.setCauldronStatusRowCount(refs, statusText === '' ? 0 : 1);
    this.setHidden(refs.bubble, false);
    this.renderCauldronBubble(refs, brewing);
    this.renderCauldronGuide(refs, brewing);
    this.renderCauldronItems(refs, brewing);

    if (brewing.activeBrew) {
      this.setHidden(refs.active, false);
      this.setText(
        refs.activeText,
        this.formatActiveBrewText(brewing.activeBrew),
      );
      setTimerProgressFill(refs.activeProgressFill, brewing.activeBrew, {
        onUpdate: ({ remainingMs, percent }) => {
          this.setText(
            refs.activeText,
            this.formatActiveBrewText(brewing.activeBrew, remainingMs),
          );
          this.setAttribute(refs.activeProgress, 'aria-valuenow', String(percent));
        },
      });
      this.setText(refs.activeProgressText, '');
      this.setAttribute(
        refs.activeProgress,
        'aria-label',
        this.formatActiveProgressAriaLabel(brewing.activeBrew),
      );
    } else {
      this.setHidden(refs.active, true);
      this.setText(refs.activeText, '');
      stopTimerProgressFill(refs.activeProgressFill, 0);
      this.setText(refs.activeProgressText, '');
      this.setAttribute(refs.activeProgress, 'aria-valuenow', '0');
    }
  }

  renderLockedCauldron(refs, brewing) {
    const isBuyable = brewing.canBuyCauldron === true;

    refs.root.classList.add('is-locked');
    refs.root.classList.toggle('is-buyable', isBuyable);
    refs.root.classList.remove('is-current');
    refs.root.classList.remove('has-active-brew');
    this.setAttribute(refs.root, 'aria-disabled', isBuyable ? 'false' : 'true');
    this.setHidden(refs.recipeBox, true);
    this.setHidden(refs.potionBox, true);
    this.setHidden(refs.lockedBox, false);
    this.setCauldronRowCount(refs);
    this.renderCauldronTitle(refs.title, brewing);
    this.renderPlainCauldronTitle(refs.lockedTitle, brewing);
    this.setHidden(refs.preview, false);
    this.setHidden(refs.previewLabel, true);
    this.setHidden(refs.previewSummary, true);
    this.renderCauldronPreviewIcon(refs, null);
    this.setText(refs.previewLabel, '');
    setResourceColor(refs.previewLabel, null);
    setItemIconLabel(refs.previewLabel, null);
    refs.previewLabel.classList.remove('is-empty', 'is-locked', 'is-unknown');
    this.renderCauldronLiquid(refs, null, null);
    this.setHidden(refs.bubble, true);
    this.setText(refs.bubble, '');
    this.setHidden(refs.count, true);
    this.setHidden(refs.status, true);
    this.setText(refs.status, '');
    this.setCauldronStatusRowCount(refs, 0);
    this.setHidden(refs.guide, true);
    this.hideExtraCauldronGuideRows(refs, 0);
    this.ensureCauldronEmptyRow(refs);
    this.setHidden(refs.items, true);
    refs.items.classList.remove('is-empty');
    this.setHidden(refs.empty, true);
    this.setText(refs.empty, '');
    this.hideExtraIngredientRows(refs, 0);
    this.setHidden(refs.active, true);
    this.setText(refs.activeText, '');
    stopTimerProgressFill(refs.activeProgressFill, 0);
    this.setText(refs.activeProgressText, '');
    this.setAttribute(refs.activeProgress, 'aria-valuenow', '0');
  }

  renderCauldronBubble(refs, brewing) {
    if (!refs?.bubble) {
      return;
    }

    this.setText(refs.bubble, this.formatCauldronBubble(brewing));
    refs.bubble.classList.toggle('is-empty', (brewing?.ingredients?.length ?? 0) === 0);
    refs.bubble.classList.toggle('is-active', Boolean(brewing?.activeBrew));
    refs.bubble.classList.toggle('is-locked', brewing?.unlocked === false);
  }

  formatCauldronBubble(brewing) {
    if (brewing?.unlocked === false) {
      if (brewing.canBuyCauldron === true) {
        return 'buy';
      }

      if (brewing.nextCauldronLockedByLevel) {
        return `level ${brewing.nextCauldronRequiresLevel ?? '?'}`;
      }

      if (brewing.nextCauldronLockedByResearch) {
        return 'research';
      }

      return 'locked';
    }

    if (brewing?.activeBrew) {
      return this.formatActiveBrewText(brewing.activeBrew);
    }

    const groups = this.groupAdjacentIngredients(brewing?.ingredients ?? []);

    if (groups.length === 0) {
      return '';
    }

    return groups
      .slice(0, 2)
      .map((ingredient) => `${ingredient.quantity} ${ingredient.label}`)
      .join(', ');
  }

  renderCauldronItems(refs, brewing) {
    this.ensureCauldronEmptyRow(refs);

    if (brewing.activeBrew) {
      this.setCauldronRowCount(refs);
      this.setHidden(refs.items, true);
      refs.items.classList.remove('is-empty');
      this.setHidden(refs.empty, true);
      this.setText(refs.empty, '');
      this.hideExtraIngredientRows(refs, 0);
      return;
    }

    const showGuideContents = Boolean(brewing.selectedRecipe && !brewing.activeBrew);

    if (showGuideContents) {
      this.setHidden(refs.items, true);
      refs.items.classList.remove('is-empty');
      this.setHidden(refs.empty, true);
      this.setText(refs.empty, '');
      this.hideExtraIngredientRows(refs, 0);
      return;
    }

    const hasIngredients = brewing.ingredients.length > 0;

    this.setHidden(refs.items, false);
    const showEmpty = !hasIngredients && !brewing.activeBrew;
    refs.items.classList.toggle('is-empty', showEmpty);
    this.setHidden(refs.empty, !showEmpty);
    this.setText(refs.empty, showEmpty ? 'empty' : '');

    const ingredientGroups = this.groupAdjacentIngredients(brewing.ingredients);
    this.setCauldronRowCount(refs, ingredientGroups.length);

    for (const [index, ingredient] of ingredientGroups.entries()) {
      const rowRefs = this.ensureIngredientRow(refs, index);
      this.setHidden(rowRefs.row, false);
      this.setAttribute(rowRefs.row, 'data-slot-index', String(ingredient.slotIndex));
      this.setRemoveIngredientTutorialId(rowRefs.row, ingredient);
      this.setAttribute(rowRefs.row, 'aria-label', `remove one ${ingredient.label} from cauldron`);
      setResourceColor(rowRefs.row, null);
      setResourceColor(rowRefs.count, 'herb');
      setResourceColor(rowRefs.label, 'herb');
      this.setText(rowRefs.count, `${ingredient.quantity} `);
      this.setText(rowRefs.label, ingredient.label);
      setItemIconLabel(rowRefs.label, 'herb', ingredient.key);
      this.setText(rowRefs.action, '');
    }

    this.hideExtraIngredientRows(refs, ingredientGroups.length);
  }

  renderCauldronPreview(refs, brewing) {
    const preview = this.getPotionPreview(brewing);
    const showLabel = Boolean(preview.label);

    this.setHidden(refs.preview, false);
    this.renderCauldronLiquid(refs, brewing, preview);
    this.setHidden(refs.previewSummary, !showLabel);
    this.setHidden(refs.previewLabel, !showLabel);
    this.setText(refs.previewLabel, showLabel ? preview.label : '');
    setResourceColor(refs.previewLabel, null);
    setItemIconLabel(refs.previewLabel, null);
    refs.previewLabel.classList.toggle('is-empty', showLabel && preview.empty);
    refs.previewLabel.classList.toggle('is-locked', showLabel && preview.locked);
    refs.previewLabel.classList.toggle('is-unknown', showLabel && preview.unknown);
    this.renderCauldronPreviewIcon(
      refs,
      showLabel && preview.resource === 'potion'
        ? getPotionIconFrameName(preview.iconKey)
        : null,
    );
  }

  renderCauldronPreviewIcon(refs, frameName) {
    const icon = refs?.previewIcon;
    const showIcon = Boolean(frameName);

    this.setPreviewIconHidden(icon, !showIcon);

    if (!showIcon) {
      icon?.removeAttribute?.('data-asset-atlas-frame');
      return;
    }

    if (icon?.dataset?.assetAtlasFrame === frameName) {
      return;
    }

    const nextIcon =
      createAssetAtlasSprite('brewing-page__cauldron-preview-icon', frameName) ??
      document.createElement('span');
    nextIcon.classList.add('brewing-page__cauldron-preview-icon');
    nextIcon.setAttribute('aria-hidden', 'true');
    this.setPreviewIconHidden(nextIcon, false);
    icon?.replaceWith(nextIcon);
    refs.previewIcon = nextIcon;
  }

  setPreviewIconHidden(element, hidden) {
    if (!element) {
      return;
    }

    element.hidden = hidden;
    element.toggleAttribute('hidden', hidden);
  }

  renderCauldronLiquid(refs, brewing, preview) {
    const showLiquid = Boolean(brewing?.activeBrew);
    const liquidKey = showLiquid ? (preview?.iconKey ?? 'generic') : null;
    const liquidColor = showLiquid ? getPotionLiquidColor(liquidKey) : null;

    refs.root.classList.toggle('has-cauldron-liquid', showLiquid);
    this.setHidden(refs.cauldronLiquid, !showLiquid);

    if (!showLiquid) {
      refs.cauldronLiquid.style.removeProperty('--brewing-page-cauldron-liquid-color');
      delete refs.cauldronLiquid.dataset.potionLiquidKey;
      return;
    }

    refs.cauldronLiquid.style.setProperty(
      '--brewing-page-cauldron-liquid-color',
      liquidColor,
    );
    refs.cauldronLiquid.dataset.potionLiquidKey = liquidKey;
  }

  getPotionPreview(brewing) {
    if (!brewing) {
      return {
        label: '',
        iconKey: null,
        resource: null,
        empty: true,
        locked: false,
        unknown: false,
      };
    }

    if (brewing.unlocked === false) {
      return {
        label: 'locked',
        iconKey: null,
        resource: null,
        empty: true,
        locked: true,
        unknown: false,
      };
    }

    if (brewing.activeBrew) {
      return {
        label: brewing.activeBrew.label ?? 'potion',
        iconKey: this.getPotionPreviewIconKey(
          brewing.activeBrew.key,
          brewing.activeBrew.label,
        ),
        resource: 'potion',
        empty: false,
        locked: false,
        unknown: false,
      };
    }

    if (brewing.selectedRecipe) {
      return {
        label: brewing.selectedRecipe.label,
        iconKey: this.getPotionPreviewIconKey(
          brewing.selectedRecipe.key,
          brewing.selectedRecipe.label,
        ),
        resource: 'potion',
        empty: false,
        locked: false,
        unknown: false,
      };
    }

    if ((brewing.ingredients?.length ?? 0) === 0) {
      return {
        label: '',
        iconKey: null,
        resource: null,
        empty: true,
        locked: false,
        unknown: false,
      };
    }

    if (brewing.match?.discoverable) {
      return {
        label: 'unknown potion',
        iconKey: 'unknownPotion',
        resource: 'potion',
        empty: false,
        locked: false,
        unknown: true,
      };
    }

    if (brewing.match?.unlocked) {
      return {
        label: brewing.match.label,
        iconKey: brewing.match.key ?? null,
        resource: 'potion',
        empty: false,
        locked: false,
        unknown: false,
      };
    }

    if (brewing.match) {
      return {
        label: `${brewing.match.label} locked`,
        iconKey: brewing.match.key ?? null,
        resource: 'potion',
        empty: false,
        locked: true,
        unknown: false,
      };
    }

    return {
      label: 'wasted potion',
      iconKey: 'wastedPotion',
      resource: 'potion',
      empty: false,
      locked: false,
      unknown: false,
    };
  }

  getPotionPreviewIconKey(key, label) {
    const normalizedKey = String(key ?? '').trim();

    if (normalizedKey) {
      return normalizedKey;
    }

    const normalizedLabel = String(label ?? '').trim().toLowerCase();

    if (normalizedLabel === 'unknown potion') {
      return 'unknownPotion';
    }

    if (normalizedLabel === 'wasted potion') {
      return 'wastedPotion';
    }

    return null;
  }

  hideExtraIngredientRows(cauldronRefs, visibleCount) {
    for (let index = visibleCount; index < cauldronRefs.ingredientRows.length; index += 1) {
      const rowRefs = cauldronRefs.ingredientRows[index];
      this.setHidden(rowRefs.row, true);
      this.removeAttribute(rowRefs.row, 'aria-label');
      this.removeAttribute(rowRefs.row, 'data-slot-index');
      this.removeAttribute(rowRefs.row, 'data-tutorial-id');
      setResourceColor(rowRefs.row, null);
      setResourceColor(rowRefs.count, null);
      setResourceColor(rowRefs.label, null);
      this.setText(rowRefs.count, '');
      this.setText(rowRefs.label, '');
      this.setText(rowRefs.action, '');
    }
  }

  renderCauldronGuide(refs, brewing) {
    const recipe = brewing.selectedRecipe;
    const showGuide = Boolean(recipe && !brewing.activeBrew);
    this.setHidden(refs.guide, !showGuide);

    if (!showGuide) {
      this.hideExtraCauldronGuideRows(refs, 0);
      return;
    }

    const brewQuantity = this.getBrewQuantity(brewing);
    const ingredientGroups = this.createIngredientGroups(recipe.ingredients).map(
      (ingredient) => ({
        ...ingredient,
        brewQuantity,
      }),
    );
    const ownedQuantities = this.getOwnedIngredientQuantities(brewing);
    let renderedRows = 0;

    for (const ingredient of ingredientGroups) {
      const rowRefs = this.ensureCauldronGuideRow(refs, renderedRows);
      const requiredQuantity = this.getIngredientRequiredQuantity(ingredient);
      this.renderCauldronGuideRow(rowRefs, {
        ingredient,
        requiredQuantity,
        ownedQuantity: ownedQuantities.get(ingredient.itemTypeId) ?? 0,
      });
      renderedRows += 1;
    }

    this.hideExtraCauldronGuideRows(refs, renderedRows);
    this.setCauldronRowCount(refs, renderedRows);
  }

  setCauldronRowCount(refs, rowCount = CAULDRON_BASE_ROW_COUNT) {
    const statusRowCount = Math.max(
      0,
      Math.floor(
        Number(refs?.root?.style.getPropertyValue('--brewing-page-cauldron-status-row-count')),
      ) || 0,
    );
    const safeListRowCount = Math.max(0, Math.floor(Number(rowCount)) || 0);
    const safeRowCount = Math.max(
      CAULDRON_BASE_ROW_COUNT,
      statusRowCount + safeListRowCount,
    );
    const visibleListRowCount = Math.max(1, safeRowCount - statusRowCount);

    refs?.root?.style.setProperty('--brewing-page-cauldron-row-count', String(safeRowCount));
    refs?.root?.style.setProperty(
      '--brewing-page-cauldron-list-row-count',
      String(visibleListRowCount),
    );
  }

  setCauldronStatusRowCount(refs, rowCount = 0) {
    const safeRowCount = Math.max(0, Math.floor(Number(rowCount)) || 0);
    refs?.root?.style.setProperty(
      '--brewing-page-cauldron-status-row-count',
      String(safeRowCount),
    );
  }

  hideExtraCauldronGuideRows(cauldronRefs, visibleCount) {
    for (let index = visibleCount; index < cauldronRefs.cauldronGuideRows.length; index += 1) {
      const rowRefs = cauldronRefs.cauldronGuideRows[index];
      this.setHidden(rowRefs.row, true);
      this.setDisabled(rowRefs.row, true);
      this.removeAttribute(rowRefs.row, 'data-slot-index');
      this.removeAttribute(rowRefs.row, 'aria-label');
      this.removeAttribute(rowRefs.row, 'data-tutorial-id');
      this.setAttribute(rowRefs.row, 'aria-disabled', 'true');
      rowRefs.row.classList.remove('is-fulfilled');
      this.setText(rowRefs.count, '');
      this.setText(rowRefs.label, '');
      this.setText(rowRefs.value, '');
      setResourceColor(rowRefs.label, null);
    }
  }

  ensureCauldronGuideRow(cauldronRefs, index) {
    if (cauldronRefs.cauldronGuideRows[index]) {
      return cauldronRefs.cauldronGuideRows[index];
    }

    const row = document.createElement('button');
    row.className = 'brewing-page__cauldron-guide-step';
    row.type = 'button';
    row.addEventListener('click', (event) => {
      const slotIndex = Number(event.currentTarget.dataset.slotIndex);
      const cauldronIndex = Number(event.currentTarget.dataset.cauldronIndex);

      if (Number.isInteger(slotIndex)) {
        this.onRemoveIngredient(slotIndex, cauldronIndex, event.currentTarget);
      }
    });

    const count = document.createElement('span');
    count.className = 'brewing-page__ingredient-count';

    const label = document.createElement('span');
    label.className = 'brewing-page__ingredient-label row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(count, label, value);
    this.setAttribute(row, 'data-cauldron-index', String(cauldronRefs.cauldronIndex));
    cauldronRefs.guideSequence.append(row);

    const rowRefs = { row, count, label, value };
    cauldronRefs.cauldronGuideRows[index] = rowRefs;
    return rowRefs;
  }

  renderCauldronGuideRow(refs, {
    ingredient,
    requiredQuantity,
    ownedQuantity,
  }) {
    const safeRequiredQuantity = Math.max(1, Math.floor(Number(requiredQuantity)) || 1);
    const safeOwnedQuantity = Math.max(0, Math.floor(Number(ownedQuantity)) || 0);
    const fulfilled = safeOwnedQuantity >= safeRequiredQuantity;
    const removeSlotIndex = this.getLastIngredientSlotIndex(
      ingredient.itemTypeId,
      refs.row.dataset.cauldronIndex,
    );

    this.setHidden(refs.row, false);
    this.setText(refs.count, '');
    this.setText(refs.label, ingredient.label);
    setItemIconLabel(refs.label, 'herb', ingredient.key);
    setResourceColor(refs.label, null);
    this.setText(refs.value, `${safeOwnedQuantity}/${safeRequiredQuantity}`);
    refs.row.classList.toggle('is-fulfilled', fulfilled);

    if (Number.isInteger(removeSlotIndex)) {
      this.setDisabled(refs.row, false);
      this.setAttribute(refs.row, 'data-slot-index', String(removeSlotIndex));
      this.setAttribute(refs.row, 'aria-disabled', 'false');
      this.setAttribute(refs.row, 'aria-label', `remove one ${ingredient.label} from cauldron`);
      this.setOptionalAttribute(
        refs.row,
        'data-tutorial-id',
        this.getRemoveIngredientTutorialId(ingredient),
      );
      return;
    }

    this.setDisabled(refs.row, true);
    this.removeAttribute(refs.row, 'data-slot-index');
    this.setAttribute(refs.row, 'aria-disabled', 'true');
    this.removeAttribute(refs.row, 'aria-label');
    this.removeAttribute(refs.row, 'data-tutorial-id');
  }

  getOwnedIngredientQuantities(brewing = {}) {
    const quantities = new Map();

    for (const herb of brewing.herbs ?? []) {
      if (!Number.isInteger(herb?.itemTypeId)) {
        continue;
      }

      const quantity = Number.isFinite(herb.quantity) ? Math.floor(herb.quantity) : 0;
      quantities.set(herb.itemTypeId, Math.max(0, quantity));
    }

    return quantities;
  }

  getSelectedRecipe(recipes, cauldronIndex = this.selectedCauldronIndex) {
    const selectedRecipeKey = this.getSelectedRecipeKey?.(cauldronIndex);

    if (!selectedRecipeKey) {
      return null;
    }

    return recipes.find((recipe) => recipe.key === selectedRecipeKey && recipe.unlocked) ?? null;
  }

  createIngredientGroups(ingredients = []) {
    let startIndex = 0;

    return ingredients.map((ingredient) => {
      const quantity = this.normalizeIngredientQuantity(ingredient);
      const group = {
        ...ingredient,
        quantity,
        startIndex,
        endIndex: startIndex + quantity,
      };
      startIndex = group.endIndex;
      return group;
    });
  }

  normalizeIngredientQuantity(ingredient) {
    const quantity = Number.isFinite(ingredient?.quantity) ? Math.floor(ingredient.quantity) : 1;
    return Math.max(1, quantity);
  }

  getIngredientRequiredQuantity(ingredient) {
    const quantity = this.normalizeIngredientQuantity(ingredient);
    const brewQuantity = this.getIngredientBrewQuantity(ingredient);
    return quantity * brewQuantity;
  }

  getIngredientBrewQuantity(ingredient) {
    const brewQuantity = Math.floor(Number(ingredient?.brewQuantity));
    return Number.isInteger(brewQuantity) && brewQuantity > 1 ? brewQuantity : 1;
  }

  getRemainingIngredientQuantities(
    recipe,
    brewing,
    brewQuantity = this.getBrewQuantity(brewing),
  ) {
    const remainingQuantities = new Map();

    for (const ingredient of recipe.ingredients ?? []) {
      const quantity = this.normalizeIngredientQuantity(ingredient) * brewQuantity;
      remainingQuantities.set(
        ingredient.itemTypeId,
        (remainingQuantities.get(ingredient.itemTypeId) ?? 0) + quantity,
      );
    }

    for (const ingredient of brewing.ingredients ?? []) {
      if (!remainingQuantities.has(ingredient.itemTypeId)) {
        continue;
      }

      remainingQuantities.set(
        ingredient.itemTypeId,
        Math.max(0, (remainingQuantities.get(ingredient.itemTypeId) ?? 0) - 1),
      );
    }

    return remainingQuantities;
  }

  getLastIngredientSlotIndex(itemTypeId, cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const snapshot = this.gameplayFacade?.getSnapshot?.();
    const cauldron =
      (snapshot?.brewing?.cauldrons ?? []).find(
        (candidate) => candidate.cauldronIndex === safeCauldronIndex,
      ) ?? (safeCauldronIndex === 0 ? snapshot?.brewing : null);
    const ingredients = cauldron?.ingredients ?? [];

    for (let index = ingredients.length - 1; index >= 0; index -= 1) {
      if (ingredients[index]?.itemTypeId === itemTypeId) {
        return index;
      }
    }

    return null;
  }

  getMissingIngredientQuantities(recipe, brewing, brewQuantity = this.getBrewQuantity(brewing)) {
    const requiredQuantities = new Map();

    for (const ingredient of recipe.ingredients ?? []) {
      const quantity = this.normalizeIngredientQuantity(ingredient);
      requiredQuantities.set(
        ingredient.itemTypeId,
        (requiredQuantities.get(ingredient.itemTypeId) ?? 0) + quantity * brewQuantity,
      );
    }

    const placedQuantities = new Map();

    for (const ingredient of brewing.ingredients ?? []) {
      placedQuantities.set(
        ingredient.itemTypeId,
        (placedQuantities.get(ingredient.itemTypeId) ?? 0) + 1,
      );
    }

    const ownedQuantities = new Map(
      (brewing.herbs ?? []).map((herb) => {
        const placedQuantity = placedQuantities.get(herb.itemTypeId) ?? 0;
        const availableQuantity = Number.isFinite(herb.availableQuantity)
          ? herb.availableQuantity
          : herb.quantity ?? 0;
        return [herb.itemTypeId, availableQuantity + placedQuantity];
      }),
    );
    const missingQuantities = new Map();

    for (const [itemTypeId, requiredQuantity] of requiredQuantities) {
      const ownedQuantity = ownedQuantities.get(itemTypeId) ?? 0;
      const missingQuantity = requiredQuantity - ownedQuantity;

      if (missingQuantity > 0) {
        missingQuantities.set(itemTypeId, missingQuantity);
      }
    }

    return missingQuantities;
  }

  groupAdjacentIngredients(ingredients) {
    const groups = [];

    for (const [index, ingredient] of ingredients.entries()) {
      const group = groups.at(-1);

      if (group?.itemTypeId === ingredient.itemTypeId) {
        group.quantity += 1;
        continue;
      }

      groups.push({
        slotIndex: index,
        itemTypeId: ingredient.itemTypeId,
        key: ingredient.key,
        label: ingredient.label,
        kind: ingredient.kind,
        quantity: 1,
      });
    }

    return groups;
  }

  ensureCauldronEmptyRow(cauldronRefs) {
    if (cauldronRefs.empty) {
      return cauldronRefs.empty;
    }

    const empty = document.createElement('div');
    empty.className = 'brewing-page__cauldron-empty';
    empty.textContent = 'empty';
    cauldronRefs.items.append(empty);
    cauldronRefs.empty = empty;
    return empty;
  }

  ensureIngredientRow(cauldronRefs, index) {
    if (cauldronRefs.ingredientRows[index]) {
      return cauldronRefs.ingredientRows[index];
    }

    const row = document.createElement('button');
    row.className = 'brewing-page__ingredient-row';
    row.type = 'button';
    row.addEventListener('click', (event) => {
      const slotIndex = Number(event.currentTarget.dataset.slotIndex);
      const cauldronIndex = Number(event.currentTarget.dataset.cauldronIndex);

      if (Number.isInteger(slotIndex)) {
        this.onRemoveIngredient(slotIndex, cauldronIndex, event.currentTarget);
      }
    });

    const count = document.createElement('span');
    count.className = 'brewing-page__ingredient-count';

    const label = document.createElement('span');
    label.className = 'brewing-page__ingredient-label row_key';

    const action = document.createElement('span');
    action.className = 'row_val';

    row.append(count, label, action);
    this.setAttribute(row, 'data-cauldron-index', String(cauldronRefs.cauldronIndex));
    cauldronRefs.items.append(row);

    const refs = { row, count, label, action };
    cauldronRefs.ingredientRows[index] = refs;
    return refs;
  }

  renderActions(refs, brewing) {
    const action = this.getPrimaryAction(brewing);

    if (!action) {
      const messageText = this.getActionMessageText(refs);
      this.setHidden(refs.actions.root, messageText === '');
      this.setText(refs.actions.actionButtonLabel, '');
      this.setHidden(refs.actions.actionButtonCost, true);
      this.setResourceText(refs.actions.actionButtonCost, '');
      this.setDisabled(refs.actions.actionButton, true);
      this.removeAttribute(refs.actions.actionButton, 'data-action');
      this.removeAttribute(refs.actions.actionButton, 'data-tutorial-id');
      this.removeAttribute(refs.actions.actionButton, 'aria-disabled');
      this.removeAttribute(refs.actions.actionButton, 'aria-label');
      setNotificationBadge(refs.actions.actionButton, false);
      this.renderBrewQuantityOptions(refs, brewing, null);
      this.renderAutoBrewButton(refs, brewing, null);
      this.renderActionMessage(refs);
      this.renderSelectRecipeButton(refs, brewing);
      return;
    }

    this.setHidden(refs.actions.root, false);
    this.setText(
      refs.actions.actionButtonLabel,
      action.hasCost ? `${action.label} ` : action.label,
    );
    this.setHidden(refs.actions.actionButtonCost, !action.hasCost);
    setResourceColor(refs.actions.actionButtonCost, action.costResource ?? 'mana');
    this.setResourceText(
      refs.actions.actionButtonCost,
      action.hasCost ? action.costText ?? `${brewing.manaCost} mana` : '',
    );
    this.setDisabled(refs.actions.actionButton, action.disabled);
    this.setAttribute(refs.actions.actionButton, 'data-action', action.id);
    this.setAttribute(refs.actions.actionButton, 'data-tutorial-id', 'brewing:action');
    this.setAttribute(
      refs.actions.actionButton,
      'aria-disabled',
      action.disabled ? 'true' : 'false',
    );
    this.setAttribute(
      refs.actions.actionButton,
      'aria-label',
      action.ariaLabel,
    );
    setNotificationBadge(refs.actions.actionButton, !action.disabled);
    this.renderBrewQuantityOptions(refs, brewing, action);
    this.renderAutoBrewButton(refs, brewing, action);
    this.renderActionMessage(refs);
    this.renderSelectRecipeButton(refs, brewing);
  }

  renderBrewQuantityOptions(refs, brewing, action) {
    const root = refs?.actions?.quantityOptions;

    if (!root) {
      return;
    }

    const maxBrewQuantity = this.getMaxBrewQuantity(brewing);
    const visible = action?.id === 'brew' && maxBrewQuantity > 1;
    this.setHidden(root, !visible);

    if (!visible) {
      root.replaceChildren();
      return;
    }

    const brewQuantity = this.getBrewQuantity(brewing);
    const button =
      root.querySelector('.brewing-page__quantity-button') ??
      this.createBrewQuantityButton(refs.cauldronIndex);
    const nextQuantity = brewQuantity >= maxBrewQuantity ? 1 : brewQuantity + 1;

    button.dataset.brewQuantity = String(brewQuantity);
    button.dataset.nextBrewQuantity = String(nextQuantity);
    button.dataset.maxBrewQuantity = String(maxBrewQuantity);
    button.dataset.cauldronIndex = String(this.normalizeCauldronIndex(refs.cauldronIndex));
    button.textContent = `x${brewQuantity}`;
    button.setAttribute('aria-label', `brewing x${brewQuantity}; press for x${nextQuantity}`);

    if (button.parentElement !== root || root.children.length !== 1) {
      root.replaceChildren(button);
    }
  }

  createBrewQuantityButton(cauldronIndex = 0) {
    const button = document.createElement('button');
    button.className = 'style-button brewing-page__quantity-button';
    button.type = 'button';
    button.dataset.cauldronIndex = String(this.normalizeCauldronIndex(cauldronIndex));
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const safeCauldronIndex = this.normalizeCauldronIndex(
        event.currentTarget.dataset.cauldronIndex,
      );
      const selectedQuantity = Math.max(
        1,
        Math.floor(Number(event.currentTarget.dataset.nextBrewQuantity)) || 1,
      );
      this.selectCauldron(safeCauldronIndex);
      this.onSelectBrewQuantity?.(selectedQuantity, safeCauldronIndex);
      this.render(this.gameplayFacade?.getSnapshot?.());
    });
    return button;
  }

  renderAutoBrewButton(refs, brewing, action) {
    const button = refs?.actions?.autoButton;

    if (!button) {
      return;
    }

    const visible = action?.id === 'brew' && brewing.autoBrewAvailable === true;
    this.setHidden(button, !visible);

    if (!visible) {
      this.setDisabled(button, true);
      this.removeAttribute(button, 'aria-pressed');
      this.removeAttribute(button, 'aria-label');
      this.removeAttribute(button, 'data-auto-brew-enabled');
      return;
    }

    const enabled = brewing.autoBrewEnabled === true;
    const label = enabled ? 'auto' : 'manual';
    const nextLabel = enabled ? 'manual' : 'auto';

    button.dataset.cauldronIndex = String(this.normalizeCauldronIndex(refs.cauldronIndex));
    button.dataset.autoBrewEnabled = enabled ? 'true' : 'false';
    this.setText(button, label);
    this.setDisabled(button, false);
    this.setAttribute(button, 'aria-pressed', enabled ? 'true' : 'false');
    this.setAttribute(button, 'aria-label', `${label} brewing; press for ${nextLabel}`);
  }

  onAutoBrewModeButtonClick(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    this.selectCauldron(safeCauldronIndex);

    const result = this.onToggleAutoBrew?.(safeCauldronIndex) ?? {
      ok: false,
      reason: 'auto_brew_recipe_required',
    };

    if (result.ok) {
      this.message = null;
    } else {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
    }

    this.render(this.gameplayFacade?.getSnapshot?.());
    this.flashMessage(safeCauldronIndex);
  }

  renderActionMessage(refs) {
    const messageText = this.getActionMessageText(refs);

    this.setHidden(refs.actions.message, messageText === '');
    this.setText(refs.actions.message, messageText);
  }

  getActionMessageText(refs) {
    if (this.message?.cauldronIndex !== refs.cauldronIndex) {
      return '';
    }

    return this.message.text ?? '';
  }

  renderSelectRecipeButton(refs, brewing) {
    const selectRecipeButton = refs?.selectRecipeButton;

    if (!selectRecipeButton) {
      return;
    }

    const visible = brewing.canSelectRecipe === true;
    this.setHidden(selectRecipeButton, !visible);
    refs.actions.root.classList.toggle('is-centered', !visible);

    if (!visible) {
      this.setDisabled(selectRecipeButton, true);
      this.setAttribute(selectRecipeButton, 'aria-hidden', 'true');
      this.removeAttribute(selectRecipeButton, 'aria-label');
      this.removeAttribute(selectRecipeButton, 'data-state');
      this.removeAttribute(selectRecipeButton, 'aria-pressed');
      return;
    }

    const label = 'recipes';
    this.setText(selectRecipeButton, label);
    this.setDisabled(selectRecipeButton, false);
    this.removeAttribute(selectRecipeButton, 'aria-hidden');
    this.setAttribute(
      selectRecipeButton,
      'aria-label',
      `open recipes for cauldron ${brewing.cauldronNumber ?? brewing.cauldronIndex + 1}`,
    );
    this.removeAttribute(selectRecipeButton, 'data-state');
    this.removeAttribute(selectRecipeButton, 'aria-pressed');
  }

  isAutoBrewAvailable(snapshot, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const cauldron =
      (snapshot?.brewing?.cauldrons ?? []).find(
        (candidate) => candidate.cauldronIndex === safeCauldronIndex,
      ) ?? (safeCauldronIndex === 0 ? snapshot?.brewing : null);

    if (cauldron?.autoBrewEnabled === true) {
      return true;
    }

    const completedResearchIds = getCompletedResearchIds(snapshot);

    if (completedResearchIds === null) {
      return false;
    }

    return completedResearchIds.has(
      automationResearchIds.autoBrewCauldron(safeCauldronIndex + 1),
    );
  }

  getPrimaryAction(brewing) {
    if (brewing.unlocked === false) {
      const levelLocked = brewing.nextCauldronLockedByLevel === true;
      const researchLocked = brewing.nextCauldronLockedByResearch === true;
      const cost = brewing.nextCauldronCost;

      return {
        id: 'buy',
        label: levelLocked
          ? `level ${brewing.nextCauldronRequiresLevel ?? '?'}`
          : researchLocked
            ? 'research'
            : 'buy',
        hasCost: !levelLocked && !researchLocked && Number.isFinite(cost),
        costText: Number.isFinite(cost) ? formatCoinPriceText(cost) : '',
        costResource: 'coin',
        disabled: brewing.canBuyCauldron !== true,
        ariaLabel: levelLocked
          ? `cauldron ${brewing.cauldronNumber} requires level ${
              brewing.nextCauldronRequiresLevel ?? '?'
            }`
          : researchLocked
            ? `cauldron ${brewing.cauldronNumber} requires research`
          : `buy cauldron ${brewing.cauldronNumber}`,
      };
    }

    if (brewing.activeBrew) {
      if (
        brewing.activeBrew.canStartBottling ||
        brewing.activeBrew.phase === 'brewed' ||
        brewing.activeBrew.phase === 'bottling'
      ) {
        const canStartBottling = Boolean(brewing.activeBrew.canStartBottling);
        return {
          id: 'bottle',
          label: 'bottle',
          hasCost: false,
          disabled: !canStartBottling,
          ariaLabel: canStartBottling
            ? `start bottling ${brewing.activeBrew.label}`
            : 'start bottling',
        };
      }
    }

    if (
      !brewing.activeBrew &&
      (brewing.ingredients?.length ?? 0) === 0 &&
      !brewing.selectedRecipe
    ) {
      return null;
    }

    if (!brewing.activeBrew && brewing.ingredients.length === 0 && brewing.selectedRecipe) {
      const canFillRecipe = this.canFillSelectedRecipe(brewing);
      return {
        id: 'fill',
        label: 'fill recipe',
        hasCost: false,
        disabled: !canFillRecipe,
        ariaLabel: this.formatFillRecipeAriaLabel(brewing, canFillRecipe),
      };
    }

    const recipeLocked = Boolean(
      brewing.match && !brewing.match.unlocked && !brewing.match.discoverable,
    );
    const canBrew = brewing.canBrew && !recipeLocked;
    return {
      id: 'brew',
      label: 'brew',
      hasCost: !brewing.activeBrew && Number.isFinite(brewing.manaCost),
      disabled: !canBrew,
      ariaLabel: this.formatBrewAriaLabel(brewing),
    };
  }

  canFillSelectedRecipe(brewing) {
    if (
      brewing?.activeBrew ||
      !brewing?.selectedRecipe ||
      (brewing.ingredients?.length ?? 0) > 0
    ) {
      return false;
    }

    return this.getMissingIngredientQuantities(brewing.selectedRecipe, brewing).size === 0;
  }

  onHerbButtonClick(event, itemTypeId) {
    if (this.suppressNextClick) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressNextClick = false;
      return;
    }

    this.onAddIngredient(itemTypeId);
  }

  onAddIngredient(itemTypeId, cauldronIndex = this.selectedCauldronIndex) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const brewing = {
      ...snapshot?.brewing,
      cauldrons: this.getCauldrons(snapshot?.brewing ?? {}, snapshot),
    };
    for (const cauldron of brewing.cauldrons) {
      cauldron.selectedRecipe =
        cauldron.unlocked === false
          ? null
          : this.getSelectedRecipe(brewing.recipes ?? [], cauldron.cauldronIndex);
    }
    const requestedCauldron = brewing.cauldrons.find(
      (cauldron) => cauldron.cauldronIndex === cauldronIndex,
    );
    const selectedCauldron = brewing.cauldrons.find(
      (cauldron) => cauldron.cauldronIndex === this.selectedCauldronIndex,
    );
    const targetCauldron =
      requestedCauldron?.canAddIngredient && !requestedCauldron.activeBrew
        ? requestedCauldron
        : this.getAddTargetCauldron(brewing.cauldrons, itemTypeId);
    const targetCauldronIndex = targetCauldron?.cauldronIndex ?? cauldronIndex;

    if (!targetCauldron) {
      const messageCauldron = targetCauldron ?? requestedCauldron ?? selectedCauldron;
      const messageCauldronIndex =
        messageCauldron?.cauldronIndex ?? this.normalizeCauldronIndex(cauldronIndex);
      this.message = {
        cauldronIndex: messageCauldronIndex,
        text: this.formatIngredientBlockedMessage(messageCauldron, itemTypeId),
      };
      this.render(this.gameplayFacade.getSnapshot());
      this.flashMessage(messageCauldronIndex);
      return { ok: false, cauldronIndex: messageCauldronIndex };
    }

    if (targetCauldron.selectedRecipe) {
      this.onClearSelectedRecipe?.(targetCauldronIndex);
    }

    const result = this.gameplayFacade.addBrewingIngredient(
      itemTypeId,
      targetCauldronIndex,
    );

    if (!result.ok) {
      this.message = {
        cauldronIndex: targetCauldronIndex,
        text: this.formatResultMessage(result),
      };
      this.render(this.gameplayFacade.getSnapshot());
      this.flashMessage(targetCauldronIndex);
      return { ok: false, cauldronIndex: targetCauldronIndex };
    }

    this.selectCauldron(targetCauldronIndex);
    this.message = null;
    this.render(this.gameplayFacade.getSnapshot());
    return { ok: true, cauldronIndex: targetCauldronIndex, itemTypeId };
  }

  onRemoveIngredient(
    slotIndex,
    cauldronIndex = this.selectedCauldronIndex,
    sourceElement = null,
  ) {
    const targetCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const ingredient = this.getIngredientAtSlot(slotIndex, targetCauldronIndex);
    const sourceRect = this.getElementRect(sourceElement);
    const result = this.gameplayFacade.removeBrewingIngredientAt(
      slotIndex,
      targetCauldronIndex,
    );

    if (!result.ok) {
      this.message = {
        cauldronIndex: targetCauldronIndex,
        text: this.formatResultMessage(result),
      };
      this.render(this.gameplayFacade.getSnapshot());
      this.flashMessage(targetCauldronIndex);
    } else {
      this.message = null;
      this.render(this.gameplayFacade.getSnapshot());
      this.animateIngredientReturnToHerbs(ingredient, sourceRect);
    }
  }

  getIngredientAtSlot(slotIndex, cauldronIndex = this.selectedCauldronIndex) {
    const safeSlotIndex = Math.floor(Number(slotIndex));
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const snapshot = this.gameplayFacade?.getSnapshot?.();
    const cauldron =
      (snapshot?.brewing?.cauldrons ?? []).find(
        (candidate) => candidate.cauldronIndex === safeCauldronIndex,
      ) ?? (safeCauldronIndex === 0 ? snapshot?.brewing : null);

    if (!Number.isInteger(safeSlotIndex)) {
      return null;
    }

    return (
      (cauldron?.ingredients ?? []).find(
        (ingredient, index) => (ingredient.slotIndex ?? index) === safeSlotIndex,
      ) ?? null
    );
  }

  animateIngredientReturnToHerbs(ingredient, sourceRect) {
    if (!ingredient || !sourceRect || this.prefersReducedMotion()) {
      return;
    }

    const target = this.getHerbReturnTarget(ingredient.itemTypeId);

    if (!target) {
      return;
    }

    const ghost = this.createFloatingItemGhost(ingredient, {
      className: 'brewing-page__herb-return-ghost',
      fallbackLabel: ingredient.label ?? 'herb',
    });

    document.body.append(ghost);
    this.prepareFloatingGhostForAnimation(ghost, sourceRect);
    this.animateItemDragGhostToElement(ghost, target, {
      type: 'return',
      duration: ITEM_DROP_RETURN_MS,
    });
    target
      .closest?.('.brewing-page__herb-row')
      ?.classList.add('is-returning');
    this.setTransientClassTimeout(
      target.closest?.('.brewing-page__herb-row') ?? target,
      'is-returning',
      ITEM_DROP_RETURN_MS,
    );
  }

  getBrewIngredientFlyoutSources(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const refs = this.cauldronRefs.get(safeCauldronIndex);
    const brewing = this.getRenderedCauldronSnapshot(safeCauldronIndex);

    if (!refs || !brewing || brewing.activeBrew) {
      return [];
    }

    if (brewing.selectedRecipe) {
      return this.getBrewFlyoutSourcesFromRows(
        refs.cauldronGuideRows,
        this.createIngredientGroups(brewing.selectedRecipe.ingredients),
      );
    }

    return this.getBrewFlyoutSourcesFromRows(
      refs.ingredientRows,
      this.groupAdjacentIngredients(brewing.ingredients ?? []),
    );
  }

  getBrewFlyoutSourcesFromRows(rowRefs = [], ingredients = []) {
    const sources = [];

    for (const [index, refs] of rowRefs.entries()) {
      const row = refs?.row;
      const ingredient = ingredients[index];

      if (!row || row.hidden || !ingredient) {
        continue;
      }

      const rect = this.getElementRect(row);

      if (!rect) {
        continue;
      }

      sources.push({
        rect,
        itemKind: ingredient.kind ?? 'herb',
        itemKey: ingredient.key ?? '',
        itemLabel: ingredient.label ?? 'herb',
      });
    }

    return sources;
  }

  animateBrewIngredientsIntoCauldron(
    cauldronIndex = this.selectedCauldronIndex,
    sources = [],
  ) {
    if (sources.length <= 0 || this.prefersReducedMotion()) {
      return;
    }

    const target = this.getCauldronDropTarget(cauldronIndex);

    if (!target) {
      return;
    }

    sources.forEach((source, index) => {
      const animateSource = () => {
        const ghost = this.createFloatingItemGhost(source, {
          className: 'brewing-page__brew-ingredient-ghost',
          fallbackLabel: source.itemLabel ?? 'herb',
        });

        document.body.append(ghost);
        this.animateItemDragGhostToElement(ghost, target, {
          type: 'brew',
          duration: ITEM_BREW_DROP_MS,
          startRect: source.rect,
          onFinish: () => this.animateCauldronIngredientReceive(cauldronIndex),
        });
      };

      if (index === 0) {
        animateSource();
        return;
      }

      const timeout = window.setTimeout(() => {
        this.transientAnimationTimeouts.delete(timeout);
        animateSource();
      }, index * ITEM_BREW_DROP_STAGGER_MS);
      this.transientAnimationTimeouts.add(timeout);
    });
  }

  onPrimaryAction(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const refs = this.cauldronRefs.get(safeCauldronIndex);

    if (!refs || refs.actions.actionButton.disabled) {
      return;
    }

    const action = refs.actions.actionButton.dataset.action;

    if (action === 'buy') {
      this.onBuyCauldron(safeCauldronIndex);
      return;
    }

    this.selectCauldron(safeCauldronIndex);

    if (action === 'bottle') {
      this.onBottle(safeCauldronIndex);
      return;
    }

    if (action === 'fill') {
      this.onFillSelectedRecipe(safeCauldronIndex);
      return;
    }

    this.onBrew(safeCauldronIndex);
  }

  onFillSelectedRecipe(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const snapshot = this.gameplayFacade.getSnapshot();
    const recipe = this.getSelectedRecipe(snapshot?.brewing?.recipes ?? [], safeCauldronIndex);

    if (!recipe) {
      return;
    }

    const result = this.gameplayFacade.prepareBrewingRecipe(recipe.key, safeCauldronIndex);

    if (!result.ok) {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
      this.render(this.gameplayFacade.getSnapshot());
      this.flashMessage(safeCauldronIndex);
      return;
    }

    this.message = null;
    this.render(this.gameplayFacade.getSnapshot());
  }

  onBrew(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const flyoutSources = this.getBrewIngredientFlyoutSources(safeCauldronIndex);
    const result = this.gameplayFacade.brewCauldron(safeCauldronIndex);

    if (result.ok) {
      this.message = null;
    } else {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
    }

    this.render(this.gameplayFacade.getSnapshot());
    if (result.ok) {
      this.animateBrewIngredientsIntoCauldron(safeCauldronIndex, flyoutSources);
    }
    this.flashMessage(safeCauldronIndex);
  }

  onBottle(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const result = this.gameplayFacade.startBrewingBottling(safeCauldronIndex);

    if (result.ok) {
      this.message = null;
    } else {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
    }

    this.render(this.gameplayFacade.getSnapshot());
    this.flashMessage(safeCauldronIndex);
  }

  onBuyCauldron(cauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const result = this.gameplayFacade.buyBrewingCauldron();

    if (result.ok) {
      this.selectCauldron(result.cauldronNumber - 1);
      this.message = null;
    } else {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
    }

    this.render(this.gameplayFacade.getSnapshot());
    if (result.ok) {
      this.playBoughtCauldronAnimation(result.cauldronNumber - 1);
    }
    this.flashMessage(result.ok ? result.cauldronNumber - 1 : safeCauldronIndex);
  }

  playBoughtCauldronAnimation(cauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const refs = this.cauldronRefs.get(safeCauldronIndex);

    if (!refs?.root) {
      return;
    }

    const previousReset = this.boughtCauldronAnimationResets.get(safeCauldronIndex);
    if (previousReset !== undefined) {
      globalThis.clearTimeout(previousReset);
    }

    refs.root.classList.remove('is-newly-bought');
    void refs.root.offsetWidth;
    refs.root.classList.add('is-newly-bought');

    const reset = globalThis.setTimeout(() => {
      refs.root.classList.remove('is-newly-bought');
      this.boughtCauldronAnimationResets.delete(safeCauldronIndex);
    }, 260);
    reset?.unref?.();
    this.boughtCauldronAnimationResets.set(safeCauldronIndex, reset);
  }

  clearBoughtCauldronAnimations() {
    for (const [cauldronIndex, reset] of this.boughtCauldronAnimationResets) {
      globalThis.clearTimeout(reset);
      this.cauldronRefs.get(cauldronIndex)?.root?.classList.remove('is-newly-bought');
    }

    this.boughtCauldronAnimationResets.clear();
  }

  onCauldronWorldClick(event, cauldronIndex) {
    if (this.isWorldClickSuppressed()) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      return;
    }

    if (event?.target?.closest?.('button')) {
      return;
    }

    this.openCauldronOrBuy(cauldronIndex);
  }

  openCauldronOrBuy(cauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const refs = this.cauldronRefs.get(safeCauldronIndex);

    if (!refs) {
      return;
    }

    if (refs.root.classList.contains('is-locked')) {
      this.onCauldronBoxClick(null, safeCauldronIndex);
      return;
    }

    this.selectCauldron(safeCauldronIndex);
    const cauldron = this.getRenderedCauldronSnapshot(safeCauldronIndex);

    if (cauldron?.selectedRecipe || (cauldron?.ingredients?.length ?? 0) === 0) {
      this.onOpenSelectRecipe?.(safeCauldronIndex);
    }
  }

  getRenderedCauldronSnapshot(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const snapshot = this.gameplayFacade?.getSnapshot?.();
    const brewing = snapshot?.brewing ?? {};
    const cauldron =
      (brewing.cauldrons ?? []).find(
        (candidate) => candidate.cauldronIndex === safeCauldronIndex,
      ) ?? (safeCauldronIndex === 0 ? brewing : null);

    if (!cauldron || cauldron.unlocked === false) {
      return cauldron ?? null;
    }

    return {
      ...cauldron,
      selectedRecipe: this.getSelectedRecipe(brewing.recipes ?? [], safeCauldronIndex),
    };
  }

  onCauldronBoxClick(event, cauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const refs = this.cauldronRefs.get(safeCauldronIndex);

    if (
      !refs?.root.classList.contains('is-locked') ||
      event?.target?.closest?.('button') ||
      refs.actions.actionButton.disabled
    ) {
      return;
    }

    this.onPrimaryAction(safeCauldronIndex);
  }

  formatResultMessage(result) {
    if (result.reason === 'research_not_unlocked') {
      return 'research not yet unlocked';
    }

    if (result.reason === 'not_enough_mana') {
      return 'not enough mana';
    }

    if (result.reason === 'not_enough_coin') {
      return 'not enough coin';
    }

    if (result.reason === 'not_enough_item' || result.reason === 'not_enough_ingredients') {
      return 'missing herbs';
    }

    if (result.reason === 'cauldron_full') {
      return 'cauldron full';
    }

    if (result.reason === 'cauldron_empty') {
      return 'cauldron empty';
    }

    if (result.reason === 'cauldron_locked') {
      return 'cauldron locked';
    }

    if (result.reason === 'level_locked') {
      return 'level locked';
    }

    if (result.reason === 'research_locked') {
      return 'research locked';
    }

    if (result.reason === 'brew_in_progress') {
      return 'brewing';
    }

    if (result.reason === 'brew_not_done') {
      return 'wait for brew';
    }

    if (result.reason === 'auto_brew_recipe_required') {
      return 'select recipe';
    }

    if (result.reason === 'bottling_in_progress') {
      return 'bottling';
    }

    if (result.reason === 'bottling_done') {
      return 'bottling complete';
    }

    if (result.reason === 'bottling_not_done') {
      return 'bottling';
    }

    if (result.reason === 'no_brew') {
      return 'no brew';
    }

    return 'cannot brew';
  }

  formatIngredientBlockedMessage(brewing, itemTypeId) {
    if (brewing?.selectedRecipe) {
      const recipeIngredient = (brewing.selectedRecipe.ingredients ?? []).find(
        (ingredient) => ingredient.itemTypeId === itemTypeId,
      );

      if (recipeIngredient) {
        return `enough ${recipeIngredient.label}`;
      }

      return 'recipe needs listed herbs';
    }

    if (brewing?.activeBrew) {
      return 'brewing';
    }

    return 'cannot add';
  }

  isCauldronLocked(cauldronIndex) {
    return this.cauldronRefs
      .get(this.normalizeCauldronIndex(cauldronIndex))
      ?.root.classList.contains('is-locked');
  }

  formatCauldronCount(brewing) {
    const count = brewing.ingredients.length;
    const max = Number.isFinite(brewing.maxIngredients) ? brewing.maxIngredients : '?';
    return `${count}/${max}`;
  }

  formatCauldronTitle(brewing) {
    const cauldronNumber = Math.max(1, Math.floor(Number(brewing?.cauldronNumber) || 1));
    const starLevel = this.getCauldronStarLevel(brewing);
    return `cauldron ${cauldronNumber} ${formatStarLevel(starLevel).text}`;
  }

  renderCauldronTitle(element, brewing) {
    if (!element) {
      return;
    }

    const cauldronNumber = Math.max(1, Math.floor(Number(brewing?.cauldronNumber) || 1));
    const cauldronStarLevel = this.getCauldronStarLevel(brewing);
    const starLevel = formatStarLevel(cauldronStarLevel);
    const signature = `${cauldronNumber}:${cauldronStarLevel}:${starLevel.tone}:${starLevel.starCount}`;

    if (element.dataset.cauldronStarTitle === signature) {
      return;
    }

    element.replaceChildren(
      document.createTextNode(`cauldron ${cauldronNumber} `),
      createStarLevelLabel(cauldronStarLevel),
    );

    element.dataset.cauldronStarTitle = signature;
    element.setAttribute(
      'aria-label',
      `cauldron ${cauldronNumber} ${starLevel.ariaLabel}`,
    );
  }

  renderPlainCauldronTitle(element, brewing) {
    if (!element) {
      return;
    }

    const cauldronNumber = Math.max(1, Math.floor(Number(brewing?.cauldronNumber) || 1));
    const signature = `${cauldronNumber}:plain`;

    if (element.dataset.cauldronStarTitle === signature) {
      return;
    }

    element.textContent = `cauldron ${cauldronNumber}`;
    element.dataset.cauldronStarTitle = signature;
    element.setAttribute('aria-label', `cauldron ${cauldronNumber}`);
  }

  getCauldronStarLevel(brewing) {
    const level = Math.max(1, Math.floor(Number(brewing?.level) || 1));
    return Math.max(0, level - 1);
  }

  formatCauldronStatus(brewing) {
    const count = brewing.ingredients.length;
    if (brewing.activeBrew) {
      return '';
    }

    if (brewing.selectedRecipe) {
      return '';
    }

    if (count === 0) {
      return '';
    }

    if (brewing.match) {
      return brewing.match.unlocked || brewing.match.discoverable
        ? ''
        : `${brewing.match.label} locked`;
    }

    return '';
  }

  formatActionHint(brewing) {
    if (brewing.activeBrew) {
      if (brewing.activeBrew.canCollect) {
        return '';
      }

      if (brewing.activeBrew.canStartBottling) {
        return '';
      }

      return brewing.activeBrew.phase === 'bottling'
        ? 'wait for bottling'
        : 'wait for brew';
    }

    if (brewing.ingredients.length === 0) {
      return 'need herbs';
    }

    if (brewing.match && !brewing.match.unlocked && !brewing.match.discoverable) {
      return 'recipe locked';
    }

    if (!brewing.hasEnoughIngredients) {
      return 'missing herbs';
    }

    if (!brewing.hasEnoughMana) {
      return `need ${brewing.manaCost} mana`;
    }

    if (brewing.match?.unlocked || brewing.match?.discoverable) {
      return '';
    }

    if (brewing.canBrew) {
      return 'no recipe found';
    }

    return 'cannot brew';
  }

  formatActiveBrewText(activeBrew, remainingMs = activeBrew.remainingMs) {
    if (activeBrew.canCollect) {
      return 'bottled';
    }

    if (activeBrew.canStartBottling) {
      return 'brewed';
    }

    const timer = formatRemainingTime(remainingMs);
    return `${this.getActivePhaseLabel(activeBrew)} ${timer}`;
  }

  formatActiveProgressAriaLabel(activeBrew) {
    if (activeBrew.canCollect) {
      return 'bottling complete';
    }

    if (activeBrew.canStartBottling) {
      return 'brewing complete';
    }

    return activeBrew.phase === 'bottling' ? 'bottling progress' : 'brewing progress';
  }

  getActivePhaseLabel(activeBrew) {
    return activeBrew.phase === 'bottling' ? 'bottling' : 'brewing';
  }

  formatBrewAriaLabel(brewing) {
    const costLabel = Number.isFinite(brewing.manaCost)
      ? `, costs ${brewing.manaCost} mana`
      : '';
    const brewQuantity = this.getBrewQuantity(brewing);
    const quantityPrefix = brewQuantity > 1 ? `${brewQuantity} ` : '';

    if (brewing.match?.unlocked) {
      return `brew ${quantityPrefix}${brewing.match.label}${costLabel}`;
    }

    if (brewing.match?.discoverable) {
      return `brew ${quantityPrefix}unknown potion${costLabel}`;
    }

    if (brewing.match && !brewing.match.unlocked) {
      return `recipe locked${costLabel}`;
    }

    if (brewing.ingredients.length > 0) {
      return `brew ${quantityPrefix}wasted potion${costLabel}`;
    }

    return `brew${costLabel}`;
  }

  getBrewQuantity(brewing = {}) {
    const quantity = Math.floor(Number(brewing?.brewQuantity ?? brewing?.yieldMultiplier));

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return 1;
    }

    return Math.min(quantity, this.getMaxBrewQuantity(brewing));
  }

  getMaxBrewQuantity(brewing = {}) {
    const quantity = Math.floor(Number(brewing?.maxBrewQuantity ?? brewing?.level));
    if (Number.isInteger(quantity) && quantity > 0) {
      return quantity;
    }

    const currentQuantity = Math.floor(Number(brewing?.brewQuantity ?? brewing?.yieldMultiplier));
    return Number.isInteger(currentQuantity) && currentQuantity > 0 ? currentQuantity : 1;
  }

  formatFillRecipeAriaLabel(brewing, canFillRecipe = this.canFillSelectedRecipe(brewing)) {
    const recipeLabel = brewing?.selectedRecipe?.label ?? 'selected recipe';

    if (!canFillRecipe) {
      return `missing herbs for ${recipeLabel}`;
    }

    return `fill ${recipeLabel} recipe`;
  }

  setRemoveIngredientTutorialId(element, ingredient) {
    this.setOptionalAttribute(
      element,
      'data-tutorial-id',
      this.getRemoveIngredientTutorialId(ingredient),
    );
  }

  getRemoveIngredientTutorialId(ingredient) {
    if (typeof ingredient?.key !== 'string' || ingredient.key.length === 0) {
      return null;
    }

    return `brewing:remove:${ingredient.key}`;
  }

  flashMessage(cauldronIndex = this.selectedCauldronIndex) {
    const message = this.cauldronRefs.get(cauldronIndex)?.actions?.message;

    if (!message?.textContent) {
      return;
    }

    message.classList.remove('is-updated');
    void message.offsetWidth;
    message.classList.add('is-updated');
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setResourceText(element, text) {
    if (element.textContent !== text) {
      setResourceIconText(element, text);
    }
  }

  setHidden(element, hidden) {
    if (element.hidden !== hidden) {
      element.hidden = hidden;
    }
  }

  setDisabled(element, disabled) {
    if (element.disabled !== disabled) {
      element.disabled = disabled;
    }
  }

  setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

  setOptionalAttribute(element, name, value) {
    if (value === null || value === undefined || value === '') {
      this.removeAttribute(element, name);
      return;
    }

    this.setAttribute(element, name, value);
  }

  removeAttribute(element, name) {
    if (element.hasAttribute(name)) {
      element.removeAttribute(name);
    }
  }

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
