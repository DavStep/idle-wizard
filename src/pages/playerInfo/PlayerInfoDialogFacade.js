import { PlayerInfoDialogManager } from './managers/PlayerInfoDialogManager.js';

export class PlayerInfoDialogFacade {
  static explain =
    'Shows a small player information popup when a visible player name is pressed.';

  constructor({ playerInfoFacade } = {}) {
    this.manager = new PlayerInfoDialogManager({ playerInfoFacade });
  }

  mount(stage) {
    this.manager.mount(stage);
  }

  unmount() {
    this.manager.unmount();
  }

  show(player) {
    this.manager.show(player);
  }

  hide() {
    this.manager.hide();
  }
}
