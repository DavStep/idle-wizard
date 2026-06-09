const maxLockedResearchesPerBox = 3;

export class ResearchBoxListManager {
  constructor({ gameplayFacade, onShowResearchInfo } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onShowResearchInfo = onShowResearchInfo;
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
            .map(
              (research) =>
                `${research.id}:${research.label}:${research.value}:${research.effect}:${research.showEffect}:${research.description}:${research.completed}:${research.locked}:${research.canResearch}`,
            )
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

    section.append(
      title,
      ...this.getDisplayedResearches(box.researches).map((research) => this.createRow(research)),
    );

    return section;
  }

  getDisplayedResearches(researches = []) {
    let lockedResearchCount = 0;

    return researches.filter((research) => {
      if (!research.locked) {
        return true;
      }

      lockedResearchCount += 1;
      return lockedResearchCount <= maxLockedResearchesPerBox;
    });
  }

  createRow(research) {
    const row = document.createElement('div');
    row.className = 'research-page__row';
    row.classList.toggle('is-completed', Boolean(research.completed));
    row.classList.toggle(
      'is-unavailable',
      !research.completed && !research.canResearch,
    );
    row.classList.toggle('is-locked', Boolean(research.locked));

    const key = document.createElement('button');
    key.className = 'row_key research-page__research-label research-page__research-label-button';
    key.type = 'button';
    key.setAttribute('aria-haspopup', 'dialog');
    key.setAttribute('aria-label', `show information for ${this.formatResearchName(research)}`);
    key.addEventListener('click', () => this.onShowResearchInfo?.(research));
    key.append(...this.createResearchLabelParts(research));

    const val = research.completed ? this.createCompletedValue(research) : this.createBuyButton(research);

    row.append(key, val);
    return row;
  }

  createResearchLabelParts(research) {
    const name = document.createElement('span');
    name.className = 'research-page__research-name';
    name.textContent = research.label;

    if (!research.showEffect) {
      return [name];
    }

    const effect = document.createElement('span');
    effect.className = 'research-page__research-effect';
    effect.textContent = research.effect;
    return [name, effect];
  }

  createCompletedValue(research) {
    const val = document.createElement('span');
    val.className = 'row_val research-page__research-value';
    val.textContent = research.value;
    return val;
  }

  createBuyButton(research) {
    const button = document.createElement('button');
    button.className = 'style-button research-page__research-button';
    button.type = 'button';
    button.textContent = research.value;
    button.disabled = !research.canResearch;
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
    button.setAttribute('aria-label', this.formatResearchButtonLabel(research));
    button.addEventListener('click', () => this.gameplayFacade.buyResearch(research.id));
    return button;
  }

  formatResearchName(research) {
    return research.showEffect ? `${research.label} ${research.effect}` : research.label;
  }

  formatResearchButtonLabel(research) {
    if (research.locked) {
      return `${this.formatResearchName(research)} is locked`;
    }

    return `research ${this.formatResearchName(research)} for ${research.value}`;
  }
}
