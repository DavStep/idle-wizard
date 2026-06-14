import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import summonCircleUrl from '../../../assets/ui/summon-circle.png';

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

    const circle = document.createElement('img');
    circle.className = 'workshop-page__summon-circle';
    circle.src = summonCircleUrl;
    circle.alt = '';
    circle.draggable = false;
    circle.setAttribute('aria-hidden', 'true');

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
    button.addEventListener('click', () => this.onSummonSeed());
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
    button.addEventListener('click', () => this.onPrestigeClick?.());
    return button;
  }

  onSummonSeed() {
    const result = this.gameplayFacade.summonSeed();
    this.render(this.gameplayFacade.getSnapshot());

    if (result.ok) {
      if (!this.rewardEventsAvailable) {
        this.onSummonNotice?.(this.getSuccessMessage(result));
      }
      return;
    }

    this.onSummonNotice?.(this.getFailureMessage(result.reason));
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
    const disabled = !snapshot.seedSummoning.canSummon;

    this.setText(this.refs.summonButtonLabel, summonLabel);
    setResourceIconText(this.refs.summonButtonCost, costLabel);
    this.setAttribute(this.refs.summonButton, 'aria-label', ariaLabel);
    this.setAttribute(this.refs.summonButton, 'aria-disabled', ariaDisabled);
    this.refs.summonButton.disabled = disabled;
    setNotificationBadge(this.refs.summonButton, snapshot.seedSummoning.canSummon);
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
