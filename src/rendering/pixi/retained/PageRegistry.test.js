import { describe, expect, it, vi } from 'vitest';

import { PageRegistry } from './PageRegistry.js';

describe('PageRegistry', () => {
  it('retains eager page instances across page switches', () => {
    const workshop = createView();
    const garden = createView();
    const registry = new PageRegistry({
      pages: [
        ['workshop', workshop],
        ['garden', garden],
      ],
    });

    expect(registry.getPageIds()).toEqual(['workshop', 'garden']);
    expect(registry.activate('workshop')).toBe(workshop);
    expect(registry.activate('workshop')).toBe(workshop);
    registry.activate('garden');
    registry.activate('workshop');

    expect(workshop.activate).toHaveBeenCalledTimes(2);
    expect(workshop.deactivate).toHaveBeenCalledTimes(1);
    expect(garden.activate).toHaveBeenCalledTimes(1);
    expect(garden.deactivate).toHaveBeenCalledTimes(1);
    expect(workshop.destroy).not.toHaveBeenCalled();
    expect(garden.destroy).not.toHaveBeenCalled();
    expect(registry.getActivePageId()).toBe('workshop');
  });

  it('binds individual pages and applies shared theme/layout to every page', () => {
    const workshop = createView();
    const garden = createView();
    const registry = new PageRegistry();
    registry.register('workshop', workshop);
    registry.register('garden', garden);
    const theme = { id: 'witchcraft' };
    const viewport = { width: 1080, height: 2170 };

    registry.bind('garden', { plots: 4 });
    registry.applyTheme(theme);
    registry.layout(viewport);

    expect(garden.bind).toHaveBeenCalledWith({ plots: 4 });

    for (const page of [workshop, garden]) {
      expect(page.applyTheme).toHaveBeenCalledWith(theme);
      expect(page.layout).toHaveBeenCalledWith(viewport);
    }
  });

  it('rejects duplicate and unknown pages and destroys instances only at shutdown', () => {
    const page = createView();
    const registry = new PageRegistry();
    registry.register('workshop', page);

    expect(() => registry.register('workshop', createView())).toThrow(/already registered/);
    expect(() => registry.activate('missing')).toThrow('Unknown page: missing');

    registry.activate('workshop');
    expect(registry.destroy()).toBe(true);
    expect(registry.destroy()).toBe(false);
    expect(page.deactivate).toHaveBeenCalledTimes(1);
    expect(page.destroy).toHaveBeenCalledTimes(1);
    expect(() => registry.activate('workshop')).toThrow(/registry is destroyed/);
  });
});

function createView() {
  return {
    bind: vi.fn(),
    applyTheme: vi.fn(),
    layout: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    destroy: vi.fn(),
  };
}
