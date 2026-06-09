export class WorkshopSeedSummonButtonManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.message = '';
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__summon-controls';

    this.refs.button = this.createButton();
    this.refs.message = document.createElement('div');
    this.refs.message.className = 'workshop-page__summon-message';

    this.root.append(this.refs.button, this.refs.message);
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
    this.message = '';
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__summon-button';
    button.type = 'button';
    button.addEventListener('click', () => this.onSummonSeed());
    return button;
  }

  onSummonSeed() {
    const result = this.gameplayFacade.summonSeed();
    this.message = result.ok ? `found ${result.seed.label}` : 'not enough mana';
    this.render(this.gameplayFacade.getSnapshot());
  }

  render(snapshot) {
    this.refs.button.textContent = `summon seed (${snapshot.seedSummoning.cost} mana)`;
    this.refs.button.setAttribute(
      'aria-disabled',
      snapshot.seedSummoning.canSummon ? 'false' : 'true',
    );
    this.refs.button.disabled = !snapshot.seedSummoning.canSummon;
    this.refs.message.textContent = this.message;
  }
}
