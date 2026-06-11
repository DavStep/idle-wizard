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
    this.root.append(this.createPanel());
    stage.append(this.root);
    this.setCurrentPageId(this.getCurrentPageId?.());

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
    this.tabButtons.clear();
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
    button.setAttribute('aria-label', `show ${tab.label}`);
    button.setAttribute('aria-selected', 'false');
    button.addEventListener('click', () => this.onShowPage?.(tab.id));
    this.tabButtons.set(tab.id, button);
    this.syncTabNotification(tab);
    return button;
  }

  syncTabNotification(tab) {
    const button = this.tabButtons.get(tab.id);

    if (!button) {
      return;
    }

    const pageNotification = this.notifications?.[tab.id];
    const active = isNotificationActive(pageNotification);

    if (active) {
      setNotificationBadge(button, true, getNotificationTone(pageNotification));
      button.setAttribute('aria-label', `show ${tab.label}, action available`);
      return;
    }

    setNotificationBadge(button, false);
    button.setAttribute('aria-label', `show ${tab.label}`);
  }
}
