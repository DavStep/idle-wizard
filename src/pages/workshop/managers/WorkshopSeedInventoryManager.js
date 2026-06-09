export class WorkshopSeedInventoryManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.handleRootClick = (event) => {
      if (event.target === this.root) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
    };
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'workshop-page__seed-inventory';
    this.root.addEventListener('click', this.handleRootClick);

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__seed-inventory-dialog style-dialog';
    this.refs.dialog.setAttribute('aria-label', 'Seed inventory');
    this.refs.dialog.setAttribute('aria-modal', 'true');
    this.refs.dialog.setAttribute('role', 'dialog');
    this.refs.dialog.tabIndex = -1;

    this.refs.title = this.createTitle();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__seed-inventory-rows';
    this.refs.dialog.append(this.refs.title, this.refs.rows);
    this.root.append(this.refs.dialog);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'seeds';
    return title;
  }

  toggle() {
    if (this.visible) {
      this.hide();
      return;
    }

    this.show();
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    const { researched, unresearched } = this.getGroupedSeedRows(snapshot);
    const rows = [
      ...researched.map((seed) => this.createRow(seed)),
      ...(researched.length > 0 && unresearched.length > 0 ? [this.createDivider()] : []),
      ...unresearched.map((seed) => this.createRow(seed)),
    ];

    this.refs.rows.replaceChildren(...rows);
  }

  getSeedRows(snapshot) {
    if (snapshot.seedInventory?.length) {
      return snapshot.seedInventory;
    }

    return snapshot.inventory.filter((item) => item.kind === 'seed');
  }

  getGroupedSeedRows(snapshot) {
    const researchedSeedIds = this.getResearchedSeedIds(snapshot);
    const rows = this.getSeedRows(snapshot).map((seed) => ({
      ...seed,
      researched: researchedSeedIds.has(this.getSeedResearchId(seed)),
    }));

    return {
      researched: rows.filter((seed) => seed.researched),
      unresearched: rows.filter((seed) => !seed.researched),
    };
  }

  getResearchedSeedIds(snapshot) {
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

  getSeedResearchId(seed) {
    return `unlockSeed:${seed.key}`;
  }

  createDivider() {
    const divider = document.createElement('div');
    divider.className = 'workshop-page__seed-inventory-divider';
    divider.setAttribute('role', 'separator');
    return divider;
  }

  createRow(seed) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__seed-inventory-row';
    row.classList.toggle('is-empty', seed.quantity <= 0);
    row.classList.toggle('is-unresearched', !seed.researched);

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = seed.label;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = String(seed.quantity);

    row.append(key, val);
    return row;
  }

  applyVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden = !this.visible;
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
