import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';

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
    this.openWeightDropdownSeedKey = null;
    this.selectionAnimationSeedKey = null;
    this.previousFocus = null;
    this.handleRootClick = (event) => {
      if (event.target === this.root) {
        this.hide();
      }
    };
    this.handleDialogClick = (event) => {
      if (!event.target?.closest?.('.workshop-page__summon-info-weight-dropdown')) {
        this.closeWeightDropdown();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      if (this.openWeightDropdownSeedKey) {
        this.closeWeightDropdown({ restoreFocus: true });
        return;
      }

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
    this.refs.dialog.addEventListener('click', this.handleDialogClick);

    this.refs.title = this.createTitle();
    this.refs.closeButton = this.createCloseButton();
    this.refs.autoRows = this.createAutoRows();
    this.refs.rowsHeader = this.createRowsHeader();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__summon-info-rows';

    this.refs.dialog.append(
      this.refs.title,
      this.refs.closeButton,
      this.refs.autoRows,
      this.refs.rowsHeader,
      this.refs.rows,
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
    this.refs.dialog?.removeEventListener('click', this.handleDialogClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.lastSnapshot = {};
    this.renderedSignature = null;
    this.renderedAutoSignature = null;
    this.openWeightDropdownSeedKey = null;
    this.selectionAnimationSeedKey = null;
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    this.renderAutoSummoning(this.getAutoSummoning(this.lastSnapshot));
    const rows = this.getRows(this.lastSnapshot);
    this.refs.rowsHeader.hidden = rows.length === 0;
    const signature = rows
      .map(
        (row) =>
          `${row.itemTypeId}:${row.key}:${row.label}:${row.dropPreference}:${row.dropChance}`,
      )
      .join('|');

    if (signature === this.renderedSignature) {
      this.selectionAnimationSeedKey = null;
      this.syncWeightDropdownState();
      return;
    }

    this.renderedSignature = signature;
    const selectionAnimationSeedKey = this.selectionAnimationSeedKey;
    this.refs.rows.replaceChildren(
      ...(rows.length
        ? rows.map((row) => this.createRow(row, row.key === selectionAnimationSeedKey))
        : [this.createEmptyRow()]),
    );
    this.selectionAnimationSeedKey = null;
    this.syncWeightDropdownState();
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

  createRow(seed, animateSelection = false) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__summon-info-row';
    row.dataset.seedKey = seed.key;
    row.classList.toggle('is-selection-updated', animateSelection);
    setResourceColor(row, 'seed');

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = seed.label;
    setItemIconLabel(key, 'seed', seed.key);

    const value = document.createElement('span');
    value.className = 'row_val workshop-page__summon-info-value';

    const dropdown = this.createWeightDropdown(seed);
    const chance = document.createElement('span');
    chance.className = 'workshop-page__summon-info-chance';
    chance.dataset.dropRateColor = this.getDropRateColor(seed.dropChance);
    setResourceIconText(chance, this.formatDropChance(seed.dropChance));

    value.append(dropdown, chance);

    row.append(key, value);
    return row;
  }

  createWeightDropdown(seed) {
    const preference = this.normalizeDropPreference(seed.dropPreference);
    const dropdown = document.createElement('span');
    dropdown.className = 'workshop-page__summon-info-weight-dropdown';
    dropdown.dataset.seedKey = seed.key;

    const button = document.createElement('button');
    button.className = 'workshop-page__summon-info-weight-button';
    button.type = 'button';
    button.setAttribute('aria-label', `${seed.label} drop weight: ${preference}`);
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', this.getWeightDropdownMenuId(seed.key));
    button.addEventListener('click', () => this.toggleWeightDropdown(seed.key));
    button.addEventListener('keydown', (event) =>
      this.handleWeightButtonKeydown(event, seed.key),
    );
    button.append(this.createWeightDropdownText(preference));

    const menu = document.createElement('span');
    menu.id = this.getWeightDropdownMenuId(seed.key);
    menu.className = 'workshop-page__summon-info-weight-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', `${seed.label} drop weight options`);
    menu.hidden = true;

    for (const optionValue of seedDropPreferenceOptions) {
      if (optionValue === preference) {
        continue;
      }

      const option = document.createElement('button');
      option.className = 'workshop-page__summon-info-weight-option';
      option.type = 'button';
      option.dataset.preference = optionValue;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.append(this.createWeightDropdownText(optionValue));
      option.addEventListener('click', () => this.commitDropPreference(seed, optionValue));
      option.addEventListener('keydown', (event) =>
        this.handleWeightOptionKeydown(event, seed),
      );
      menu.append(option);
    }

    dropdown.append(button, menu);
    return dropdown;
  }

  createWeightDropdownText(text) {
    const label = document.createElement('span');
    label.className = 'workshop-page__summon-info-weight-text';
    label.textContent = text;
    return label;
  }

  getWeightDropdownMenuId(seedKey) {
    return `workshop-summon-info-weight-${seedKey}`;
  }

  handleWeightButtonKeydown(event, seedKey) {
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      return;
    }

    event.preventDefault();
    this.openWeightDropdown(seedKey, { focusSelected: true });
  }

  handleWeightOptionKeydown(event, seed) {
    const options = [
      ...(event.currentTarget.parentElement?.querySelectorAll(
        '.workshop-page__summon-info-weight-option',
      ) ?? []),
    ];
    const currentIndex = options.indexOf(event.currentTarget);

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeWeightDropdown({ restoreFocus: true });
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.commitDropPreference(seed, event.currentTarget.dataset.preference);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      options[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      options.at(-1)?.focus();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    event.preventDefault();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + step + options.length) % options.length;
    options[nextIndex]?.focus();
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

  getDropRateColor(dropChance) {
    const rate = Number(dropChance);

    if (!Number.isFinite(rate) || rate <= 0) {
      return 'none';
    }

    if (rate < 1 / 3) {
      return 'low';
    }

    if (rate < 2 / 3) {
      return 'medium';
    }

    return 'high';
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

  commitDropPreference(seed, preference) {
    const normalizedPreference = this.normalizeDropPreference(preference);
    this.selectionAnimationSeedKey = seed.key;
    const result = this.gameplayFacade?.setSeedDropPreference?.(
      seed.key,
      normalizedPreference,
    );

    if (result?.ok === false) {
      this.selectionAnimationSeedKey = null;
    }

    this.closeWeightDropdown({ restoreFocus: true });
    this.render(this.gameplayFacade?.getSnapshot?.());
  }

  toggleWeightDropdown(seedKey) {
    if (this.openWeightDropdownSeedKey === seedKey) {
      this.closeWeightDropdown({ restoreFocus: true });
      return;
    }

    this.openWeightDropdown(seedKey);
  }

  openWeightDropdown(seedKey, { focusSelected = false } = {}) {
    this.openWeightDropdownSeedKey = seedKey;
    this.syncWeightDropdownState();

    if (focusSelected) {
      this.focusSelectedWeightOption(seedKey);
    }
  }

  closeWeightDropdown({ restoreFocus = false } = {}) {
    const seedKey = this.openWeightDropdownSeedKey;

    if (!seedKey) {
      return;
    }

    this.openWeightDropdownSeedKey = null;
    this.syncWeightDropdownState();

    if (restoreFocus) {
      this.findWeightDropdown(seedKey)
        ?.querySelector('.workshop-page__summon-info-weight-button')
        ?.focus();
    }
  }

  syncWeightDropdownState() {
    const dropdowns = [
      ...(this.root?.querySelectorAll('.workshop-page__summon-info-weight-dropdown') ?? []),
    ];

    for (const dropdown of dropdowns) {
      const isOpen = dropdown.dataset.seedKey === this.openWeightDropdownSeedKey;
      dropdown.classList.toggle('is-open', isOpen);
      dropdown
        .querySelector('.workshop-page__summon-info-weight-button')
        ?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const menu = dropdown.querySelector('.workshop-page__summon-info-weight-menu');

      if (menu) {
        menu.hidden = !isOpen;
      }
    }
  }

  focusSelectedWeightOption(seedKey) {
    const dropdown = this.findWeightDropdown(seedKey);
    const selectedOption =
      dropdown?.querySelector(
        '.workshop-page__summon-info-weight-option[aria-selected="true"]',
      ) ?? dropdown?.querySelector('.workshop-page__summon-info-weight-option');

    selectedOption?.focus();
  }

  findWeightDropdown(seedKey) {
    return (
      [
        ...(this.root?.querySelectorAll(
          '.workshop-page__summon-info-weight-dropdown',
        ) ?? []),
      ].find((dropdown) => dropdown.dataset.seedKey === seedKey) ?? null
    );
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

    if (!this.visible) {
      this.closeWeightDropdown();
    }

    this.root.hidden = !this.visible;
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
