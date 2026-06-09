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

    this.refs.manaValue.textContent = `${Math.floor(mana.current ?? 0)} / ${mana.cap ?? 0}`;
    this.refs.goldValue.textContent = String(Math.floor(gold));
  }
}
