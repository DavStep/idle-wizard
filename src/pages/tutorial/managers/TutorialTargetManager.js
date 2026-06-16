export const BLOCKING_DIALOG_SELECTORS = [
  '.app-account-link-choice:not([hidden])',
  '.app-fresh-start-choice:not([hidden])',
  '.mobile-auth-bridge:not([hidden])',
  '.room-top-panel__level-popup:not([hidden])',
  '.room-top-panel__settings:not([hidden])',
];

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
    const root = this.stage?.ownerDocument ?? this.stage;

    return {
      isBlockingDialogOpen: () =>
        BLOCKING_DIALOG_SELECTORS.some((selector) => Boolean(root?.querySelector(selector))),
      isGardenSeedPopupOpen: () =>
        Boolean(this.stage?.querySelector('.garden-page__seed-popup:not([hidden])')),
      isBrewingRecipePopupOpen: () =>
        Boolean(this.stage?.querySelector('.brewing-page__recipes-popup:not([hidden])')),
      isShopSellPopupOpen: () =>
        Boolean(this.stage?.querySelector('.shop-page__sell-popup:not([hidden])')),
      isTasksExpanded: () => {
        const tasks = this.stage?.querySelector('[data-tutorial-id="workshop:tasks"]');
        return tasks?.getAttribute('aria-expanded') === 'true';
      },
    };
  }

  hasBlockingDialogMutation(mutations = []) {
    return mutations.some((mutation) => {
      if (isBlockingDialogNode(mutation.target)) {
        return true;
      }

      return [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
        isBlockingDialogNode(node),
      );
    });
  }
}

function isBlockingDialogNode(node) {
  if (!node || typeof node.matches !== 'function') {
    return false;
  }

  return BLOCKING_DIALOG_SELECTORS.some((selector) => {
    const baseSelector = selector.replace(':not([hidden])', '');
    return node.matches(baseSelector) || Boolean(node.querySelector(baseSelector));
  });
}
