import { setResourceColor } from '../../shared/resourceColor.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';

export class WorkshopSeedBlockManager {
  constructor({ gameplayFacade, onSeedsClick, onSummonNotice } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onSeedsClick = onSeedsClick;
    this.onSummonNotice = onSummonNotice;
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
    this.root.className = 'workshop-page__seed-block style-box';
    this.root.setAttribute('aria-label', 'seeds');

    this.refs.title = this.createTitle();
    this.refs.seedCountButton = this.createSeedCountButton();
    this.refs.actionRow = document.createElement('div');
    this.refs.actionRow.className = 'workshop-page__seed-action-row';
    this.refs.button = this.createButton();
    this.refs.actionRow.append(this.refs.button);

    this.root.append(
      this.refs.title,
      this.refs.seedCountButton,
      this.refs.actionRow,
    );
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

  createTitle() {
    const title = document.createElement('button');
    title.className = 'workshop-page__seed-title style-box__title';
    title.type = 'button';
    title.textContent = 'seeds';
    title.setAttribute('aria-label', 'show seed inventory');
    title.addEventListener('click', () => this.onSeedsClick?.());
    return title;
  }

  createSeedCountButton() {
    const button = document.createElement('button');
    button.className = 'workshop-page__seed-count-button';
    button.type = 'button';
    button.textContent = '0 seeds';
    button.setAttribute('aria-label', 'show seed inventory, 0 seeds');
    setResourceColor(button, 'seed');
    button.addEventListener('click', () => this.onSeedsClick?.());
    return button;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__summon-button';
    button.type = 'button';
    button.dataset.tutorialId = 'workshop:summonSeed';

    this.refs.summonButtonLabel = document.createElement('span');
    this.refs.summonButtonLabel.className = 'workshop-page__summon-button-label';
    this.refs.summonButtonLabel.textContent = 'summon seed';

    this.refs.summonButtonCost = document.createElement('span');
    this.refs.summonButtonCost.className = 'workshop-page__summon-button-cost';
    setResourceColor(this.refs.summonButtonCost, 'mana');

    button.append(this.refs.summonButtonLabel, this.refs.summonButtonCost);
    button.addEventListener('click', () => this.onSummonSeed());
    return button;
  }

  onSummonSeed() {
    const result = this.gameplayFacade.summonSeed();
    const message = result.ok
      ? this.getSuccessMessage(result)
      : this.getFailureMessage(result.reason);
    this.render(this.gameplayFacade.getSnapshot());
    this.onSummonNotice?.(message);
  }

  getSuccessMessage(result) {
    if (result.quantity <= 1 || !Array.isArray(result.seedCounts)) {
      return `${result.seed.label} found`;
    }

    if (result.seedCounts.length === 1) {
      return `${result.seedCounts[0].seed.label} x${result.quantity} found`;
    }

    return `${result.quantity} seeds found`;
  }

  getFailureMessage(reason) {
    return reason === 'no_summonable_seeds' ? 'no seeds researched' : 'not enough mana';
  }

  render(snapshot) {
    const seedCount = snapshot.inventory
      .filter((item) => item.kind === 'seed')
      .reduce((total, item) => total + item.quantity, 0);

    const quantity = snapshot.seedSummoning.quantity ?? 1;
    const summonLabel = quantity > 1 ? `summon x${quantity}` : 'summon seed';

    const seedCountText = this.formatSeedCount(seedCount);

    this.refs.seedCountButton.textContent = seedCountText;
    this.refs.seedCountButton.setAttribute(
      'aria-label',
      `show seed inventory, ${seedCountText}`,
    );
    this.refs.summonButtonLabel.textContent = summonLabel;
    this.refs.summonButtonCost.textContent = `${snapshot.seedSummoning.cost} mana`;
    this.refs.button.setAttribute(
      'aria-label',
      `${summonLabel}, costs ${snapshot.seedSummoning.cost} mana`,
    );
    this.refs.button.setAttribute(
      'aria-disabled',
      snapshot.seedSummoning.canSummon ? 'false' : 'true',
    );
    this.refs.button.disabled = !snapshot.seedSummoning.canSummon;
    setNotificationBadge(this.refs.button, snapshot.seedSummoning.canSummon);
  }

  formatSeedCount(seedCount) {
    return `${seedCount} ${seedCount === 1 ? 'seed' : 'seeds'}`;
  }
}
