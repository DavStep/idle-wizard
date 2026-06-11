import { formatGoldPrice } from '../../../shared/goldPrice.js';

export class TopPanelResourceDisplayManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.refs = null;
    this.unsubscribe = null;
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

    const mana = snapshot.mana ?? {};
    const gold = snapshot.gold?.current ?? 0;
    const crystal = snapshot.crystal?.current ?? 0;
    const level = snapshot.tasks?.currentLevel ?? 1;

    this.setText(this.refs.manaValue, `${Math.floor(mana.current ?? 0)} / ${mana.cap ?? 0}`);
    this.setText(this.refs.goldValue, formatGoldPrice(gold));
    this.setText(this.refs.crystalValue, String(Math.floor(crystal)));
    this.setText(this.refs.levelValue, `level ${level}`);
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }
}
