export class WorkshopManaSphereManager {
  constructor({ gameplayFacade, onSeedsClick } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onSeedsClick = onSeedsClick;
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
    this.refs.seeds = this.createRow('seeds', '0', {
      ariaLabel: 'show seed inventory',
      interactive: true,
      onClick: () => this.onSeedsClick?.(),
    });

    this.root.append(
      this.refs.title,
      this.refs.mana.row,
      this.refs.generation.row,
      this.refs.seeds.row,
    );
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

  createRow(label, value, { ariaLabel = null, interactive = false, onClick = null } = {}) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row';

    if (interactive) {
      row.classList.add('workshop-page__row--interactive');
      row.setAttribute('role', 'button');
      row.tabIndex = 0;
      if (ariaLabel) {
        row.setAttribute('aria-label', ariaLabel);
      }
      row.addEventListener('click', () => onClick?.());
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        onClick?.();
      });
    }

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
    const seedCount = snapshot.inventory
      .filter((item) => item.kind === 'seed')
      .reduce((total, item) => total + item.quantity, 0);

    this.refs.mana.val.textContent = `${Math.floor(snapshot.mana.current)} / ${snapshot.mana.cap}`;
    this.refs.generation.val.textContent = `${snapshot.mana.perSecond} / second`;
    this.refs.seeds.val.textContent = String(seedCount);
  }
}
