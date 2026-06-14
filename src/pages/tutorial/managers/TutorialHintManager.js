const HINT_WIDTH = 184;
const HINT_HEIGHT = 72;
const HINT_GAP = 8;
const HIGHLIGHT_PAD = 3;

export class TutorialHintManager {
  constructor({ onSkip } = {}) {
    this.onSkip = onSkip;
    this.stage = null;
    this.root = null;
    this.highlight = null;
    this.hint = null;
    this.stepLabel = null;
    this.witch = null;
    this.text = null;
    this.skipButton = null;
  }

  mount(stage) {
    if (this.root) {
      return this.root;
    }

    this.stage = stage;
    this.root = document.createElement('section');
    this.root.className = 'tutorial-layer';
    this.root.hidden = true;
    this.root.setAttribute('aria-label', 'Guide');

    this.highlight = document.createElement('div');
    this.highlight.className = 'tutorial-layer__highlight';
    this.highlight.setAttribute('aria-hidden', 'true');

    this.hint = document.createElement('section');
    this.hint.className = 'tutorial-layer__hint style-box';
    this.hint.setAttribute('aria-live', 'polite');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'guide';

    this.stepLabel = document.createElement('div');
    this.stepLabel.className = 'tutorial-layer__step-label';

    this.witch = document.createElement('div');
    this.witch.className = 'tutorial-layer__witch';
    this.witch.setAttribute('aria-hidden', 'true');

    for (const className of [
      'tutorial-layer__witch-hat',
      'tutorial-layer__witch-face',
      'tutorial-layer__witch-body',
      'tutorial-layer__witch-broom',
    ]) {
      const part = document.createElement('span');
      part.className = className;
      this.witch.append(part);
    }

    const copy = document.createElement('div');
    copy.className = 'tutorial-layer__copy';

    this.text = document.createElement('p');
    this.text.className = 'tutorial-layer__text';

    this.skipButton = document.createElement('button');
    this.skipButton.className = 'tutorial-layer__skip';
    this.skipButton.type = 'button';
    this.skipButton.textContent = 'skip';
    this.skipButton.addEventListener('click', () => this.onSkip?.());

    copy.append(this.text, this.skipButton);
    this.hint.append(title, this.stepLabel, this.witch, copy);
    this.root.append(this.highlight, this.hint);
    stage.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.stage = null;
    this.root = null;
    this.highlight = null;
    this.hint = null;
    this.stepLabel = null;
    this.witch = null;
    this.text = null;
    this.skipButton = null;
  }

  show({ target, text, stepLabel }) {
    if (!this.root || !this.stage || !target) {
      this.hide();
      return;
    }

    const rect = this.getSourceRect(target);

    if (!rect) {
      this.hide();
      return;
    }

    this.root.hidden = false;
    this.text.textContent = text ?? '';
    this.stepLabel.textContent = stepLabel ?? '';
    this.positionHighlight(rect);
    this.positionHint(rect);
  }

  hide() {
    if (this.root) {
      this.root.hidden = true;
    }
  }

  getSourceRect(target) {
    const stageRect = this.stage.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scale = this.getUiScale();

    if (targetRect.width <= 0 && targetRect.height <= 0) {
      return null;
    }

    return {
      left: (targetRect.left - stageRect.left) / scale,
      top: (targetRect.top - stageRect.top) / scale,
      width: targetRect.width / scale,
      height: targetRect.height / scale,
    };
  }

  getUiScale() {
    const view = this.stage?.ownerDocument?.defaultView ?? globalThis.window;
    const scale = Number.parseFloat(
      view?.getComputedStyle?.(this.stage)?.getPropertyValue('--style-ui-scale'),
    );

    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  positionHighlight(rect) {
    const left = Math.max(0, rect.left - HIGHLIGHT_PAD);
    const top = Math.max(0, rect.top - HIGHLIGHT_PAD);
    const width = rect.width + HIGHLIGHT_PAD * 2;
    const height = rect.height + HIGHLIGHT_PAD * 2;

    this.highlight.style.left = `${left}px`;
    this.highlight.style.top = `${top}px`;
    this.highlight.style.width = `${width}px`;
    this.highlight.style.height = `${height}px`;
  }

  positionHint(rect) {
    const bounds = this.getSourceBounds();
    const left = clamp(rect.left, HINT_GAP, Math.max(HINT_GAP, bounds.width - HINT_WIDTH));
    const below = rect.top + rect.height + HINT_GAP;
    const above = rect.top - HINT_HEIGHT - HINT_GAP;
    const top =
      below + HINT_HEIGHT <= bounds.height - HINT_GAP
        ? below
        : Math.max(HINT_GAP, above);

    this.hint.style.left = `${left}px`;
    this.hint.style.top = `${top}px`;
  }

  getSourceBounds() {
    const rect = this.stage.getBoundingClientRect();
    const scale = this.getUiScale();

    return {
      width: rect.width > 0 ? rect.width / scale : 360,
      height: rect.height > 0 ? rect.height / scale : 720,
    };
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
