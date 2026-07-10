import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import { isGuildAdventurerIconKey } from '../../../shared/guildAdventurerIcons.js';
import {
  DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
  TRADE_ALLIANCE_TAG_COLORS,
  getTradeAllianceTagColorCssValue,
  normalizeTradeAllianceTagColor,
} from '../../../shared/tradeAllianceTagColors.js';
import { createAllianceTagSpan } from '../../shared/allianceTagLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { createCharacterImage } from '../../shared/playerCharacterIcon.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setSelectedTabState } from '../../shared/selectedTabState.js';

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

const GUILD_SECRETARY_ICON_KEY = 'guild_secretary';
const GUILD_QUEST_ASSET_PATH = '/ui/guild-quest/';

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
    this.requestStackIndex = 0;
    this.requestStackTimer = null;
    this.renderedCardScrollKey = '';
    this.contentTabScrollTops = new Map();
    this.lastRenderedSecretaryLevel = null;
    this.secretaryUpgradeAnimationLevel = null;
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
    this.clearRequestStackTimer();
    this.refs.popup?.remove();
    this.root?.remove();
    this.root = null;
    this.popupLayer = null;
    this.refs = {};
    this.selectedContentTab = 'hall';
    this.requestStackIndex = 0;
    this.renderedCardScrollKey = '';
    this.contentTabScrollTops.clear();
    this.formDrafts = {
      charter: null,
      settings: null,
    };
    this.lastRenderedSecretaryLevel = null;
    this.secretaryUpgradeAnimationLevel = null;
  }

  render(snapshot = {}) {
    if (!this.root) {
      return;
    }

    this.captureVisibleFormDraft();
    this.captureContentPanelScroll();
    const currentSecretaryLevel = this.getSecretaryLevel(snapshot.guild);
    this.secretaryUpgradeAnimationLevel =
      currentSecretaryLevel != null &&
      this.lastRenderedSecretaryLevel != null &&
      currentSecretaryLevel > this.lastRenderedSecretaryLevel
        ? currentSecretaryLevel
        : null;
    this.lastRenderedSecretaryLevel = currentSecretaryLevel;
    this.snapshot = snapshot.guild ?? {};
    this.root.classList.toggle('guild-page__content--centered', this.snapshot.created !== true);

    if (this.snapshot.unlocked && this.snapshot.created) {
      this.renderCreatedSections(this.snapshot);
    } else {
      this.refs.contentTabs = null;
      this.refs.contentPanel = null;
      this.root.replaceChildren(...this.createMainSections());
    }

    this.restoreContentPanelScroll(this.getActiveContentTab().id);
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
        this.createBox(
          'guild charter',
          [
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
          ],
          { className: 'guild-page__box--charter' },
        ),
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

  renderCreatedSections(guild) {
    const activeTab = this.getActiveContentTab();
    const tabs = this.createContentTabs(activeTab.id, guild);
    const panel = this.createOrUpdateContentPanel(
      activeTab,
      this.getContentTabSections(guild, activeTab.id),
    );
    const keptPanel =
      panel === this.refs.contentPanel && panel.parentElement === this.root;

    if (keptPanel) {
      if (this.refs.contentTabs?.parentElement === this.root) {
        this.refs.contentTabs.replaceWith(tabs);
      } else {
        this.root.insertBefore(tabs, panel);
      }

      for (const child of [...this.root.children]) {
        if (child !== tabs && child !== panel) {
          child.remove();
        }
      }
    } else {
      this.root.replaceChildren(tabs, panel);
    }

    this.refs.contentTabs = tabs;
    this.refs.contentPanel = panel;
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
    setSelectedTabState(button, tab.id === activeTabId, { tabIndex: true });
    setNotificationBadge(button, this.getContentTabNotification(guild, tab.id));
    button.addEventListener('click', () => this.setActiveContentTab(tab.id));
    return button;
  }

  createContentPanel(tab, sections) {
    const panel = document.createElement('section');
    panel.className = 'guild-page__tabpanel style-page-scroll';
    panel.dataset.scrollCueProgress = 'inline';
    panel.dataset.guildTabPanel = tab.id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-label', tab.label);
    panel.append(...sections);
    return panel;
  }

  createOrUpdateContentPanel(tab, sections) {
    const panel = this.refs.contentPanel;

    if (panel?.parentElement === this.root && panel.dataset.guildTabPanel === tab.id) {
      panel.setAttribute('aria-label', tab.label);
      panel.replaceChildren(...sections);
      return panel;
    }

    return this.createContentPanel(tab, sections);
  }

  getContentTabSections(guild, tabId) {
    if (tabId === 'board') {
      return [
        this.createBoardBox(guild),
        this.createAvailableRequestsBox(guild),
      ];
    }

    if (tabId === 'adventurers') {
      return [this.createAdventurersBox(guild), this.createApplicantsBox(guild)];
    }

    if (tabId === 'log') {
      return [this.createLogBox(guild)];
    }

    return [this.createHallBox(guild), this.createSecretaryBox(guild)];
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

  captureContentPanelScroll() {
    const panel = this.root?.querySelector('.guild-page__tabpanel');
    const tabId = panel?.dataset.guildTabPanel;

    if (!tabId) {
      return;
    }

    this.contentTabScrollTops.set(tabId, Math.max(0, Number(panel.scrollTop) || 0));
  }

  restoreContentPanelScroll(tabId) {
    const panel = this.root?.querySelector('.guild-page__tabpanel');
    const scrollTop = this.contentTabScrollTops.get(tabId);

    if (!panel || panel.dataset.guildTabPanel !== tabId || !scrollTop) {
      return;
    }

    panel.scrollTop = scrollTop;
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
        this.createIdentityRow(profileLabel),
        this.createTextRow(
          'adventurers',
          `${guild.adventurers?.filter((adventurer) => adventurer.status !== 'dead').length ?? 0}/${guild.secretary?.hiredCap ?? 1}`,
        ),
        this.createTextRow('board', `${guild.board?.length ?? 0}/${guild.secretary?.boardSlots ?? 3}`),
        this.createButtonRow('settings', () => this.showSettingsDialog()),
      ],
    );
  }

  createSecretaryBox(guild) {
    const secretary = guild.secretary ?? {};
    const secretaryLevel = this.getSecretaryLevel(guild);

    return this.createBox(
      'secretary',
      [
        this.createSecretarySummary(secretary),
        this.createSecretaryUpgradeButton(secretary),
      ],
      {
        className:
          secretaryLevel != null && secretaryLevel === this.secretaryUpgradeAnimationLevel
            ? 'guild-page__box--secretary-upgraded'
            : '',
      },
    );
  }

  createSecretarySummary(secretary) {
    const summary = document.createElement('div');
    summary.className = 'guild-page__secretary-summary';

    const rows = document.createElement('div');
    rows.className = 'guild-page__secretary-rows';
    rows.append(
      this.createTextRow('level', secretary.level ?? 1),
      this.createTextRow(
        'adventurers',
        this.createUpgradePreviewText(secretary.hiredCap ?? 1, secretary.next?.hiredCap),
      ),
      this.createTextRow(
        'board',
        this.createUpgradePreviewText(secretary.boardSlots ?? 3, secretary.next?.boardSlots),
      ),
    );

    summary.append(this.createSecretaryIconRow(), rows);
    return summary;
  }

  createSecretaryIconRow() {
    const row = document.createElement('div');
    row.className = 'guild-page__secretary-icon-row';
    row.append(createCharacterImage(GUILD_SECRETARY_ICON_KEY, 'guild-page__secretary-icon'));
    return row;
  }

  getSecretaryLevel(guild) {
    const level = Number(guild?.secretary?.level);
    return Number.isFinite(level) ? level : null;
  }

  createUpgradePreviewText(current, next) {
    if (next == null || next === current) {
      return current;
    }

    const preview = document.createElement('span');
    preview.className = 'guild-page__upgrade-preview';
    preview.append(document.createTextNode(String(current)), this.createUpgradePreviewGain(next));
    return preview;
  }

  createUpgradePreviewGain(next) {
    const gain = document.createElement('span');
    gain.className = 'guild-page__upgrade-preview-gain';
    gain.textContent = ` > ${next}`;
    return gain;
  }

  createSecretaryUpgradeButton(secretary) {
    const next = secretary.next;
    const button = this.createButtonRow(
      'upgrade secretary',
      () => this.gameplayFacade?.upgradeGuildSecretary?.(),
      { disabled: !secretary.canUpgrade },
    );

    if (!next) {
      button.textContent = 'secretary max';
      return button;
    }

    const costText = `${next.costCoin ?? '?'} coin`;
    const labelElement = document.createElement('span');
    labelElement.className = 'guild-page__secretary-upgrade-label';
    labelElement.textContent = 'upgrade secretary';

    const costElement = document.createElement('span');
    costElement.className = 'guild-page__secretary-upgrade-cost';
    setResourceColor(costElement, 'coin');
    setResourceIconText(costElement, costText);

    button.setAttribute('aria-label', `upgrade secretary for ${costText}`);
    button.replaceChildren(labelElement, document.createTextNode(' '), costElement);
    return button;
  }

  createBoardBox(guild) {
    const requests = [
      ...(guild.normalBoard ?? []),
      ...(guild.eventBoard ?? []),
    ];
    const rows = requests.length
      ? [this.createQuestBoard(requests)]
      : [this.createEmptyRow('no requests')];

    return this.createBox('request board', rows, {
      countLabel: `${guild.board?.length ?? 0}/${guild.secretary?.boardSlots ?? 3}`,
      className: 'guild-page__box--request-board',
    });
  }

  createAvailableRequestsBox(guild) {
    const availableRequests = guild.availableRequests ?? [];
    const rows = [];

    if (availableRequests.length > 0) {
      rows.push(
        this.createTextRow(
          'incoming',
          `${availableRequests.length} quest${availableRequests.length === 1 ? '' : 's'}`,
        ),
        this.createButtonRow('review quests', () => this.showAvailableRequestsDialog()),
      );
    } else {
      rows.push(this.createEmptyRow('no available quests'));
    }

    if (guild.boardWaveLabel) {
      rows.push(this.createTextRow('upcoming quest', guild.boardWaveLabel));
    }

    return this.createBox('available quests', rows, {
      countLabel: `${availableRequests.length}`,
    });
  }

  createQuestBoard(requests) {
    const board = document.createElement('div');
    board.className = 'guild-page__quest-board';

    requests.forEach((request, index) => {
      board.append(this.createQuestPaper(request, index));
    });

    return board;
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

  createIdentityRow(label) {
    const row = document.createElement('div');
    row.className = 'guild-page__row guild-page__identity-row';

    const value = document.createElement('span');
    value.className = 'guild-page__identity-label';
    value.append(label);

    row.append(value);
    return row;
  }

  createQuestPaper(request, index = 0) {
    const paper = document.createElement('article');
    paper.className = 'guild-page__quest-paper';
    paper.dataset.questSlot = String((index % 6) + 1);

    const main = document.createElement('button');
    main.className = 'guild-page__quest-paper-main';
    main.type = 'button';
    main.setAttribute('aria-label', `open ${request.title} quest`);
    main.append(
      this.createRequestLine('guild-page__request-title', request.title),
      this.createRequestLine('guild-page__request-description', request.lore),
      this.createRequestLine(
        'guild-page__request-meta',
        `${request.difficulty}${request.expiresLabel ? `, expires ${request.expiresLabel}` : ''}`,
      ),
      this.createRequestLine('guild-page__request-reward', `reward: ${request.rewardText}`, {
        resourceIcons: true,
      }),
    );
    main.addEventListener('click', () => this.showRequestDialog(request.id));

    const action = document.createElement('button');
    action.className = 'guild-page__quest-paper-action';
    action.type = 'button';
    action.textContent = 'remove';
    action.addEventListener('click', () => {
      this.gameplayFacade?.removeGuildRequest?.(request.id);
    });

    paper.append(main, action);
    return paper;
  }

  createRequestLine(className, text, { resourceIcons = false } = {}) {
    const line = document.createElement('span');
    line.className = className;
    if (resourceIcons) {
      setResourceIconText(line, text);
    } else {
      line.textContent = String(text ?? '');
    }
    return line;
  }

  createAdventurerRow(adventurer, kind) {
    const row = document.createElement('div');
    row.className = 'guild-page__row guild-page__adventurer-row';
    setNotificationBadge(row, adventurer.status === 'hospital' || adventurer.status === 'dead');

    const displayName = adventurer.displayName ?? 'nameless';
    const levelLabel = `level ${adventurer.level ?? 1}`;
    const statusLabel = adventurer.statusLabel ?? adventurer.personalityLabel ?? 'idle';

    const main = document.createElement('button');
    main.className = 'guild-page__row-main guild-page__adventurer-main';
    main.type = 'button';
    main.setAttribute('aria-label', `${displayName}, ${levelLabel}, ${statusLabel}`);
    main.append(
      this.createAdventurerIcon(adventurer, displayName),
      this.createAdventurerSummary(displayName, levelLabel),
    );
    main.addEventListener('click', () => this.showAdventurerDialog(adventurer.id, kind));

    const status = document.createElement('span');
    status.className = 'guild-page__row-action guild-page__adventurer-status';
    status.textContent = statusLabel;

    row.append(main, status);
    return row;
  }

  createAdventurerIcon(adventurer, displayName, className = '') {
    const iconClassName = ['guild-page__adventurer-icon', className]
      .filter(Boolean)
      .join(' ');

    if (isGuildAdventurerIconKey(adventurer?.iconKey)) {
      return createCharacterImage(adventurer.iconKey, iconClassName);
    }

    return this.createAdventurerIconPlaceholder(displayName, iconClassName);
  }

  createAdventurerIconPlaceholder(displayName, className = 'guild-page__adventurer-icon') {
    const icon = document.createElement('span');
    icon.className = className;
    icon.dataset.initial = this.getAdventurerInitial(displayName);
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  createAdventurerSummary(displayName, levelLabel) {
    const summary = document.createElement('span');
    summary.className = 'guild-page__adventurer-summary';

    const name = document.createElement('span');
    name.className = 'guild-page__adventurer-name';
    name.textContent = displayName;

    const level = document.createElement('span');
    level.className = 'guild-page__adventurer-level';
    level.textContent = levelLabel;

    summary.append(name, level);
    return summary;
  }

  getAdventurerInitial(displayName) {
    const trimmed = String(displayName ?? '').trim();
    return trimmed ? trimmed.slice(0, 1).toLowerCase() : '?';
  }

  createAdventurerCard(
    adventurer,
    secondaryRows,
    actionButton = null,
    { detailsElement = null } = {},
  ) {
    const displayName = adventurer.displayName ?? 'nameless';
    const card = document.createElement('div');
    card.className = 'guild-page__card-info';

    const summary = document.createElement('div');
    summary.className = 'guild-page__card-summary';

    const mainRows = document.createElement('div');
    mainRows.className = 'guild-page__card-main-rows';
    mainRows.append(
      this.createAdventurerCardNameLine(displayName),
      this.createCardTextRow('level', adventurer.level ?? 1),
      this.createCardTextRow('status', adventurer.statusLabel ?? adventurer.status ?? 'idle'),
    );

    summary.append(
      this.createAdventurerIcon(adventurer, displayName, 'guild-page__card-icon'),
      mainRows,
    );

    const details = this.createOrUpdateCardDetails(secondaryRows, detailsElement);

    card.append(summary, details);

    if (actionButton) {
      const actions = document.createElement('div');
      actions.className = 'guild-page__card-actions';
      actions.append(actionButton);
      card.append(actions);
    }

    return card;
  }

  createOrUpdateCardDetails(secondaryRows, detailsElement = null) {
    const details = detailsElement ?? document.createElement('div');
    details.className = 'guild-page__card-details';
    details.dataset.scrollCueProgress = 'inline';

    let rows = [...details.children].find((child) =>
      child.classList?.contains('guild-page__card-rows'),
    );

    if (!rows) {
      rows = document.createElement('div');
      rows.className = 'guild-page__card-rows';
      details.replaceChildren(rows);
    }

    rows.replaceChildren(...secondaryRows);
    return details;
  }

  createAdventurerCardNameLine(displayName) {
    const line = document.createElement('div');
    line.className = 'guild-page__card-name-line';

    const name = document.createElement('span');
    name.className = 'guild-page__card-name';
    name.textContent = displayName;

    line.append(name);
    return line;
  }

  createCardTextRow(label, value) {
    const row = document.createElement('div');
    row.className = 'guild-page__card-row';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = label;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = String(value ?? '');

    row.append(key, val);
    return row;
  }

  createBox(title, children, { countLabel = '', bottomLabel = '', className = '' } = {}) {
    const box = document.createElement('section');
    box.className = ['style-box guild-page__box', className].filter(Boolean).join(' ');

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

  createResourceText(value) {
    const element = document.createElement('span');
    setResourceIconText(element, value);
    return element;
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
    this.refs.closeButton.setAttribute('aria-label', 'close');
    this.refs.closeButton.addEventListener('click', () => this.hidePopup());
    this.refs.popupContent = document.createElement('div');
    this.refs.popupContent.className = 'guild-page__popup-content';
    this.refs.popupActions = document.createElement('div');
    this.refs.popupActions.className = 'guild-page__popup-actions';
    this.refs.popupTabs = document.createElement('div');
    this.refs.popupTabs.className = 'guild-page__tabs';
    this.refs.popupTabs.setAttribute('role', 'tablist');
    this.refs.popupTabs.setAttribute('aria-label', 'guild card details');

    dialog.append(this.refs.popupTitle, this.refs.closeButton, this.refs.popupContent);
    panel.append(dialog, this.refs.popupActions, this.refs.popupTabs);
    popup.append(panel);
    this.refs.popup = popup;
    this.refs.popupPanel = panel;
    this.refs.dialog = dialog;
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

  showAvailableRequestsDialog() {
    if ((this.snapshot.availableRequests ?? []).length <= 0) {
      return;
    }

    this.selectedCardKind = 'requestStack';
    this.selectedCardId = null;
    this.requestStackIndex = 0;
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

    this.clearRequestStackTimer();
    this.refs.popup.hidden = true;
    this.refs.popup.setAttribute('aria-hidden', 'true');
    this.selectedCardId = null;
    this.selectedCardKind = null;
    this.selectedCardTab = 'stats';
    this.requestStackIndex = 0;
    this.clearCardDetailsReuse();
  }

  renderPopup() {
    if (!this.refs.popup || this.refs.popup.hidden) {
      return;
    }

    this.refs.popupPanel.dataset.popupKind = this.selectedCardKind ?? '';
    this.refs.popupActions?.replaceChildren();

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

    if (this.selectedCardKind === 'requestStack') {
      this.renderRequestStackDialog();
      return;
    }

    this.renderAdventurerDialog();
  }

  renderCharterDialog() {
    const draft = this.getFormDraft('charter');
    this.clearCardDetailsReuse();
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
    this.clearCardDetailsReuse();
    this.refs.popupTitle.textContent = 'guild settings';
    this.refs.popupTabs.replaceChildren();
    if (this.hasFocusedProfileForm('settings')) {
      return;
    }

    const form = document.createElement('form');
    form.className = 'guild-page__form';
    form.dataset.formKind = 'settings';
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
    );
    this.bindFormDraft(form, 'settings');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.captureFormDraft('settings', form);
      const formData = new globalThis.FormData(form);
      const result = this.gameplayFacade?.updateGuildProfile?.({
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

  renderRequestDialog() {
    this.clearCardDetailsReuse();
    const boardRequest = (this.snapshot.board ?? []).find(
      (candidate) => candidate.id === this.selectedCardId,
    );
    const availableRequest = (this.snapshot.availableRequests ?? []).find(
      (candidate) => candidate.id === this.selectedCardId,
    );
    const request = boardRequest ?? availableRequest;

    if (!request) {
      this.hidePopup();
      return;
    }

    this.refs.popupTitle.textContent = request.title;
    this.refs.popupTabs.replaceChildren();

    const boardFull =
      !boardRequest &&
      (this.snapshot.board?.length ?? 0) >= (this.snapshot.secretary?.boardSlots ?? 0);
    this.refs.popupContent.replaceChildren(
      this.createRequestPaperContent(request, {
        actionLabel: boardRequest ? 'remove' : boardFull ? 'board full' : 'post',
        actionDisabled: boardFull,
        onAction: () => {
          if (boardRequest) {
            this.gameplayFacade?.removeGuildRequest?.(request.id);
          } else {
            this.gameplayFacade?.postGuildRequest?.(request.id);
          }

          this.hidePopup();
        },
      }),
    );
  }

  renderRequestStackDialog() {
    this.clearCardDetailsReuse();
    const requests = this.getAvailableRequestStack();

    if (requests.length <= 0) {
      this.hidePopup();
      return;
    }

    this.requestStackIndex = Math.min(
      Math.max(0, this.requestStackIndex),
      requests.length - 1,
    );
    const request = requests[this.requestStackIndex];
    const boardFull =
      (this.snapshot.board?.length ?? 0) >= (this.snapshot.secretary?.boardSlots ?? 0);

    this.refs.popupTitle.textContent = 'Incoming Quests';
    this.refs.popupTabs.replaceChildren();

    const controls = document.createElement('div');
    controls.className = 'guild-page__request-stack-controls';

    const postButton = this.createRequestStackButton(
      boardFull ? 'Board Full' : 'Post',
      'guild-page__request-stack-post',
      () => {
        this.gameplayFacade?.postGuildRequest?.(request.id);
        this.hidePopup();
      },
      { disabled: boardFull },
    );

    const nextButton = this.createRequestStackButton(
      requests.length > 1 ? 'Next Page' : 'Only Page',
      'guild-page__request-stack-next',
      () => this.turnAvailableRequestPage(),
      { disabled: requests.length <= 1 },
    );
    controls.append(postButton, nextButton);

    const note = document.createElement('div');
    note.className = 'guild-page__request-stack-note';
    note.textContent = 'Papers rotate to the back when you open the next one.';

    this.refs.popupContent.replaceChildren(
      this.createRequestStackPreview(requests, request),
    );
    this.refs.popupActions.replaceChildren(controls, note);
  }

  createRequestStackPreview(requests, selectedRequest) {
    const wrap = document.createElement('div');
    wrap.className = 'guild-page__request-stack-wrap';

    const stack = document.createElement('div');
    stack.className = 'guild-page__request-stack';
    stack.append(
      this.createRequestStackList(requests),
      this.createRequestStackDetail(
        selectedRequest,
        `${this.requestStackIndex + 1}/${requests.length}`,
      ),
    );

    wrap.append(stack, this.createRequestStackProgress(requests.length));
    return wrap;
  }

  createRequestStackProgress(totalRequests) {
    const total = Math.max(1, Number(totalRequests) || 0);
    const current = Math.min(total, Math.max(1, this.requestStackIndex + 1));
    const fillPercent = Number(((current / total) * 100).toFixed(2));

    const progress = document.createElement('div');
    progress.className = 'style-progress guild-page__request-stack-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', 'quest page progress');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', String(total));
    progress.setAttribute('aria-valuenow', String(current));
    progress.setAttribute('aria-valuetext', `${current}/${total}`);

    const fill = document.createElement('div');
    fill.className = 'style-progress__fill guild-page__request-stack-progress-fill';
    fill.style.width = `${fillPercent}%`;
    progress.append(fill);

    return progress;
  }

  createRequestStackList(requests) {
    const list = document.createElement('div');
    list.className = 'guild-page__request-list';
    list.setAttribute('aria-label', 'incoming quest pages');

    for (const item of this.getRequestStackDisplayItems(requests)) {
      list.append(this.createRequestStackListItem(item));
    }

    return list;
  }

  getRequestStackDisplayItems(requests) {
    return requests.map((_, offset) => {
      const requestIndex = (this.requestStackIndex + offset) % requests.length;
      return {
        request: requests[requestIndex],
        requestIndex,
        selected: offset === 0,
      };
    });
  }

  createRequestStackListItem({ request, requestIndex, selected }) {
    const button = document.createElement('button');
    button.className = 'guild-page__request-list-item';
    button.type = 'button';
    button.dataset.questIndex = String(requestIndex);
    button.setAttribute('aria-label', `open ${request.title} quest`);
    button.classList.toggle('is-selected', selected);
    button.addEventListener('click', () => this.selectAvailableRequestIndex(requestIndex));

    const number = document.createElement('span');
    number.className = 'guild-page__request-list-number';
    number.textContent = String(requestIndex + 1);

    const title = document.createElement('span');
    title.className = 'guild-page__request-list-title';
    title.textContent = this.toQuestDisplayCase(request.title);

    button.append(number, title);

    if (selected) {
      button.append(
        this.createQuestAssetImage(
          'paperclip.png',
          'guild-page__request-list-paperclip',
        ),
        this.createQuestAssetImage(
          'quest-photo-smuggler-tunnel.png',
          'guild-page__request-list-photo',
        ),
      );
    }

    return button;
  }

  selectAvailableRequestIndex(requestIndex) {
    const requests = this.getAvailableRequestStack();

    if (
      !Number.isInteger(requestIndex) ||
      requestIndex < 0 ||
      requestIndex >= requests.length ||
      requestIndex === this.requestStackIndex
    ) {
      return;
    }

    this.requestStackIndex = requestIndex;
    this.renderPopup();
  }

  createRequestStackDetail(request, pageLabel) {
    const detail = document.createElement('section');
    detail.className = 'guild-page__request-paper-content guild-page__request-detail-card';

    const title = document.createElement('div');
    title.className = 'guild-page__request-paper-title';
    title.textContent = request.title;

    const page = document.createElement('div');
    page.className = 'guild-page__request-paper-page';
    page.textContent = pageLabel;

    const lore = document.createElement('p');
    lore.className = 'guild-page__request-detail-lore';
    lore.textContent = request.lore ?? '';

    const rows = document.createElement('div');
    rows.className = 'guild-page__request-paper-rows guild-page__request-detail-rows guild-page__rows';
    rows.append(
      this.createRequestDetailRow({
        icon: 'icon-difficulty.png',
        label: 'Difficulty',
        value: this.toQuestDisplayCase(request.difficulty),
        className: `guild-page__request-detail-row--${this.getCssToken(
          request.difficulty ?? 'normal',
        )}`,
      }),
      this.createRequestDetailRow({
        icon: 'icon-stats.png',
        label: 'Stats',
        value: this.toQuestDisplayCase(request.statLabel),
      }),
      this.createRequestDetailRow({
        icon: 'icon-reward.png',
        label: 'Reward',
        value: this.createRequestStackRewardText(request.rewardText),
        className: 'guild-page__request-detail-row--reward',
      }),
      this.createRequestDetailRow({
        icon: 'icon-expires.png',
        label: 'Expires',
        value: request.expiresLabel ?? 'now',
      }),
    );

    if (request.eventLabel) {
      rows.append(
        this.createRequestDetailRow({
          icon: 'wax-seal.png',
          label: 'Event',
          value: request.eventLabel,
        }),
      );
    }

    detail.append(
      title,
      page,
      lore,
      rows,
      this.createQuestAssetImage('wax-seal.png', 'guild-page__request-detail-seal'),
    );
    return detail;
  }

  createRequestDetailRow({ icon, label, value, className = '' }) {
    const row = document.createElement('div');
    row.className = ['guild-page__row guild-page__request-detail-row', className]
      .filter(Boolean)
      .join(' ');

    row.append(this.createQuestAssetImage(icon, 'guild-page__request-detail-icon'));

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

  createRequestStackRewardText(value) {
    const reward = document.createElement('span');
    reward.className = 'guild-page__request-detail-reward-list';
    const parts = String(value ?? '')
      .split(/\s*(?:,|\bor\b)\s*/i)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts.length > 0 ? parts : [String(value ?? '')]) {
      const line = document.createElement('span');
      line.className = 'guild-page__request-detail-reward-line';
      setResourceIconText(line, part);
      reward.append(line);
    }

    return reward;
  }

  toQuestDisplayCase(value) {
    return String(value ?? '').replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }

  createQuestAssetImage(fileName, className) {
    const image = document.createElement('img');
    image.className = className;
    image.src = `${GUILD_QUEST_ASSET_PATH}${fileName}`;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    image.draggable = false;
    return image;
  }

  getCssToken(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  createRequestPaperContent(
    request,
    {
      showTitle = false,
      pageLabel = '',
      actionLabel = '',
      actionDisabled = false,
      onAction = null,
    } = {},
  ) {
    const content = document.createElement('section');
    content.className = 'guild-page__request-paper-content';

    if (showTitle || pageLabel) {
      const header = document.createElement('div');
      header.className = 'guild-page__request-paper-header';

      if (showTitle) {
        const title = document.createElement('div');
        title.className = 'guild-page__request-paper-title';
        title.textContent = request.title;
        header.append(title);
      }

      if (pageLabel) {
        const page = document.createElement('div');
        page.className = 'guild-page__request-paper-page';
        page.textContent = pageLabel;
        header.append(page);
      }

      content.append(header);
    }

    const rows = document.createElement('div');
    rows.className = 'guild-page__request-paper-rows guild-page__rows';
    rows.append(
      this.createTextRow('difficulty', request.difficulty),
      this.createTextRow('stats', request.statLabel),
      this.createTextRow('reward', this.createResourceText(request.rewardText)),
      this.createTextRow('expires', request.expiresLabel ?? 'now'),
      this.createParagraph(request.lore),
    );

    if (request.eventLabel) {
      rows.append(this.createTextRow('event', request.eventLabel));
    }

    content.append(rows);

    if (actionLabel && onAction) {
      content.append(
        this.createButtonRow(actionLabel, onAction, { disabled: actionDisabled }),
      );
    }

    return content;
  }

  createRequestStackButton(label, className, onClick, { disabled = false } = {}) {
    const button = document.createElement('button');
    button.className = ['style-button guild-page__request-stack-action', className]
      .filter(Boolean)
      .join(' ');
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
  }

  getAvailableRequestStack() {
    return (this.snapshot.availableRequests ?? []).filter(Boolean);
  }

  turnAvailableRequestPage() {
    const requests = this.getAvailableRequestStack();

    if (requests.length <= 1 || this.requestStackTimer) {
      return;
    }

    const finishTurn = () => {
      const latestRequests = this.getAvailableRequestStack();
      this.requestStackIndex =
        latestRequests.length > 0
          ? (this.requestStackIndex + 1) % latestRequests.length
          : 0;
      this.requestStackTimer = null;
      this.refs.popupPanel?.classList.remove('is-turning-page');
      this.renderPopup();
    };

    const prefersReducedMotion =
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

    if (prefersReducedMotion) {
      finishTurn();
      return;
    }

    this.refs.popupPanel?.classList.add('is-turning-page');
    this.requestStackTimer = globalThis.setTimeout(finishTurn, 225);
  }

  clearRequestStackTimer() {
    if (this.requestStackTimer) {
      globalThis.clearTimeout(this.requestStackTimer);
      this.requestStackTimer = null;
    }

    this.refs.popupPanel?.classList.remove('is-turning-page');
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

    this.refs.popupTitle.textContent =
      this.selectedCardKind === 'applicant' ? 'applicant info' : 'adventurer info';
    this.renderCardTabs();
    const cardScrollKey = this.getCardScrollKey(adventurer);
    const reusableDetails = this.getReusableCardDetails(cardScrollKey);
    const secondaryRows = [];

    if (this.selectedCardTab === 'life') {
      secondaryRows.push(
        this.createCardTextRow('morale', adventurer.morale),
        this.createCardTextRow('fatigue', adventurer.fatigue),
        this.createCardTextRow('injury', adventurer.injury),
        this.createParagraph(adventurer.lifeText || adventurer.personalityLife),
      );
    } else if (this.selectedCardTab === 'history') {
      const history = adventurer.history ?? [];
      secondaryRows.push(
        ...(history.length
          ? history.map((entry) => this.createParagraph(entry.text ?? entry))
          : [this.createEmptyRow('no history')]),
      );
    } else {
      secondaryRows.push(
        this.createCardTextRow('xp', `${adventurer.xp ?? 0}/${adventurer.nextLevelXp ?? '?'}`),
        this.createCardTextRow('personality', adventurer.personalityLabel),
        ...Object.entries(adventurer.stats ?? {}).map(([stat, value]) =>
          this.createCardTextRow(stat, value),
        ),
      );
    }

    let actionButton = null;

    if (this.selectedCardKind === 'applicant') {
      actionButton = this.createButtonRow('hire', () => {
        const result = this.gameplayFacade?.hireGuildApplicant?.(adventurer.id);

        if (result?.ok) {
          this.hidePopup();
        }
      });
    } else if (adventurer.status !== 'dead' && adventurer.status !== 'questing') {
      actionButton = this.createButtonRow('fire', () => {
        this.gameplayFacade?.fireGuildAdventurer?.(adventurer.id);
        this.hidePopup();
      });
    }

    const card = this.createAdventurerCard(adventurer, secondaryRows, actionButton, {
      detailsElement: reusableDetails,
    });
    this.refs.popupContent.replaceChildren(card);
    this.renderedCardScrollKey = cardScrollKey;
    this.refs.cardDetails = card.querySelector('.guild-page__card-details');
    this.dispatchScrollEvent(this.refs.cardDetails);
  }

  getCardScrollKey(adventurer) {
    return [
      this.selectedCardKind ?? '',
      adventurer?.id ?? '',
      this.selectedCardTab ?? '',
    ].join('|');
  }

  getReusableCardDetails(cardScrollKey) {
    if (!cardScrollKey || this.renderedCardScrollKey !== cardScrollKey) {
      return null;
    }

    const details =
      this.refs.cardDetails ??
      this.refs.popupContent?.querySelector('.guild-page__card-details') ??
      null;

    if (!details?.isConnected || !this.refs.popupContent?.contains(details)) {
      return null;
    }

    return details;
  }

  clearCardDetailsReuse() {
    this.renderedCardScrollKey = '';
    this.refs.cardDetails = null;
  }

  dispatchScrollEvent(element) {
    if (!element) {
      return;
    }

    const EventCtor = element.ownerDocument?.defaultView?.Event ?? globalThis.Event;
    element.dispatchEvent(new EventCtor('scroll'));
  }

  renderCardTabs() {
    this.refs.popupTabs.replaceChildren(
      ...CARD_TABS.map((tab) => {
        const button = document.createElement('button');
        button.className = 'style-button guild-page__tab-button';
        button.type = 'button';
        button.textContent = tab.label;
        button.setAttribute('role', 'tab');
        setSelectedTabState(button, tab.id === this.selectedCardTab);
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
