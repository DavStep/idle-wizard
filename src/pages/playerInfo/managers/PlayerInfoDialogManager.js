import { createAllianceTagSpan, normalizeAllianceTag } from '../../shared/allianceTagLabel.js';

const EMPTY_SNAPSHOT = {
  connected: false,
  players: [],
};

export class PlayerInfoDialogManager {
  constructor({ playerInfoFacade } = {}) {
    this.playerInfoFacade = playerInfoFacade;
    this.unsubscribe = null;
    this.refs = {};
    this.root = null;
    this.visible = false;
    this.previousFocus = null;
    this.lastSnapshot = { ...EMPTY_SNAPSHOT };
    this.activePlayer = null;
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

    if (this.playerInfoFacade) {
      this.unsubscribe = this.playerInfoFacade.subscribe((snapshot) => {
        this.lastSnapshot = snapshot ?? { ...EMPTY_SNAPSHOT };
        this.render();
      });
      this.lastSnapshot = this.playerInfoFacade.getSnapshot();
    }

    this.applyVisibility();
    return this.root;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'room-player-info-popup';
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
    popup.addEventListener('click', this.handleRootClick);

    const dialog = document.createElement('section');
    dialog.className = 'room-player-info-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Player information');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    this.refs.popup = popup;
    this.refs.dialog = dialog;
    this.refs.title = document.createElement('div');
    this.refs.title.className = 'style-box__title';
    this.refs.closeButton = document.createElement('button');
    this.refs.closeButton.className = 'style-button room-player-info-close';
    this.refs.closeButton.type = 'button';
    this.refs.closeButton.textContent = 'close';
    this.refs.closeButton.addEventListener('click', () => this.hide());
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'room-player-info-rows';

    dialog.append(this.refs.title, this.refs.closeButton, this.refs.rows);
    popup.append(dialog);
    return popup;
  }

  show(player) {
    const fallback = this.normalizePlayer(player);

    if (!fallback.username || fallback.username === 'system') {
      return;
    }

    this.activePlayer = this.mergePlayer(fallback);
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.render();
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
    this.previousFocus = null;
    this.lastSnapshot = { ...EMPTY_SNAPSHOT };
    this.activePlayer = null;
  }

  render() {
    if (!this.root || !this.activePlayer) {
      return;
    }

    const player = this.mergePlayer(this.activePlayer);
    this.activePlayer = player;
    this.refs.title.textContent = player.username;
    this.refs.dialog.setAttribute('aria-label', `${player.username} player information`);
    this.refs.rows.replaceChildren(
      this.createAllianceRow(player),
      this.createTextRow('total produced gold', this.formatNumber(player.totalProducedGold)),
      this.createTextRow('level', this.formatNumber(player.playerLevel)),
      this.createTextRow('prestige', this.formatPrestige(player.prestigeCount)),
    );
  }

  createAllianceRow(player) {
    const row = document.createElement('div');
    row.className = 'room-player-info-row';
    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = 'alliance';
    const val = document.createElement('span');
    val.className = 'row_val';
    const tag = createAllianceTagSpan(player.allianceTag, player.allianceTagColor);

    if (tag) {
      val.append(tag);
    } else {
      val.textContent = 'none';
    }

    row.append(key, val);
    return row;
  }

  createTextRow(label, value) {
    const row = document.createElement('div');
    row.className = 'room-player-info-row';
    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = label;
    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = value;
    row.append(key, val);
    return row;
  }

  mergePlayer(fallback) {
    const player = this.findPlayer(fallback);
    return this.normalizePlayer({
      ...fallback,
      ...player,
      identity: player?.identity ?? fallback.identity,
      username: player?.username ?? fallback.username,
      allianceTag: player?.allianceTag ?? fallback.allianceTag,
      allianceTagColor: player?.allianceTagColor ?? fallback.allianceTagColor,
      playerLevel: player?.playerLevel ?? fallback.playerLevel,
    });
  }

  findPlayer(fallback) {
    const players = Array.isArray(this.lastSnapshot?.players)
      ? this.lastSnapshot.players
      : [];
    const identity = this.normalizeIdentity(fallback.identity);

    if (identity) {
      const player = players.find(
        (candidate) => this.normalizeIdentity(candidate.identity) === identity,
      );

      if (player) {
        return player;
      }
    }

    const username = this.normalizeUsernameKey(fallback.username);
    return username
      ? players.find((candidate) => this.normalizeUsernameKey(candidate.username) === username)
      : null;
  }

  normalizePlayer(player = {}) {
    return {
      identity: this.normalizeIdentity(player.identity),
      username: String(player.username ?? player.name ?? '').trim(),
      allianceTag: normalizeAllianceTag(player.allianceTag ?? player.alliance_tag),
      allianceTagColor: player.allianceTagColor ?? player.alliance_tag_color,
      totalProducedGold: this.normalizeMetric(
        player.totalProducedGold,
        player.totalGeneratedGold,
        player.totalIncome,
      ),
      playerLevel: this.normalizePositiveInteger(player.playerLevel, { fallback: 1, min: 1 }),
      prestigeCount: this.normalizePositiveInteger(player.prestigeCount, {
        fallback: 0,
        min: 0,
      }),
    };
  }

  normalizeMetric(...values) {
    for (const value of values) {
      if (typeof value === 'bigint') {
        return Number(value);
      }

      const number = Number(value);
      if (Number.isFinite(number) && number >= 0) {
        return number;
      }
    }

    return 0;
  }

  normalizePositiveInteger(value, { fallback, min }) {
    const number = this.normalizeMetric(value);

    if (!Number.isFinite(number) || number < min) {
      return fallback;
    }

    return Math.floor(number);
  }

  normalizeIdentity(identity) {
    return String(identity ?? '').trim();
  }

  normalizeUsernameKey(username) {
    return String(username ?? '').trim().toLowerCase();
  }

  formatNumber(value) {
    return String(Math.floor(this.normalizeMetric(value)));
  }

  formatPrestige(value) {
    const count = Math.floor(this.normalizeMetric(value));
    return `${count} ${count === 1 ? 'time' : 'times'}`;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
