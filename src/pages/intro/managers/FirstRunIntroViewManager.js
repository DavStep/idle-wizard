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
    text: 'your reward for saving the kingdom? a nearly empty pouch.',
    action: 'next',
  }),
  Object.freeze({
    id: 'better-use',
    scene: 'reward',
    text: 'time to put your magic to better use.',
    action: 'next',
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
    text: 'the sign says vacant. the key is still under the sill.',
    action: 'enter workshop',
  }),
]);

export class FirstRunIntroViewManager {
  constructor() {
    this.root = null;
    this.refs = {};
    this.stepIndex = 0;
    this.motionStep = 0;
    this.isTransitioning = false;
    this.transitionTimeoutId = null;
    this.backdropFrozen = false;
    this.preloadedImages = [];
    this.onComplete = null;
    this.handleAdvance = () => this.advance();
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

    this.refs.backdropLayer = document.createElement('div');
    this.refs.backdropLayer.className = 'first-run-intro__backdrop-layer';

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
    this.refs.backdropLayer.append(this.refs.backdrop, this.refs.workshopSale);
    this.refs.transitionShade = document.createElement('div');
    this.refs.transitionShade.className = 'first-run-intro__transition-shade';
    this.refs.transitionShade.setAttribute('aria-hidden', 'true');

    this.refs.scene.append(
      this.refs.backdropLayer,
      this.refs.rainbow,
      this.refs.demonDefeated,
      this.refs.coinPile,
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

    this.refs.advance = document.createElement('button');
    this.refs.advance.className = 'style-button first-run-intro__advance';
    this.refs.advance.type = 'button';
    this.refs.advance.addEventListener('click', this.handleAdvance);

    this.refs.panel.append(
      this.refs.title,
      this.refs.text,
      this.refs.advance,
    );

    this.root.append(this.refs.scene, this.refs.panel);
    stage.append(this.root);
    return this.root;
  }

  unmount() {
    this.clearTransition();
    this.refs.advance?.removeEventListener('click', this.handleAdvance);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.stepIndex = 0;
    this.motionStep = 0;
    this.isTransitioning = false;
    this.backdropFrozen = false;
    this.preloadedImages = [];
    this.onComplete = null;
  }

  show({ onComplete } = {}) {
    if (!this.root) {
      return;
    }

    this.onComplete = typeof onComplete === 'function' ? onComplete : null;
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
    this.refs.advance.type = 'button';
    this.restartStepMotion();
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
    const backdropLayer = this.refs.backdropLayer;
    if (!backdropLayer) {
      return;
    }

    const view = backdropLayer.ownerDocument?.defaultView ?? globalThis.window;
    const style = view?.getComputedStyle?.(backdropLayer);
    if (!style) {
      return;
    }

    backdropLayer.style.transform = style.transform === 'none' ? '' : style.transform;
    backdropLayer.style.opacity = style.opacity;
    backdropLayer.style.filter = style.filter;
    this.backdropFrozen = true;
  }

  clearFrozenBackdrop() {
    if (!this.backdropFrozen || !this.refs.backdropLayer) {
      return;
    }

    this.refs.backdropLayer.style.removeProperty('transform');
    this.refs.backdropLayer.style.removeProperty('opacity');
    this.refs.backdropLayer.style.removeProperty('filter');
    this.backdropFrozen = false;
  }

  getBackdropUrl(scene) {
    if (scene === 'peace') {
      return PEACEFUL_WORLD_URL;
    }

    if (scene === 'reward') {
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
    pile.setAttribute('aria-label', 'old coin pouch');

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
    board.setAttribute('aria-label', 'vacant, free');

    const label = document.createElement('div');
    label.className = 'first-run-intro__workshop-sale-label';
    label.textContent = 'vacant';

    const price = document.createElement('div');
    price.className = 'first-run-intro__workshop-sale-price';

    const count = document.createElement('span');
    count.className = 'first-run-intro__workshop-sale-count';
    count.textContent = 'free';

    price.append(count);
    board.append(label, price);

    return board;
  }
}
