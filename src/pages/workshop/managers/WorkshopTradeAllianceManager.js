import {
  DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
  TRADE_ALLIANCE_TAG_COLORS,
  getTradeAllianceTagColorCssValue,
  normalizeTradeAllianceTagColor,
} from '../../../shared/tradeAllianceTagColors.js';
import { formatGoldPriceText } from '../../../shared/goldPrice.js';
import { createAllianceTagSpan } from '../../shared/allianceTagLabel.js';
import { createPlayerInfoLink } from '../../shared/playerInfoLink.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';

const ROLE_LABELS = {
  tradeMaster: 'trade master',
  quartermaster: 'quartermaster',
  factor: 'factor',
  broker: 'broker',
  trader: 'trader',
};

const ROLE_OPTIONS = [
  'tradeMaster',
  'quartermaster',
  'factor',
  'broker',
  'trader',
];

const JOIN_MODE_LABELS = {
  open: 'open',
  apply: 'apply',
  closed: 'closed',
};

const SOLO_TABS = [
  { id: 'browse', label: 'browse' },
  { id: 'create', label: 'create' },
];

const MEMBER_TABS = [
  { id: 'home', label: 'home' },
  { id: 'quests', label: 'quests' },
  { id: 'members', label: 'members' },
  { id: 'settings', label: 'settings' },
];
const ITEM_FILL_QUEST_TYPE = 'itemFill';
const QUEST_PERIOD_ANCHOR_MS = 1_780_876_800_000;
const QUEST_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const QUEST_TIMER_INTERVAL_MS = 1000;

export class WorkshopTradeAllianceManager {
  constructor({ gameplayFacade, tradeAllianceFacade, onOpenPlayerInfo } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.tradeAllianceFacade = tradeAllianceFacade;
    this.onOpenPlayerInfo = onOpenPlayerInfo;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedSoloTabId = 'browse';
    this.selectedMemberTabId = 'home';
    this.searchTerm = '';
    this.status = '';
    this.lastSnapshot = {};
    this.previousFocus = null;
    this.memberEditVisible = false;
    this.selectedMemberIdentity = null;
    this.questTimer = null;
    this.handleRootClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleMemberPopupClick = (event) => {
      if (event.target === this.refs.memberPopup) {
        this.hideMemberEdit();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      if (this.memberEditVisible) {
        this.hideMemberEdit();
        return;
      }

      this.hide();
    };
  }

  mount(parent, popupParent = parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__trade-alliance';

    this.refs.button = this.createButton();
    this.refs.popup = this.createPopup();

    this.root.append(this.refs.button);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    if (this.tradeAllianceFacade) {
      this.unsubscribe = this.tradeAllianceFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.tradeAllianceFacade.getSnapshot());
    } else {
      this.render({});
    }

    this.applyVisibility();
    return this.root;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__trade-alliance-button';
    button.type = 'button';
    button.textContent = 'alliance';
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__trade-alliance-popup';
    popup.addEventListener('click', this.handleRootClick);

    const panel = document.createElement('section');
    panel.className = 'workshop-page__trade-alliance-panel';
    panel.setAttribute('aria-label', 'Trade alliance');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__trade-alliance-dialog style-dialog';

    this.refs.dialog = panel;
    this.refs.title = this.createTitle();
    this.refs.closeButton = this.createCloseButton();
    this.refs.content = document.createElement('div');
    this.refs.content.className = 'workshop-page__trade-alliance-content';
    this.refs.status = document.createElement('div');
    this.refs.status.className = 'workshop-page__trade-alliance-status';
    this.refs.tabs = document.createElement('div');
    this.refs.tabs.className = 'workshop-page__trade-alliance-tabs';
    this.refs.tabs.setAttribute('role', 'tablist');
    this.refs.tabs.setAttribute('aria-label', 'Alliance view');

    dialog.append(
      this.refs.title,
      this.refs.closeButton,
      this.refs.content,
      this.refs.status,
    );
    panel.append(dialog, this.refs.tabs);
    this.refs.memberPopup = this.createMemberEditPopup();
    popup.append(panel, this.refs.memberPopup);
    return popup;
  }

  createMemberEditPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__trade-alliance-member-popup';
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
    popup.addEventListener('click', this.handleMemberPopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__trade-alliance-member-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Alliance member');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    this.refs.memberEditDialog = dialog;
    this.refs.memberEditTitle = document.createElement('div');
    this.refs.memberEditTitle.className = 'style-box__title';
    this.refs.memberEditTitle.textContent = 'member';

    this.refs.memberEditCloseButton = document.createElement('button');
    this.refs.memberEditCloseButton.className = 'style-button workshop-page__trade-alliance-close';
    this.refs.memberEditCloseButton.type = 'button';
    this.refs.memberEditCloseButton.textContent = 'close';
    this.refs.memberEditCloseButton.addEventListener('click', () => this.hideMemberEdit());

    this.refs.memberEditContent = document.createElement('div');
    this.refs.memberEditContent.className = 'workshop-page__trade-alliance-rows';
    this.refs.memberEditStatus = document.createElement('div');
    this.refs.memberEditStatus.className = 'workshop-page__trade-alliance-status';

    dialog.append(
      this.refs.memberEditTitle,
      this.refs.memberEditCloseButton,
      this.refs.memberEditContent,
      this.refs.memberEditStatus,
    );
    popup.append(dialog);
    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'trade alliance';
    return title;
  }

  createCloseButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__trade-alliance-close';
    button.type = 'button';
    button.textContent = 'close';
    button.addEventListener('click', () => this.hide());
    return button;
  }

  show() {
    if (!this.isButtonAvailable()) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
  }

  isButtonAvailable() {
    return (
      this.root &&
      !this.root.hidden &&
      this.refs.button?.disabled !== true &&
      this.refs.button?.getAttribute('aria-disabled') !== 'true'
    );
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.memberEditVisible = false;
    this.selectedMemberIdentity = null;
    this.applyVisibility();
    this.applyMemberEditVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  unmount() {
    this.stopQuestTimer();
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.selectedSoloTabId = 'browse';
    this.selectedMemberTabId = 'home';
    this.searchTerm = '';
    this.status = '';
    this.lastSnapshot = {};
    this.previousFocus = null;
    this.memberEditVisible = false;
    this.selectedMemberIdentity = null;
    this.questTimer = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    const ownAlliance = this.lastSnapshot.ownAlliance ?? null;
    this.syncMemberEditState();
    this.refs.button.textContent = ownAlliance ? 'alliance' : 'alliance';
    this.renderTitle(ownAlliance);
    this.refs.status.textContent = this.status;
    this.syncQuestTimer();

    if (ownAlliance) {
      this.renderTabs(MEMBER_TABS, this.selectedMemberTabId);
      this.renderMemberView(this.selectedMemberTabId);
      this.renderMemberEditPopup();
      return;
    }

    this.hideMemberEdit({ focusDialog: false });
    this.renderTabs(SOLO_TABS, this.selectedSoloTabId);
    this.renderSoloView(this.selectedSoloTabId);
  }

  renderTabs(tabs, selectedTabId) {
    this.refs.tabs.replaceChildren(
      ...tabs.map((tab) => {
        const button = document.createElement('button');
        button.className = 'style-button workshop-page__trade-alliance-tab-button';
        button.type = 'button';
        button.textContent = tab.label;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', selectedTabId === tab.id ? 'true' : 'false');
        button.addEventListener('click', () => {
          if (tabs === SOLO_TABS) {
            this.selectedSoloTabId = tab.id;
          } else {
            this.selectedMemberTabId = tab.id;
          }
          this.status = '';
          this.render(this.lastSnapshot);
        });
        return button;
      }),
    );
  }

  renderTitle(ownAlliance) {
    if (!ownAlliance) {
      this.refs.title.textContent = 'trade alliance';
      return;
    }

    const tag = this.createTagSpan(ownAlliance.tag, ownAlliance.tagColor);
    this.refs.title.replaceChildren(
      ...(tag ? [tag, document.createTextNode(' ')] : []),
      document.createTextNode(ownAlliance.name),
    );
  }

  renderSoloView(tabId) {
    if (tabId === 'create') {
      this.renderCreateView();
      return;
    }

    this.renderBrowseView();
  }

  renderBrowseView() {
    const root = document.createElement('div');
    const search = document.createElement('input');
    search.className = 'style-input workshop-page__trade-alliance-search';
    search.type = 'text';
    search.value = this.searchTerm;
    search.placeholder = 'search name or tag';
    search.setAttribute('aria-label', 'Search alliance name or tag');

    const rows = document.createElement('div');
    rows.className = 'workshop-page__trade-alliance-rows';

    search.addEventListener('input', () => {
      this.searchTerm = search.value;
      this.renderAllianceList(rows);
    });

    root.append(search, rows);
    this.refs.content.replaceChildren(root);
    this.renderAllianceList(rows);
  }

  renderAllianceList(rows) {
    const alliances = this.getFilteredAlliances();
    if (!alliances.length) {
      rows.replaceChildren(this.createEmptyRow('no alliances'));
      return;
    }

    rows.replaceChildren(...alliances.map((alliance) => this.createAllianceRow(alliance)));
  }

  createAllianceRow(alliance) {
    const row = document.createElement('div');
    row.className = 'workshop-page__trade-alliance-list-row';

    const main = document.createElement('div');
    main.className = 'workshop-page__trade-alliance-list-main';
    main.append(
      this.createTextRow(
        this.createAllianceNameTagLabel(alliance),
        `${alliance.memberCount}/50`,
      ),
      this.createAllianceInfoRow(
        alliance.description || JOIN_MODE_LABELS[alliance.joinMode] || alliance.joinMode,
      ),
      this.createTextRow(
        'season income',
        this.formatGoldText(alliance.seasonIncome),
        { muted: true, compact: true, resource: 'gold' },
      ),
    );

    const action = document.createElement('button');
    action.className = 'style-button workshop-page__trade-alliance-list-action';
    action.type = 'button';
    action.textContent = alliance.joinMode === 'open' ? 'join' : 'apply';
    action.disabled = alliance.joinMode === 'closed';
    action.addEventListener('click', () => {
      if (alliance.joinMode === 'open') {
        void this.runAction(() => this.tradeAllianceFacade.joinAlliance(alliance.allianceId));
      } else {
        void this.runAction(() => this.tradeAllianceFacade.applyAlliance(alliance.allianceId));
      }
    });

    row.append(main, action);
    return row;
  }

  renderCreateView() {
    const form = document.createElement('form');
    form.className = 'workshop-page__trade-alliance-form';
    form.addEventListener('submit', (event) => this.onCreateSubmit(event, form));
    const submitButton = this.createSubmitButton('create');
    this.bindSubmitPressStart(submitButton, form);

    form.append(
      this.createInputField('name', 'name', { maxLength: 24 }),
      this.createInputField('tag', 'tag', { maxLength: 5, autocapitalize: 'characters' }),
      this.createTagColorField('tag color'),
      this.createInputField('description', 'description', { maxLength: 120 }),
      this.createJoinModeField('join mode'),
      submitButton,
    );

    this.refs.content.replaceChildren(form);
  }

  async onCreateSubmit(event, form) {
    event.preventDefault();
    const formData = new window.FormData(form);
    await this.runAction(() =>
      this.tradeAllianceFacade.createAlliance({
        name: formData.get('name'),
        tag: formData.get('tag'),
        tagColor: formData.get('tagColor'),
        description: formData.get('description'),
        joinMode: formData.get('joinMode'),
      }),
    );
  }

  renderMemberView(tabId) {
    if (tabId === 'quests') {
      this.renderQuestsView();
      return;
    }

    if (tabId === 'members') {
      this.renderMembersView();
      return;
    }

    if (tabId === 'settings') {
      this.renderSettingsView();
      return;
    }

    this.renderHomeView();
  }

  renderHomeView() {
    const alliance = this.lastSnapshot.ownAlliance;
    const member = this.lastSnapshot.ownMember;
    const root = document.createElement('div');
    root.className = 'workshop-page__trade-alliance-rows';

    root.append(
      this.createTextRow('role', this.formatRole(member?.role)),
      this.createTextRow('members', `${alliance.memberCount}/50`),
      this.createTextRow('season income', this.formatGoldText(alliance.seasonIncome), {
        resource: 'gold',
      }),
      this.createTextRow('daily income', this.formatGoldText(alliance.dailyIncome), {
        resource: 'gold',
      }),
      this.createQuestResetRow(),
    );

    if (alliance.notice) {
      root.append(this.createParagraph(alliance.notice));
    }

    const leave = document.createElement('button');
    leave.className = 'style-button workshop-page__trade-alliance-wide-button';
    leave.type = 'button';
    leave.textContent = 'leave';
    leave.disabled = member?.role === 'tradeMaster' && alliance.memberCount > 1;
    leave.addEventListener('click', () =>
      void this.runAction(() => this.tradeAllianceFacade.leaveAlliance()),
    );
    root.append(leave);

    this.refs.content.replaceChildren(root);
  }

  renderQuestsView() {
    const rows = document.createElement('div');
    rows.className = 'workshop-page__trade-alliance-rows';
    this.refs.questLockMessage = null;
    const allianceId = this.lastSnapshot.ownAlliance?.allianceId;
    const quests = (this.lastSnapshot.quests ?? []).filter(
      (quest) => quest.allianceId === allianceId,
    );
    const questLock = this.getQuestParticipationLock();

    rows.append(this.createQuestResetRow());

    if (questLock) {
      rows.append(this.createQuestLockMessage(questLock));
    }

    if (!quests.length) {
      rows.append(this.createEmptyRow('no quests'));
      this.refs.content.replaceChildren(rows);
      return;
    }

    rows.append(...quests.map((quest) => this.createQuestRow(quest, { locked: Boolean(questLock) })));
    this.refs.content.replaceChildren(rows);
  }

  createQuestRow(quest, { locked = false } = {}) {
    const contribution = this.getOwnContribution(quest);
    const itemFillQuest = this.isItemFillQuest(quest);
    const questComplete = quest.progress >= quest.target;
    const questClaimed = Boolean(quest.claimed);
    const row = document.createElement('div');
    row.className = 'workshop-page__trade-alliance-quest-row';

    const main = document.createElement('div');
    main.className = 'workshop-page__trade-alliance-quest-main';
    main.append(
      this.createTextRow(quest.label, `${this.formatNumber(quest.progress)}/${this.formatNumber(quest.target)}`),
      this.createTextRow(
        `${itemFillQuest ? 'your fill' : 'your route'} ${this.formatNumber(contribution)}/${this.formatNumber(quest.minContribution)}`,
        `${quest.crystalReward} crystal`,
        { muted: true },
      ),
    );

    const progress = document.createElement('div');
    progress.className = 'style-progress workshop-page__trade-alliance-progress';
    const fill = document.createElement('div');
    fill.className = 'style-progress__fill workshop-page__trade-alliance-progress-fill';
    fill.style.width = `${Math.round((quest.progressRatio ?? 0) * 100)}%`;
    progress.append(fill);

    const action = document.createElement('button');
    action.className = 'style-button workshop-page__trade-alliance-quest-action';
    action.type = 'button';
    let actionText = 'claim';
    if (questClaimed) {
      actionText = 'claimed';
    } else if (locked) {
      actionText = 'locked';
    } else if (itemFillQuest && !questComplete) {
      actionText = 'fill';
    }
    action.textContent = actionText;

    if (questClaimed) {
      action.disabled = true;
    } else if (locked) {
      action.disabled = true;
    } else if (itemFillQuest && !questComplete) {
      action.disabled = !this.canFillItemQuest(quest);
      action.addEventListener('click', () => void this.runAction(() => this.fillItemQuest(quest)));
    } else {
      action.disabled = quest.progress < quest.target || contribution < quest.minContribution;
      action.addEventListener('click', () =>
        void this.runAction(() => this.tradeAllianceFacade.claimQuestReward(quest.questId)),
      );
    }

    main.append(progress);
    row.append(main, action);
    return row;
  }

  renderMembersView() {
    const root = document.createElement('div');
    root.className = 'workshop-page__trade-alliance-rows';
    const allianceId = this.lastSnapshot.ownAlliance?.allianceId;
    const members = (this.lastSnapshot.members ?? []).filter(
      (member) => member.allianceId === allianceId,
    );

    root.append(...members.map((member) => this.createMemberRow(member)));

    if (this.lastSnapshot.canManageApplications) {
      const applications = (this.lastSnapshot.applications ?? []).filter(
        (application) => application.allianceId === allianceId,
      );
      root.append(this.createDivider());
      root.append(this.createSectionLabel('applications'));
      root.append(
        ...(applications.length
          ? applications.map((application) => this.createApplicationRow(application))
          : [this.createEmptyRow('none')]),
      );
    }

    this.refs.content.replaceChildren(root);
  }

  createMemberRow(member) {
    const row = document.createElement('div');
    row.className = 'workshop-page__trade-alliance-member-row';

    const main = document.createElement('div');
    main.className = 'workshop-page__trade-alliance-member-main';
    main.append(
      this.createTextRow(this.createPlayerLabel(member), this.formatRole(member.role)),
      this.createTextRow('weekly', this.formatNumber(this.getMemberWeeklyContribution(member)), {
        muted: true,
      }),
    );

    if (this.canModifyMember(member)) {
      row.classList.add('is-actionable');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `edit ${member.username}`);
      row.addEventListener('click', () => this.showMemberEdit(member));
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        this.showMemberEdit(member);
      });
    }

    row.append(main);
    return row;
  }

  showMemberEdit(member) {
    if (!this.canModifyMember(member)) {
      return;
    }

    this.selectedMemberIdentity = member.memberIdentity;
    this.memberEditVisible = true;
    this.renderMemberEditPopup();
    this.applyMemberEditVisibility();
    this.refs.memberEditDialog?.focus();
  }

  hideMemberEdit({ focusDialog = true } = {}) {
    const wasVisible = this.memberEditVisible;
    this.memberEditVisible = false;
    this.selectedMemberIdentity = null;
    this.applyMemberEditVisibility();

    if (wasVisible && focusDialog && this.visible) {
      this.refs.dialog?.focus();
    }
  }

  renderMemberEditPopup() {
    if (!this.refs.memberEditContent) {
      return;
    }

    const member = this.getSelectedMember();
    if (!this.memberEditVisible || !member) {
      this.refs.memberEditTitle.textContent = 'member';
      this.refs.memberEditContent.replaceChildren();
      this.refs.memberEditStatus.textContent = this.status;
      this.applyMemberEditVisibility();
      return;
    }

    this.refs.memberEditTitle.textContent = `${member.username}(${member.playerLevel})`;
    const rows = [
      this.createTextRow('role', this.formatRole(member.role)),
      this.createTextRow('weekly', this.formatNumber(this.getMemberWeeklyContribution(member)), {
        muted: true,
      }),
    ];

    if (this.canManageMember(member)) {
      rows.push(this.createMemberRoleField(member));
    }

    if (this.canTransferLeadership(member)) {
      rows.push(
        this.createDangerButton('lead', () =>
          this.runAction(() =>
            this.tradeAllianceFacade.transferLeadership(member.memberIdentity),
          ),
        ),
      );
    }

    if (this.canKickMember(member)) {
      rows.push(
        this.createDangerButton('kick', () =>
          this.runAction(() => this.tradeAllianceFacade.kickMember(member.memberIdentity)),
        ),
      );
    }

    this.refs.memberEditContent.replaceChildren(...rows);
    this.refs.memberEditStatus.textContent = this.status;
    this.applyMemberEditVisibility();
  }

  createMemberRoleField(member) {
    const field = document.createElement('label');
    field.className = 'workshop-page__trade-alliance-field';

    const span = document.createElement('span');
    span.textContent = 'change role';

    const select = document.createElement('select');
    select.className = 'style-input workshop-page__trade-alliance-input';
    select.setAttribute('aria-label', `${member.username} role`);
    for (const role of ROLE_OPTIONS.filter((roleId) => roleId !== 'tradeMaster')) {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = this.formatRole(role);
      option.selected = role === member.role;
      select.append(option);
    }
    select.addEventListener('change', () =>
      void this.runAction(() =>
        this.tradeAllianceFacade.setMemberRole(member.memberIdentity, select.value),
      ),
    );

    field.append(span, select);
    return field;
  }

  createApplicationRow(application) {
    const row = document.createElement('div');
    row.className = 'workshop-page__trade-alliance-application-row';
    row.append(
      this.createTextRow(
        this.createPlayerLabel({
          identity: application.applicantIdentity,
          username: application.username,
          playerLevel: application.playerLevel,
        }),
        'pending',
      ),
      this.createSmallButton('accept', () =>
        this.runAction(() =>
          this.tradeAllianceFacade.acceptApplication(application.applicationKey),
        ),
      ),
      this.createSmallButton('reject', () =>
        this.runAction(() =>
          this.tradeAllianceFacade.rejectApplication(application.applicationKey),
        ),
      ),
    );
    return row;
  }

  renderSettingsView() {
    if (!this.lastSnapshot.canEditSettings) {
      const root = document.createElement('div');
      root.className = 'workshop-page__trade-alliance-rows';
      root.append(this.createEmptyRow('trade master only'));
      this.refs.content.replaceChildren(root);
      return;
    }

    const alliance = this.lastSnapshot.ownAlliance;
    const form = document.createElement('form');
    form.className = 'workshop-page__trade-alliance-form';
    form.addEventListener('submit', (event) => this.onSettingsSubmit(event, form));
    const submitButton = this.createSubmitButton('save');
    this.bindSubmitPressStart(submitButton, form);

    form.append(
      this.createInputField('name', 'name', { value: alliance.name, maxLength: 24 }),
      this.createInputField('tag', 'tag', {
        value: alliance.tag,
        maxLength: 5,
        autocapitalize: 'characters',
      }),
      this.createTagColorField('tag color', alliance.tagColor),
      this.createInputField('description', 'description', {
        value: alliance.description,
        maxLength: 120,
      }),
      this.createInputField('notice', 'notice', { value: alliance.notice, maxLength: 160 }),
      this.createJoinModeField('join mode', alliance.joinMode),
      submitButton,
      this.createDangerButton('disband', () => this.onDisband()),
    );

    this.refs.content.replaceChildren(form);
  }

  async onSettingsSubmit(event, form) {
    event.preventDefault();
    const formData = new window.FormData(form);
    await this.runAction(() =>
      this.tradeAllianceFacade.updateProfile({
        name: formData.get('name'),
        tag: formData.get('tag'),
        tagColor: formData.get('tagColor'),
        description: formData.get('description'),
        notice: formData.get('notice'),
        joinMode: formData.get('joinMode'),
      }),
    );
  }

  createInputField(name, label, { value = '', maxLength = 80, autocapitalize = 'none' } = {}) {
    const field = document.createElement('label');
    field.className = 'workshop-page__trade-alliance-field';

    const span = document.createElement('span');
    span.textContent = label;

    const input = document.createElement('input');
    input.className = 'style-input workshop-page__trade-alliance-input';
    input.name = name;
    input.type = 'text';
    input.maxLength = maxLength;
    input.value = value;
    input.autocomplete = 'off';
    input.autocapitalize = autocapitalize;

    field.append(span, input);
    return field;
  }

  createJoinModeField(label, value = 'apply') {
    const field = document.createElement('label');
    field.className = 'workshop-page__trade-alliance-field';

    const span = document.createElement('span');
    span.textContent = label;

    const select = document.createElement('select');
    select.className = 'style-input workshop-page__trade-alliance-input';
    select.name = 'joinMode';

    for (const joinMode of Object.keys(JOIN_MODE_LABELS)) {
      const option = document.createElement('option');
      option.value = joinMode;
      option.textContent = JOIN_MODE_LABELS[joinMode];
      option.selected = joinMode === value;
      select.append(option);
    }

    field.append(span, select);
    return field;
  }

  createTagColorField(label, value = DEFAULT_TRADE_ALLIANCE_TAG_COLOR) {
    const selectedColorId = normalizeTradeAllianceTagColor(value);
    const field = document.createElement('fieldset');
    field.className =
      'workshop-page__trade-alliance-field workshop-page__trade-alliance-color-field';

    const legend = document.createElement('legend');
    legend.textContent = label;

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'tagColor';
    input.value = selectedColorId;

    const swatches = document.createElement('div');
    swatches.className = 'workshop-page__trade-alliance-color-swatches';
    swatches.setAttribute('role', 'radiogroup');
    swatches.setAttribute('aria-label', label);

    const buttons = TRADE_ALLIANCE_TAG_COLORS.map((color) => {
      const button = document.createElement('button');
      button.className = 'workshop-page__trade-alliance-color-swatch';
      button.type = 'button';
      button.style.setProperty(
        '--workshop-alliance-swatch-color',
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
      button.addEventListener('click', () => setSelected(button.dataset.colorId));
    }

    setSelected(selectedColorId);
    field.append(legend, input, swatches);
    return field;
  }

  createSubmitButton(label) {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__trade-alliance-wide-button';
    button.type = 'submit';
    button.textContent = label;
    return button;
  }

  bindSubmitPressStart(button, form) {
    const submit = (event) => {
      if (button.disabled) {
        return;
      }

      event.preventDefault();
      this.submitForm(form);
    };

    button.addEventListener('pointerdown', submit);
    if (typeof window.PointerEvent !== 'function') {
      button.addEventListener('touchstart', submit, { passive: false });
    }
  }

  submitForm(form) {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }

    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  }

  createDangerButton(label, onClick) {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__trade-alliance-wide-button';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => void onClick());
    return button;
  }

  createSmallButton(label, onClick) {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__trade-alliance-small-button';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => void onClick());
    return button;
  }

  createTextRow(label, value, { muted = false, compact = false, resource = null } = {}) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__trade-alliance-row';
    if (muted) {
      row.classList.add('is-muted');
    }
    if (compact) {
      row.classList.add('is-compact');
    }

    const key = document.createElement('span');
    key.className = 'row_key';
    this.appendCellContent(key, label);

    const val = document.createElement('span');
    val.className = 'row_val';
    this.appendCellContent(val, value);
    this.applyResourceValue(val, value, resource);

    row.append(key, val);
    return row;
  }

  createAllianceNameTagLabel(alliance) {
    const tag = this.createTagSpan(alliance?.tag, alliance?.tagColor);
    return [
      ...(tag ? [tag, document.createTextNode(' ')] : []),
      document.createTextNode(String(alliance?.name ?? '')),
    ];
  }

  createPlayerLabel(player) {
    const username = String(player?.username ?? 'wizard');
    const level = this.normalizePlayerLevel(player?.playerLevel);
    return [
      createPlayerInfoLink(
        {
          identity: player?.identity ?? player?.memberIdentity ?? player?.applicantIdentity,
          username,
          playerLevel: level,
        },
        {
          onOpenPlayerInfo: this.onOpenPlayerInfo,
          text: username,
          className: 'workshop-page__trade-alliance-player-link',
        },
      ),
      document.createTextNode(`(${level})`),
    ];
  }

  createTagSpan(tag, tagColor) {
    return createAllianceTagSpan(tag, tagColor);
  }

  appendCellContent(element, content) {
    if (Array.isArray(content)) {
      element.replaceChildren(...content);
      return;
    }

    if (content && typeof content === 'object' && typeof content.nodeType === 'number') {
      element.replaceChildren(content);
      return;
    }

    element.textContent = String(content ?? '');
  }

  applyResourceValue(element, value, resource) {
    setResourceColor(element, resource);
    if (resource === 'gold') {
      setResourceIconText(element, value);
    }
  }

  createAllianceInfoRow(text) {
    const row = document.createElement('div');
    row.className = 'workshop-page__trade-alliance-info-row';
    row.textContent = text;
    return row;
  }

  createEmptyRow(text) {
    const row = document.createElement('div');
    row.className = 'workshop-page__trade-alliance-empty';
    row.textContent = text;
    return row;
  }

  createParagraph(text) {
    const paragraph = document.createElement('p');
    paragraph.className = 'workshop-page__trade-alliance-paragraph';
    paragraph.textContent = text;
    return paragraph;
  }

  createQuestResetRow() {
    const row = this.createTextRow('quests reset', this.getQuestResetLabel());
    row.classList.add('workshop-page__trade-alliance-reset-row');
    this.refs.questResetValue = row.querySelector('.row_val');
    this.updateQuestResetTimerText();
    return row;
  }

  createQuestLockMessage(questLock) {
    const message = this.createParagraph(this.getQuestLockMessage(questLock));
    message.classList.add('workshop-page__trade-alliance-lock-message');
    this.refs.questLockMessage = message;
    return message;
  }

  createDivider() {
    const divider = document.createElement('div');
    divider.className = 'workshop-page__trade-alliance-divider';
    return divider;
  }

  createSectionLabel(text) {
    const label = document.createElement('div');
    label.className = 'workshop-page__trade-alliance-section-label';
    label.textContent = text;
    return label;
  }

  getFilteredAlliances() {
    const term = this.searchTerm.trim().toLowerCase();
    const alliances = Array.isArray(this.lastSnapshot.alliances)
      ? this.lastSnapshot.alliances
      : [];

    return alliances
      .filter((alliance) => {
        if (!term) {
          return true;
        }

        return (
          alliance.name.toLowerCase().includes(term) ||
          alliance.tag.toLowerCase().includes(term)
        );
      })
      .sort((left, right) => right.seasonIncome - left.seasonIncome)
      .slice(0, 20);
  }

  getOwnContribution(quest) {
    const ownIdentity = this.lastSnapshot.ownMember?.memberIdentity;
    const allianceId = quest?.allianceId;
    const questId = quest?.questId;
    const dayKey = quest?.dayKey;
    const contribution = (this.lastSnapshot.contributions ?? []).find(
      (row) =>
        row.allianceId === allianceId &&
        row.contributorIdentity === ownIdentity &&
        row.questId === questId &&
        row.dayKey === dayKey,
    );
    return contribution?.contribution ?? 0;
  }

  getQuestParticipationLock() {
    const ownIdentity = this.lastSnapshot.ownMember?.memberIdentity;
    const currentAllianceId = this.lastSnapshot.ownAlliance?.allianceId;
    const periodKey = this.getQuestPeriodKey();

    if (!ownIdentity || !currentAllianceId || !periodKey) {
      return null;
    }

    const otherContribution = (this.lastSnapshot.contributions ?? []).find(
      (row) =>
        row.contributorIdentity === ownIdentity &&
        row.dayKey === periodKey &&
        row.allianceId &&
        row.allianceId !== currentAllianceId &&
        Number(row.contribution ?? 0) > 0,
    );

    if (otherContribution) {
      const alliance = (this.lastSnapshot.alliances ?? []).find(
        (candidate) => candidate.allianceId === otherContribution.allianceId,
      );

      return {
        allianceId: otherContribution.allianceId,
        allianceName: alliance?.name || 'another alliance',
      };
    }

    const otherReward = (this.lastSnapshot.rewardInbox ?? []).find(
      (reward) =>
        reward.recipientIdentity === ownIdentity &&
        reward.dayKey === periodKey &&
        reward.allianceId &&
        reward.allianceId !== currentAllianceId,
    );

    if (!otherReward) {
      return null;
    }

    return {
      allianceId: otherReward.allianceId,
      allianceName: otherReward.allianceName || 'another alliance',
    };
  }

  getQuestLockMessage(questLock = this.getQuestParticipationLock()) {
    if (!questLock) {
      return '';
    }

    return `quest progress this week belongs to ${questLock.allianceName}. rejoin it to continue, or start quests here after reset in ${this.formatQuestResetDuration()}.`;
  }

  getQuestPeriodKey() {
    return (
      this.lastSnapshot.ownAlliance?.seasonKey ||
      this.lastSnapshot.ownMember?.dayKey ||
      (this.lastSnapshot.quests ?? [])[0]?.dayKey ||
      ''
    );
  }

  getQuestResetAtMs() {
    const periodKey = String(this.getQuestPeriodKey() ?? '').trim();

    if (!periodKey) {
      return null;
    }

    if (/^-?\d+$/.test(periodKey)) {
      return QUEST_PERIOD_ANCHOR_MS + (Number(periodKey) + 1) * QUEST_PERIOD_MS;
    }

    const isoWeekMatch = periodKey.match(/^(\d{4})-W(\d{1,2})$/);
    if (isoWeekMatch) {
      return this.getIsoWeekStartMs(Number(isoWeekMatch[1]), Number(isoWeekMatch[2]) + 1);
    }

    return null;
  }

  getIsoWeekStartMs(year, weekNumber) {
    const januaryFourth = Date.UTC(year, 0, 4);
    const januaryFourthDay = new Date(januaryFourth).getUTCDay() || 7;
    const firstWeekStart = januaryFourth - (januaryFourthDay - 1) * 24 * 60 * 60 * 1000;
    return firstWeekStart + (weekNumber - 1) * QUEST_PERIOD_MS;
  }

  getQuestResetLabel() {
    return `in ${this.formatQuestResetDuration()}`;
  }

  formatQuestResetDuration() {
    const resetAtMs = this.getQuestResetAtMs();

    if (!resetAtMs) {
      return 'unknown';
    }

    const remainingSeconds = Math.max(0, Math.floor((resetAtMs - Date.now()) / 1000));

    if (remainingSeconds <= 0) {
      return 'soon';
    }

    const days = Math.floor(remainingSeconds / 86_400);
    const hours = Math.floor((remainingSeconds % 86_400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  updateQuestResetTimerText() {
    if (this.refs.questResetValue) {
      this.refs.questResetValue.textContent = this.getQuestResetLabel();
    }

    if (this.refs.questLockMessage) {
      this.refs.questLockMessage.textContent = this.getQuestLockMessage();
    }
  }

  startQuestTimer() {
    if (this.questTimer || !this.getQuestResetAtMs()) {
      return;
    }

    this.questTimer = window.setInterval(
      () => this.updateQuestResetTimerText(),
      QUEST_TIMER_INTERVAL_MS,
    );
  }

  stopQuestTimer() {
    if (!this.questTimer) {
      return;
    }

    window.clearInterval(this.questTimer);
    this.questTimer = null;
  }

  syncQuestTimer() {
    if (!this.visible || !this.getQuestResetAtMs()) {
      this.stopQuestTimer();
      return;
    }

    this.startQuestTimer();
    this.updateQuestResetTimerText();
  }

  isItemFillQuest(quest) {
    return quest?.questType === ITEM_FILL_QUEST_TYPE && Boolean(quest.itemKey);
  }

  canFillItemQuest(quest) {
    if (!this.gameplayFacade || !this.isItemFillQuest(quest)) {
      return false;
    }

    try {
      const item = this.gameplayFacade.itemsFacade?.getItemDefinitionByKey?.(quest.itemKey);
      return item ? this.gameplayFacade.itemsFacade.getItemQuantity(item.id) > 0 : false;
    } catch {
      return false;
    }
  }

  async fillItemQuest(quest) {
    if (!this.gameplayFacade || !this.tradeAllianceFacade?.fillItemQuest) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    const fill = this.gameplayFacade.fillTradeAllianceItemQuest(quest);

    if (!fill.ok) {
      return fill;
    }

    const result = await this.tradeAllianceFacade.fillItemQuest({
      questId: quest.questId,
      itemKey: fill.item.key,
      quantity: fill.quantity,
    });

    if (!result?.ok) {
      this.gameplayFacade.refundTradeAllianceItemQuestFill(fill);
    }

    return result;
  }

  getMemberWeeklyContribution(member) {
    return member.weeklyContribution ?? member.dailyContribution ?? 0;
  }

  getSelectedMember() {
    if (!this.selectedMemberIdentity) {
      return null;
    }

    const allianceId = this.lastSnapshot.ownAlliance?.allianceId;
    return (
      (this.lastSnapshot.members ?? []).find(
        (member) =>
          member.allianceId === allianceId &&
          member.memberIdentity === this.selectedMemberIdentity,
      ) ?? null
    );
  }

  syncMemberEditState() {
    if (!this.memberEditVisible) {
      return;
    }

    const member = this.getSelectedMember();
    if (member && this.canModifyMember(member)) {
      return;
    }

    this.memberEditVisible = false;
    this.selectedMemberIdentity = null;
    this.applyMemberEditVisibility();
  }

  canModifyMember(member) {
    return (
      this.canManageMember(member) ||
      this.canTransferLeadership(member) ||
      this.canKickMember(member)
    );
  }

  canManageMember(member) {
    return (
      this.lastSnapshot.canManageRoles &&
      member.memberIdentity !== this.lastSnapshot.ownMember?.memberIdentity &&
      member.role !== 'tradeMaster'
    );
  }

  canTransferLeadership(member) {
    return (
      this.lastSnapshot.ownRole === 'tradeMaster' &&
      member.memberIdentity !== this.lastSnapshot.ownMember?.memberIdentity &&
      member.role !== 'tradeMaster'
    );
  }

  canKickMember(member) {
    return (
      this.lastSnapshot.canManageRoles &&
      member.memberIdentity !== this.lastSnapshot.ownMember?.memberIdentity &&
      member.role !== 'tradeMaster'
    );
  }

  async runAction(action) {
    this.setStatus('saving');
    const result = await action();
    this.setStatus(result?.ok ? '' : this.formatFailure(result?.reason));
    return result;
  }

  onDisband() {
    const memberCount = Number(this.lastSnapshot.ownAlliance?.memberCount ?? 0);

    if (memberCount > 1) {
      this.setStatus('remove members first');
      return null;
    }

    return this.runAction(() => this.tradeAllianceFacade.leaveAlliance());
  }

  setStatus(text) {
    this.status = text;
    if (this.refs.status) {
      this.refs.status.textContent = text;
    }
    if (this.refs.memberEditStatus) {
      this.refs.memberEditStatus.textContent = text;
    }
  }

  formatFailure(reason) {
    if (reason === 'offline') {
      return 'offline';
    }

    if (reason === 'empty_message') {
      return '';
    }

    if (reason === 'not_enough_items') {
      return 'not enough items';
    }

    return 'not saved';
  }

  formatRole(role) {
    return ROLE_LABELS[role] ?? role ?? 'trader';
  }

  formatNumber(value) {
    const safeValue = Math.floor(Number(value) || 0);
    return safeValue.toLocaleString('en-US');
  }

  normalizePlayerLevel(value) {
    const level = Math.floor(Number(value));
    return Number.isFinite(level) && level >= 1 ? level : 1;
  }

  formatGoldText(value) {
    return formatGoldPriceText(Math.floor(Number(value) || 0));
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
    this.syncQuestTimer();
  }

  applyMemberEditVisibility() {
    if (!this.refs.memberPopup) {
      return;
    }

    const hidden = !this.visible || !this.memberEditVisible;
    this.refs.memberPopup.hidden = hidden;
    this.refs.memberPopup.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }
}
