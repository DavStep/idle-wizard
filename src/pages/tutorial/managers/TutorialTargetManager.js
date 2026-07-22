export const GLOBAL_BLOCKING_DIALOG_SELECTORS = [
  '[data-tutorial-blocker="true"]:not([hidden])',
  '.app-account-link-choice:not([hidden])',
  '.app-fresh-start-choice:not([hidden])',
  '.mobile-auth-bridge:not([hidden])',
  '.room-announcement-layer:not([hidden])',
  '.room-top-panel__level-popup:not([hidden])',
];
const POPUP_ROOT_BASE_SELECTORS = [
  '.room-top-panel__settings',
  '[class$="__popup"]',
  '[class*="__popup "]',
  '[class$="-popup"]',
  '[class*="-popup "]',
];
export const POPUP_ROOT_SELECTORS = POPUP_ROOT_BASE_SELECTORS.map(
  (selector) => `${selector}:not([hidden])`,
).join(', ');
const POPUP_ROOT_MUTATION_SELECTORS = POPUP_ROOT_BASE_SELECTORS.join(', ');
const POPUP_TARGET_PREFIXES = new Map([
  ['top:username-input', ['room-top-panel__settings']],
  ['garden:seed:', ['garden-page__seed-popup']],
  ['brewing:recipe:', ['brewing-page__recipes-popup']],
  ['shop:sell:', ['shop-page__sell-popup']],
]);
const NON_SETTINGS_BLOCKING_DIALOG_SELECTORS = GLOBAL_BLOCKING_DIALOG_SELECTORS;

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

    const targets = [...this.stage.querySelectorAll('[data-tutorial-id]')].filter(
      (element) => element.dataset.tutorialId === targetId,
    );

    return (
      targets.find((element) => isVisibleTargetElement(element, this.stage)) ??
      targets[0] ??
      null
    );
  }

  getDomState() {
    const root = this.stage?.ownerDocument ?? this.stage;

    return {
      isBlockingDialogOpen: () =>
        GLOBAL_BLOCKING_DIALOG_SELECTORS.some((selector) =>
          Boolean(root?.querySelector(selector)),
        ) || this.getVisiblePopupRoots(root).length > 0,
      isNonSettingsBlockingDialogOpen: () =>
        NON_SETTINGS_BLOCKING_DIALOG_SELECTORS.some((selector) =>
          Boolean(root?.querySelector(selector)),
        ),
      isBlockingDialogOpenForStep: (step, target) =>
        this.isBlockingDialogOpenForStep({ root, step, target }),
      isUsernameSettingsOpen: () => isUsernameSettingsOpen(this.stage),
      isSettingsThemeTabVisible: () => isSettingsThemeTabVisible(this.stage),
      isThemeSettingsTabOpen: () => isThemeSettingsTabOpen(this.stage),
      isGardenSeedPopupOpen: () =>
        Boolean(this.stage?.querySelector('.garden-page__seed-popup:not([hidden])')),
      isBrewingRecipePopupOpen: () =>
        Boolean(this.stage?.querySelector('.brewing-page__recipes-popup:not([hidden])')),
      isBrewingHerbInventoryOpen: () =>
        Boolean(this.stage?.querySelector('.brewing-page__herbs:not([hidden])')),
      isBrewingRecipeSelected: (recipeKey) =>
        Boolean(getSelectedBrewingRecipeRow(this.stage, recipeKey)),
      isShopSellPopupOpen: () =>
        Boolean(this.stage?.querySelector('.shop-page__sell-popup:not([hidden])')),
      hasShopSellSelection: () =>
        Boolean(
          this.stage?.querySelector(
            '.shop-page__sell-current[data-has-selection="true"]',
          ),
        ),
      isShopSellPercentageSelected: (percentage) => {
        const range = this.stage?.querySelector('.shop-page__sell-allocation-range');
        return Number(range?.value) === Number(percentage);
      },
      isShopSellTabSelected: (kind) =>
        Boolean(
          this.stage?.querySelector(
            `[data-tutorial-id="shop:sell:tab:${kind}"][aria-selected="true"]`,
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
      isTasksPinned: () => {
        const pin = this.stage?.querySelector('.workshop-page__tasks-pin');
        const sequentialRequest = this.stage?.querySelector(
          '.workshop-page__tasks[data-quest-mode="sequential"]',
        );

        if (sequentialRequest && (!pin || pin.hidden)) {
          return true;
        }

        return (
          pin?.getAttribute('aria-pressed') === 'true' ||
          Boolean(this.stage?.querySelector('.workshop-page__tasks.is-pinned'))
        );
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

  isBlockingDialogOpenForStep({
    root = this.stage?.ownerDocument ?? this.stage,
    step,
    target,
  } = {}) {
    if (
      GLOBAL_BLOCKING_DIALOG_SELECTORS.some((selector) => Boolean(root?.querySelector(selector)))
    ) {
      return true;
    }

    const popupRoots = this.getVisiblePopupRoots(root);

    if (!popupRoots.length) {
      return false;
    }

    const allowedPopupClasses = new Set([
      ...normalizePopupClasses(step?.allowedPopupClasses),
      ...getPopupClassesForTargetId(step?.targetId),
    ]);

    return popupRoots.some((popupRoot) => {
      if (target && popupRoot.contains(target)) {
        return false;
      }

      const popupClasses = getPopupClasses(popupRoot);
      return !popupClasses.some((popupClass) => allowedPopupClasses.has(popupClass));
    });
  }

  getVisiblePopupRoots(root = this.stage?.ownerDocument ?? this.stage) {
    if (!root?.querySelectorAll) {
      return [];
    }

    const seen = new Set();

    return [...root.querySelectorAll(POPUP_ROOT_SELECTORS)].filter((element) => {
      if (!element || seen.has(element) || element.closest('.tutorial-layer')) {
        return false;
      }

      seen.add(element);
      return true;
    });
  }
}

function isUsernameSettingsOpen(stage) {
  const settings = stage?.querySelector('.room-top-panel__settings:not([hidden])');
  const input = settings?.querySelector('[data-tutorial-id="top:username-input"]');

  return Boolean(input && !input.closest('[hidden]'));
}

function isSettingsThemeTabVisible(stage) {
  const settings = stage?.querySelector('.room-top-panel__settings:not([hidden])');
  const themeTab = settings?.querySelector('[data-tutorial-id="top:settings:theme-tab"]');

  return Boolean(themeTab && !themeTab.closest('[hidden]'));
}

function isThemeSettingsTabOpen(stage) {
  const settings = stage?.querySelector('.room-top-panel__settings:not([hidden])');
  const themeTab = settings?.querySelector('[data-tutorial-id="top:settings:theme-tab"]');

  return Boolean(
    themeTab &&
      !themeTab.closest('[hidden]') &&
      themeTab.getAttribute('aria-selected') === 'true',
  );
}

function getSelectedBrewingRecipeRow(stage, recipeKey) {
  if (!stage || !recipeKey) {
    return null;
  }

  return (
    [...stage.querySelectorAll('.brewing-page__recipe-row[aria-pressed="true"]')].find(
      (row) => row.dataset?.tutorialId === `brewing:recipe:${recipeKey}`,
    ) ?? null
  );
}

function isBlockingDialogNode(node) {
  if (!node || typeof node.matches !== 'function') {
    return false;
  }

  return (
    GLOBAL_BLOCKING_DIALOG_SELECTORS.some((selector) => {
      const baseSelector = selector.replace(':not([hidden])', '');
      return node.matches(baseSelector) || Boolean(node.querySelector(baseSelector));
    }) ||
    node.matches(POPUP_ROOT_MUTATION_SELECTORS) ||
    Boolean(node.querySelector(POPUP_ROOT_MUTATION_SELECTORS))
  );
}

function normalizePopupClasses(popupClasses) {
  if (!Array.isArray(popupClasses)) {
    return [];
  }

  return popupClasses.filter(
    (popupClass) => typeof popupClass === 'string' && popupClass.length > 0,
  );
}

function getPopupClassesForTargetId(targetId) {
  if (typeof targetId !== 'string' || targetId.length === 0) {
    return [];
  }

  for (const [prefix, popupClasses] of POPUP_TARGET_PREFIXES) {
    if (targetId === prefix || targetId.startsWith(prefix)) {
      return popupClasses;
    }
  }

  return [];
}

function getPopupClasses(node) {
  return [...(node?.classList ?? [])].filter((className) => {
    if (className === 'room-top-panel__settings') {
      return true;
    }

    return className.endsWith('__popup') || className.endsWith('-popup');
  });
}

function isVisibleTargetElement(element, root) {
  if (!element || element.closest?.('[hidden]')) {
    return false;
  }

  const rect = element.getBoundingClientRect?.();

  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const view = element.ownerDocument?.defaultView ?? globalThis.window;

  for (let node = element; node && typeof node.matches === 'function'; node = node.parentElement) {
    const style = view?.getComputedStyle?.(node);

    if (
      style?.display === 'none' ||
      style?.visibility === 'hidden'
    ) {
      return false;
    }

    if (node === root) {
      break;
    }
  }

  return true;
}
