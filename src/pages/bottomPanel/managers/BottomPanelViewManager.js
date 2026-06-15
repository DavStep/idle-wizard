import {
  getNotificationTone,
  isNotificationActive,
  setNotificationBadge,
} from '../../shared/notificationBadge.js';

export const BOTTOM_PANEL_TABS = [
  { id: 'brewing', label: 'brewing' },
  { id: 'garden', label: 'garden' },
  { id: 'workshop', label: 'workshop' },
  { id: 'research', label: 'research' },
  { id: 'shop', label: 'market' },
];

export class BottomPanelViewManager {
  constructor({ getCurrentPageId, onShowPage, tabs = BOTTOM_PANEL_TABS } = {}) {
    this.getCurrentPageId = getCurrentPageId;
    this.onShowPage = onShowPage;
    this.tabs = tabs;
    this.root = null;
    this.tabButtons = new Map();
    this.notifications = {};
    this.pageStates = new Map(
      tabs.map((tab) => [
        tab.id,
        {
          id: tab.id,
          unlocked: true,
        },
      ]),
    );
    this.visiblePageIds = new Set(tabs.map((tab) => tab.id));
    this.refs = {
      lockPopup: null,
      lockPanel: null,
      lockMessage: null,
      lockCloseButton: null,
    };
    this.previousFocus = null;
    this.handleLockCloseClick = () => this.hideLockedPageMessage();
    this.handleLockPopupClick = (event) => {
      if (event.target === this.refs.lockPopup) {
        this.hideLockedPageMessage();
      }
    };
    this.handleKeydown = (event) => {
      if (this.refs.lockPopup?.hidden || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hideLockedPageMessage();
    };
  }

  mount(stage) {
    if (!stage) {
      throw new Error('BottomPanelViewManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'room-bottom-panel-layer';
    this.root.append(this.createPanel(), this.createLockedPagePopup());
    stage.append(this.root);
    this.setCurrentPageId(this.getCurrentPageId?.());
    document.addEventListener('keydown', this.handleKeydown);

    return this.root;
  }

  unmount() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.root = null;
    this.tabButtons.clear();
    this.refs = {
      lockPopup: null,
      lockPanel: null,
      lockMessage: null,
      lockCloseButton: null,
    };
    this.previousFocus = null;
  }

  setCurrentPageId(pageId) {
    for (const tab of this.tabs) {
      const button = this.tabButtons.get(tab.id);
      const selected = tab.id === pageId;

      button?.classList.toggle('is-selected', selected);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');

      if (selected) {
        button?.setAttribute('aria-current', 'page');
      } else {
        button?.removeAttribute('aria-current');
      }
    }
  }

  setVisiblePageIds(pageIds = []) {
    this.visiblePageIds = new Set(
      Array.isArray(pageIds) ? pageIds.filter((pageId) => typeof pageId === 'string') : [],
    );

    for (const tab of this.tabs) {
      const button = this.tabButtons.get(tab.id);

      if (button) {
        button.hidden = !this.visiblePageIds.has(tab.id);
      }
    }
  }

  setPageStates(pageStates = []) {
    const nextStates = new Map();

    for (const pageState of Array.isArray(pageStates) ? pageStates : []) {
      if (!pageState?.id) {
        continue;
      }

      nextStates.set(pageState.id, {
        ...pageState,
        unlocked: pageState.unlocked !== false,
      });
    }

    for (const tab of this.tabs) {
      const state = nextStates.get(tab.id) ?? {
        id: tab.id,
        unlocked: true,
      };
      const button = this.tabButtons.get(tab.id);

      this.pageStates.set(tab.id, state);

      if (!button) {
        continue;
      }

      const locked = !state.unlocked;
      button.classList.toggle('is-locked', locked);
      button.removeAttribute('aria-disabled');

      if (locked) {
        setNotificationBadge(button, false);
        button.setAttribute(
          'aria-label',
          `${tab.label} locked, ${this.getLockedMessage(tab, state)}`,
        );
      } else {
        this.syncTabNotification(tab);
      }
    }
  }

  setNotifications(notifications = {}) {
    this.notifications = notifications ?? {};

    for (const tab of this.tabs) {
      this.syncTabNotification(tab);
    }
  }

  createPanel() {
    const panel = document.createElement('nav');
    panel.className = 'room-bottom-panel style-panel';
    panel.setAttribute('aria-label', 'rooms');

    const list = document.createElement('div');
    list.className = 'room-bottom-panel__tabs';

    for (const tab of this.tabs) {
      list.append(this.createTab(tab));
    }

    panel.append(list);
    return panel;
  }

  createTab(tab) {
    const button = document.createElement('button');
    button.className = 'room-bottom-panel__tab';
    button.type = 'button';
    button.textContent = tab.label;
    button.dataset.pageId = tab.id;
    button.dataset.tutorialId = `page:${tab.id}`;
    button.hidden = !this.visiblePageIds.has(tab.id);
    button.setAttribute('aria-label', `show ${tab.label}`);
    button.setAttribute('aria-selected', 'false');
    button.addEventListener('click', () => this.handleTabClick(tab));
    this.tabButtons.set(tab.id, button);
    this.syncTabNotification(tab);
    return button;
  }

  handleTabClick(tab) {
    const state = this.pageStates.get(tab.id);

    if (state && !state.unlocked) {
      this.showLockedPageMessage(tab, state);
      return;
    }

    this.onShowPage?.(tab.id);
  }

  createLockedPagePopup() {
    const popup = document.createElement('section');
    popup.className = 'room-bottom-panel__lock-popup';
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
    popup.addEventListener('click', this.handleLockPopupClick);

    const panel = document.createElement('div');
    panel.className = 'room-bottom-panel__lock-panel';
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'room-bottom-panel-lock-title');

    const dialog = document.createElement('div');
    dialog.className = 'room-bottom-panel__lock-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.id = 'room-bottom-panel-lock-title';
    title.textContent = 'locked';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button room-bottom-panel__lock-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.setAttribute('aria-label', 'close locked room notice');
    closeButton.addEventListener('click', this.handleLockCloseClick);

    const message = document.createElement('p');
    message.className = 'room-bottom-panel__lock-message';

    dialog.append(title, closeButton, message);
    panel.append(dialog);
    popup.append(panel);

    this.refs.lockPopup = popup;
    this.refs.lockPanel = panel;
    this.refs.lockMessage = message;
    this.refs.lockCloseButton = closeButton;

    return popup;
  }

  showLockedPageMessage(tab, state) {
    if (!this.refs.lockPopup || !this.refs.lockMessage) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.refs.lockMessage.textContent = this.getLockedMessage(tab, state);
    this.refs.lockPopup.hidden = false;
    this.refs.lockPopup.setAttribute('aria-hidden', 'false');
    this.refs.lockPanel?.focus?.({ preventScroll: true });
  }

  hideLockedPageMessage() {
    if (!this.refs.lockPopup) {
      return;
    }

    const wasVisible = !this.refs.lockPopup.hidden;
    this.refs.lockPopup.hidden = true;
    this.refs.lockPopup.setAttribute('aria-hidden', 'true');

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus?.({ preventScroll: true });
    }

    this.previousFocus = null;
  }

  getLockedMessage(tab, state) {
    if (state?.lockedMessage) {
      return state.lockedMessage;
    }

    if (state?.requiredLevel) {
      return `${tab.label} unlocks at level ${state.requiredLevel}`;
    }

    return `${tab.label} is locked`;
  }

  syncTabNotification(tab) {
    const button = this.tabButtons.get(tab.id);

    if (!button) {
      return;
    }

    const pageNotification = this.notifications?.[tab.id];
    const active = isNotificationActive(pageNotification);
    const locked = this.pageStates.get(tab.id)?.unlocked === false;

    if (locked) {
      setNotificationBadge(button, false);
      button.setAttribute(
        'aria-label',
        `${tab.label} locked, ${this.getLockedMessage(tab, this.pageStates.get(tab.id))}`,
      );
      return;
    }

    if (active) {
      setNotificationBadge(button, true, getNotificationTone(pageNotification));
      button.setAttribute('aria-label', `show ${tab.label}, action available`);
      return;
    }

    setNotificationBadge(button, false);
    button.setAttribute('aria-label', `show ${tab.label}`);
  }
}
