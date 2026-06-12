import { formatGoldPriceText } from '../../../shared/goldPrice.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { setResourceColor } from '../../shared/resourceColor.js';

export class ShopGoldOfferManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
  }

  mount(parent) {
    if (!parent || !this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__gold-offer style-box';
    this.root.setAttribute('aria-label', 'Gold offer');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'gold offer';

    const row = document.createElement('div');
    row.className = 'shop-page__gold-offer-row';

    this.refs.reward = document.createElement('span');
    this.refs.reward.className = 'shop-page__gold-offer-reward';
    setResourceColor(this.refs.reward, 'gold');

    this.refs.action = document.createElement('button');
    this.refs.action.className = 'shop-page__gold-offer-action';
    this.refs.action.type = 'button';
    this.refs.action.addEventListener('click', () => this.onCollect());

    row.append(this.refs.reward, this.refs.action);
    this.root.append(title, row);
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
    this.refs = {};
  }

  onCollect() {
    const result = this.gameplayFacade.collectShopGoldOffer();

    if (!result.ok) {
      this.render(this.gameplayFacade.getSnapshot());
    }
  }

  render(snapshot) {
    const offer = snapshot?.shop?.goldOffer;

    if (!offer || !this.root) {
      return;
    }

    const rewardText = formatGoldPriceText(offer.rewardGold);
    this.setText(this.refs.reward, rewardText);
    this.setText(
      this.refs.action,
      offer.canCollect ? 'collect' : this.formatTimer(offer.cooldownRemainingSeconds),
    );
    this.refs.action.disabled = !offer.canCollect;
    this.refs.action.setAttribute('aria-disabled', offer.canCollect ? 'false' : 'true');
    this.refs.action.setAttribute(
      'aria-label',
      offer.canCollect
        ? `collect ${rewardText}`
        : `${rewardText} available in ${this.formatTimer(offer.cooldownRemainingSeconds)}`,
    );
    setNotificationBadge(this.refs.action, offer.canCollect);
  }

  formatTimer(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
    const hours = Math.floor(safeSeconds / 3_600);
    const minutes = Math.floor((safeSeconds % 3_600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    if (minutes > 0) {
      return `${minutes}m`;
    }

    return `${safeSeconds}s`;
  }

  setText(element, text) {
    if (element && element.textContent !== text) {
      element.textContent = text;
    }
  }
}
