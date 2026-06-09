export class WorkshopManaSphereManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
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
    this.root.className = 'workshop-page__mana-sphere style-box';
    this.root.setAttribute('aria-label', 'Mana sphere');

    this.refs.title = this.createTitle();
    this.refs.mana = this.createRow('mana', '0 / 0');
    this.refs.generation = this.createRow('generation', '0 / second');

    this.root.append(this.refs.title, this.refs.mana.row, this.refs.generation.row);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'mana sphere';
    return title;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.remove();
    this.root = null;
    this.refs = {};
  }

  createRow(label, value) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = label;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = value;

    row.append(key, val);
    return { row, val };
  }

  render(snapshot) {
    this.refs.mana.val.textContent = `${Math.floor(snapshot.mana.current)} / ${snapshot.mana.cap}`;
    this.refs.generation.val.textContent = `${snapshot.mana.perSecond} / second`;
  }
}
