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

export class WorkshopTradeAllianceManager {
  constructor({ tradeAllianceFacade } = {}) {
    this.tradeAllianceFacade = tradeAllianceFacade;
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
    this.handleRootClick = (event) => {
      if (event.target === this.refs.popup) {
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
    popup.append(panel);
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
    this.previousFocus = document.activeElement;
    this.visible = true;
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
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    const ownAlliance = this.lastSnapshot.ownAlliance ?? null;
    this.refs.button.textContent = ownAlliance ? 'alliance' : 'alliance';
    this.refs.title.textContent = ownAlliance
      ? `${ownAlliance.name} [${ownAlliance.tag}]`
      : 'trade alliance';
    this.refs.status.textContent = this.status;

    if (ownAlliance) {
      this.renderTabs(MEMBER_TABS, this.selectedMemberTabId);
      this.renderMemberView(this.selectedMemberTabId);
      return;
    }

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
      this.createTextRow(`${alliance.name} [${alliance.tag}]`, `${alliance.memberCount}/50`),
      this.createTextRow(
        alliance.description || JOIN_MODE_LABELS[alliance.joinMode] || alliance.joinMode,
        this.formatNumber(alliance.seasonIncome),
        { muted: true },
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

    form.append(
      this.createInputField('name', 'name', { maxLength: 24 }),
      this.createInputField('tag', 'tag', { maxLength: 5, autocapitalize: 'characters' }),
      this.createInputField('description', 'description', { maxLength: 120 }),
      this.createJoinModeField('join mode'),
      this.createSubmitButton('create'),
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
      this.createTextRow('season income', this.formatNumber(alliance.seasonIncome)),
      this.createTextRow('daily income', this.formatNumber(alliance.dailyIncome)),
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
    const allianceId = this.lastSnapshot.ownAlliance?.allianceId;
    const quests = (this.lastSnapshot.quests ?? []).filter(
      (quest) => quest.allianceId === allianceId,
    );

    if (!quests.length) {
      rows.append(this.createEmptyRow('no quests'));
      this.refs.content.replaceChildren(rows);
      return;
    }

    rows.append(...quests.map((quest) => this.createQuestRow(quest)));
    this.refs.content.replaceChildren(rows);
  }

  createQuestRow(quest) {
    const contribution = this.getOwnContribution(quest.questId, quest.dayKey);
    const row = document.createElement('div');
    row.className = 'workshop-page__trade-alliance-quest-row';

    const main = document.createElement('div');
    main.className = 'workshop-page__trade-alliance-quest-main';
    main.append(
      this.createTextRow(quest.label, `${this.formatNumber(quest.progress)}/${this.formatNumber(quest.target)}`),
      this.createTextRow(
        `your route ${this.formatNumber(contribution)}/${this.formatNumber(quest.minContribution)}`,
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
    action.textContent = 'claim';
    action.disabled = quest.progress < quest.target || contribution < quest.minContribution;
    action.addEventListener('click', () =>
      void this.runAction(() => this.tradeAllianceFacade.claimQuestReward(quest.questId)),
    );

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
      this.createTextRow(`${member.username}(${member.playerLevel})`, this.formatRole(member.role)),
      this.createTextRow('daily', this.formatNumber(member.dailyContribution), { muted: true }),
    );

    const controls = document.createElement('div');
    controls.className = 'workshop-page__trade-alliance-member-controls';

    if (this.canManageMember(member)) {
      const select = document.createElement('select');
      select.className = 'style-input workshop-page__trade-alliance-role-select';
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
      controls.append(select);
    }

    if (this.lastSnapshot.ownRole === 'tradeMaster' && member.role !== 'tradeMaster') {
      controls.append(
        this.createSmallButton('lead', () =>
          this.runAction(() =>
            this.tradeAllianceFacade.transferLeadership(member.memberIdentity),
          ),
        ),
      );
    }

    if (this.canKickMember(member)) {
      controls.append(
        this.createSmallButton('kick', () =>
          this.runAction(() => this.tradeAllianceFacade.kickMember(member.memberIdentity)),
        ),
      );
    }

    row.append(main, controls);
    return row;
  }

  createApplicationRow(application) {
    const row = document.createElement('div');
    row.className = 'workshop-page__trade-alliance-application-row';
    row.append(
      this.createTextRow(`${application.username}(${application.playerLevel})`, 'pending'),
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

    form.append(
      this.createInputField('name', 'name', { value: alliance.name, maxLength: 24 }),
      this.createInputField('tag', 'tag', {
        value: alliance.tag,
        maxLength: 5,
        autocapitalize: 'characters',
      }),
      this.createInputField('description', 'description', {
        value: alliance.description,
        maxLength: 120,
      }),
      this.createInputField('notice', 'notice', { value: alliance.notice, maxLength: 160 }),
      this.createJoinModeField('join mode', alliance.joinMode),
      this.createSubmitButton('save'),
      this.createDangerButton('disband', () =>
        this.setStatus('dashboard only for disband'),
      ),
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

  createSubmitButton(label) {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__trade-alliance-wide-button';
    button.type = 'submit';
    button.textContent = label;
    return button;
  }

  createDangerButton(label, onClick) {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__trade-alliance-wide-button';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
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

  createTextRow(label, value, { muted = false } = {}) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__trade-alliance-row';
    if (muted) {
      row.classList.add('is-muted');
    }

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = label;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = value;

    row.append(key, val);
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

  getOwnContribution(questId, dayKey) {
    const ownIdentity = this.lastSnapshot.ownMember?.memberIdentity;
    const contribution = (this.lastSnapshot.contributions ?? []).find(
      (row) =>
        row.contributorIdentity === ownIdentity &&
        row.questId === questId &&
        row.dayKey === dayKey,
    );
    return contribution?.contribution ?? 0;
  }

  canManageMember(member) {
    return (
      this.lastSnapshot.canManageRoles &&
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

  setStatus(text) {
    this.status = text;
    if (this.refs.status) {
      this.refs.status.textContent = text;
    }
  }

  formatFailure(reason) {
    if (reason === 'offline') {
      return 'offline';
    }

    if (reason === 'empty_message') {
      return '';
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

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
