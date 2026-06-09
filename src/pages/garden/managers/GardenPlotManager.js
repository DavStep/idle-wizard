export class GardenPlotManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.tileRefs = new Map();
    this.seedRefs = new Map();
    this.emptySeedRef = null;
    this.seedRowOrderKey = '';
    this.selectedTileNumber = null;
    this.visible = false;
    this.previousFocus = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
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

  mount(parent) {
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
    parent.append(this.root, this.refs.popup);
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
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.tileRefs.clear();
    this.seedRefs.clear();
    this.emptySeedRef = null;
    this.seedRowOrderKey = '';
    this.selectedTileNumber = null;
    this.visible = false;
    this.previousFocus = null;
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
    title.textContent = 'seed';
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
    button.addEventListener('click', (event) => this.onTileClick(tileNumber, event));

    const number = document.createElement('span');
    number.className = 'garden-page__plot-number';
    number.textContent = String(tileNumber);

    const label = document.createElement('span');
    label.className = 'garden-page__plot-label';

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

    progress.append(fill, progressText);
    action.append(actionLabel, actionGap, actionTimer);
    button.append(number, label, state, action, progress);
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
    });
    this.refs.rows.append(button);
  }

  createSeedRow(seed) {
    const row = document.createElement('div');
    row.className = 'garden-page__seed-row';

    const button = document.createElement('button');
    button.className = 'garden-page__seed-button';
    button.type = 'button';
    button.addEventListener('click', () => this.onSelectSeed(seed.itemTypeId));

    const label = document.createElement('span');
    label.className = 'row_key';

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
    button.addEventListener('click', () => this.onSelectSeed(null));

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
    const garden = snapshot.garden;
    const seedQuantityById = new Map(
      garden.seeds.map((seed) => [seed.itemTypeId, seed.quantity]),
    );
    this.ensureTiles(garden.plot.maxTiles);
    this.ensureEmptySeedRow();
    this.ensureSeedRows(garden.seeds);

    for (const tile of garden.plot.tiles) {
      this.renderTile({
        tile,
        plot: garden.plot,
        gold: snapshot.gold,
        seedQuantityById,
      });
    }

    this.renderSeeds(garden.seeds);
    this.updateOverflowCues();
  }

  renderTile({ tile, plot, gold, seedQuantityById }) {
    const refs = this.tileRefs.get(tile.tileNumber);
    const isNextLockedTile = tile.tileNumber === plot.nextTileNumber;
    const selectedSeedQuantity = tile.selectedSeedItemTypeId
      ? (seedQuantityById.get(tile.selectedSeedItemTypeId) ?? 0)
      : 0;
    const hasSelectedSeed = Boolean(tile.selectedSeedItemTypeId);

    refs.button.hidden = !tile.unlocked && !isNextLockedTile;
    refs.button.classList.toggle('is-locked', !tile.unlocked);
    refs.button.classList.toggle('is-empty', tile.unlocked && tile.phase === 'empty');
    refs.button.classList.toggle(
      'is-plantable',
      tile.unlocked && tile.phase === 'empty' && hasSelectedSeed && selectedSeedQuantity > 0,
    );
    refs.button.classList.toggle('is-ready', tile.phase === 'ready');
    refs.button.classList.toggle('is-processing', Boolean(tile.process));

    if (!tile.unlocked) {
      refs.label.textContent = isNextLockedTile ? `plot ${tile.tileNumber}` : '';
      refs.state.textContent = '';
      this.setTileAction(refs, {
        label: isNextLockedTile ? `buy ${this.formatGold(plot.nextTileCost)}` : '',
      });
      refs.button.disabled = !isNextLockedTile || gold.current < plot.nextTileCost;
      refs.button.setAttribute(
        'aria-label',
        isNextLockedTile ? `buy garden tile ${tile.tileNumber}` : `locked tile ${tile.tileNumber}`,
      );
      refs.button.setAttribute('aria-disabled', refs.button.disabled ? 'true' : 'false');
      this.hideProgress(refs);
      return;
    }

    refs.button.disabled = false;
    refs.button.setAttribute('aria-disabled', 'false');

    if (tile.phase === 'empty') {
      refs.label.textContent = tile.selectedSeedLabel ?? 'empty';
      refs.state.textContent = '';
      this.setTileAction(refs, {
        label: hasSelectedSeed ? (selectedSeedQuantity > 0 ? 'plant' : 'no seeds') : 'choose',
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

    refs.label.textContent = tile.selectedSeedLabel ?? 'empty';
    refs.state.textContent = '';
    this.setTileAction(refs, this.formatTileAction(tile));
    refs.button.setAttribute(
      'aria-label',
      tile.phase === 'ready'
        ? `start harvesting ${tile.herbLabel}`
        : `${tile.herbLabel} ${tile.phase}`,
    );

    if (tile.process) {
      this.renderProgress(refs, tile.process.progress);
    } else if (tile.phase === 'ready') {
      this.renderProgress(refs, 1);
    } else {
      this.hideProgress(refs);
    }
  }

  renderProgress(refs, progress) {
    refs.progress.hidden = false;
    refs.fill.style.width = `${Math.round(progress * 100)}%`;
    this.setText(refs.progressText, '');
  }

  hideProgress(refs) {
    refs.progress.hidden = true;
    refs.fill.style.width = '0%';
    this.setText(refs.progressText, '');
  }

  renderSeeds(seeds) {
    if (this.emptySeedRef) {
      this.emptySeedRef.button.disabled = false;
      this.emptySeedRef.button.setAttribute('aria-disabled', 'false');
      this.emptySeedRef.button.setAttribute('aria-label', 'set plot seed to empty');
    }

    for (const seed of seeds) {
      const refs = this.seedRefs.get(seed.itemTypeId);
      refs.label.textContent = seed.label;
      refs.quantity.textContent = String(seed.quantity);
      refs.button.disabled = false;
      refs.button.setAttribute('aria-disabled', 'false');
      refs.button.setAttribute('aria-label', `select ${seed.label}, owned ${seed.quantity}`);
    }

    this.applySeedRowOrder(seeds);
  }

  applySeedRowOrder(seeds) {
    const availableSeeds = seeds.filter((seed) => seed.quantity > 0);
    const emptySeeds = seeds.filter((seed) => seed.quantity <= 0);
    const orderedEntries = [
      'empty',
      ...availableSeeds.map((seed) => `seed:${seed.itemTypeId}`),
      ...(availableSeeds.length > 0 && emptySeeds.length > 0 ? ['divider'] : []),
      ...emptySeeds.map((seed) => `seed:${seed.itemTypeId}`),
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
      this.refs.seedDivider.setAttribute('role', 'separator');
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
    for (const seed of seeds) {
      if (!this.seedRefs.has(seed.itemTypeId)) {
        this.createSeedRow(seed);
      }
    }
  }

  onTileClick(tileNumber, event) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const garden = snapshot.garden;
    const tile = garden.plot.tiles.find((candidate) => candidate.tileNumber === tileNumber);
    const clickedLabel = Boolean(event?.target?.closest?.('.garden-page__plot-label'));

    if (!tile) {
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

      if (tile.selectedSeedItemTypeId) {
        const result = this.gameplayFacade.plantSelectedGardenSeed(tileNumber);

        if (result.ok) {
          this.render(this.gameplayFacade.getSnapshot());
          return;
        }
      }

      this.showSeedPopup(tileNumber);
      return;
    }

    if (tile.phase === 'ready') {
      this.gameplayFacade.startGardenHarvest(tileNumber);
      this.render(this.gameplayFacade.getSnapshot());
    }
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

  formatGold(value) {
    return Number.isFinite(value) ? `${value}g` : '?g';
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

  setTileAction(refs, { label, timer = '' }) {
    this.setText(refs.actionLabel, label);
    this.setText(refs.actionGap, timer ? ' ' : '');
    this.setText(refs.actionTimer, timer);
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
}
