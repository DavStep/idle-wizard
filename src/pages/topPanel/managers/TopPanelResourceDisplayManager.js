import { formatGoldPriceText } from '../../../shared/goldPrice.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';

export class TopPanelResourceDisplayManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.contextCurrency = null;
    this.latestSnapshot = null;
  }

  mount(refs) {
    if (!this.gameplayFacade) {
      return;
    }

    this.refs = refs;
    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.refs = null;
  }

  render(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    this.latestSnapshot = snapshot;
    const mana = snapshot.mana ?? {};
    const gold = snapshot.gold?.current ?? 0;
    const level = snapshot.tasks?.currentLevel ?? 1;
    const goldText = formatGoldPriceText(gold);

    this.setText(this.refs.manaValue, `${Math.floor(mana.current ?? 0)}/${mana.cap ?? 0}`);
    this.setResourceText(this.refs.goldValue, goldText);
    this.renderContextCurrency(snapshot);
    this.setText(this.refs.levelValue, `level ${level}`);
  }

  setContextCurrency(currency) {
    const normalizedCurrency = ['crystal', 'ruby'].includes(currency) ? currency : null;

    if (this.contextCurrency === normalizedCurrency) {
      return;
    }

    this.contextCurrency = normalizedCurrency;
    this.render(this.latestSnapshot ?? this.gameplayFacade?.getSnapshot?.());
  }

  renderContextCurrency(snapshot) {
    const currency = this.contextCurrency;
    const showCurrency = Boolean(currency);
    const resource = this.refs.contextCurrency;

    this.refs.resources?.classList.toggle('has-special-currency', showCurrency);

    if (!resource) {
      return;
    }

    resource.hidden = !showCurrency;

    if (!showCurrency) {
      return;
    }

    const current = snapshot[currency]?.current ?? 0;
    this.setAttribute(resource, 'aria-label', currency);
    setResourceColor(resource, currency);
    this.setResourceText(this.refs.contextCurrencyKey, `${currency} `);
    this.setText(this.refs.contextCurrencyValue, String(Math.floor(current)));
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setResourceText(element, text) {
    if (element.textContent !== text) {
      setResourceIconText(element, text);
    }
  }

  setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }
}
