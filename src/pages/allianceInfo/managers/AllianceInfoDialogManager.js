import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import { normalizeTradeAllianceTagColor } from '../../../shared/tradeAllianceTagColors.js';
import { createAllianceTagSpan, normalizeAllianceTag } from '../../shared/allianceTagLabel.js';
import { createPlayerInfoLink } from '../../shared/playerInfoLink.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';

const EMPTY_SNAPSHOT = {
  connected: false,
  alliances: [],
  members: [],
  ownAlliance: null,
};

const ROLE_ORDER = [
  'tradeMaster',
  'quartermaster',
  'factor',
  'broker',
  'trader',
];

const ROLE_LABELS = {
  tradeMaster: 'trade master',
  quartermaster: 'quartermaster',
  factor: 'factor',
  broker: 'broker',
  trader: 'trader',
};

const JOIN_MODE_LABELS = {
  open: 'open',
  apply: 'apply',
  closed: 'closed',
};

export class AllianceInfoDialogManager {
  constructor({ tradeAllianceFacade, onOpenPlayerInfo } = {}) {
    this.tradeAllianceFacade = tradeAllianceFacade;
    this.onOpenPlayerInfo = onOpenPlayerInfo;
    this.unsubscribe = null;
    this.releasePublicData = null;
    this.refs = {};
    this.root = null;
    this.visible = false;
    this.previousFocus = null;
    this.status = '';
    this.lastSnapshot = { ...EMPTY_SNAPSHOT };
    this.activeAllianceRequest = null;
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

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = this.createPopup();
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    if (this.tradeAllianceFacade) {
      this.unsubscribe = this.tradeAllianceFacade.subscribe((snapshot) => {
        this.lastSnapshot = snapshot ?? { ...EMPTY_SNAPSHOT };
        this.render();
      });
      this.lastSnapshot = this.tradeAllianceFacade.getSnapshot();
    }

    this.applyVisibility();
    return this.root;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'room-alliance-info-popup';
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
    popup.addEventListener('click', this.handleRootClick);

    const dialog = document.createElement('section');
    dialog.className = 'room-alliance-info-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Alliance information');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    this.refs.popup = popup;
    this.refs.dialog = dialog;
    this.refs.title = document.createElement('div');
    this.refs.title.className = 'style-box__title';
    this.refs.closeButton = document.createElement('button');
    this.refs.closeButton.className = 'style-button room-alliance-info-close';
    this.refs.closeButton.type = 'button';
    this.refs.closeButton.textContent = 'close';
    this.refs.closeButton.addEventListener('click', () => this.hide());
    this.refs.content = document.createElement('div');
    this.refs.content.className = 'room-alliance-info-content';
    this.refs.actions = document.createElement('div');
    this.refs.actions.className = 'room-alliance-info-actions';
    this.refs.status = document.createElement('div');
    this.refs.status.className = 'room-alliance-info-status';

