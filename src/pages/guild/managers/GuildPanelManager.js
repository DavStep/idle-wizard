import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import {
  DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
  TRADE_ALLIANCE_TAG_COLORS,
  getTradeAllianceTagColorCssValue,
  normalizeTradeAllianceTagColor,
} from '../../../shared/tradeAllianceTagColors.js';
import { createAllianceTagSpan } from '../../shared/allianceTagLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';

const CARD_TABS = [
  { id: 'stats', label: 'stats' },
  { id: 'life', label: 'life' },
  { id: 'history', label: 'history' },
];

const CONTENT_TABS = [
  { id: 'hall', label: 'hall' },
  { id: 'board', label: 'board' },
  { id: 'adventurers', label: 'roster' },
  { id: 'log', label: 'log' },
];

export class GuildPanelManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.popupLayer = null;
    this.unsubscribe = null;
    this.snapshot = {};
    this.selectedContentTab = 'hall';
    this.selectedCardTab = 'stats';
    this.selectedCardId = null;
    this.selectedCardKind = null;
    this.formDrafts = {
      charter: null,
      settings: null,
    };
    this.refs = {};
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hidePopup();
      }
    };
    this.handleKeydown = (event) => {
      if (this.refs.popup?.hidden || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hidePopup();
    };
  }

  mount(parent, popupLayer) {
    if (this.root) {
      return this.root;
    }

    this.popupLayer = popupLayer;
    this.root = document.createElement('section');
    this.root.className = 'guild-page__content';
    parent.append(this.root);
    popupLayer.append(this.createPopup());
    document.addEventListener('keydown', this.handleKeydown);
    this.unsubscribe = this.gameplayFacade?.subscribe?.((snapshot) => this.render(snapshot)) ?? null;
    this.render(this.gameplayFacade?.getSnapshot?.() ?? {});

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.remove();
    this.root?.remove();
    this.root = null;
    this.popupLayer = null;
    this.refs = {};
    this.selectedContentTab = 'hall';
    this.formDrafts = {
      charter: null,
      settings: null,
    };
  }

  render(snapshot = {}) {
    if (!this.root) {
      return;
    }

    this.captureVisibleFormDraft();
    this.snapshot = snapshot.guild ?? {};
    this.root.classList.toggle('guild-page__content--centered', this.snapshot.created !== true);
    this.root.replaceChildren(...this.createMainSections());
    this.renderPopup();
  }

  createMainSections() {
    const guild = this.snapshot;

    if (!guild.unlocked) {
      return [
        this.createBox('guild', [
          this.createTextRow('locked', `level ${guild.unlockLevel ?? 15}`),
        ]),
      ];
    }

    if (!guild.created) {
      const charterCost = guild.charterCostCoin ?? 1500;
      return [
        this.createBox('guild charter', [
          this.createParagraph(
            'establish your guild to hire adventurers, take requests, and keep a hall of your own.',
          ),
          this.createCostButtonRow(
            'start guild',
            formatCoinPriceText(charterCost),
            () => this.showCharterDialog(),
            {
              disabled: !guild.canCreate,
              notification: guild.canCreate,
            },
          ),
        ]),
      ];
    }

    return this.createCreatedSections(guild);
  }

  createCreatedSections(guild) {
    const activeTab = this.getActiveContentTab();

    return [
      this.createContentTabs(activeTab.id, guild),
      this.createContentPanel(activeTab, this.getContentTabSections(guild, activeTab.id)),
    ];
  }

  createContentTabs(activeTabId, guild) {
    const tabs = document.createElement('div');
    tabs.className = 'guild-page__content-tabs';
    tabs.setAttribute('aria-label', 'Guild sections');
    tabs.setAttribute('role', 'tablist');

    for (const tab of CONTENT_TABS) {
      tabs.append(this.createContentTabButton(tab, activeTabId, guild));
    }

    return tabs;
  }

  createContentTabButton(tab, activeTabId, guild) {
    const button = document.createElement('button');
    button.className = 'style-button guild-page__content-tab-button';
    button.type = 'button';
    button.textContent = tab.label;
    button.dataset.guildTab = tab.id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
    button.setAttribute('tabindex', tab.id === activeTabId ? '0' : '-1');
    setNotificationBadge(button, this.getContentTabNotification(guild, tab.id));
    button.addEventListener('click', () => this.setActiveContentTab(tab.id));
    return button;
  }

  createContentPanel(tab, sections) {
    const panel = document.createElement('section');
    panel.className = 'guild-page__tabpanel';
    panel.dataset.guildTabPanel = tab.id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-label', tab.label);
    panel.append(...sections);
    return panel;
  }

  getContentTabSections(guild, tabId) {
    if (tabId === 'board') {
      return [this.createBoardBox(guild)];
    }

    if (tabId === 'adventurers') {
      return [this.createAdventurersBox(guild), this.createApplicantsBox(guild)];
    }

    if (tabId === 'log') {
      return [this.createLogBox(guild)];
    }

    return [this.createHallBox(guild)];
  }

  getContentTabNotification(guild, tabId) {
    if (tabId !== 'adventurers') {
      return false;
    }

    return (guild.adventurers ?? []).some((adventurer) =>
      adventurer.status === 'hospital' || adventurer.status === 'dead',
    );
  }

  getActiveContentTab() {
    return (
      CONTENT_TABS.find((tab) => tab.id === this.selectedContentTab) ??
      CONTENT_TABS[0]
    );
  }

  setActiveContentTab(tabId) {
    if (!CONTENT_TABS.some((tab) => tab.id === tabId) || this.selectedContentTab === tabId) {
      return;
    }

    this.selectedContentTab = tabId;
    this.render(this.gameplayFacade?.getSnapshot?.() ?? { guild: this.snapshot });
  }

  createHallBox(guild) {
    const profile = guild.profile ?? {};
    const profileLabel = document.createElement('span');
    const tag = createAllianceTagSpan(profile.tag, profile.color);
    profileLabel.append(
      ...(tag ? [tag, document.createTextNode(' ')] : []),
      document.createTextNode(profile.name),
    );
    return this.createBox(
      'guild hall',
      [
        this.createTextRow('name', profileLabel),
        this.createTextRow('secretary', `level ${guild.secretary?.level ?? 1}`),
        this.createTextRow(
          'adventurers',
          `${guild.adventurers?.filter((adventurer) => adventurer.status !== 'dead').length ?? 0}/${guild.secretary?.hiredCap ?? 1}`,
        ),
        this.createTextRow('board', `${guild.board?.length ?? 0}/${guild.secretary?.boardSlots ?? 3}`),
        this.createButtonRow('settings', () => this.showSettingsDialog()),
      ],
      {
        countLabel: guild.applicantResetLabel ? `applicants ${guild.applicantResetLabel}` : '',
      },
    );
  }

  createBoardBox(guild) {
    const rows = [];
    const eventBoard = guild.eventBoard ?? [];
    const normalBoard = guild.normalBoard ?? [];

    if (normalBoard.length <= 0 && eventBoard.length <= 0) {
      rows.push(this.createEmptyRow('no requests'));
    } else {
      rows.push(...normalBoard.map((request) => this.createRequestRow(request)));

      if (eventBoard.length > 0) {
        rows.push(this.createSectionLabel('event requests'));
        rows.push(...eventBoard.map((request) => this.createRequestRow(request)));
      }
    }

    return this.createBox('request board', rows, {
      countLabel: `${guild.board?.length ?? 0}/${guild.secretary?.boardSlots ?? 3}`,
      bottomLabel: guild.boardWaveLabel ? `next ${guild.boardWaveLabel}` : '',
    });
  }

  createAdventurersBox(guild) {
    const adventurers = guild.adventurers ?? [];
    const rows = adventurers.length
      ? adventurers.map((adventurer) => this.createAdventurerRow(adventurer, 'adventurer'))
      : [this.createEmptyRow('no adventurers')];
    return this.createBox('adventurers', rows, {
      countLabel: `${adventurers.length}/${guild.secretary?.hiredCap ?? 1}`,
    });
  }

  createApplicantsBox(guild) {
    const applicants = guild.applicants ?? [];
    const rows = applicants.length
      ? applicants.map((applicant) => this.createAdventurerRow(applicant, 'applicant'))
      : [this.createEmptyRow('no applicants')];
    return this.createBox('applicants', rows, {
      countLabel: guild.applicantResetLabel ? `next ${guild.applicantResetLabel}` : '',
    });
  }

  createLogBox(guild) {
    const rows = (guild.logs ?? []).slice(0, 4).map((log) => {
      const row = this.createEmptyRow(log.text);
      row.dataset.tone = log.tone ?? '';
      return row;
    });

    return this.createBox('guild log', rows.length ? rows : [this.createEmptyRow('quiet')]);
  }

  createRequestRow(request) {
    const row = document.createElement('div');
    row.className = 'guild-page__row guild-page__request-row';

    const main = document.createElement('button');
    main.className = 'guild-page__row-main';
    main.type = 'button';
    main.textContent = `${request.title} (${request.difficulty})`;
    main.addEventListener('click', () => this.showRequestDialog(request.id));

    const action = document.createElement('button');
    action.className = 'guild-page__row-action';
    action.type = 'button';
    action.textContent = 'remove';
    action.addEventListener('click', () => this.gameplayFacade?.removeGuildRequest?.(request.id));

    row.append(main, action);
    return row;
  }

  createAdventurerRow(adventurer, kind) {
    const row = document.createElement('div');
    row.className = 'guild-page__row guild-page__adventurer-row';
    setNotificationBadge(row, adventurer.status === 'hospital' || adventurer.status === 'dead');

    const main = document.createElement('button');
    main.className = 'guild-page__row-main';
    main.type = 'button';
    main.textContent = `${adventurer.displayName} (${adventurer.level})`;
    main.addEventListener('click', () => this.showAdventurerDialog(adventurer.id, kind));

    const status = document.createElement('span');
    status.className = 'guild-page__row-action';
    status.textContent = adventurer.statusLabel ?? adventurer.personalityLabel;

    row.append(main, status);
    return row;
  }

  createBox(title, children, { countLabel = '', bottomLabel = '' } = {}) {
    const box = document.createElement('section');
    box.className = 'style-box guild-page__box';

    const titleElement = document.createElement('div');
    titleElement.className = 'style-box__title';
    titleElement.textContent = title;
    box.append(titleElement);

    if (countLabel) {
      const count = document.createElement('div');
      count.className = 'guild-page__box-count';
      count.textContent = countLabel;
      box.append(count);
    }

    const content = document.createElement('div');
    content.className = 'guild-page__rows';
    content.append(...children);
    box.append(content);

    if (bottomLabel) {
      const bottom = document.createElement('div');
      bottom.className = 'guild-page__box-bottom';
      bottom.textContent = bottomLabel;
      box.append(bottom);
    }

    return box;
  }

  createTextRow(label, value) {
    const row = document.createElement('div');
    row.className = 'guild-page__row';
    const key = document.createElement('span');
    key.className = 'guild-page__row-key';
    key.textContent = label;
    const val = document.createElement('span');
    val.className = 'guild-page__row-value';

    const NodeConstructor = globalThis.Node;

    if (NodeConstructor && value instanceof NodeConstructor) {
      val.append(value);
    } else {
      val.textContent = String(value ?? '');
    }

    row.append(key, val);
    return row;
  }

  createButtonRow(label, onClick, { disabled = false, notification = false } = {}) {
    const button = document.createElement('button');
    button.className = 'style-button guild-page__wide-button';
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    setNotificationBadge(button, notification);
    button.addEventListener('click', onClick);
    return button;
  }

  createCostButtonRow(
    label,
    costText,
    onClick,
    { disabled = false, notification = false } = {},
  ) {
    const button = this.createButtonRow(label, onClick, { disabled, notification });
    button.classList.add('guild-page__charter-button');
    button.setAttribute('aria-label', `${label} for ${costText}`);

    const labelElement = document.createElement('span');
    labelElement.className = 'guild-page__charter-button-label';
    labelElement.textContent = label;

    const costElement = document.createElement('span');
    costElement.className = 'guild-page__charter-button-cost';
    setResourceColor(costElement, 'coin');
    setResourceIconText(costElement, costText);

    button.replaceChildren(labelElement, costElement);
    return button;
  }

  createEmptyRow(text) {
    const row = document.createElement('div');
    row.className = 'guild-page__empty-row';
    row.textContent = text;
    return row;
  }

  createSectionLabel(text) {
    const label = document.createElement('div');
    label.className = 'guild-page__section-label';
    label.textContent = text;
    return label;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'guild-page__popup';
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
    popup.addEventListener('click', this.handlePopupClick);

    const panel = document.createElement('section');
    panel.className = 'guild-page__popup-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'guild-page__dialog style-dialog';
    this.refs.popupTitle = document.createElement('div');
    this.refs.popupTitle.className = 'style-box__title';
    this.refs.popupTitle.textContent = 'guild';
    this.refs.closeButton = document.createElement('button');
    this.refs.closeButton.className = 'style-button guild-page__close';
    this.refs.closeButton.type = 'button';
    this.refs.closeButton.textContent = 'close';
    this.refs.closeButton.addEventListener('click', () => this.hidePopup());
    this.refs.popupContent = document.createElement('div');
    this.refs.popupContent.className = 'guild-page__popup-content';
    this.refs.popupTabs = document.createElement('div');
    this.refs.popupTabs.className = 'guild-page__tabs';
    this.refs.popupTabs.setAttribute('role', 'tablist');
    this.refs.popupTabs.setAttribute('aria-label', 'guild card details');

    dialog.append(this.refs.popupTitle, this.refs.closeButton, this.refs.popupContent);
    panel.append(dialog, this.refs.popupTabs);
    popup.append(panel);
    this.refs.popup = popup;
    this.refs.popupPanel = panel;
    return popup;
  }

  showCharterDialog() {
    this.selectedCardKind = 'charter';
    this.selectedCardId = null;
    this.formDrafts.charter = this.createProfileDraft();
    this.showPopup();
  }

  showSettingsDialog() {
    this.selectedCardKind = 'settings';
    this.selectedCardId = null;
    this.formDrafts.settings = this.createProfileDraft(this.snapshot.profile);
    this.showPopup();
  }

  showRequestDialog(requestId) {
    this.selectedCardKind = 'request';
    this.selectedCardId = requestId;
    this.showPopup();
  }

  showAdventurerDialog(adventurerId, kind) {
    this.selectedCardKind = kind;
    this.selectedCardId = adventurerId;
    this.selectedCardTab = 'stats';
    this.showPopup();
  }

  showPopup() {
    this.refs.popup.hidden = false;
    this.refs.popup.setAttribute('aria-hidden', 'false');
    this.renderPopup();
    this.refs.popupPanel?.focus?.({ preventScroll: true });
  }

  hidePopup() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = true;
    this.refs.popup.setAttribute('aria-hidden', 'true');
    this.selectedCardId = null;
    this.selectedCardKind = null;
    this.selectedCardTab = 'stats';
  }

  renderPopup() {
    if (!this.refs.popup || this.refs.popup.hidden) {
      return;
    }

    this.refs.popupPanel.dataset.popupKind = this.selectedCardKind ?? '';

    if (this.selectedCardKind === 'charter') {
      this.renderCharterDialog();
      return;
    }

    if (this.selectedCardKind === 'settings') {
      this.renderSettingsDialog();
      return;
    }

    if (this.selectedCardKind === 'request') {
      this.renderRequestDialog();
      return;
    }

    this.renderAdventurerDialog();
  }

  renderCharterDialog() {
    const draft = this.getFormDraft('charter');
    this.refs.popupTitle.textContent = 'guild charter';
    this.refs.popupTabs.replaceChildren();
    if (this.hasFocusedProfileForm('charter')) {
      return;
    }

    const form = document.createElement('form');
    form.className = 'guild-page__form';
    form.dataset.formKind = 'charter';
    form.append(
      this.createInputField('name', 'name', { value: draft.name, maxLength: 24 }),
      this.createInputField('tag', 'tag', {
        value: draft.tag,
        minLength: 2,
        maxLength: 5,
        autocapitalize: 'characters',
      }),
      this.createColorField('tag color', draft.color),
      this.createSubmitButton('create'),
    );
    this.bindFormDraft(form, 'charter');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.captureFormDraft('charter', form);
      const formData = new globalThis.FormData(form);
      const result = this.gameplayFacade?.createGuild?.({
        name: formData.get('name'),
        tag: formData.get('tag'),
        color: formData.get('color'),
      });

      if (result?.ok) {
        this.hidePopup();
      }
    });
    this.refs.popupContent.replaceChildren(form);
  }

  renderSettingsDialog() {
    const profile = this.snapshot.profile ?? {};
    const draft = this.getFormDraft('settings', profile);
    this.refs.popupTitle.textContent = 'guild settings';
    this.refs.popupTabs.replaceChildren();
    if (this.hasFocusedProfileForm('settings')) {
      return;
    }

    const form = document.createElement('form');
    form.className = 'guild-page__form';
    form.dataset.formKind = 'settings';
    const next = this.snapshot.secretary?.next;
    const upgrade = document.createElement('button');
    upgrade.className = 'style-button guild-page__wide-button';
    upgrade.type = 'button';
    upgrade.textContent = next ? `upgrade secretary (${next.costCoin})` : 'secretary max';
    upgrade.disabled = !this.snapshot.secretary?.canUpgrade;
    upgrade.addEventListener('click', () => this.gameplayFacade?.upgradeGuildSecretary?.());
    form.append(
      this.createInputField('name', 'name', { value: draft.name, maxLength: 24 }),
      this.createInputField('tag', 'tag', {
        value: draft.tag,
        minLength: 2,
        maxLength: 5,
        autocapitalize: 'characters',
      }),
      this.createColorField('tag color', draft.color),
      this.createSubmitButton('save'),
      upgrade,
    );
    this.bindFormDraft(form, 'settings');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.captureFormDraft('settings', form);
      const formData = new globalThis.FormData(form);
      this.gameplayFacade?.updateGuildProfile?.({
        name: formData.get('name'),
        tag: formData.get('tag'),
        color: formData.get('color'),
      });
    });
    this.refs.popupContent.replaceChildren(form);
  }

  renderRequestDialog() {
    const request = (this.snapshot.board ?? []).find((candidate) => candidate.id === this.selectedCardId);

    if (!request) {
      this.hidePopup();
      return;
    }

    this.refs.popupTitle.textContent = request.title;
    this.refs.popupTabs.replaceChildren();
    const rows = document.createElement('div');
    rows.className = 'guild-page__rows';
    rows.append(
      this.createTextRow('difficulty', request.difficulty),
      this.createTextRow('stats', request.statLabel),
      this.createTextRow('reward', request.rewardText),
      this.createParagraph(request.lore),
    );

    if (request.eventLabel) {
      rows.append(this.createTextRow('event', request.eventLabel));
    }

    rows.append(this.createButtonRow('remove', () => {
      this.gameplayFacade?.removeGuildRequest?.(request.id);
      this.hidePopup();
    }));
    this.refs.popupContent.replaceChildren(rows);
  }

  renderAdventurerDialog() {
    const list =
      this.selectedCardKind === 'applicant'
        ? this.snapshot.applicants ?? []
        : this.snapshot.adventurers ?? [];
    const adventurer = list.find((candidate) => candidate.id === this.selectedCardId);

    if (!adventurer) {
      this.hidePopup();
      return;
    }

    this.refs.popupTitle.textContent = adventurer.displayName;
    this.renderCardTabs();
    const rows = document.createElement('div');
    rows.className = 'guild-page__rows';

    if (this.selectedCardTab === 'life') {
      rows.append(
        this.createTextRow('status', adventurer.statusLabel),
        this.createTextRow('morale', adventurer.morale),
        this.createTextRow('fatigue', adventurer.fatigue),
        this.createTextRow('injury', adventurer.injury),
        this.createParagraph(adventurer.lifeText || adventurer.personalityLife),
      );
    } else if (this.selectedCardTab === 'history') {
      const history = adventurer.history ?? [];
      rows.append(
        ...(history.length
          ? history.map((entry) => this.createParagraph(entry.text ?? entry))
          : [this.createEmptyRow('no history')]),
      );
    } else {
      rows.append(
        this.createTextRow('level', adventurer.level),
        this.createTextRow('xp', `${adventurer.xp}/${adventurer.nextLevelXp}`),
        this.createTextRow('personality', adventurer.personalityLabel),
        ...Object.entries(adventurer.stats ?? {}).map(([stat, value]) =>
          this.createTextRow(stat, value),
        ),
      );
    }

    if (this.selectedCardKind === 'applicant') {
      rows.append(this.createButtonRow('hire', () => {
        const result = this.gameplayFacade?.hireGuildApplicant?.(adventurer.id);

        if (result?.ok) {
          this.hidePopup();
        }
      }));
    } else if (adventurer.status !== 'dead' && adventurer.status !== 'questing') {
      rows.append(this.createButtonRow('fire', () => {
        this.gameplayFacade?.fireGuildAdventurer?.(adventurer.id);
        this.hidePopup();
      }));
    }

    this.refs.popupContent.replaceChildren(rows);
  }

  renderCardTabs() {
    this.refs.popupTabs.replaceChildren(
      ...CARD_TABS.map((tab) => {
        const button = document.createElement('button');
        button.className = 'style-button guild-page__tab-button';
        button.type = 'button';
        button.textContent = tab.label;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', tab.id === this.selectedCardTab ? 'true' : 'false');
        button.addEventListener('click', () => {
          this.selectedCardTab = tab.id;
          this.renderPopup();
        });
        return button;
      }),
    );
  }

  createInputField(
    name,
    label,
    { value = '', minLength = 0, maxLength = 80, autocapitalize = 'none' } = {},
  ) {
    const field = document.createElement('label');
    field.className = 'guild-page__field';
    const span = document.createElement('span');
    span.textContent = label;
    const input = document.createElement('input');
    input.className = 'style-input guild-page__input';
    input.name = name;
    input.type = 'text';
    input.value = value ?? '';
    input.minLength = minLength;
    input.maxLength = maxLength;
    input.autocomplete = 'off';
    input.autocapitalize = autocapitalize;
    field.append(span, input);
    return field;
  }

  createColorField(label, value = DEFAULT_TRADE_ALLIANCE_TAG_COLOR) {
    const selectedValue = normalizeTradeAllianceTagColor(value);
    const field = document.createElement('fieldset');
    field.className = 'guild-page__field guild-page__color-field';

    const legend = document.createElement('legend');
    legend.textContent = label;

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'color';
    input.value = selectedValue;

    const swatches = document.createElement('div');
    swatches.className = 'guild-page__swatches';
    swatches.setAttribute('role', 'radiogroup');
    swatches.setAttribute('aria-label', label);

    const buttons = TRADE_ALLIANCE_TAG_COLORS.map((color) => {
      const button = document.createElement('button');
      button.className = 'guild-page__swatch';
      button.type = 'button';
      button.style.setProperty(
        '--guild-page-swatch-color',
        getTradeAllianceTagColorCssValue(color.id),
      );
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-label', color.label);
      button.dataset.colorId = color.id;
      swatches.append(button);
      return button;
    });

    const setSelected = (colorId) => {
      const normalizedColorId = normalizeTradeAllianceTagColor(colorId);
      input.value = normalizedColorId;

      for (const button of buttons) {
        const selected = button.dataset.colorId === normalizedColorId;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
        button.tabIndex = selected ? 0 : -1;
      }
    };

    for (const button of buttons) {
      button.addEventListener('click', () => {
        setSelected(button.dataset.colorId);
        input.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
        input.dispatchEvent(new globalThis.Event('change', { bubbles: true }));
      });
    }

    setSelected(selectedValue);
    field.append(legend, input, swatches);
    return field;
  }

  createSubmitButton(label) {
    const button = document.createElement('button');
    button.className = 'style-button guild-page__wide-button';
    button.type = 'submit';
    button.textContent = label;
    return button;
  }

  createParagraph(text) {
    const paragraph = document.createElement('p');
    paragraph.className = 'guild-page__paragraph';
    paragraph.textContent = String(text ?? '');
    return paragraph;
  }

  bindFormDraft(form, kind) {
    form.addEventListener('input', () => this.captureFormDraft(kind, form));
    form.addEventListener('change', () => this.captureFormDraft(kind, form));
  }

  captureVisibleFormDraft() {
    if (this.refs.popup?.hidden || !['charter', 'settings'].includes(this.selectedCardKind)) {
      return;
    }

    const form = this.refs.popupContent?.querySelector('form.guild-page__form');

    if (form) {
      this.captureFormDraft(this.selectedCardKind, form);
    }
  }

  captureFormDraft(kind, form) {
    const formData = new globalThis.FormData(form);
    this.formDrafts[kind] = {
      name: String(formData.get('name') ?? ''),
      tag: String(formData.get('tag') ?? ''),
      color:
        normalizeTradeAllianceTagColor(formData.get('color')) ||
        DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
    };
  }

  getFormDraft(kind, profile) {
    if (!this.formDrafts[kind]) {
      this.formDrafts[kind] = this.createProfileDraft(profile);
    }

    return this.formDrafts[kind];
  }

  createProfileDraft(profile = {}) {
    return {
      name: String(profile.name ?? ''),
      tag: String(profile.tag ?? ''),
      color: normalizeTradeAllianceTagColor(profile.color),
    };
  }

  hasFocusedProfileForm(kind) {
    if (this.refs.popup?.hidden || this.selectedCardKind !== kind) {
      return false;
    }

    const form = this.refs.popupContent?.querySelector('form.guild-page__form');
    const activeElement = document.activeElement;
    return (
      form?.dataset.formKind === kind &&
      this.isTextEntryElement(activeElement) &&
      form.contains(activeElement)
    );
  }

  isTextEntryElement(element) {
    if (!element) {
      return false;
    }

    const tagName = element.tagName?.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  }
}
