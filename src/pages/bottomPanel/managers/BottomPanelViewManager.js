import {
  getNotificationTone,
  isNotificationActive,
  setNotificationBadge,
} from '../../shared/notificationBadge.js';
import { createStatusIcon, STATUS_ICON_LOCK } from '../../shared/statusIcon.js';

const RESEARCH_TAB_ICON_URL = new URL(
  '../../../assets/icons/icon-research-telescope-tab.webp',
  import.meta.url,
).href;
const BREWING_TAB_ICON_URL = new URL(
  '../../../assets/icons/icon-brewing-cauldron-tab.webp',
  import.meta.url,
).href;
const GARDEN_TAB_ICON_URL = new URL(
  '../../../assets/icons/icon-garden-plot-tab.webp',
  import.meta.url,
).href;
const SHOP_TAB_ICON_URL = new URL(
  '../../../assets/icons/icon-shop-market-stall-tab.webp',
  import.meta.url,
).href;
const WORKSHOP_TAB_ICON_URL = new URL(
  '../../../assets/icons/icon-workshop-house-tab.webp',
  import.meta.url,
).href;

const TAB_ICON_URL_BY_ID = new Map([
  ['brewing', BREWING_TAB_ICON_URL],
  ['garden', GARDEN_TAB_ICON_URL],
  ['research', RESEARCH_TAB_ICON_URL],
  ['shop', SHOP_TAB_ICON_URL],
  ['workshop', WORKSHOP_TAB_ICON_URL],
]);

export const BOTTOM_PANEL_TABS = [
  { id: 'brewing', label: 'brewing' },
  { id: 'garden', label: 'garden' },
  { id: 'workshop', label: 'workshop' },
  { id: 'research', label: 'research' },
  { id: 'shop', label: 'market' },
];

export const OPTIONAL_BOTTOM_PANEL_TABS = [
  { id: 'advancedBrewing', label: 'adv brewing' },
  { id: 'advancedGarden', label: 'adv garden' },
  { id: 'guild', label: 'guild' },
  { id: 'prestige', label: 'prestige' },
  { id: 'advancedMarket', label: 'adv market' },
];

const OPTIONAL_BOTTOM_PANEL_TAB_BY_ID = new Map(
  OPTIONAL_BOTTOM_PANEL_TABS.map((tab) => [tab.id, tab]),
);

const LOCK_UNLOCK_ANIMATION_MS = 520;

