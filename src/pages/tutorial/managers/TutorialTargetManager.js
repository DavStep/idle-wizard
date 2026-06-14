export class TutorialTargetManager {
  constructor({ stage } = {}) {
    this.stage = stage;
  }

  setStage(stage) {
    this.stage = stage;
  }

  getTarget(targetId) {
    if (!this.stage || !targetId) {
      return null;
    }

    return (
      [...this.stage.querySelectorAll('[data-tutorial-id]')].find(
        (element) => element.dataset.tutorialId === targetId,
      ) ?? null
    );
  }

  getDomState() {
    return {
      isBlockingDialogOpen: () =>
        Boolean(this.stage?.querySelector('.room-top-panel__settings:not([hidden])')),
      isGardenSeedPopupOpen: () =>
        Boolean(this.stage?.querySelector('.garden-page__seed-popup:not([hidden])')),
      isShopSellPopupOpen: () =>
        Boolean(this.stage?.querySelector('.shop-page__sell-popup:not([hidden])')),
      isTasksExpanded: () => {
        const tasks = this.stage?.querySelector('[data-tutorial-id="workshop:tasks"]');
        return tasks?.getAttribute('aria-expanded') === 'true';
      },
    };
  }
}
