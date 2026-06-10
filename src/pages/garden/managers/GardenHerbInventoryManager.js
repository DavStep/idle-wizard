import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';

export class GardenHerbInventoryManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.rows = null;
    this.unsubscribe = null;
    this.herbRefs = new Map();
    this.divider = null;
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
    this.divider = null;
  }

  render(snapshot) {
    const herbs = this.getHerbRows(snapshot);
    this.ensureRows(herbs);

    for (const herb of herbs) {
      const refs = this.herbRefs.get(herb.itemTypeId);
      refs.label.textContent = herb.display.label;
      refs.quantity.textContent = herb.display.quantity;
      refs.row.classList.toggle('is-empty', herb.quantity <= 0);
      refs.row.classList.toggle('is-locked', herb.display.locked);
      refs.row.classList.toggle('is-unknown', herb.display.unknown);
    }

    this.applyRowOrder(herbs);
    this.queueOverflowCue();
  }

  getHerbRows(snapshot) {
    return (snapshot.garden.herbs ?? [])
      .map((herb) => ({
        ...herb,
        display: getItemDisplay(snapshot, herb, herb.quantity),
      }))
      .filter((herb) => shouldShowItemInActionList(snapshot, herb, herb.quantity));
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

  applyRowOrder(herbs) {
    const knownHerbs = herbs.filter((herb) => !herb.display.locked);
    const unknownHerbs = herbs.filter((herb) => herb.display.locked);
    const orderedRows = [
      ...knownHerbs.map((herb) => this.herbRefs.get(herb.itemTypeId)?.row),
      ...(knownHerbs.length > 0 && unknownHerbs.length > 0
        ? [this.getDivider()]
        : []),
      ...unknownHerbs.map((herb) => this.herbRefs.get(herb.itemTypeId)?.row),
    ].filter(Boolean);

    this.rows.replaceChildren(...orderedRows);
  }

  getDivider() {
    if (!this.divider) {
      this.divider = document.createElement('div');
      this.divider.className = 'garden-page__herb-divider';
      this.divider.setAttribute('role', 'separator');
    }

    return this.divider;
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
