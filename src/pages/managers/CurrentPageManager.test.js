// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { CurrentPageManager } from './CurrentPageManager.js';

describe('CurrentPageManager retained pages', () => {
  it('constructs each page once and reattaches the same DOM when revisiting it', () => {
    const stage = document.createElement('main');
    const workshop = createPage('workshop');
    const research = createPage('research');
    const pages = new Map([
      ['workshop', workshop],
      ['research', research],
    ]);
    const manager = new CurrentPageManager({
      pageRegistryManager: {
        get: (pageId) => pages.get(pageId),
      },
      defaultPageId: 'workshop',
    });

    manager.mount(stage);
    const retainedWorkshopRoot = workshop.root;

    manager.show('research');

    expect(workshop.mount).toHaveBeenCalledTimes(1);
    expect(workshop.unmount).not.toHaveBeenCalled();
    expect(workshop.deactivate).toHaveBeenCalledTimes(1);
    expect(stage.contains(retainedWorkshopRoot)).toBe(false);
    expect(retainedWorkshopRoot.dataset.pageCacheState).toBe('inactive');
    expect(research.mount).toHaveBeenCalledTimes(1);
    expect(stage.querySelector('[data-page-id="research"]')).toBe(
      research.root,
    );

    manager.show('workshop');

    expect(workshop.mount).toHaveBeenCalledTimes(1);
    expect(workshop.root).toBe(retainedWorkshopRoot);
    expect(stage.contains(retainedWorkshopRoot)).toBe(true);
    expect(retainedWorkshopRoot.dataset.pageCacheState).toBe('active');
    expect(retainedWorkshopRoot.dataset.pageCacheActivation).toBe('reused');
    expect(workshop.activate).toHaveBeenCalledTimes(2);
    expect(research.unmount).not.toHaveBeenCalled();
    expect(research.deactivate).toHaveBeenCalledTimes(1);
    expect(stage.contains(research.root)).toBe(false);

    manager.unmount();

    expect(workshop.unmount).toHaveBeenCalledTimes(1);
    expect(research.unmount).toHaveBeenCalledTimes(1);
  });

  it('suspends and resumes each cached page activity scope', () => {
    const stage = document.createElement('main');
    const workshop = createPage('workshop');
    const research = createPage('research');
    const pages = new Map([
      ['workshop', workshop],
      ['research', research],
    ]);
    const onPageActivate = vi.fn();
    const onPageDeactivate = vi.fn();
    const manager = new CurrentPageManager({
      pageRegistryManager: {
        get: (pageId) => pages.get(pageId),
      },
      defaultPageId: 'workshop',
      onPageActivate,
      onPageDeactivate,
    });

    manager.mount(stage);
    manager.show('research');
    manager.show('workshop');

    expect(onPageActivate.mock.calls).toEqual([
      ['workshop'],
      ['research'],
      ['workshop'],
    ]);
    expect(onPageDeactivate.mock.calls).toEqual([
      ['workshop'],
      ['research'],
    ]);
  });
});

function createPage(pageId) {
  const page = {
    root: null,
    popup: null,
    activate: vi.fn(),
    deactivate: vi.fn(),
    mount: vi.fn((stage) => {
      page.root = document.createElement('article');
      page.root.dataset.pageId = pageId;
      page.popup = document.createElement('aside');
      page.popup.dataset.pagePopup = pageId;
      stage.append(page.root, page.popup);
    }),
    unmount: vi.fn(() => {
      page.root?.remove();
      page.popup?.remove();
    }),
  };

  return page;
}
