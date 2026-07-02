import { createAssetAtlasSprite } from '../../../assets/atlas/atlasSprite.js';

const CASTLE_RUINS_URL = new URL('../assets/castle-ruins.webp', import.meta.url).href;
const DEMON_DEFEATED_URL = new URL('../assets/demon-defeated.webp', import.meta.url).href;
const PEACEFUL_WORLD_URL = new URL('../assets/peaceful-world.webp', import.meta.url).href;
const REWARD_POUCH_URL = new URL('../assets/reward-pouch.webp', import.meta.url).href;
const WORKSHOP_FOR_SALE_URL = new URL('../assets/workshop-for-sale.webp', import.meta.url).href;

const INTRO_STEP_EXIT_MS = 180;
const INTRO_IMAGE_URLS = Object.freeze([
  CASTLE_RUINS_URL,
  DEMON_DEFEATED_URL,
  PEACEFUL_WORLD_URL,
  REWARD_POUCH_URL,
  WORKSHOP_FOR_SALE_URL,
]);

const INTRO_STEPS = Object.freeze([
  Object.freeze({
    id: 'castle',
    scene: 'castle',
    text: 'one last battle at the demon lord\'s keep.',
    action: 'next',
  }),
  Object.freeze({
    id: 'defeated',
    scene: 'defeated',
    text: 'the demon lord has been defeated.',
    action: 'next',
  }),
  Object.freeze({
    id: 'disbanded',
    scene: 'peace',
    text: 'peace returned. the wizard army disbanded.',
    action: 'next',
  }),
  Object.freeze({
    id: 'reward',
    scene: 'reward',
    text: 'your reward for saving the kingdom? a miserable 10 coin.',
    action: 'next',
  }),
  Object.freeze({
    id: 'better-use',
    scene: 'reward',
    text: 'time to put your magic to better use.',
    action: 'next',
  }),
  Object.freeze({
    id: 'name',
    scene: 'profile',
    text: 'every legendary wizard needs a name.',
    action: 'save name',
    mode: 'name',
  }),
  Object.freeze({
    id: 'workshop',
    scene: 'workshop',
    text: 'not every legend ends on a battlefield. some begin with an old workshop.',
    action: 'next',
  }),
  Object.freeze({
    id: 'buy-workshop',
    scene: 'workshop',
    text: 'the sign asks for 10 coin. that is exactly all you have.',
    action: 'buy workshop',
  }),
  Object.freeze({
    id: 'enter-workshop',
    scene: 'workshop',
    text: 'the door opens. time to work.',
    action: 'enter workshop',
  }),
]);

export class FirstRunIntroViewManager {
  constructor({ playerFacade } = {}) {
    this.playerFacade = playerFacade;
    this.root = null;
    this.refs = {};
    this.stepIndex = 0;
    this.motionStep = 0;
    this.isTransitioning = false;
    this.transitionTimeoutId = null;
    this.backdropFrozen = false;
    this.preloadedImages = [];
    this.onComplete = null;
    this.onName = null;
    this.handleAdvance = () => this.advance();
    this.handleSubmit = (event) => {
      event.preventDefault();
      this.advance();
    };
  }

