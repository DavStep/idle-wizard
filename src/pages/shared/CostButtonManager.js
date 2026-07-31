import { setResourceColorFromText } from './resourceColor.js';
import { setResourceIconText } from './resourceIconLabel.js';

const COIN_ICON_PATH = new URL(
  '../../../assets/game/source/icons/icon-coin.png',
  import.meta.url,
).href;

/**
 * Binds one button to a cost presentation without owning the purchase rule.
 * Callers provide the current cost label and whether gameplay says the action
 * is available; this manager keeps the visual, disabled, and click states in
 * sync.
 */
export class CostButtonManager {
  constructor({ button, onPress } = {}) {
    if (!button || typeof button.addEventListener !== 'function') {
      throw new Error('Cost button requires a button element.');
    }

    if (typeof onPress !== 'function') {
      throw new Error('Cost button requires an onPress handler.');
    }

    this.button = button;
    this.onPress = onPress;
    this.enabled = false;
    this.handlePointerDown = (event) => event.stopPropagation();
    this.handleClick = (event) => {
      event.stopPropagation();

      if (this.enabled) {
        this.onPress();
      }
    };

    this.button.classList.add('style-cost-button');
    this.button.addEventListener('pointerdown', this.handlePointerDown);
    this.button.addEventListener('click', this.handleClick);
  }

  setData({ amountLabel, enabled, ariaLabel, title = '' } = {}) {
    const label = String(amountLabel ?? '');

    if (!label.trim()) {
      throw new Error('Cost button requires a visible amount label.');
    }

    this.enabled = enabled === true;
    setResourceIconText(this.button, label);
    this.wrapPlainLabel(label);
    this.useSharedCoinIcon();
    setResourceColorFromText(this.button, label);
    this.button.disabled = !this.enabled;
    this.button.setAttribute('aria-disabled', this.enabled ? 'false' : 'true');
    this.button.setAttribute('aria-label', String(ariaLabel ?? label));

    if (title) {
      this.button.title = String(title);
    } else {
      this.button.removeAttribute('title');
    }
  }

  wrapPlainLabel(label) {
    if (this.button.querySelector('.style-resource-label')) {
      return;
    }

    const text = document.createElement('span');
    text.className = 'style-cost-button__plain-label';
    text.textContent = label;
    this.button.replaceChildren(text);
  }

  useSharedCoinIcon() {
    const coinIcon = this.button.querySelector(
      '.style-resource-label--coin .style-resource-label__icon',
    );

    if (!coinIcon || coinIcon.tagName.toLowerCase() === 'img') {
      return;
    }

    const image = document.createElement('img');
    image.className = coinIcon.getAttribute('class') ?? 'style-resource-label__icon';
    image.src = COIN_ICON_PATH;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    image.draggable = false;
    image.dataset.currencyIcon = 'coin';
    coinIcon.replaceWith(image);
  }

  destroy() {
    this.button.removeEventListener('pointerdown', this.handlePointerDown);
    this.button.removeEventListener('click', this.handleClick);
  }
}
