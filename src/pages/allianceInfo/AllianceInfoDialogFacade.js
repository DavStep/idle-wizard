import { AllianceInfoDialogManager } from './managers/AllianceInfoDialogManager.js';

export class AllianceInfoDialogFacade {
  static explain =
    'Shows a small public alliance information popup when an alliance label is pressed.';

  constructor({ tradeAllianceFacade, onOpenPlayerInfo } = {}) {
    this.manager = new AllianceInfoDialogManager({
      tradeAllianceFacade,
      onOpenPlayerInfo,
    });
  }

  mount(stage) {
    this.manager.mount(stage);
  }

  unmount() {
    this.manager.unmount();
  }

  show(alliance) {
    this.manager.show(alliance);
  }

  hide() {
    this.manager.hide();
  }
}
