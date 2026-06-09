export class GardenHerbInventoryManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.rows = null;
    this.unsubscribe = null;
    this.herbRefs = new Map();
    this.handleRowsScroll = () => this.updateOverflowCue();
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'garden-page__herbs style-box';
    this.root.setAttribute('aria-label', 'Herbs');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'herbs';

    this.rows = document.createElement('div');
    this.rows.className = 'garden-page__herb-rows';
    this.rows.addEventListener('scroll', this.handleRowsScroll);
    this.root.append(title, this.rows);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.rows?.removeEventListener('scroll', this.handleRowsScroll);
    this.root?.remove();
    this.root = null;
    this.rows = null;
    this.herbRefs.clear();
  }

  render(snapshot) {
    const groupedHerbs = this.getGroupedHerbs(snapshot);
    const herbs = [
      ...groupedHerbs.unlocked,
      ...groupedHerbs.locked,
    ];
    this.ensureRows(herbs);

    for (const herb of herbs) {
      const refs = this.herbRefs.get(herb.itemTypeId);
      refs.label.textContent = herb.label;
      refs.quantity.textContent = String(herb.quantity);
      refs.row.classList.toggle('is-empty', herb.quantity <= 0);
      refs.row.classList.toggle('is-locked', !herb.unlocked);
    }

    this.applyRowOrder(groupedHerbs);
    this.queueOverflowCue();
  }

  getGroupedHerbs(snapshot) {
    const unlockedSeedIds = this.getUnlockedSeedIds(snapshot);
    const herbs = (snapshot.garden.herbs ?? []).map((herb) => ({
      ...herb,
      unlocked: unlockedSeedIds.has(this.getHerbSeedResearchId(herb)),
    }));

    return {
      unlocked: herbs.filter((herb) => herb.unlocked),
      locked: herbs.filter((herb) => !herb.unlocked),
    };
  }

  getUnlockedSeedIds(snapshot) {
    const ids = new Set(snapshot.research?.completedResearchIds ?? []);

    for (const box of snapshot.research?.boxes ?? []) {
      for (const research of box.researches ?? []) {
        if (research.completed) {
          ids.add(research.id);
        }
      }
    }

    return ids;
  }

  getHerbSeedResearchId(herb) {
    const seedKey = herb.key?.endsWith('Herb')
      ? `${herb.key.slice(0, -4)}Seed`
      : herb.key;

    return `unlockSeed:${seedKey}`;
  }

  ensureRows(herbs) {
    for (const herb of herbs) {
      if (this.herbRefs.has(herb.itemTypeId)) {
        continue;
      }

      const row = document.createElement('div');
      row.className = 'garden-page__herb-row';

      const label = document.createElement('span');
      label.className = 'row_key';

      const quantity = document.createElement('span');
      quantity.className = 'row_val';

      row.append(label, quantity);
      this.herbRefs.set(herb.itemTypeId, { row, label, quantity });
      this.rows.append(row);
    }
  }

  applyRowOrder({ unlocked, locked }) {
    const orderedRows = [
      ...unlocked.map((herb) => this.herbRefs.get(herb.itemTypeId)?.row),
      ...(unlocked.length > 0 && locked.length > 0 ? [this.createDivider()] : []),
      ...locked.map((herb) => this.herbRefs.get(herb.itemTypeId)?.row),
    ].filter(Boolean);

    this.rows.replaceChildren(...orderedRows);
  }

  createDivider() {
    const divider = document.createElement('div');
    divider.className = 'garden-page__herb-divider';
    divider.setAttribute('role', 'separator');
    return divider;
  }

  queueOverflowCue() {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.updateOverflowCue());
      return;
    }

    this.updateOverflowCue();
  }

  updateOverflowCue() {
    if (!this.rows) {
      return;
    }

    const hasOverflow = this.rows.scrollHeight > this.rows.clientHeight + 1;
    const isAtEnd = this.rows.scrollTop + this.rows.clientHeight >= this.rows.scrollHeight - 1;
    this.rows.classList.toggle('has-overflow', hasOverflow && !isAtEnd);
  }
}
