import {
  getCompletedResearchIds,
  isItemResearched,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel, setTextWithItemIcons } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { createStarLevelLabel, formatStarLevel } from '../../shared/starLevelLabel.js';
import { setTimerProgressFill, stopTimerProgressFill } from '../../shared/timerProgress.js';
import { formatRemainingTime } from '../../shared/timerDisplay.js';
import { createAssetAtlasSprite } from '../../../assets/atlas/atlasSprite.js';
import { getPotionIconFrameName } from '../../../assets/items/potions/potionIcons.js';
import { automationResearchIds } from '../../../gameplay/automation/automationResearchIds.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';

const CAULDRON_BASE_ROW_COUNT = 3;
const WORLD_EDGE_EXTENSION = 16;
const WORLD_WIDTH = 560 + WORLD_EDGE_EXTENSION * 2;
const WORLD_HEIGHT = 720 + WORLD_EDGE_EXTENSION * 2;
const HERB_DRAG_THRESHOLD = 5;
const WORLD_DRAG_THRESHOLD = 4;
const WORLD_MIN_ZOOM = 0.68;
const WORLD_MAX_ZOOM = 1.16;
const WORLD_ZOOM_RUBBER_LIMIT = 0.12;
const WORLD_PAN_RUBBER_LIMIT = 54;
const WORLD_SETTLE_CLASS_MS = 240;