  mount(stage) {
    if (!stage) {
      throw new Error('FirstRunIntroViewManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    this.preloadImages();

    this.root = document.createElement('section');
    this.root.className = 'first-run-intro';
    this.root.hidden = true;
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'introduction');

    this.refs.scene = document.createElement('div');
    this.refs.scene.className = 'first-run-intro__scene';

    this.refs.backdrop = document.createElement('img');
    this.refs.backdrop.className = 'first-run-intro__backdrop';
    this.refs.backdrop.alt = '';
    this.refs.backdrop.draggable = false;
    this.refs.backdrop.setAttribute('aria-hidden', 'true');

    this.refs.demonDefeated = this.createSceneImage(
      'first-run-intro__demon first-run-intro__demon--defeated',
      DEMON_DEFEATED_URL,
    );
    this.refs.rainbow = document.createElement('div');
    this.refs.rainbow.className = 'first-run-intro__rainbow';
    this.refs.rainbow.setAttribute('aria-hidden', 'true');
    this.refs.coinPile = this.createCoinPile();
    this.refs.workshopSale = this.createWorkshopSaleBoard();
    this.refs.transitionShade = document.createElement('div');
    this.refs.transitionShade.className = 'first-run-intro__transition-shade';
    this.refs.transitionShade.setAttribute('aria-hidden', 'true');

    this.refs.scene.append(
      this.refs.backdrop,
      this.refs.rainbow,
      this.refs.demonDefeated,
      this.refs.coinPile,
      this.refs.workshopSale,
      this.refs.transitionShade,
    );

    this.refs.panel = document.createElement('section');
    this.refs.panel.className = 'first-run-intro__panel style-dialog';
    this.refs.panel.tabIndex = -1;

    this.refs.title = document.createElement('div');
    this.refs.title.className = 'style-box__title';
    this.refs.title.textContent = 'after the war';

    this.refs.text = document.createElement('p');
    this.refs.text.className = 'first-run-intro__text';

    this.refs.form = document.createElement('form');
    this.refs.form.className = 'first-run-intro__form';
    this.refs.form.hidden = true;
    this.refs.form.addEventListener('submit', this.handleSubmit);

    this.refs.nameInput = document.createElement('input');
    this.refs.nameInput.className = 'style-input first-run-intro__name-input';
    this.refs.nameInput.type = 'text';
    this.refs.nameInput.maxLength = 24;
    this.refs.nameInput.autocomplete = 'off';
    this.refs.nameInput.enterKeyHint = 'done';
    this.refs.nameInput.setAttribute('aria-label', 'wizard name');

    this.refs.error = document.createElement('div');
    this.refs.error.className = 'first-run-intro__error';
    this.refs.error.hidden = true;

    this.refs.advance = document.createElement('button');
    this.refs.advance.className = 'style-button first-run-intro__advance';
    this.refs.advance.type = 'button';
    this.refs.advance.addEventListener('click', this.handleAdvance);

    this.refs.form.append(this.refs.nameInput, this.refs.error);
    this.refs.panel.append(
      this.refs.title,
      this.refs.text,
      this.refs.form,
      this.refs.advance,
    );

    this.root.append(this.refs.scene, this.refs.panel);
    stage.append(this.root);
    return this.root;
  }

  unmount() {
    this.clearTransition();
    this.refs.advance?.removeEventListener('click', this.handleAdvance);
    this.refs.form?.removeEventListener('submit', this.handleSubmit);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.stepIndex = 0;
    this.motionStep = 0;
    this.isTransitioning = false;
    this.backdropFrozen = false;
    this.preloadedImages = [];
    this.onComplete = null;
    this.onName = null;
  }

  show({ onComplete, onName } = {}) {
    if (!this.root) {
      return;
    }

    this.onComplete = typeof onComplete === 'function' ? onComplete : null;
    this.onName = typeof onName === 'function' ? onName : null;
    this.stepIndex = 0;
    this.motionStep = 0;
    this.clearTransition();
    this.root.hidden = false;
    this.render();
    this.refs.panel?.focus?.();
  }

  hide() {
    this.clearTransition();
    if (this.root) {
      this.root.hidden = true;
    }
  }

  advance() {
    if (this.isTransitioning) {
      return;
    }

    const step = this.getStep();

    if (step?.mode === 'name' && !this.saveName()) {
      return;
    }

    if (this.stepIndex >= INTRO_STEPS.length - 1) {
      this.transitionToComplete();
      return;
    }

    this.transitionToStep(this.stepIndex + 1);
  }

  complete() {
    this.hide();
    this.onComplete?.();
  }

  transitionToStep(nextStepIndex) {
    const backdropChanging = this.isBackdropChangingForStep(nextStepIndex);
    this.startStepExit(() => {
      this.stepIndex = nextStepIndex;
      this.render();
    }, { backdropChanging });
  }

  transitionToComplete() {
    this.startStepExit(() => this.complete(), { backdropChanging: true });
  }

  startStepExit(afterExit, { backdropChanging = true } = {}) {
    if (!this.root) {
      return;
    }

    this.isTransitioning = true;
    this.refs.advance.disabled = true;
    if (!backdropChanging) {
      this.freezeBackdropVisualState();
    }
    this.setBackdropTransition(backdropChanging);
    this.root.classList.remove('first-run-intro--step-enter');
    this.root.classList.add('first-run-intro--step-exit');

    const delay = this.getStepExitDelay();
    this.transitionTimeoutId = window.setTimeout(() => {
      this.transitionTimeoutId = null;
      afterExit();
      this.root?.classList.remove('first-run-intro--step-exit');
      this.isTransitioning = false;
      if (this.refs.advance) {
        this.refs.advance.disabled = false;
      }
    }, delay);
  }

  clearTransition() {
    if (this.transitionTimeoutId !== null) {
      window.clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }

    this.isTransitioning = false;
    this.root?.classList.remove(
      'first-run-intro--step-enter',
      'first-run-intro--step-exit',
      'first-run-intro--stable-backdrop',
      'first-run-intro--changing-backdrop',
    );
    this.root?.removeAttribute('data-backdrop-transition');
    this.clearFrozenBackdrop();

    if (this.refs.advance) {
      this.refs.advance.disabled = false;
    }
  }

  getStepExitDelay() {
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return 0;
    }

    return INTRO_STEP_EXIT_MS;
  }

  render() {
    const step = this.getStep();
    if (!step) {
      return;
    }

    this.root.dataset.scene = step.scene;
    this.root.dataset.step = step.id;
    const nextBackdropUrl = this.getBackdropUrl(step.scene);
    if (this.refs.backdrop.src !== nextBackdropUrl) {
      this.clearFrozenBackdrop();
    }
    this.refs.backdrop.src = nextBackdropUrl;
    this.refs.text.textContent = step.text;
    this.refs.advance.textContent = step.action;
    this.refs.advance.type = step.mode === 'name' ? 'submit' : 'button';
    this.refs.form.hidden = step.mode !== 'name';
    this.refs.error.hidden = true;
    this.refs.error.textContent = '';
    this.restartStepMotion();

    if (step.mode === 'name') {
      const currentName = this.playerFacade?.getSnapshot?.()?.username ?? '';
      this.refs.nameInput.value = currentName === 'wizard' ? '' : currentName;
      window.setTimeout(() => this.refs.nameInput?.focus?.(), 0);
    }
  }

