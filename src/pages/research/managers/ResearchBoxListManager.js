export class ResearchBoxListManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.signature = '';
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'research-page__content';
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
    this.signature = '';
  }

  render(snapshot) {
    const boxes = snapshot.research?.boxes ?? [];
    const signature = boxes
      .map(
        (box) =>
          `${box.id}:${box.researches
            .map((research) => `${research.id}:${research.label}:${research.value}`)
            .join(',')}`,
      )
      .join('|');

    if (signature === this.signature) {
      return;
    }

    this.signature = signature;
    this.root.replaceChildren(...boxes.map((box) => this.createBox(box)));
  }

  createBox(box) {
    const section = document.createElement('section');
    section.className = `research-page__box research-page__box--${box.id} style-box`;
    section.setAttribute('aria-label', box.label);

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = box.label;

    section.append(title, ...box.researches.map((research) => this.createRow(research)));

    return section;
  }

  createRow(research) {
    const row = document.createElement('div');
    row.className = 'research-page__row';

    const key = document.createElement('span');
    key.className = 'row_key research-page__research-label';
    key.textContent = research.label;

    const val = document.createElement('span');
    val.className = 'row_val research-page__research-value';
    val.textContent = research.value;

    row.append(key, val);
    return row;
  }
}
