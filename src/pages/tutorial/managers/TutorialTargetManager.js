export const BLOCKING_DIALOG_SELECTORS = [
  '.app-account-link-choice:not([hidden])',
  '.app-fresh-start-choice:not([hidden])',
  '.mobile-auth-bridge:not([hidden])',
  '.room-top-panel__level-popup:not([hidden])',
  '.room-top-panel__settings:not([hidden])',
];
const USERNAME_SETTINGS_BLOCKER = '.room-top-panel__settings:not([hidden])';
const NON_SETTINGS_BLOCKING_DIALOG_SELECTORS = BLOCKING_DIALOG_SELECTORS.filter(
  (selector) => selector !== USERNAME_SETTINGS_BLOCKER,
);

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
      isNonSettingsBlockingDialogOpen: () =>
        NON_SETTINGS_BLOCKING_DIALOG_SELECTORS.some((selector) =>
          Boolean(root?.querySelector(selector)),
        ),
      isBlockingDialogOpenForStep: (step) =>
        BLOCKING_DIALOG_SELECTORS.some((selector) => {
          if (
            selector === USERNAME_SETTINGS_BLOCKER &&
            step?.id === 'intro-username' &&
            isUsernameSettingsOpen(this.stage)
          ) {
            return false;
          }

          return Boolean(root?.querySelector(selector));
        }),
      isUsernameSettingsOpen: () => isUsernameSettingsOpen(this.stage),
      isGardenSeedPopupOpen: () =>
        Boolean(this.stage?.querySelector('.garden-page__seed-popup:not([hidden])')),
      isBrewingRecipePopupOpen: () =>
        Boolean(this.stage?.querySelector('.brewing-page__recipes-popup:not([hidden])')),
      isShopSellPopupOpen: () =>
        Boolean(this.stage?.querySelector('.shop-page__sell-popup:not([hidden])')),
      isShopDirectSellPopupOpen: () =>
        Boolean(this.stage?.querySelector('.shop-page__direct-sell-popup:not([hidden])')),
      isShopDirectSellItemSelected: (itemKey) =>
        Boolean(
          this.stage?.querySelector(
            `.shop-page__direct-sell-item-button[data-direct-sell-item-key="${itemKey}"][aria-pressed="true"]`,
          ),
        ),
      getUsername: () =>
        this.stage
          ?.querySelector('[data-tutorial-id="top:username"]')
          ?.textContent?.trim() || 'wizard',
      isTasksExpanded: () => {
        const toggle = this.stage?.querySelector('.workshop-page__tasks-toggle');

        if (toggle) {
          return toggle.hidden || toggle.getAttribute('aria-expanded') === 'true';
        }

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

function isUsernameSettingsOpen(stage) {
  const settings = stage?.querySelector('.room-top-panel__settings:not([hidden])');
  const input = settings?.querySelector('[data-tutorial-id="top:username-input"]');

  return Boolean(input && !input.closest('[hidden]'));
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