  restartStepMotion() {
    if (!this.root || this.root.hidden) {
      return;
    }

    this.motionStep += 1;
    this.root.dataset.motionStep = String(this.motionStep);
    this.root.classList.remove('first-run-intro--step-enter');
    // Force style recalculation so the same animation can replay on repeated scenes.
    void this.root.offsetWidth;
    this.root.classList.add('first-run-intro--step-enter');
  }

  getStep() {
    return INTRO_STEPS[this.stepIndex] ?? null;
  }

  isBackdropChangingForStep(nextStepIndex) {
    const currentStep = this.getStep();
    const nextStep = INTRO_STEPS[nextStepIndex] ?? null;
    if (!currentStep || !nextStep) {
      return true;
    }

    return (
      this.getBackdropUrl(currentStep.scene) !== this.getBackdropUrl(nextStep.scene)
    );
  }

  setBackdropTransition(backdropChanging) {
    if (!this.root) {
      return;
    }

    const transitionName = backdropChanging ? 'changing' : 'stable';
    this.root.classList.remove(
      'first-run-intro--stable-backdrop',
      'first-run-intro--changing-backdrop',
    );
    this.root.classList.add(`first-run-intro--${transitionName}-backdrop`);
    this.root.dataset.backdropTransition = transitionName;
  }

  freezeBackdropVisualState() {
    const backdrop = this.refs.backdrop;
    if (!backdrop) {
      return;
    }

    const view = backdrop.ownerDocument?.defaultView ?? globalThis.window;
    const style = view?.getComputedStyle?.(backdrop);
    if (!style) {
      return;
    }

    backdrop.style.transform = style.transform === 'none' ? '' : style.transform;
    backdrop.style.opacity = style.opacity;
    backdrop.style.filter = style.filter;
    this.backdropFrozen = true;
  }

  clearFrozenBackdrop() {
    if (!this.backdropFrozen || !this.refs.backdrop) {
      return;
    }

    this.refs.backdrop.style.removeProperty('transform');
    this.refs.backdrop.style.removeProperty('opacity');
    this.refs.backdrop.style.removeProperty('filter');
    this.backdropFrozen = false;
  }

  getBackdropUrl(scene) {
    if (scene === 'peace') {
      return PEACEFUL_WORLD_URL;
    }

    if (scene === 'reward' || scene === 'profile') {
      return REWARD_POUCH_URL;
    }

    if (scene === 'workshop') {
      return WORKSHOP_FOR_SALE_URL;
    }

    return CASTLE_RUINS_URL;
  }

  createSceneImage(className, src) {
    const image = document.createElement('img');
    image.className = className;
    image.src = src;
    image.alt = '';
    image.draggable = false;
    image.setAttribute('aria-hidden', 'true');
    return image;
  }

  preloadImages() {
    if (this.preloadedImages.length > 0) {
      return;
    }

    this.preloadedImages = INTRO_IMAGE_URLS.map((src) => {
      const image = document.createElement('img');
      image.src = src;
      return image;
    });
  }

  createCoinPile() {
    const pile = document.createElement('div');
    pile.className = 'first-run-intro__coin-pile';
    pile.setAttribute('aria-label', '10 coin');

    for (let index = 0; index < 10; index += 1) {
      const coin = createAssetAtlasSprite(
        'first-run-intro__coin-pile-icon',
        'resource:coin',
      );
      if (coin) {
        coin.dataset.coinIndex = String(index + 1);
        pile.append(coin);
      }
    }

    return pile;
  }

  createWorkshopSaleBoard() {
    const board = document.createElement('div');
    board.className = 'first-run-intro__workshop-sale';
    board.setAttribute('aria-label', 'on sale, 10 coin');

    const label = document.createElement('div');
    label.className = 'first-run-intro__workshop-sale-label';
    label.textContent = 'on sale';

    const price = document.createElement('div');
    price.className = 'first-run-intro__workshop-sale-price';

    const icon = createAssetAtlasSprite(
      'first-run-intro__workshop-sale-icon',
      'resource:coin',
    );
    const count = document.createElement('span');
    count.className = 'first-run-intro__workshop-sale-count';
    count.textContent = 'x10';

    if (icon) {
      price.append(icon);
    }
    price.append(count);
    board.append(label, price);

    return board;
  }

  saveName() {
    const name = String(this.refs.nameInput?.value ?? '').trim();
    if (!name) {
      this.refs.error.textContent = 'enter a name';
      this.refs.error.hidden = false;
      this.refs.nameInput?.focus?.();
      return false;
    }

    this.onName?.(name);
    return true;
  }
}
