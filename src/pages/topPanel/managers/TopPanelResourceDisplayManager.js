import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';

export class TopPanelResourceDisplayManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.frameResourceUnsubscribe = null;
    this.contextCurrency = null;
    this.latestSnapshot = null;
  }

  mount(refs) {
    if (!this.gameplayFacade) {
      return;
    }

    this.refs = refs;
    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.frameResourceUnsubscribe =
      this.gameplayFacade.subscribeFrameResources?.((snapshot) =>
        this.renderFrameResources(snapshot),
      ) ?? null;
    this.render(this.gameplayFacade.getSnapshot());
  }

  unmount() {
    this.unsubscribe?.();
    this.frameResourceUnsubscribe?.();
    this.unsubscribe = null;
    this.frameResourceUnsubscribe = null;
    this.refs = null;
  }

  render(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    this.latestSnapshot = snapshot;
    const mana = snapshot.mana ?? {};
    const coin = snapshot.coin?.current ?? 0;
    const level = this.getVisibleLevel(snapshot);
    const coinText = formatCoinPriceText(coin);

    this.setResourceText(
      this.refs.manaValue,
      `${Math.floor(mana.current ?? 0)}/${mana.cap ?? 0} mana`,
    );
    this.setManaValueTutorialTarget();
    this.setText(this.refs.manaRateText ?? this.refs.manaRateValue, formatManaRate(mana.perSecond));
    this.setResourceText(this.refs.coinValue, coinText);
    this.renderContextCurrency(snapshot);
    this.setText(this.refs.levelValue, level === null ? '' : String(level));
    this.setHidden(this.refs.levelButton ?? this.refs.levelValue, level === null);
    this.setAttribute(
      this.refs.levelButton,
      'aria-label',
      level === null ? 'level unavailable' : `level ${level}, open level rewards`,
    );
  }

  renderFrameResources(snapshot) {
    const previousSnapshot = this.latestSnapshot ?? {};
    this.render({
      ...previousSnapshot,
      ...snapshot,
      tasks: {
        ...(previousSnapshot.tasks ?? {}),
        ...(snapshot.tasks ?? {}),
      },
    });
  }

  setContextCurrency(currency) {
    const normalizedCurrency = ['crystal', 'ruby', 'emerald'].includes(currency)
      ? currency
      : null;

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
    this.setResourceText(this.refs.contextCurrencyValue, `${Math.floor(current)} ${currency}`);
  }

  setText(element, text) {
    if (!element) {
      return;
    }

    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setResourceText(element, text) {
    if (!element) {
      return;
    }

    if (element.textContent !== text) {
      setResourceIconText(element, text);
    }
  }

  setManaValueTutorialTarget() {
    const label = this.refs?.manaValue?.querySelector?.('.style-resource-label--mana');
    const amount = label?.querySelector?.('.style-resource-label__amount');

    label?.setAttribute('data-tutorial-id', 'top:mana:value');
    label?.removeAttribute('data-tutorial-highlight-padding');
    label?.removeAttribute('data-tutorial-highlight-shape');

    amount?.removeAttribute('data-tutorial-id');
    amount?.removeAttribute('data-tutorial-highlight-padding');
    amount?.removeAttribute('data-tutorial-highlight-shape');
  }

  setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

  setHidden(element, hidden) {
    if (!element) {
      return;
    }

    element.hidden = Boolean(hidden);
  }

  getVisibleLevel(snapshot) {
    const rawLevel = snapshot?.tasks?.currentLevel ?? snapshot?.playerLevel?.currentLevel ?? null;
    const level = Math.floor(Number(rawLevel));

    return Number.isFinite(level) && level >= 1 ? level : null;
  }
}

function formatManaRate(perSecond) {
  const safePerSecond = Math.max(0, Number(perSecond) || 0);
  const roundedPerSecond = Number.isInteger(safePerSecond)
    ? safePerSecond
    : Number(safePerSecond.toFixed(2));

  return `+${roundedPerSecond}/s`;
}