export class BottomPanelViewManager {
  constructor({ getCurrentPageId, onShowPage, onAction, tabs = BOTTOM_PANEL_TABS } = {}) {
    this.getCurrentPageId = getCurrentPageId;
    this.onShowPage = onShowPage;
    this.onAction = onAction;
    this.tabs = [...tabs];
    this.defaultTabIds = new Set(this.tabs.map((tab) => tab.id));
    this.root = null;
    this.tabButtons = new Map();
    this.notifications = {};
    this.swipeTargetPageId = null;
    this.pageStates = new Map(
      tabs
        .filter((tab) => !this.isActionTab(tab))
        .map((tab) => [
          tab.id,
          {
            id: tab.id,
            unlocked: true,
          },
        ]),
    );
    this.actionStates = new Map(
      tabs
        .filter((tab) => this.isActionTab(tab))
        .map((tab) => [
          tab.actionId,
          {
            id: tab.actionId,
            visible: false,
            enabled: false,
          },
        ]),
    );
    this.visiblePageIds = new Set(
      tabs.filter((tab) => !this.isActionTab(tab)).map((tab) => tab.id),
    );
    this.hasCustomVisiblePageIds = false;
    this.refs = {
      tabList: null,
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
    this.handleLockPopupAnimationEnd = (event) => {
      if (event.animationName === 'room-bottom-lock-popup-enter') {
        this.refs.lockPopup?.classList.remove('is-entering');
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
    this.swipeTargetPageId = null;
    this.refs = {
      tabList: null,
      lockPopup: null,
      lockPanel: null,
      lockMessage: null,
      lockCloseButton: null,
    };
    this.previousFocus = null;
  }

  setCurrentPageId(pageId) {
    for (const tab of this.tabs) {
      if (this.isActionTab(tab)) {
        continue;
      }

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
    this.hasCustomVisiblePageIds = true;
    this.visiblePageIds = new Set(
      Array.isArray(pageIds) ? pageIds.filter((pageId) => typeof pageId === 'string') : [],
    );

    for (const tab of this.tabs) {
      if (this.isActionTab(tab)) {
        continue;
      }

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

    this.syncOptionalTabs(nextStates);

    for (const tab of this.tabs) {
      if (this.isActionTab(tab)) {
        continue;
      }

      const state = nextStates.get(tab.id) ?? {
        id: tab.id,
        unlocked: true,
        visible: true,
      };
      const button = this.tabButtons.get(tab.id);

      this.pageStates.set(tab.id, state);

      if (!button) {
        continue;
      }

      const wasLocked = button.classList.contains('is-locked');
      const locked = !state.unlocked;
      const visible = state.visible !== false;
      const optionalHidden = !visible && !this.defaultTabIds.has(tab.id);
      button.hidden = optionalHidden || !this.visiblePageIds.has(tab.id);
      button.style.visibility = visible || optionalHidden ? '' : 'hidden';
      button.setAttribute('aria-hidden', visible ? 'false' : 'true');
      button.tabIndex = visible ? 0 : -1;
      button.classList.toggle('is-locked', locked);
      button.classList.toggle(
        'is-swipe-target-locked',
        locked && this.swipeTargetPageId === tab.id,
      );
      button.removeAttribute('aria-disabled');

      if (wasLocked && !locked && visible && !button.hidden) {
        this.restartUnlockAnimation(button);
      }

      if (!visible) {
        setNotificationBadge(button, false);
        button.setAttribute('aria-label', `${tab.label} unavailable`);
      } else if (locked) {
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
      if (this.isActionTab(tab)) {
        continue;
      }

      this.syncTabNotification(tab);
    }
  }

  setActionStates(actionStates = []) {
    const nextStates = new Map();

    for (const state of Array.isArray(actionStates) ? actionStates : []) {
      if (!state?.id) {
        continue;
      }

      nextStates.set(state.id, {
        ...state,
        visible: state.visible === true,
        enabled: state.enabled === true,
      });
    }

    for (const tab of this.tabs) {
      if (!this.isActionTab(tab)) {
        continue;
      }

      const state = nextStates.get(tab.actionId) ?? {
        id: tab.actionId,
        visible: false,
        enabled: false,
      };

      this.actionStates.set(tab.actionId, state);
      this.syncActionState(tab);
    }
  }

  setSwipeTargetPageId(pageId) {
    this.swipeTargetPageId =
      typeof pageId === 'string' && this.tabButtons.has(pageId) ? pageId : null;

    for (const tab of this.tabs) {
      if (this.isActionTab(tab)) {
        continue;
      }

      const button = this.tabButtons.get(tab.id);
      const selected = tab.id === this.swipeTargetPageId;
      const locked = this.pageStates.get(tab.id)?.unlocked === false;

      button?.classList.toggle('is-swipe-target', selected);
      button?.classList.toggle('is-swipe-target-locked', selected && locked);
    }
  }

  showLockedPage(pageId) {
    const tab = this.tabs.find((candidate) => candidate.id === pageId);
    const state = this.pageStates.get(pageId);

    if (!tab || !state || state.unlocked !== false) {
      return false;
    }

    this.restartSwipeTabFeedback(pageId);
    this.showLockedPageMessage(tab, state);
    return true;
  }

  createPanel() {
    const panel = document.createElement('nav');
    panel.className = 'room-bottom-panel style-panel';
    panel.setAttribute('aria-label', 'rooms');

    const list = document.createElement('div');
    list.className = 'room-bottom-panel__tabs';
    this.refs.tabList = list;

    for (const tab of this.tabs) {
      list.append(this.createTab(tab));
    }

    panel.append(list);
    return panel;
  }

  syncOptionalTabs(nextStates) {
    for (const [pageId, state] of nextStates) {
      const tab = OPTIONAL_BOTTOM_PANEL_TAB_BY_ID.get(pageId);

      if (!tab || this.tabButtons.has(pageId) || state.visible === false) {
        continue;
      }

      this.tabs.push(tab);
      if (!this.hasCustomVisiblePageIds) {
        this.visiblePageIds.add(pageId);
      }
      this.pageStates.set(pageId, {
        id: pageId,
        unlocked: state.unlocked !== false,
        visible: true,
      });
      this.refs.tabList?.append(this.createTab(tab));
    }
  }

  createTab(tab) {
    const button = document.createElement('button');
    button.className = this.isActionTab(tab)
      ? `room-bottom-panel__tab room-bottom-panel__action room-bottom-panel__${tab.actionId}-button`
      : `room-bottom-panel__tab room-bottom-panel__${tab.id}-button`;
    button.type = 'button';

    const icon = this.createTabIcon(tab);
    if (icon) {
      button.append(icon);
    }

    const label = document.createElement('span');
    label.className = 'room-bottom-panel__tab-label';
    label.textContent = tab.label;
    button.append(label);

    const lockIcon = this.createLockIcon();
    if (lockIcon) {
      button.append(lockIcon);
    }

    if (this.isActionTab(tab)) {
      button.dataset.actionId = tab.actionId;
      button.setAttribute('aria-label', `open ${tab.label}`);
      this.syncActionState(tab, button);
    } else {
      button.dataset.pageId = tab.id;
      button.dataset.tutorialId = `page:${tab.id}`;
      button.hidden = !this.visiblePageIds.has(tab.id);
      button.setAttribute('aria-label', `show ${tab.label}`);
      button.setAttribute('aria-selected', 'false');
    }
    button.addEventListener('click', () => this.handleTabClick(tab));
    this.tabButtons.set(tab.id, button);
    if (!this.isActionTab(tab)) {
      this.syncTabNotification(tab);
    }
    return button;
  }

  createTabIcon(tab) {
    const iconUrl = TAB_ICON_URL_BY_ID.get(tab.id);

    if (!iconUrl || this.isActionTab(tab)) {
      return null;
    }

    const frame = document.createElement('span');
    frame.className = 'room-bottom-panel__tab-icon-frame';
    frame.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.className = 'room-bottom-panel__tab-icon';
    image.src = iconUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.setAttribute('aria-hidden', 'true');

    frame.append(image);
    return frame;
  }

  createLockIcon() {
    const lock = document.createElement('span');
    lock.className = 'room-bottom-panel__tab-lock';
    lock.setAttribute('aria-hidden', 'true');

    const whole = createStatusIcon(
      'room-bottom-panel__tab-lock-icon room-bottom-panel__tab-lock-icon--whole',
      STATUS_ICON_LOCK,
    );
    const left = createStatusIcon(
      'room-bottom-panel__tab-lock-icon room-bottom-panel__tab-lock-icon--left',
      STATUS_ICON_LOCK,
    );
    const right = createStatusIcon(
      'room-bottom-panel__tab-lock-icon room-bottom-panel__tab-lock-icon--right',
      STATUS_ICON_LOCK,
    );

    if (!whole || !left || !right) {
      return null;
    }

    lock.append(whole, left, right);
    return lock;
  }

  handleTabClick(tab) {
    if (this.isActionTab(tab)) {
      const button = this.tabButtons.get(tab.id);

      if (button?.disabled || button?.getAttribute('aria-disabled') === 'true') {
        return;
      }

      this.onAction?.(tab.actionId);
      return;
    }

    const state = this.pageStates.get(tab.id);

    if (state?.visible === false) {
      return;
    }

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
    popup.addEventListener('animationend', this.handleLockPopupAnimationEnd);

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
    this.refs.lockPopup.dataset.pageId = tab.id;
    this.refs.lockPopup.hidden = false;
    this.refs.lockPopup.setAttribute('aria-hidden', 'false');
    this.restartLockedPageMessageAnimation();
    this.refs.lockPanel?.focus?.({ preventScroll: true });
  }

  hideLockedPageMessage() {
    if (!this.refs.lockPopup) {
      return;
    }

    const wasVisible = !this.refs.lockPopup.hidden;
    this.refs.lockPopup.hidden = true;
    this.refs.lockPopup.setAttribute('aria-hidden', 'true');
    this.refs.lockPopup.classList.remove('is-entering');
    delete this.refs.lockPopup.dataset.pageId;

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus?.({ preventScroll: true });
    }

    this.previousFocus = null;
  }

  restartLockedPageMessageAnimation() {
    if (!this.refs.lockPopup) {
      return;
    }

    this.refs.lockPopup.classList.remove('is-entering');
    void this.refs.lockPopup.offsetWidth;
    this.refs.lockPopup.classList.add('is-entering');
  }

  restartSwipeTabFeedback(pageId) {
    const button = this.tabButtons.get(pageId);

    if (!button) {
      return;
    }

    button.classList.remove('is-swipe-bumped');
    void button.offsetWidth;
    button.classList.add('is-swipe-bumped');
  }

  restartUnlockAnimation(button) {
    if (!button) {
      return;
    }

    const token = String((Number(button.dataset.unlockAnimationToken) || 0) + 1);
    button.dataset.unlockAnimationToken = token;
    button.classList.remove('is-unlocking');
    void button.offsetWidth;
    button.classList.add('is-unlocking');

    const clearAnimation = () => {
      if (button.dataset.unlockAnimationToken !== token) {
        return;
      }

      button.classList.remove('is-unlocking');
      delete button.dataset.unlockAnimationToken;
    };

    const handleAnimationEnd = (event) => {
      if (event.animationName !== 'room-bottom-tab-lock-break') {
        return;
      }

      button.removeEventListener('animationend', handleAnimationEnd);
      clearAnimation();
    };

    button.addEventListener('animationend', handleAnimationEnd);
    globalThis.setTimeout?.(() => {
      button.removeEventListener('animationend', handleAnimationEnd);
      clearAnimation();
    }, LOCK_UNLOCK_ANIMATION_MS);
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
    const visible = this.pageStates.get(tab.id)?.visible !== false;

    if (!visible) {
      setNotificationBadge(button, false);
      button.setAttribute('aria-label', `${tab.label} unavailable`);
      return;
    }

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

  syncActionState(tab, button = this.tabButtons.get(tab.id)) {
    if (!button) {
      return;
    }

    const state = this.actionStates.get(tab.actionId) ?? {
      visible: false,
      enabled: false,
    };
    const visible = state.visible === true;
    const enabled = visible && state.enabled === true;
    const wasLocked = button.classList.contains('is-locked');

    button.disabled = !enabled;
    button.style.visibility = visible ? '' : 'hidden';
    button.classList.toggle('is-locked', visible && !enabled);
    button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    button.tabIndex = visible ? 0 : -1;
    button.setAttribute(
      'aria-label',
      enabled ? `open ${tab.label}` : `${tab.label} unavailable`,
    );

    if (wasLocked && enabled) {
      this.restartUnlockAnimation(button);
    }
  }

  isActionTab(tab) {
    return Boolean(tab?.actionId);
  }
}
