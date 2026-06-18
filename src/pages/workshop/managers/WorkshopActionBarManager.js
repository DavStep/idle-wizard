import { createAssetAtlasSprite } from '../../../assets/atlas/atlasSprite.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { getSeedSummonNotification } from '../../notifications/managers/PageNotificationStateManager.js';

const SUMMON_HOLD_REPEAT_MS = 110;
const SUMMON_CLICK_SUPPRESSION_MS = 550;

export class WorkshopActionBarManager {
  constructor({
    gameplayFacade,
    onBagClick,
    onPrestigeClick,
    onSummonNotice,
    rewardEventsAvailable = false,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onBagClick = onBagClick;
    this.onPrestigeClick = onPrestigeClick;
    this.onSummonNotice = onSummonNotice;
    this.rewardEventsAvailable = rewardEventsAvailable;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.summonHoldTimer = null;
    this.summonHoldPointerId = null;
    this.suppressSummonClickUntilMs = 0;
    this.handleSummonPointerDown = (event) => this.onSummonPointerDown(event);
    this.handleSummonClick = (event) => this.onSummonClick(event);
    this.handleDocumentPointerUp = (event) => this.onDocumentPointerUp(event);
    this.handleDocumentPointerCancel = (event) => this.onDocumentPointerCancel(event);
    this.handleWindowBlur = () => this.stopSummonHold();
    this.handleVisibilityChange = () => this.stopSummonHold();
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'workshop-page__action-bar';
    this.root.setAttribute('aria-label', 'Workshop actions');

    this.refs.summonButton = this.createSummonButton();
    this.refs.prestigeButton = this.createPrestigeButton();
    this.refs.bagButton = this.createBagButton();

    this.root.append(this.refs.summonButton, this.refs.prestigeButton, this.refs.bagButton);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.stopSummonHold({ suppressClick: false });
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.remove();
    this.root = null;
    this.refs = {};
  }

  createSummonButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__summon-button';
    button.type = 'button';
    button.dataset.tutorialId = 'workshop:summonSeed';

    const circle = createAssetAtlasSprite(
      'workshop-page__summon-circle',
      'ui:summonCircle',
    );

    const text = document.createElement('span');
    text.className = 'workshop-page__summon-button-text';

    this.refs.summonButtonLabel = document.createElement('span');
    this.refs.summonButtonLabel.className = 'workshop-page__summon-button-label';
    this.refs.summonButtonLabel.textContent = 'summon seed';

    this.refs.summonButtonCost = document.createElement('span');
    this.refs.summonButtonCost.className = 'workshop-page__summon-button-cost';
    setResourceColor(this.refs.summonButtonCost, 'mana');

    text.append(this.refs.summonButtonLabel, this.refs.summonButtonCost);
    button.append(circle, text);
    button.addEventListener('pointerdown', this.handleSummonPointerDown);
    button.addEventListener('click', this.handleSummonClick);
    return button;
  }

  createBagButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__bag-button';
    button.type = 'button';
    button.textContent = 'bag';
    button.setAttribute('aria-label', 'open bag');
    button.addEventListener('click', () => this.onBagClick?.());
    return button;
  }

  createPrestigeButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__prestige-button';
    button.type = 'button';
    button.textContent = 'prestige';
    button.setAttribute('aria-label', 'open prestige');
    button.addEventListener('click', () => {
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
        return;
      }

      this.onPrestigeClick?.();
    });
    return button;
  }

  onSummonClick(event) {
    if (this.shouldSuppressSummonClick()) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressSummonClickUntilMs = 0;
      return;
    }

    this.onSummonSeed();
  }

  onSummonPointerDown(event) {
    if (event.button > 0 || event.isPrimary === false) {
      return;
    }

    event.preventDefault();
    this.stopSummonHold({ suppressClick: false });
    this.summonHoldPointerId = event.pointerId;
    this.suppressNextSummonClick();
    this.addSummonHoldListeners();

    if (this.onSummonSeed()) {
      this.scheduleNextSummon();
      return;
    }

    this.stopSummonHold();
  }

  onDocumentPointerUp(event) {
    if (event.pointerId !== this.summonHoldPointerId) {
      return;
    }

    this.stopSummonHold();
  }

  onDocumentPointerCancel(event) {
    if (event.pointerId !== this.summonHoldPointerId) {
      return;
    }

    this.stopSummonHold();
  }

  onSummonSeed() {
    const result = this.gameplayFacade.summonSeed();
    this.render(this.gameplayFacade.getSnapshot());

    if (result.ok) {
      if (!this.rewardEventsAvailable) {
        this.onSummonNotice?.(this.getSuccessMessage(result));
      }
      return this.canContinueSummonHold();
    }

    this.onSummonNotice?.(this.getFailureMessage(result.reason));
    return false;
  }

  scheduleNextSummon() {
    this.clearSummonHoldTimer();
    this.summonHoldTimer = window.setTimeout(() => {
      this.summonHoldTimer = null;

      if (this.summonHoldPointerId === null) {
        return;
      }

      if (this.onSummonSeed()) {
        this.scheduleNextSummon();
        return;
      }

      this.stopSummonHold();
    }, SUMMON_HOLD_REPEAT_MS);
  }

  canContinueSummonHold() {
    return this.gameplayFacade.getSnapshot()?.seedSummoning?.canSummon === true;
  }

  addSummonHoldListeners() {
    const document = this.root?.ownerDocument;
    const window = document?.defaultView;

    document?.addEventListener('pointerup', this.handleDocumentPointerUp, true);
    document?.addEventListener('pointercancel', this.handleDocumentPointerCancel, true);
    document?.addEventListener('visibilitychange', this.handleVisibilityChange);
    window?.addEventListener('blur', this.handleWindowBlur);
  }

  removeSummonHoldListeners() {
    const document = this.root?.ownerDocument;
    const window = document?.defaultView;

    document?.removeEventListener('pointerup', this.handleDocumentPointerUp, true);
    document?.removeEventListener('pointercancel', this.handleDocumentPointerCancel, true);
    document?.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window?.removeEventListener('blur', this.handleWindowBlur);
  }

  stopSummonHold({ suppressClick = true } = {}) {
    this.clearSummonHoldTimer();
    this.removeSummonHoldListeners();
    this.summonHoldPointerId = null;

    if (suppressClick) {
      this.suppressNextSummonClick();
    }
  }

  clearSummonHoldTimer() {
    if (this.summonHoldTimer === null) {
      return;
    }

    window.clearTimeout(this.summonHoldTimer);
    this.summonHoldTimer = null;
  }

  suppressNextSummonClick() {
    this.suppressSummonClickUntilMs = Date.now() + SUMMON_CLICK_SUPPRESSION_MS;
  }

  shouldSuppressSummonClick() {
    return Date.now() < this.suppressSummonClickUntilMs;
  }

  getSuccessMessage(result) {
    if (result.quantity <= 1 || !Array.isArray(result.seedCounts)) {
      return `${result.seed.label} found`;
    }

    if (result.seedCounts.length === 1) {
      return `${result.seedCounts[0].seed.label} x${result.quantity} found`;
    }

    return `${result.seedCounts
      .map((seedCount) => this.formatSeedCount(seedCount))
      .join(', ')} found`;
  }

  formatSeedCount({ seed, quantity = 1 } = {}) {
    const suffix = quantity > 1 ? ` x${quantity}` : '';
    return `${seed?.label ?? 'seed'}${suffix}`;
  }

  getFailureMessage(reason) {
    return reason === 'no_summonable_seeds' ? 'no seeds researched' : 'not enough mana';
  }

  render(snapshot) {
    const quantity = snapshot.seedSummoning.quantity ?? 1;
    const summonLabel = quantity > 1 ? `summon x${quantity}` : 'summon seed';
    const costLabel = `${snapshot.seedSummoning.cost} mana`;
    const ariaLabel = `${summonLabel}, costs ${snapshot.seedSummoning.cost} mana`;
    const ariaDisabled = snapshot.seedSummoning.canSummon ? 'false' : 'true';

    this.setText(this.refs.summonButtonLabel, summonLabel);
    setResourceIconText(this.refs.summonButtonCost, costLabel);
    this.setAttribute(this.refs.summonButton, 'aria-label', ariaLabel);
    this.setAttribute(this.refs.summonButton, 'aria-disabled', ariaDisabled);
    this.refs.summonButton.disabled = false;
    setNotificationBadge(this.refs.summonButton, getSeedSummonNotification(snapshot));
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }
}
