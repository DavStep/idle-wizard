export class PageTargetNavigationManager {
  static explain =
    'Moves the player to a specific control inside a room so prerequisite links can lead to the exact next action.';

  constructor({ showPage, getPage } = {}) {
    this.showPage = showPage;
    this.getPage = getPage;
  }

  navigate(target = {}) {
    const pageId = String(target.pageId ?? '').trim();
    const targetId = String(target.targetId ?? '').trim();

    if (!pageId || !targetId) {
      return { ok: false, reason: 'invalid_navigation_target' };
    }

    if (this.showPage?.(pageId) !== true) {
      return { ok: false, reason: 'navigation_page_unavailable', pageId };
    }

    const page = this.getPage?.(pageId);
    if (typeof page?.navigateToTarget !== 'function') {
      return { ok: false, reason: 'navigation_target_unsupported', pageId, targetId };
    }

    const result = page.navigateToTarget({
      ...target,
      pageId,
      targetId,
    });

    if (result === true) {
      return { ok: true, pageId, targetId };
    }

    if (result && typeof result === 'object') {
      return result;
    }

    return {
      ok: false,
      reason: 'navigation_target_unavailable',
      pageId,
      targetId,
    };
  }
}