    dialog.append(
      this.refs.title,
      this.refs.closeButton,
      this.refs.content,
      this.refs.actions,
      this.refs.status,
    );
    popup.append(dialog);
    return popup;
  }

  show(alliance) {
    const request = this.normalizeAllianceRequest(alliance);

    if (!request.allianceId && !request.tag && !request.name) {
      return;
    }

    if (!this.releasePublicData) {
      this.releasePublicData = this.tradeAllianceFacade?.retainPublicData?.() ?? null;
    }

    if (!this.visible) {
      this.previousFocus = document.activeElement;
    }

    this.setStatus('');
    this.activeAllianceRequest = request;
    this.visible = true;
    this.render();
    this.applyVisibility();
    this.refs.dialog?.focus();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.activeAllianceRequest = null;
    this.applyVisibility();
    this.releasePublicData?.();
    this.releasePublicData = null;

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.releasePublicData?.();
    this.releasePublicData = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.status = '';
    this.lastSnapshot = { ...EMPTY_SNAPSHOT };
    this.activeAllianceRequest = null;
  }

  render() {
    if (!this.root || !this.activeAllianceRequest) {
      return;
    }

    const liveAlliance = this.findAlliance(this.activeAllianceRequest);
    const alliance = this.mergeAlliance(this.activeAllianceRequest, liveAlliance);
    const members = liveAlliance ? this.getAllianceMembers(liveAlliance.allianceId) : [];
    const titleText = this.formatAllianceTitleText(alliance);

    this.refs.title.replaceChildren(...this.createAllianceTitle(alliance));
    this.refs.dialog.setAttribute(
      'aria-label',
      titleText ? `${titleText} alliance information` : 'Alliance information',
    );

    const content = [];

    if (liveAlliance) {
      content.push(
        this.createTextRow('members', `${this.formatNumber(alliance.memberCount)}/50`),
        this.createTextRow('join mode', JOIN_MODE_LABELS[alliance.joinMode] ?? alliance.joinMode),
        this.createTextRow('season income', this.formatCoinText(alliance.seasonIncome), {
          resource: 'coin',
        }),
      );

      if (alliance.description) {
        content.push(this.createParagraph(alliance.description));
      }

      if (alliance.notice) {
        content.push(this.createParagraph(alliance.notice));
      }
    } else if (this.lastSnapshot.connected) {
      content.push(this.createEmptyRow('loading alliance'));
    } else {
      content.push(this.createEmptyRow('offline'));
    }

    content.push(this.createDivider(), this.createSectionLabel('members'));

    if (!liveAlliance) {
      content.push(
        this.createEmptyRow(this.lastSnapshot.connected ? 'loading members' : 'offline'),
      );
    } else if (!members.length) {
      content.push(this.createEmptyRow('no members'));
    } else {
      content.push(...this.createMemberSections(members));
    }

    this.refs.content.replaceChildren(...content);
    this.renderAction(alliance, liveAlliance);
    this.refs.status.textContent = this.status;
  }

  renderAction(alliance, liveAlliance) {
    if (!this.refs.actions) {
      return;
    }

    const actionButton = this.createActionButton(alliance, liveAlliance);
    this.refs.actions.replaceChildren(...(actionButton ? [actionButton] : []));
  }

  createActionButton(alliance, liveAlliance) {
    const allianceId = liveAlliance?.allianceId ?? alliance.allianceId;
    const joinMode = liveAlliance?.joinMode ?? alliance.joinMode;

    if (
      !allianceId ||
      !this.tradeAllianceFacade ||
      this.lastSnapshot.ownAlliance ||
      joinMode === 'closed'
    ) {
      return null;
    }

    const button = document.createElement('button');
    button.className = 'style-button room-alliance-info-action';
    button.type = 'button';
    button.textContent = joinMode === 'open' ? 'join' : 'apply';
    button.addEventListener('click', () => {
      if (joinMode === 'open') {
        void this.runAction(() => this.tradeAllianceFacade.joinAlliance(allianceId));
      } else {
        void this.runAction(() => this.tradeAllianceFacade.applyAlliance(allianceId));
      }
    });
    return button;
  }

  createAllianceTitle(alliance) {
    const tag = createAllianceTagSpan(alliance.tag, alliance.tagColor);
    const name = alliance.name || 'alliance';

    return [
      ...(tag ? [tag, document.createTextNode(' ')] : []),
      document.createTextNode(name),
    ];
  }

  createMemberSections(members) {
    const sections = [];

    for (const role of ROLE_ORDER) {
      const roleMembers = members.filter((member) => member.role === role);
      if (!roleMembers.length) {
        continue;
      }

      sections.push(this.createSectionLabel(this.formatRole(role)));
      sections.push(...roleMembers.map((member) => this.createMemberRow(member)));
    }

    return sections;
  }

  createMemberRow(member) {
    const row = document.createElement('div');
    row.className = 'room-alliance-info-row room-alliance-info-member-row';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.append(
      createPlayerInfoLink(
        {
          identity: member.memberIdentity,
          username: member.username,
          playerLevel: member.playerLevel,
          allianceTag: member.allianceTag,
          allianceTagColor: member.allianceTagColor,
        },
        {
          onOpenPlayerInfo: this.onOpenPlayerInfo,
          text: member.username,
          className: 'room-alliance-info-player-link',
        },
      ),
    );

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = `${this.normalizePlayerLevel(member.playerLevel)}`;

    row.append(key, val);
    return row;
  }

  createTextRow(label, value, { resource = null } = {}) {
    const row = document.createElement('div');
    row.className = 'room-alliance-info-row';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = label;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = value;
    this.applyResourceValue(val, resource);

    row.append(key, val);
    return row;
  }

  createParagraph(text) {
    const paragraph = document.createElement('p');
    paragraph.className = 'room-alliance-info-paragraph';
    paragraph.textContent = text;
    return paragraph;
  }

  createSectionLabel(text) {
    const label = document.createElement('div');
    label.className = 'room-alliance-info-section-label';
    label.textContent = text;
    return label;
  }

  createEmptyRow(text) {
    const row = document.createElement('div');
    row.className = 'room-alliance-info-empty';
    row.textContent = text;
    return row;
  }

  createDivider() {
    const divider = document.createElement('div');
    divider.className = 'room-alliance-info-divider';
    return divider;
  }

  applyResourceValue(element, resource) {
    setResourceColor(element, resource);
    if (resource === 'coin') {
      setResourceIconText(element, element.textContent);
    }
  }

  findAlliance(request) {
    const alliances = Array.isArray(this.lastSnapshot.alliances) ? this.lastSnapshot.alliances : [];
    const requestId = this.toId(request.allianceId);
    const requestTag = normalizeAllianceTag(request.tag);
    const requestName = this.normalizeNameKey(request.name);

    if (requestId) {
      const byId = alliances.find((alliance) => this.toId(alliance.allianceId) === requestId);
      if (byId) {
        return byId;
      }
    }

    if (requestTag) {
      const byTag = alliances.find((alliance) => normalizeAllianceTag(alliance.tag) === requestTag);
      if (byTag) {
        return byTag;
      }
    }

    if (!requestName) {
      return null;
    }

    return (
      alliances.find((alliance) => this.normalizeNameKey(alliance.name) === requestName) ?? null
    );
  }

  getAllianceMembers(allianceId) {
    const safeAllianceId = this.toId(allianceId);
    const members = Array.isArray(this.lastSnapshot.members) ? this.lastSnapshot.members : [];

    return members.filter((member) => this.toId(member.allianceId) === safeAllianceId);
  }

  mergeAlliance(request, liveAlliance) {
    return {
      allianceId: this.toId(liveAlliance?.allianceId ?? request.allianceId),
      name: String(liveAlliance?.name ?? request.name ?? '').trim(),
      tag: normalizeAllianceTag(liveAlliance?.tag ?? request.tag),
      tagColor: normalizeTradeAllianceTagColor(liveAlliance?.tagColor ?? request.tagColor),
      description: String(liveAlliance?.description ?? request.description ?? '').trim(),
      notice: String(liveAlliance?.notice ?? request.notice ?? '').trim(),
      joinMode: String(liveAlliance?.joinMode ?? request.joinMode ?? 'closed'),
      memberCount: this.toNumber(liveAlliance?.memberCount ?? request.memberCount),
      seasonIncome: this.toNumber(
        liveAlliance?.seasonIncome ?? liveAlliance?.weeklyIncome ?? request.seasonIncome,
      ),
    };
  }

  normalizeAllianceRequest(alliance) {
    if (typeof alliance === 'string') {
      return {
        allianceId: '',
        name: '',
        tag: alliance,
        tagColor: '',
        description: '',
        notice: '',
        joinMode: '',
        memberCount: 0,
        seasonIncome: 0,
      };
    }

    const source = alliance ?? {};
    return {
      allianceId: this.toId(source.allianceId ?? source.id),
      name: String(source.name ?? source.allianceName ?? '').trim(),
      tag: normalizeAllianceTag(source.tag ?? source.allianceTag),
      tagColor: normalizeTradeAllianceTagColor(source.tagColor ?? source.allianceTagColor),
      description: String(source.description ?? '').trim(),
      notice: String(source.notice ?? '').trim(),
      joinMode: String(source.joinMode ?? '').trim(),
      memberCount: this.toNumber(source.memberCount),
      seasonIncome: this.toNumber(source.seasonIncome ?? source.weeklyIncome ?? source.totalIncome),
    };
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

  formatAllianceTitleText(alliance) {
    const tag = normalizeAllianceTag(alliance.tag);
    const name = String(alliance.name ?? '').trim();

    if (tag && name) {
      return `[${tag}] ${name}`;
    }

    if (tag) {
      return `[${tag}]`;
    }

    return name;
  }

  formatRole(role) {
    return ROLE_LABELS[role] ?? String(role ?? 'trader');
  }

  formatCoinText(value) {
    return formatCoinPriceText(Math.floor(this.toNumber(value)));
  }

  formatNumber(value) {
    return Math.floor(this.toNumber(value)).toLocaleString('en-US');
  }

  normalizePlayerLevel(value) {
    const level = Math.floor(this.toNumber(value));
    return Number.isFinite(level) && level >= 1 ? level : 1;
  }

  normalizeNameKey(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  toId(value) {
    if (!value) {
      return '';
    }

    if (typeof value.toHexString === 'function') {
      return value.toHexString();
    }

    return String(value).trim();
  }

  toNumber(value) {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    return Number.isFinite(value) ? Number(value) : 0;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
