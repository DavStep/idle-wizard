import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';

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
    this.root.dataset.tutorialId = 'workshop:manaSphere';
    this.root.setAttribute('aria-label', 'Mana sphere');

    this.refs.title = this.createTitle();
    this.refs.mana = this.createRow('mana', '0/0');
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
    setResourceColor(row, label === 'generation' ? 'mana' : label);

    const key = document.createElement('span');
    key.className = 'row_key';
    setResourceIconText(key, label);

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = value;

    row.append(key, val);
    return { row, val };
  }

  render(snapshot) {
    this.setText(
      this.refs.mana.val,
      `${Math.floor(snapshot.mana.current)}/${snapshot.mana.cap}`,
    );
    this.setText(this.refs.generation.val, `${snapshot.mana.perSecond} / second`);
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }
}
