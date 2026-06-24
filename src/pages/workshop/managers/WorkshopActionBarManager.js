import { createAssetAtlasSprite } from '../../../assets/atlas/atlasSprite.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { getSeedSummonNotification } from '../../notifications/managers/PageNotificationStateManager.js';

const SUMMON_HOLD_REPEAT_MS = 100;
const SUMMON_CLICK_SUPPRESSION_MS = 550;
const SUMMON_EFFECT_MS = 520;

export class WorkshopActionBarManager {
  constructor({
    gameplayFacade,
    hapticsFacade,
    onBagClick,
    onSummonInfoClick,
    onSummonNotice,
    onSummonNoticeList,
    rewardEventsAvailable = false,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.hapticsFacade = hapticsFacade;
    this.onBagClick = onBagClick;
    this.onSummonInfoClick = onSummonInfoClick;
    this.onSummonNotice = onSummonNotice;
    this.onSummonNoticeList = onSummonNoticeList;
    this.rewardEventsAvailable = rewardEventsAvailable;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.summonHoldTimer = null;
    this.summonEffectTimer = null;
    this.summonHoldPointerId = null;
    this.summonHoldPointerType = '';
    this.summonHoldActivated = false;
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
    this.refs.summonInfoButton = this.createSummonInfoButton();
    this.refs.bagButton = this.createBagButton();

    this.root.append(
      this.refs.summonButton,
      this.refs.summonInfoButton,
      this.refs.bagButton,
    );
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.stopSummonHold({ suppressClick: false });
    this.clearSummonEffect();
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

  createSummonInfoButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__summon-info-button';
    button.type = 'button';
    button.textContent = '?';
    button.setAttribute('aria-label', 'show seed drop chances');
    button.addEventListener('click', () => this.onSummonInfoClick?.());
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
    this.summonHoldPointerType = event.pointerType ?? '';
    this.addSummonHoldListeners();
    this.scheduleNextSummon();
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

  onSummonSeed({ playManualHaptic = false } = {}) {
    const result = this.gameplayFacade.summonSeed();
    const snapshot = this.gameplayFacade.getSnapshot();
    this.render(snapshot);

    if (result.ok) {
      this.playSummonEffect();

      if (playManualHaptic) {
        this.playManualSummonHaptic();
      }

      if (!this.rewardEventsAvailable) {
        this.showSummonNotices([
          { message: this.getSuccessMessage(result) },
          this.getManaSpendNotice(result, snapshot),
        ]);
      } else {
        this.showSummonNotices([this.getManaSpendNotice(result, snapshot)]);
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

      this.summonHoldActivated = true;
      this.suppressNextSummonClick();
      if (this.onSummonSeed({ playManualHaptic: this.shouldPlaySummonHoldHaptic() })) {
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
    this.summonHoldPointerType = '';

    if (suppressClick && this.summonHoldActivated) {
      this.suppressNextSummonClick();
    }

    this.summonHoldActivated = false;
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

  shouldPlaySummonHoldHaptic() {
    return this.summonHoldPointerId !== null && this.summonHoldPointerType !== 'mouse';
  }

  playManualSummonHaptic() {
    this.hapticsFacade?.playUiTap?.();
  }

  playSummonEffect() {
    const button = this.refs.summonButton;

    if (!button) {
      return;
    }

    button.classList.remove('is-summoning');
    void button.offsetWidth;
    button.classList.add('is-summoning');
    this.clearSummonEffectTimer();
    this.summonEffectTimer = window.setTimeout(() => {
      this.summonEffectTimer = null;
      button.classList.remove('is-summoning');
    }, SUMMON_EFFECT_MS);
  }

  clearSummonEffect() {
    this.clearSummonEffectTimer();
    this.refs.summonButton?.classList.remove('is-summoning');
  }

  clearSummonEffectTimer() {
    if (this.summonEffectTimer === null) {
      return;
    }

    window.clearTimeout(this.summonEffectTimer);
    this.summonEffectTimer = null;
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

  showSummonNotices(notices) {
    const visibleNotices = notices.filter((notice) => notice?.message);

    if (visibleNotices.length <= 0) {
      return;
    }

    if (visibleNotices.length > 1 && this.onSummonNoticeList) {
      this.onSummonNoticeList(visibleNotices);
      return;
    }

    for (const notice of visibleNotices) {
      const { message, ...options } = notice;
      this.onSummonNotice?.(message, options);
    }
  }

  getManaSpendNotice(result, snapshot) {
    const message = this.getManaSpendMessage(result, snapshot);

    if (!message) {
      return null;
    }

    return {
      message,
      flyoutKey: 'workshop-mana-spend',
    };
  }

  getManaSpendMessage(result, snapshot) {
    const cost = Number(result?.cost ?? snapshot?.seedSummoning?.cost);

    if (!Number.isFinite(cost) || cost <= 0) {
      return null;
    }

    return `-${cost} mana`;
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
