import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { createStatusIcon, STATUS_ICON_CHECK } from '../../shared/statusIcon.js';
import { updateScrollCueState } from '../../managers/ScrollCueManager.js';

const DEFAULT_MAX_MANA_RESERVE = 5_000;
const seedDropPreferenceOptions = ['none', 'low', 'medium', 'high'];

export class WorkshopSummonInfoManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.lastSnapshot = {};
    this.renderedSignature = null;
    this.renderedAutoSignature = null;
    this.selectedSeedKey = null;
    this.selectionAnimationSeedKey = null;
    this.preferenceStatus = '';
    this.previousFocus = null;
    this.handleRowsScroll = () => this.updateScrollProgress();
    this.handleRootClick = (event) => {
      if (event.target === this.root) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
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
    this.root.className = 'workshop-page__summon-info-popup';
    this.root.addEventListener('click', this.handleRootClick);

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__summon-info-dialog style-dialog';
    this.refs.dialog.setAttribute('aria-label', 'Seed drop chances');
    this.refs.dialog.setAttribute('aria-modal', 'true');
    this.refs.dialog.setAttribute('role', 'dialog');
    this.refs.dialog.tabIndex = -1;

    this.refs.title = this.createTitle();
    this.refs.closeButton = this.createCloseButton();
    this.refs.autoRows = this.createAutoRows();
    this.refs.selectedEditor = this.createSelectedEditor();
    this.refs.rowsHeader = this.createRowsHeader();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__summon-info-rows';
    this.refs.rows.addEventListener('scroll', this.handleRowsScroll, { passive: true });
    this.refs.progress = this.createScrollProgress();

    this.refs.dialog.append(
      this.refs.title,
      this.refs.closeButton,
      this.refs.autoRows,
      this.refs.selectedEditor,
      this.refs.rowsHeader,
      this.refs.rows,
      this.refs.progress,
    );
    this.root.append(this.refs.dialog);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'summoning seeds';
    return title;
  }

  createCloseButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__summon-info-close';
    button.type = 'button';
    button.textContent = 'close';
    button.addEventListener('click', () => this.hide());
    return button;
  }

  createAutoRows() {
    const rows = document.createElement('div');
    rows.className = 'workshop-page__summon-info-auto';

    this.refs.autoToggleRow = this.createAutoToggleRow();
    this.refs.manaReserveRow = this.createManaReserveRow();

    rows.append(this.refs.autoToggleRow, this.refs.manaReserveRow);
    return rows;
  }

  createAutoToggleRow() {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__summon-info-row';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = 'auto summon';

    this.refs.autoToggleButton = document.createElement('button');
    this.refs.autoToggleButton.className = 'style-button workshop-page__summon-info-action';
    this.refs.autoToggleButton.type = 'button';
    this.refs.autoToggleButton.addEventListener('click', () => this.toggleAutoSummon());

    const value = document.createElement('span');
    value.className = 'row_val workshop-page__summon-info-value';
    value.append(this.refs.autoToggleButton);

    row.append(key, value);
    return row;
  }

  createManaReserveRow() {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__summon-info-row';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = 'keep mana above';

    this.refs.manaReserveInput = document.createElement('input');
    this.refs.manaReserveInput.className =
      'style-input workshop-page__summon-info-reserve-input';
    this.refs.manaReserveInput.type = 'number';
    this.refs.manaReserveInput.inputMode = 'numeric';
    this.refs.manaReserveInput.min = '0';
    this.refs.manaReserveInput.step = '1';
    this.refs.manaReserveInput.autocomplete = 'off';
    this.refs.manaReserveInput.setAttribute(
      'aria-label',
      'minimum mana auto summon leaves unused',
    );
    this.refs.manaReserveInput.addEventListener('change', () => this.commitManaReserve());
    this.refs.manaReserveInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      this.commitManaReserve();
      this.refs.manaReserveInput.blur();
    });

    const value = document.createElement('span');
    value.className = 'row_val workshop-page__summon-info-value';
    value.append(this.refs.manaReserveInput);

    row.append(key, value);
    return row;
  }

  createRowsHeader() {
    const row = document.createElement('div');
    row.className =
      'workshop-page__row workshop-page__summon-info-row workshop-page__summon-info-header';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = 'name';

    const value = document.createElement('span');
    value.className = 'row_val workshop-page__summon-info-value';

    const weight = document.createElement('span');
    weight.className = 'workshop-page__summon-info-weight-header';
    weight.textContent = 'weight';

    const chance = document.createElement('span');
    chance.className = 'workshop-page__summon-info-chance';
    chance.textContent = 'chance';

    value.append(weight, chance);
    row.append(key, value);
    return row;
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.render(this.lastSnapshot);
    this.applyVisibility();
    this.refs.dialog?.focus();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.removeEventListener('click', this.handleRootClick);
    this.refs.rows?.removeEventListener('scroll', this.handleRowsScroll);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.lastSnapshot = {};
    this.renderedSignature = null;
    this.renderedAutoSignature = null;
    this.selectedSeedKey = null;
    this.selectionAnimationSeedKey = null;
    this.preferenceStatus = '';
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    this.renderAutoSummoning(this.getAutoSummoning(this.lastSnapshot));
    const rows = this.getRows(this.lastSnapshot);
    this.ensureSelectedSeed(rows);
    this.renderSelectedEditor(rows);
    this.refs.rowsHeader.hidden = rows.length === 0;
    const signature = rows
      .map(
        (row) =>
          `${row.itemTypeId}:${row.key}:${row.label}:${row.dropPreference}:${row.dropChance}`,
      )
      .join('|');
    const renderSignature = `${this.selectedSeedKey}:${this.preferenceStatus}:${signature}`;

    if (renderSignature === this.renderedSignature) {
      this.selectionAnimationSeedKey = null;
      this.updateScrollProgress();
      return;
    }

    this.renderedSignature = renderSignature;
    const selectionAnimationSeedKey = this.selectionAnimationSeedKey;
    this.refs.rows.replaceChildren(
      ...(rows.length
        ? rows.map((row) => this.createRow(row, row.key === selectionAnimationSeedKey))
        : [this.createEmptyRow()]),
    );
    this.selectionAnimationSeedKey = null;
    this.updateScrollProgress();
  }

  getRows(snapshot) {
    return Array.isArray(snapshot?.seedSummoning?.dropChances)
      ? snapshot.seedSummoning.dropChances
      : [];
  }

  getAutoSummoning(snapshot) {
    const autoSummoning = snapshot?.seedSummoning?.autoSummoning;

    return autoSummoning && typeof autoSummoning === 'object' ? autoSummoning : {};
  }

  renderAutoSummoning(autoSummoning = {}) {
    const unlocked = autoSummoning.unlocked === true;
    const enabled = autoSummoning.enabled !== false;
    const manaReserve = this.normalizeManaReserve(autoSummoning.manaReserve);
    const maxManaReserve = this.normalizeMaxManaReserve(autoSummoning.maxManaReserve);
    const signature = `${unlocked}:${enabled}:${manaReserve}:${maxManaReserve}`;

    if (signature === this.renderedAutoSignature) {
      return;
    }

    this.renderedAutoSignature = signature;
    this.refs.autoRows.hidden = !unlocked;
    this.setText(this.refs.autoToggleButton, enabled ? 'enabled' : 'disabled');
    this.setAttribute(
      this.refs.autoToggleButton,
      'aria-label',
      enabled ? 'disable auto summon' : 'enable auto summon',
    );
    this.refs.autoToggleButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    this.refs.manaReserveInput.max = String(maxManaReserve);

    if (document.activeElement !== this.refs.manaReserveInput) {
      this.refs.manaReserveInput.value = String(manaReserve);
    }
  }

  createSelectedEditor() {
    const editor = document.createElement('div');
    editor.className = 'workshop-page__summon-info-editor';

    const seedRow = this.createEditorRow('seed');
    this.refs.selectedSeedName = document.createElement('span');
    this.refs.selectedSeedName.className = 'workshop-page__summon-info-selected-name';
    seedRow.value.append(this.refs.selectedSeedName);

    const chanceRow = this.createEditorRow('chance');
    this.refs.selectedChance = document.createElement('span');
    this.refs.selectedChance.className = 'workshop-page__summon-info-chance';
    chanceRow.value.append(this.refs.selectedChance);

    this.refs.weightLabel = document.createElement('div');
    this.refs.weightLabel.className = 'workshop-page__summon-info-weight-label';
    this.refs.weightLabel.textContent = 'weight';

    this.refs.weightChoiceGroup = document.createElement('span');
    this.refs.weightChoiceGroup.className = 'workshop-page__summon-info-weight-choices';
    this.refs.weightChoiceGroup.setAttribute('aria-label', 'selected seed drop weight');
    this.refs.weightChoiceButtons = new Map();

    for (const optionValue of seedDropPreferenceOptions) {
      const option = document.createElement('button');
      option.className = 'workshop-page__summon-info-weight-choice';
      option.type = 'button';
      option.dataset.preference = optionValue;
      const check = document.createElement('span');
      check.className = 'workshop-page__summon-info-weight-check';
      check.setAttribute('aria-hidden', 'true');
      const checkIcon = createStatusIcon(
        'workshop-page__summon-info-weight-check-icon',
        STATUS_ICON_CHECK,
      );
      if (checkIcon) {
        check.append(checkIcon);
      }

      const label = document.createElement('span');
      label.className = 'workshop-page__summon-info-weight-choice-label';
      label.textContent = optionValue;

      option.append(check, label);
      option.addEventListener('click', () => this.commitSelectedDropPreference(optionValue));
      this.refs.weightChoiceButtons.set(optionValue, option);
      this.refs.weightChoiceGroup.append(option);
    }

    this.refs.preferenceStatus = document.createElement('div');
    this.refs.preferenceStatus.className = 'workshop-page__summon-info-status';
    this.refs.preferenceStatus.hidden = true;

    editor.append(
      seedRow.row,
      chanceRow.row,
      this.refs.weightLabel,
      this.refs.weightChoiceGroup,
      this.refs.preferenceStatus,
    );
    return editor;
  }

  createEditorRow(label) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__summon-info-row';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = label;

    const value = document.createElement('span');
    value.className = 'row_val workshop-page__summon-info-value';

    row.append(key, value);
    return { row, value };
  }

  createScrollProgress() {
    const progress = document.createElement('div');
    progress.className =
      'style-progress style-scroll-cue-progress workshop-page__summon-info-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.hidden = true;

    this.refs.progressFill = document.createElement('div');
    this.refs.progressFill.className =
      'style-progress__fill style-scroll-cue-progress-fill workshop-page__summon-info-progress-fill';
    progress.append(this.refs.progressFill);
    return progress;
  }

  createRow(seed, animateSelection = false) {
    const row = document.createElement('button');
    row.className =
      'workshop-page__row workshop-page__summon-info-row workshop-page__summon-info-seed-row';
    row.type = 'button';
    row.dataset.seedKey = seed.key;
    row.setAttribute('aria-pressed', seed.key === this.selectedSeedKey ? 'true' : 'false');
    row.addEventListener('click', () => this.selectSeed(seed.key));
    row.classList.toggle('is-selected', seed.key === this.selectedSeedKey);
    row.classList.toggle('is-selection-updated', animateSelection);
    setResourceColor(row, 'seed');

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = seed.label;
    setItemIconLabel(key, 'seed', seed.key);

    const value = document.createElement('span');
    value.className = 'row_val workshop-page__summon-info-value';

    const weight = document.createElement('span');
    weight.className = 'workshop-page__summon-info-weight-value';
    weight.textContent = this.normalizeDropPreference(seed.dropPreference);
    const chance = document.createElement('span');
    chance.className = 'workshop-page__summon-info-chance';
    setResourceIconText(chance, this.formatDropChance(seed.dropChance));

    value.append(weight, chance);

    row.append(key, value);
    return row;
  }

  createEmptyRow() {
    const row = document.createElement('div');
    row.className = 'workshop-page__summon-info-empty';
    row.textContent = 'no seeds researched';
    return row;
  }

  formatDropChance(dropChance) {
    const percent = Number(dropChance) * 100;

    if (!Number.isFinite(percent) || percent <= 0) {
      return '0%';
    }

    const precision = percent < 10 ? 2 : 1;
    return `${Number(percent.toFixed(precision))}%`;
  }

  toggleAutoSummon() {
    this.gameplayFacade?.toggleSeedSummoningAutoEnabled?.();
    this.render(this.gameplayFacade?.getSnapshot?.());
  }

  commitManaReserve() {
    const result = this.gameplayFacade?.setSeedSummoningManaReserve?.(
      this.refs.manaReserveInput?.value,
    );
    const manaReserve = this.normalizeManaReserve(
      result?.manaReserve ?? this.refs.manaReserveInput?.value,
    );

    this.refs.manaReserveInput.value = String(manaReserve);
    this.render(this.gameplayFacade?.getSnapshot?.());
  }

  commitSelectedDropPreference(preference) {
    const rows = this.getRows(this.lastSnapshot);
    const seed = this.getSelectedSeed(rows);

    if (!seed) {
      return;
    }

    const normalizedPreference = this.normalizeDropPreference(preference);

    if (!this.isDropPreferenceAvailable(seed, normalizedPreference, rows)) {
      this.preferenceStatus = 'one seed must stay active';
      this.render(this.lastSnapshot);
      return;
    }

    this.selectionAnimationSeedKey = seed.key;
    const result = this.gameplayFacade?.setSeedDropPreference?.(
      seed.key,
      normalizedPreference,
    );

    if (result?.ok === false) {
      this.selectionAnimationSeedKey = null;
      this.preferenceStatus = this.getDropPreferenceErrorText(result.reason);
    } else {
      this.preferenceStatus = '';
    }

    this.render(this.gameplayFacade?.getSnapshot?.());
  }

  selectSeed(seedKey) {
    if (this.selectedSeedKey === seedKey) {
      return;
    }

    this.selectedSeedKey = seedKey;
    this.preferenceStatus = '';
    this.render(this.lastSnapshot);
  }

  ensureSelectedSeed(rows) {
    if (!rows.length) {
      this.selectedSeedKey = null;
      return null;
    }

    const selectedSeed = this.getSelectedSeed(rows);
    if (selectedSeed) {
      return selectedSeed;
    }

    this.selectedSeedKey = rows[0].key;
    return rows[0];
  }

  getSelectedSeed(rows) {
    return (
      rows.find((seed) => String(seed?.key ?? '') === String(this.selectedSeedKey ?? '')) ??
      null
    );
  }

  renderSelectedEditor(rows) {
    const selectedSeed = this.getSelectedSeed(rows);

    this.refs.selectedEditor.hidden = !selectedSeed;

    if (!selectedSeed) {
      return;
    }

    this.refs.selectedSeedName.textContent = selectedSeed.label;
    setItemIconLabel(this.refs.selectedSeedName, 'seed', selectedSeed.key);
    setResourceColor(this.refs.selectedSeedName, 'seed');
    setResourceIconText(this.refs.selectedChance, this.formatDropChance(selectedSeed.dropChance));
    const selectedPreference = this.normalizeDropPreference(selectedSeed.dropPreference);

    for (const optionValue of seedDropPreferenceOptions) {
      const button = this.refs.weightChoiceButtons.get(optionValue);
      const selected = optionValue === selectedPreference;
      const disabled = !this.isDropPreferenceAvailable(selectedSeed, optionValue, rows);

      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.disabled = disabled;
      button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }

    this.refs.preferenceStatus.hidden = !this.preferenceStatus;
    this.refs.preferenceStatus.textContent = this.preferenceStatus;
  }

  isDropPreferenceAvailable(seed, preference, rows) {
    const normalizedPreference = this.normalizeDropPreference(preference);

    if (normalizedPreference !== 'none') {
      return true;
    }

    if (this.normalizeDropPreference(seed?.dropPreference) === 'none') {
      return true;
    }

    return rows.some(
      (row) =>
        row.key !== seed.key &&
        this.getDropPreferenceWeight(this.normalizeDropPreference(row.dropPreference)) > 0,
    );
  }

  getDropPreferenceWeight(preference) {
    return seedDropPreferenceOptions.indexOf(this.normalizeDropPreference(preference));
  }

  getDropPreferenceErrorText(reason) {
    if (reason === 'last_active_seed') {
      return 'one seed must stay active';
    }

    return '';
  }

  updateScrollProgress() {
    updateScrollCueState({
      scrollElement: this.refs.rows,
      cueElement: this.refs.rows,
      progressFill: this.refs.progressFill,
      progressElement: this.refs.progress,
      inlineCue: false,
    });
  }

  normalizeDropPreference(preference) {
    return seedDropPreferenceOptions.includes(preference) ? preference : 'medium';
  }

  normalizeManaReserve(value) {
    const reserve = Math.floor(Number(value));

    return Number.isFinite(reserve) && reserve > 0 ? reserve : 0;
  }

  normalizeMaxManaReserve(value) {
    const max = this.normalizeManaReserve(value);

    return max > 0 ? max : DEFAULT_MAX_MANA_RESERVE;
  }

  setText(element, text) {
    if (element && element.textContent !== text) {
      element.textContent = text;
    }
  }

  setAttribute(element, name, value) {
    if (element && element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

  applyVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden = !this.visible;
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
    this.updateScrollProgress();
  }
}
