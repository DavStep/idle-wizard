import { describe, expect, it, vi } from 'vitest';

import { PageTargetNavigationManager } from './PageTargetNavigationManager.js';

describe('PageTargetNavigationManager', () => {
  it('opens the owning page before asking it to reveal the exact target', () => {
    const navigateToTarget = vi.fn(() => ({
      ok: true,
      pageId: 'research',
      tabId: 'advanced',
      targetId: 'advanced:plotCapacity:6',
    }));
    const showPage = vi.fn(() => true);
    const getPage = vi.fn(() => ({ navigateToTarget }));
    const manager = new PageTargetNavigationManager({ showPage, getPage });

    expect(
      manager.navigate({
        pageId: 'research',
        tabId: 'advanced',
        targetId: 'advanced:plotCapacity:6',
        indication: 'boink',
      }),
    ).toEqual({
      ok: true,
      pageId: 'research',
      tabId: 'advanced',
      targetId: 'advanced:plotCapacity:6',
    });
    expect(showPage).toHaveBeenCalledWith('research');
    expect(getPage).toHaveBeenCalledWith('research');
    expect(navigateToTarget).toHaveBeenCalledWith({
      pageId: 'research',
      tabId: 'advanced',
      targetId: 'advanced:plotCapacity:6',
      indication: 'boink',
    });
  });

  it('does not resolve a target when its page cannot be opened', () => {
    const getPage = vi.fn();
    const manager = new PageTargetNavigationManager({
      showPage: () => false,
      getPage,
    });

    expect(
      manager.navigate({ pageId: 'research', targetId: 'missing' }),
    ).toEqual({
      ok: false,
      reason: 'navigation_page_unavailable',
      pageId: 'research',
    });
    expect(getPage).not.toHaveBeenCalled();
  });
});
