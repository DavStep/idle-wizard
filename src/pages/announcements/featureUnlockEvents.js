export const FEATURE_UNLOCK_FLYOUT_EVENT = 'room-feature-unlock-flyout';

export const FEATURE_UNLOCK_TARGET_SELECTORS = Object.freeze({
  alliance: '.workshop-page__trade-alliance-button',
  discoveries: '.workshop-page__discoveries-button',
  inbox: '.workshop-page__mail-button',
  leaderboard: '.workshop-page__leaderboard-button',
});

export function getFeatureUnlockTarget(root, { value, pageId } = {}) {
  if (!root) {
    return null;
  }

  if (pageId) {
    return (
      [...root.querySelectorAll('.room-bottom-panel__tab')].find(
        (button) => button.dataset.pageId === pageId,
      ) ?? null
    );
  }

  const selector = FEATURE_UNLOCK_TARGET_SELECTORS[String(value ?? '')];
  return selector ? root.querySelector(selector) : null;
}

export function getFeatureUnlockIconFrame(target) {
  return (
    target?.querySelector(
      '.room-bottom-panel__tab-icon-frame, [class*="-button-icon-frame"]',
    ) ?? null
  );
}