export class BrewingCauldronManager {
  constructor({
    gameplayFacade,
    getSelectedRecipeKey,
    onOpenSelectRecipe,
    onCurrentCauldronChange,
    onRewardNotice,
    rewardEventsAvailable = false,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSelectedRecipeKey = getSelectedRecipeKey;
    this.onOpenSelectRecipe = onOpenSelectRecipe;
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
    this.message = null;
    this.suppressNextClick = false;
    this.worldPan = { x: 0, y: 0 };
    this.worldZoom = 1;
    this.worldPointers = new Map();
    this.worldGesture = null;
    this.worldDrag = null;
    this.worldSettleClassTimeout = null;
    this.herbDrag = null;
    this.handleDocumentHerbPointerMove = (event) => this.onHerbPointerMove(event);
    this.handleDocumentHerbPointerUp = (event) => this.onHerbPointerUp(event);
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
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.herbRows.clear();
    this.herbRowsSignature = '';
    this.cauldronRefs.clear();
    this.cauldronRefsSignature = '';
    this.herbsExpanded = false;
    this.message = null;
    this.suppressNextClick = false;
    this.worldPan = { x: 0, y: 0 };
    this.worldZoom = 1;
    this.worldPointers.clear();
    this.worldGesture = null;
    this.worldDrag = null;
    this.clearWorldSettleTimers();
    this.clearHerbDrag();
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

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'herbs';

    const count = document.createElement('div');
    count.className = 'brewing-page__herbs-count';
    count.textContent = '0/0';

    const toggle = document.createElement('button');
    toggle.className = 'brewing-page__herbs-toggle';
    toggle.type = 'button';
    toggle.textContent = 'expand';
    toggle.addEventListener('click', () => this.toggleHerbsExpanded());

    const rows = document.createElement('div');
    rows.className = 'brewing-page__herb-rows';
    root.append(title, count, rows, toggle);

    return { root, count, rows, toggle };
  }

  createCauldronBox(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const root = document.createElement('section');
    root.className = 'brewing-page__cauldron style-box';
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

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = `cauldron ${safeCauldronIndex + 1}`;

    const count = document.createElement('div');
    count.className = 'brewing-page__cauldron-count';
    count.textContent = '0/0';

    const bubble = document.createElement('div');
    bubble.className = 'brewing-page__cauldron-bubble';
    bubble.textContent = 'empty';

    const selectRecipeButton = document.createElement('button');
    selectRecipeButton.className = 'brewing-page__cauldron-select-recipe-text';
    selectRecipeButton.type = 'button';
    selectRecipeButton.textContent = 'select recipe';
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

    const potionIcon = document.createElement('div');
    potionIcon.className = 'brewing-page__cauldron-potion-icon';
    potionIcon.setAttribute('aria-hidden', 'true');
    potionIcon.hidden = true;

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

    const actions = this.createActions(safeCauldronIndex);

    activeProgress.append(activeProgressFill, activeProgressText);
    active.append(activeText, activeProgress);
    root.append(
      title,
      count,
      bubble,
      guide,
      potionIcon,
      status,
      items,
      active,
      actions.root,
      selectRecipeButton,
    );
    return {
      cauldronIndex: safeCauldronIndex,
      root,
      title,
      count,
      bubble,
      guide,
      guideSequence,
      potionIcon,
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

    actionButton.append(actionButtonLabel, actionButtonCost);
    actionRow.append(actionButton);

    const message = document.createElement('div');
    message.className = 'brewing-page__message';

    root.append(actionRow, message);
    return {
      root,
      actionRow,
      actionButton,
      actionButtonLabel,
      actionButtonCost,
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
  }

  positionCauldronBox(refs, cauldronIndex = 0) {
    const position = this.getCauldronWorldPosition(cauldronIndex);

    refs.root.style.left = `${position.x}px`;
    refs.root.style.top = `${position.y}px`;
  }

  getCauldronWorldPosition(cauldronIndex = 0) {
    const safeIndex = this.normalizeCauldronIndex(cauldronIndex);
    const positions = [
      { x: 76, y: 90 },
      { x: 306, y: 154 },
      { x: 156, y: 314 },
      { x: 382, y: 424 },
      { x: 86, y: 542 },
      { x: 324, y: 616 },
    ];

    if (positions[safeIndex]) {
      return this.extendCauldronWorldPosition(positions[safeIndex]);
    }

    const column = safeIndex % 2;
    const row = Math.floor(safeIndex / 2);
    return this.extendCauldronWorldPosition({
      x: 84 + column * 238,
      y: 96 + row * 150,
    });
  }

  extendCauldronWorldPosition(position) {
    return {
      x: position.x + WORLD_EDGE_EXTENSION,
      y: position.y + WORLD_EDGE_EXTENSION,
    };
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
        this.onHerbPointerDown(event, herb.itemTypeId),
      );
      button.addEventListener('pointermove', (event) => this.onHerbPointerMove(event));
      button.addEventListener('pointerup', (event) => this.onHerbPointerUp(event));
      button.addEventListener('pointercancel', (event) => this.onHerbPointerUp(event));
      button.addEventListener('click', (event) => this.onHerbButtonClick(event, herb.itemTypeId));

      const label = document.createElement('span');
      label.className = 'brewing-page__herb-label row_key';

      const quantity = document.createElement('span');
      quantity.className = 'row_val';

      button.append(label, quantity);
      row.append(button);
      this.herbRows.set(herb.itemTypeId, { row, button, label, quantity });
      this.refs.herbs.rows.append(row);
    }
  }

  renderHerbs(snapshot, brewing) {
    const targetCauldron = this.getAddTargetCauldron(brewing.cauldrons);
    const canAddToAnyCauldron = Boolean(targetCauldron);
    const hiddenStartIndex = this.herbsExpanded ? brewing.herbs.length : 5;

    for (const herb of brewing.herbs) {
      const refs = this.herbRows.get(herb.itemTypeId);
      const disabled =
        herb.availableQuantity <= 0 || !canAddToAnyCauldron;
      const rowIndex = brewing.herbs.indexOf(herb);

      refs.row.classList.toggle('is-empty', herb.availableQuantity <= 0);
      refs.row.classList.toggle('is-locked', false);
      this.setHidden(refs.row, rowIndex >= hiddenStartIndex);
      this.setText(refs.label, herb.label);
      setItemIconLabel(refs.label, 'herb', herb.key);
      this.setText(refs.quantity, String(herb.availableQuantity));
      this.setDisabled(refs.button, disabled);
      this.setAttribute(refs.button, 'aria-disabled', disabled ? 'true' : 'false');
      this.setAttribute(refs.button, 'aria-label', `add ${herb.label} to cauldron`);
      setNotificationBadge(refs.button, false);
      setNotificationBadge(refs.label, !disabled);
    }

    this.renderHerbsToggle(brewing.herbs.length);
  }

  getAddTargetCauldron(cauldrons = []) {
    const selected = cauldrons.find(
      (cauldron) => cauldron.cauldronIndex === this.selectedCauldronIndex,
    );

    if (selected?.canAddIngredient && !selected.activeBrew) {
      return selected;
    }

    return (
      cauldrons.find((cauldron) => cauldron.canAddIngredient && !cauldron.activeBrew) ??
      null
    );
  }

  renderHerbsToggle(herbCount) {
    const collapsedCount = Math.min(herbCount, 5);
    const visibleCount = this.herbsExpanded ? herbCount : collapsedCount;
    const canToggle = herbCount > 5;

    this.refs.herbs.root.classList.toggle('is-expanded', this.herbsExpanded);
    this.setText(this.refs.herbs.count, `${visibleCount}/${herbCount}`);
    this.setHidden(this.refs.herbs.toggle, !canToggle);
    this.setText(this.refs.herbs.toggle, this.herbsExpanded ? 'collapse' : 'expand');
    this.setAttribute(
      this.refs.herbs.toggle,
      'aria-expanded',
      this.herbsExpanded ? 'true' : 'false',
    );
  }

  toggleHerbsExpanded() {
    this.herbsExpanded = !this.herbsExpanded;
    this.render(this.gameplayFacade.getSnapshot());
  }

  onWorldPointerDown(event) {
    if (
      event.button !== 0 ||
      event.target?.closest?.(
        '.brewing-page__cauldron, .brewing-page__herbs, button, [role="button"]',
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

    if (this.worldPointers.size >= 2) {
      this.startWorldPinchGesture();
    } else {
      this.worldGesture = {
        type: 'pan',
        pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: this.worldPan.x,
        panY: this.worldPan.y,
        didDrag: false,
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

    if (
      !this.worldGesture.didDrag &&
      Math.hypot(deltaX, deltaY) < WORLD_DRAG_THRESHOLD
    ) {
      return;
    }

    this.worldGesture.didDrag = true;
    this.worldDrag = this.worldGesture;
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

  setWorldZoomAroundPoint(rawZoom, clientX, clientY, { rubber = false } = {}) {
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

  clearWorldSettleTimers() {
    window.clearTimeout(this.worldSettleClassTimeout);
    this.worldSettleClassTimeout = null;
  }

  getWorldPanBounds(zoom = this.worldZoom) {
    const shellRect = this.refs.world?.shell?.getBoundingClientRect?.();
    const scale = this.getUiScale();
    const shellWidth = Math.max(0, (shellRect?.width ?? 0) / scale);
    const shellHeight = Math.max(0, (shellRect?.height ?? 0) / scale);
    const minX = Math.min(0, shellWidth - WORLD_WIDTH * zoom);
    const minY = Math.min(0, shellHeight - WORLD_HEIGHT * zoom);

    return {
      minX,
      maxX: 0,
      minY,
      maxY: 0,
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

  onHerbPointerDown(event, itemTypeId) {
    if (event.button !== 0 || event.currentTarget.disabled) {
      return;
    }

    event.stopPropagation();
    this.herbDrag = {
      pointerId: event.pointerId,
      itemTypeId,
      source: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      ghost: null,
      didDrag: false,
    };
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

    if (drag.didDrag) {
      const targetCauldron = document
        .elementFromPoint?.(event.clientX, event.clientY)
        ?.closest?.('.brewing-page__cauldron');
      const cauldronIndex = Number(targetCauldron?.dataset?.cauldronIndex);

      if (Number.isInteger(cauldronIndex) && !this.isCauldronLocked(cauldronIndex)) {
        this.onAddIngredient(drag.itemTypeId, cauldronIndex);
      }

      event.preventDefault();
    }

    this.clearHerbDrag();
  }

  ensureHerbDragGhost() {
    if (!this.herbDrag || this.herbDrag.ghost) {
      return;
    }

    const ghost = document.createElement('div');
    ghost.className = 'brewing-page__herb-drag-ghost';
    ghost.textContent =
      this.herbDrag.source.querySelector('.brewing-page__herb-label')?.textContent ??
      'herb';
    document.body.append(ghost);
    this.herbDrag.ghost = ghost;
  }

  moveHerbDragGhost(clientX, clientY) {
    if (!this.herbDrag?.ghost) {
      return;
    }

    this.herbDrag.ghost.style.left = `${clientX}px`;
    this.herbDrag.ghost.style.top = `${clientY}px`;
  }

  clearHerbDrag() {
    document.removeEventListener('pointermove', this.handleDocumentHerbPointerMove);
    document.removeEventListener('pointerup', this.handleDocumentHerbPointerUp);
    document.removeEventListener('pointercancel', this.handleDocumentHerbPointerUp);
    this.herbDrag?.ghost?.remove();
    this.herbDrag = null;
  }

  renderCauldron(refs, brewing) {
    if (brewing.unlocked === false) {
      this.renderLockedCauldron(refs, brewing);
      return;
    }

    refs.root.classList.remove('is-locked', 'is-buyable');
    refs.root.classList.toggle('is-current', brewing.cauldronIndex === this.selectedCauldronIndex);
    this.renderCauldronTitle(refs.title, brewing);
    this.setHidden(refs.count, false);
    this.setText(refs.count, this.formatCauldronCount(brewing));
    const statusText = this.formatCauldronStatus(brewing);
    this.setHidden(refs.status, statusText === '');
    this.setText(refs.status, statusText);
    this.setCauldronStatusRowCount(refs, statusText === '' ? 0 : 1);
    this.renderPotionIcon(refs, brewing);
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
    this.setCauldronRowCount(refs);
    this.renderCauldronTitle(refs.title, brewing);
    this.renderPotionIcon(refs, null);
    this.renderCauldronBubble(refs, brewing);
    this.setHidden(refs.count, true);
    this.setHidden(refs.status, true);
    this.setText(refs.status, '');
    this.setCauldronStatusRowCount(refs, 0);
    this.setHidden(refs.guide, true);
    this.hideExtraCauldronGuideRows(refs, 0);
    this.ensureCauldronEmptyRow(refs);
    this.setHidden(refs.items, false);
    refs.items.classList.add('is-empty');
    this.setHidden(refs.empty, false);
    this.setText(
      refs.empty,
      brewing.nextCauldronLockedByLevel
        ? `level ${brewing.nextCauldronRequiresLevel ?? '?'}`
        : brewing.nextCauldronLockedByResearch
          ? 'research'
        : 'locked',
    );
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
      return 'empty';
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

    const hasIngredients = brewing.ingredients.length > 0;
    const showGuideContents = Boolean(brewing.selectedRecipe && !brewing.activeBrew);

    if (showGuideContents) {
      this.setHidden(refs.items, true);
      refs.items.classList.remove('is-empty');
      this.setHidden(refs.empty, true);
      this.setText(refs.empty, '');
      this.hideExtraIngredientRows(refs, 0);
      return;
    }

    this.setHidden(refs.items, false);
    const showEmpty = !hasIngredients && !brewing.activeBrew && !showGuideContents;
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
      setResourceColor(rowRefs.label, 'herb');
      this.setTextWithItemIcons(rowRefs.label, `- ${ingredient.quantity} ${ingredient.label}`);
      this.setText(rowRefs.action, 'remove');
    }

    this.hideExtraIngredientRows(refs, ingredientGroups.length);
  }

  renderPotionIcon(refs, brewing) {
    const iconKey = this.getPotionIconKey(brewing);

    refs.root.classList.toggle('has-potion-icon', Boolean(iconKey));
    this.setHidden(refs.potionIcon, !iconKey);

    if (!iconKey) {
      refs.potionIcon.replaceChildren();
      delete refs.potionIcon.dataset.potionIconKey;
      return;
    }

    if (refs.potionIcon.dataset.potionIconKey === iconKey) {
      return;
    }

    const frameName = getPotionIconFrameName(iconKey);
    const icon = createAssetAtlasSprite(
      'brewing-page__cauldron-potion-icon-image',
      frameName,
    );

    if (!icon) {
      this.setHidden(refs.potionIcon, true);
      refs.root.classList.remove('has-potion-icon');
      refs.potionIcon.replaceChildren();
      delete refs.potionIcon.dataset.potionIconKey;
      return;
    }

    refs.potionIcon.replaceChildren(icon);
    refs.potionIcon.dataset.potionIconKey = iconKey;
  }

  getPotionIconKey(brewing) {
    if (!brewing) {
      return null;
    }

    if (brewing.activeBrew?.key) {
      return brewing.activeBrew.key;
    }

    return brewing.selectedRecipe?.key ?? null;
  }

  hideExtraIngredientRows(cauldronRefs, visibleCount) {
    for (let index = visibleCount; index < cauldronRefs.ingredientRows.length; index += 1) {
      const rowRefs = cauldronRefs.ingredientRows[index];
      this.setHidden(rowRefs.row, true);
      this.removeAttribute(rowRefs.row, 'aria-label');
      this.removeAttribute(rowRefs.row, 'data-slot-index');
      this.removeAttribute(rowRefs.row, 'data-tutorial-id');
      setResourceColor(rowRefs.row, null);
      setResourceColor(rowRefs.label, null);
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
    const targetIngredients = this.expandIngredientSequence(recipe.ingredients);
    const ingredientGroups = this.createIngredientGroups(recipe.ingredients).map((ingredient) => ({
      ...ingredient,
      brewQuantity,
    }));
    const match = this.getIngredientMatch(targetIngredients, brewing.ingredients);
    const missingQuantities = this.getMissingIngredientQuantities(
      recipe,
      brewing,
      brewQuantity,
    );
    let renderedRows = 0;

    for (const ingredient of ingredientGroups) {
      const rowRefs = this.ensureCauldronGuideRow(refs, renderedRows);
      const rowState = this.getCauldronGuideRowState(
        ingredient,
        brewing.ingredients,
        match,
        missingQuantities,
      );
      this.renderCauldronGuideRow(rowRefs, rowState);
      renderedRows += 1;
    }

    const extraGroups = this.groupAdjacentIngredients(
      brewing.ingredients.slice(targetIngredients.length),
    ).map((ingredient) => ({
      ...ingredient,
      slotIndex: ingredient.slotIndex + targetIngredients.length,
    }));

    for (const ingredient of extraGroups) {
      const rowRefs = this.ensureCauldronGuideRow(refs, renderedRows);
      this.renderCauldronGuideRow(rowRefs, {
        label: this.formatIngredientGroup(ingredient),
        value: 'remove',
        removeSlotIndex: ingredient.slotIndex + ingredient.quantity - 1,
        tutorialId: this.getRemoveIngredientTutorialId(ingredient),
        isPlaced: false,
        isNext: false,
        isMismatch: true,
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
        this.onRemoveIngredient(slotIndex, cauldronIndex);
      }
    });

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    this.setAttribute(row, 'data-cauldron-index', String(cauldronRefs.cauldronIndex));
    cauldronRefs.guideSequence.append(row);

    const rowRefs = { row, label, value };
    cauldronRefs.cauldronGuideRows[index] = rowRefs;
    return rowRefs;
  }

  renderCauldronGuideRow(refs, rowState) {
    this.setHidden(refs.row, false);
    this.setTextWithItemIcons(refs.label, rowState.label);
    this.setText(refs.value, rowState.value);
    refs.row.classList.toggle('is-placed', rowState.isPlaced);
    refs.row.classList.toggle('is-next', rowState.isNext);
    refs.row.classList.toggle('is-mismatch', rowState.isMismatch);

    if (Number.isInteger(rowState.removeSlotIndex)) {
      this.setDisabled(refs.row, false);
      this.setAttribute(refs.row, 'data-slot-index', String(rowState.removeSlotIndex));
      this.setAttribute(refs.row, 'aria-disabled', 'false');
      this.setAttribute(refs.row, 'aria-label', `remove ${rowState.label} from cauldron`);
      this.setOptionalAttribute(refs.row, 'data-tutorial-id', rowState.tutorialId);
      return;
    }

    this.setDisabled(refs.row, true);
    this.removeAttribute(refs.row, 'data-slot-index');
    this.setAttribute(refs.row, 'aria-disabled', 'true');
    this.removeAttribute(refs.row, 'aria-label');
    this.removeAttribute(refs.row, 'data-tutorial-id');
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
      rowRefs.row.classList.remove('is-placed', 'is-next', 'is-mismatch');
      this.setText(rowRefs.label, '');
      this.setText(rowRefs.value, '');
    }
  }

  getCauldronGuideRowState(ingredient, ingredients, match, missingQuantities = new Map()) {
    const actualSlots = ingredients.slice(ingredient.startIndex, ingredient.endIndex);
    const mismatchOffset = actualSlots.findIndex(
      (actual) => actual.itemTypeId !== ingredient.itemTypeId,
    );
    const hasMismatch = mismatchOffset >= 0;
    const matchedQuantity = hasMismatch ? mismatchOffset : actualSlots.length;
    const hasIngredient = actualSlots.length > 0;
    const removeSlotIndex = hasIngredient
      ? ingredient.startIndex + actualSlots.length - 1
      : null;
    const missingQuantity = missingQuantities.get(ingredient.itemTypeId) ?? 0;

    if (hasMismatch) {
      const wrongIngredient = actualSlots[mismatchOffset];
      return {
        label: this.formatIngredientGroup({
          label: wrongIngredient?.label ?? 'unknown',
          quantity: 1,
        }),
        value: 'remove',
        removeSlotIndex,
        isPlaced: false,
        isNext: false,
        isMismatch: true,
      };
    }

    if (!hasIngredient && missingQuantity > 0) {
      return {
        label: this.formatIngredientGroup(ingredient),
        value: `missing ${missingQuantity}`,
        removeSlotIndex: null,
        isPlaced: false,
        isNext: false,
        isMismatch: true,
      };
    }

    if (hasIngredient && matchedQuantity >= ingredient.quantity && missingQuantity > 0) {
      return {
        label: this.formatIngredientGroup(ingredient),
        value: `missing ${missingQuantity}`,
        removeSlotIndex,
        isPlaced: false,
        isNext: false,
        isMismatch: true,
      };
    }

    if (matchedQuantity > 0 && matchedQuantity < ingredient.quantity) {
      return {
        label: `- ${matchedQuantity}/${ingredient.quantity} ${ingredient.label}`,
        value: 'remove',
        removeSlotIndex,
        isPlaced: false,
        isNext: true,
        isMismatch: false,
      };
    }

    if (hasIngredient) {
      return {
        label: this.formatIngredientGroup(ingredient),
        value: 'remove',
        removeSlotIndex,
        isPlaced: ingredient.endIndex <= match.matchedCount,
        isNext: false,
        isMismatch: false,
      };
    }

    return {
      label: this.formatIngredientGroup(ingredient),
      value: this.formatGuideStepValue(ingredient, match),
      removeSlotIndex: null,
      isPlaced: false,
      isNext:
        match.prefixMatches &&
        ingredient.startIndex <= match.matchedCount &&
        match.matchedCount < ingredient.endIndex &&
        !match.ready,
      isMismatch:
        ingredient.startIndex <= match.firstMismatchIndex &&
        match.firstMismatchIndex < ingredient.endIndex,
    };
  }

  getSelectedRecipe(recipes, cauldronIndex = this.selectedCauldronIndex) {
    const selectedRecipeKey = this.getSelectedRecipeKey?.(cauldronIndex);

    if (!selectedRecipeKey) {
      return null;
    }

    return recipes.find((recipe) => recipe.key === selectedRecipeKey && recipe.unlocked) ?? null;
  }

  expandIngredientSequence(ingredients = []) {
    return ingredients.flatMap((ingredient) => {
      const quantity = this.normalizeIngredientQuantity(ingredient);
      return Array.from({ length: quantity }, () => ingredient);
    });
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

  getIngredientMatch(targetIngredients, ingredients) {
    let firstMismatchIndex = -1;

    for (let index = 0; index < ingredients.length; index += 1) {
      const target = targetIngredients[index];

      if (!target || target.itemTypeId !== ingredients[index].itemTypeId) {
        firstMismatchIndex = index;
        break;
      }
    }

    const prefixMatches = firstMismatchIndex === -1;
    const matchedCount = prefixMatches
      ? Math.min(ingredients.length, targetIngredients.length)
      : firstMismatchIndex;

    return {
      firstMismatchIndex,
      matchedCount,
      prefixMatches,
      ready: prefixMatches && ingredients.length === targetIngredients.length,
    };
  }

  formatIngredientGroup(ingredient) {
    const brewQuantity = this.getIngredientBrewQuantity(ingredient);

    if (brewQuantity > 1) {
      return `- ${brewQuantity} x ${ingredient.quantity} ${ingredient.label}`;
    }

    return `- ${ingredient.quantity} ${ingredient.label}`;
  }

  getIngredientBrewQuantity(ingredient) {
    const brewQuantity = Math.floor(Number(ingredient?.brewQuantity));
    return Number.isInteger(brewQuantity) && brewQuantity > 1 ? brewQuantity : 1;
  }

  formatGuideStepValue(ingredient, match) {
    if (ingredient.endIndex <= match.matchedCount) {
      return 'placed';
    }

    if (
      ingredient.startIndex <= match.firstMismatchIndex &&
      match.firstMismatchIndex < ingredient.endIndex
    ) {
      return 'needed';
    }

    if (
      match.prefixMatches &&
      ingredient.startIndex <= match.matchedCount &&
      match.matchedCount < ingredient.endIndex &&
      !match.ready
    ) {
      return 'next';
    }

    return '';
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
        this.onRemoveIngredient(slotIndex, cauldronIndex);
      }
    });

    const label = document.createElement('span');
    label.className = 'row_key';

    const action = document.createElement('span');
    action.className = 'row_val';

    row.append(label, action);
    this.setAttribute(row, 'data-cauldron-index', String(cauldronRefs.cauldronIndex));
    cauldronRefs.items.append(row);

    const refs = { row, label, action };
    cauldronRefs.ingredientRows[index] = refs;
    return refs;
  }

  renderActions(refs, brewing) {
    const action = this.getPrimaryAction(brewing);

    this.setText(
      refs.actions.actionButtonLabel,
      action.hasCost ? `${action.label} ` : action.label,
    );
    this.setHidden(refs.actions.actionButtonCost, !action.hasCost);
    setResourceColor(refs.actions.actionButtonCost, action.costResource ?? 'mana');
    this.setResourceText(
      refs.actions.actionButtonCost,
      action.hasCost ? action.costText ?? `(${brewing.manaCost} mana)` : '',
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
    this.setHidden(refs.actions.message, true);
    this.setText(refs.actions.message, '');
    this.renderSelectRecipeButton(refs, brewing);
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

    const label = brewing.selectedRecipe ? 'change recipe' : 'select recipe';
    this.setText(selectRecipeButton, label);
    this.setDisabled(selectRecipeButton, false);
    this.removeAttribute(selectRecipeButton, 'aria-hidden');
    this.setAttribute(
      selectRecipeButton,
      'aria-label',
      `open ${label} for cauldron ${brewing.cauldronNumber ?? brewing.cauldronIndex + 1}`,
    );

    if (brewing.autoBrewAvailable === true) {
      this.setAttribute(selectRecipeButton, 'data-state', brewing.autoBrewEnabled ? 'on' : 'off');
      this.setAttribute(
        selectRecipeButton,
        'aria-pressed',
        brewing.autoBrewEnabled ? 'true' : 'false',
      );
      return;
    }

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
    const brewQuantity = this.getBrewQuantity(brewing);

    return {
      id: 'brew',
      label: brewQuantity > 1 ? `brew x${brewQuantity}` : 'brew',
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
    const requestedCauldron = brewing.cauldrons.find(
      (cauldron) => cauldron.cauldronIndex === cauldronIndex,
    );
    const targetCauldron =
      requestedCauldron?.canAddIngredient && !requestedCauldron.activeBrew
        ? requestedCauldron
        : this.getAddTargetCauldron(brewing.cauldrons);
    const targetCauldronIndex = targetCauldron?.cauldronIndex ?? cauldronIndex;
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
      return;
    }

    this.selectCauldron(targetCauldronIndex);
    this.message = null;
    this.render(this.gameplayFacade.getSnapshot());
  }

  onRemoveIngredient(slotIndex, cauldronIndex = this.selectedCauldronIndex) {
    const targetCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
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
    }
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
    const result = this.gameplayFacade.brewCauldron(safeCauldronIndex);

    if (result.ok) {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: `brewing ${this.formatPotionQuantity(result.potion.label, result.quantity)}`,
      };
    } else {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
    }

    this.render(this.gameplayFacade.getSnapshot());
    this.flashMessage(safeCauldronIndex);
  }

  onBottle(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const result = this.gameplayFacade.startBrewingBottling(safeCauldronIndex);

    if (result.ok) {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: `bottling ${result.potion.label}`,
      };
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
    this.flashMessage(result.ok ? result.cauldronNumber - 1 : safeCauldronIndex);
  }

  onCauldronWorldClick(event, cauldronIndex) {
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
    this.onOpenSelectRecipe?.(safeCauldronIndex);
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
    return starLevel > 0
      ? `cauldron ${cauldronNumber} ${formatStarLevel(starLevel).text}`
      : `cauldron ${cauldronNumber}`;
  }

  renderCauldronTitle(element, brewing) {
    if (!element) {
      return;
    }

    const cauldronNumber = Math.max(1, Math.floor(Number(brewing?.cauldronNumber) || 1));
    const cauldronStarLevel = this.getCauldronStarLevel(brewing);
    const starLevel = cauldronStarLevel > 0 ? formatStarLevel(cauldronStarLevel) : null;
    const signature = `${cauldronNumber}:${cauldronStarLevel}:${starLevel?.tone ?? 'none'}:${
      starLevel?.starCount ?? 0
    }`;

    if (element.dataset.cauldronStarTitle === signature) {
      return;
    }

    if (starLevel) {
      element.replaceChildren(
        document.createTextNode(`cauldron ${cauldronNumber} `),
        createStarLevelLabel(cauldronStarLevel),
      );
    } else {
      element.textContent = `cauldron ${cauldronNumber}`;
    }

    element.dataset.cauldronStarTitle = signature;
    element.setAttribute(
      'aria-label',
      starLevel
        ? `cauldron ${cauldronNumber} ${starLevel.ariaLabel}`
        : `cauldron ${cauldronNumber} 0 stars`,
    );
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

    if (count === 0) {
      return '';
    }

    if (brewing.match) {
      if (brewing.match.unlocked) {
        return `matches ${brewing.match.label}`;
      }

      return brewing.match.discoverable
        ? 'unknown recipe'
        : `${brewing.match.label} locked`;
    }

    return 'unknown mix';
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
      return `bottled ${this.formatPotionQuantity(activeBrew.label, activeBrew.resultQuantity)}`;
    }

    if (activeBrew.canStartBottling) {
      return `brewed ${this.formatPotionQuantity(activeBrew.label, activeBrew.resultQuantity)}`;
    }

    const timer = formatRemainingTime(remainingMs);
    return `${this.getActivePhaseLabel(activeBrew)} ${this.formatPotionQuantity(
      activeBrew.label,
      activeBrew.resultQuantity,
    )} ${timer}`;
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
      return `brew ${quantityPrefix}unknown recipe${costLabel}`;
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

    return quantity;
  }

  formatPotionQuantity(label, quantity) {
    const safeQuantity = Math.floor(Number(quantity));
    return Number.isInteger(safeQuantity) && safeQuantity > 1
      ? `x${safeQuantity} ${label}`
      : label;
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

  setTextWithItemIcons(element, text) {
    setTextWithItemIcons(element, text);
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
