import { TRADE_ALLIANCE_TAG_COLORS } from '../../../shared/tradeAllianceTagColors.js';
import { createAllianceTagSpan } from '../../shared/allianceTagLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';

const CARD_TABS = [
  { id: 'stats', label: 'stats' },
  { id: 'life', label: 'life' },
  { id: 'history', label: 'history' },
];

export class GuildPanelManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.popupLayer = null;
    this.unsubscribe = null;
    this.snapshot = {};
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
      return [
        this.createBox('guild charter', [
          this.createTextRow('cost', `${guild.charterCostCoin ?? 1500} coin`),
          this.createTextRow('coin', `${guild.currentCoin ?? 0}`),
          this.createButtonRow('start guild', () => this.showCharterDialog(), {
            disabled: !guild.canCreate,
            notification: guild.canCreate,
          }),
        ]),
      ];
    }

    return [
      this.createHallBox(guild),
      this.createBoardBox(guild),
      this.createAdventurersBox(guild),
      this.createApplicantsBox(guild),
      this.createLogBox(guild),
    ];
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

    const main = document.createElement('button');
    main.className = 'guild-page__row-main';
    main.type = 'button';
    main.textContent = `${adventurer.displayName} (${adventurer.level})`;
    setNotificationBadge(main, adventurer.status === 'hospital' || adventurer.status === 'dead');
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
    const form = document.createElement('form');
    form.className = 'guild-page__form';
    form.append(
      this.createInputField('name', 'name', { value: draft.name, maxLength: 24 }),
      this.createInputField('tag', 'tag', { value: draft.tag, minLength: 2, maxLength: 5, autocapitalize: 'characters' }),
      this.createColorField('color', draft.color),
      this.createSubmitButton('start guild'),
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
    const form = document.createElement('form');
    form.className = 'guild-page__form';
    const next = this.snapshot.secretary?.next;
    const upgrade = document.createElement('button');
    upgrade.className = 'style-button guild-page__wide-button';
    upgrade.type = 'button';
    upgrade.textContent = next ? `upgrade secretary (${next.costCoin})` : 'secretary max';
    upgrade.disabled = !this.snapshot.secretary?.canUpgrade;
    upgrade.addEventListener('click', () => this.gameplayFacade?.upgradeGuildSecretary?.());
    form.append(
      this.createInputField('name', 'name', { value: draft.name, maxLength: 24 }),
      this.createInputField('tag', 'tag', { value: draft.tag, minLength: 2, maxLength: 5, autocapitalize: 'characters' }),
      this.createColorField('color', draft.color),
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
        button.setAttribute('aria-selected', tab.id === this.selectedCardTab ? 'true' : 'false');
        button.addEventListener('click', () => {
          this.selectedCardTab = tab.id;
          this.renderPopup();
        });
        return button;
      }),
    );
  }

  createInputField(name, label, { value = '', minLength = 0, maxLength = 80, autocapitalize = 'none' } = {}) {
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
    input.autocapitalize = autocapitalize;
    field.append(span, input);
    return field;
  }

  createColorField(label, value = 'ink') {
    const selectedValue = TRADE_ALLIANCE_TAG_COLORS.some((color) => color.id === value)
      ? value
      : 'ink';
    const field = document.createElement('fieldset');
    field.className = 'guild-page__field guild-page__color-field';
    const legend = document.createElement('legend');
    legend.textContent = label;
    const swatches = document.createElement('div');
    swatches.className = 'guild-page__swatches';

    for (const color of TRADE_ALLIANCE_TAG_COLORS) {
      const swatchLabel = document.createElement('label');
      swatchLabel.className = 'guild-page__swatch';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'color';
      input.value = color.id;
      input.checked = color.id === selectedValue;
      const mark = document.createElement('span');
      mark.style.color = color.cssValue;
      mark.textContent = color.label;
      swatchLabel.append(input, mark);
      swatches.append(swatchLabel);
    }

    field.append(legend, swatches);
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
      color: String(formData.get('color') ?? 'ink') || 'ink',
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
      color: String(profile.color ?? 'ink') || 'ink',
    };
  }
}
