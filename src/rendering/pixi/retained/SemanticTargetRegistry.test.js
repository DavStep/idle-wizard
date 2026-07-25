import { describe, expect, it, vi } from 'vitest';

import { SemanticTargetRegistry } from './SemanticTargetRegistry.js';

describe('SemanticTargetRegistry', () => {
  it('resolves dynamic Pixi bounds and state without DOM geometry', () => {
    const displayObject = {
      visible: true,
      renderable: true,
      eventMode: 'static',
      getBounds: vi.fn(() => ({ x: 12, y: 34, width: 56, height: 78 })),
    };
    const registry = new SemanticTargetRegistry();
    registry.register({
      semanticId: 'workshop.summon',
      tutorialId: 'workshop:summon',
      displayObject,
      state: () => ({ enabled: true, selected: false }),
    });

    const snapshot = registry.resolve('workshop.summon');

    expect(snapshot.displayObject).toBe(displayObject);
    expect(snapshot.bounds).toEqual({ x: 12, y: 34, width: 56, height: 78 });
    expect(snapshot.state).toMatchObject({
      active: true,
      visible: true,
      enabled: true,
      interactive: true,
      selected: false,
    });
    expect(registry.isAvailable('workshop.summon')).toBe(true);
  });

  it('selects the first available target for duplicate tutorial ids', () => {
    const registry = new SemanticTargetRegistry();
    registry.register({
      semanticId: 'hidden.summon',
      tutorialId: 'workshop:summon',
      displayObject: createDisplayObject(),
      state: { visible: false },
    });
    registry.register({
      semanticId: 'visible.summon',
      tutorialId: 'workshop:summon',
      displayObject: createDisplayObject(),
    });

    expect(
      registry.getTutorialTarget('workshop:summon', { availableOnly: false }).semanticId,
    ).toBe('hidden.summon');
    expect(registry.getTutorialTarget('workshop:summon').semanticId).toBe(
      'visible.summon',
    );
  });

  it('routes activation only while a target is visible, enabled, and interactive', () => {
    const activate = vi.fn(() => 'activated');
    const state = { enabled: true };
    const registry = new SemanticTargetRegistry();
    registry.register({
      semanticId: 'settings.open',
      displayObject: createDisplayObject(),
      state: () => state,
      activate,
    });

    expect(registry.activate('settings.open', { tab: 'theme' })).toBe('activated');
    expect(activate).toHaveBeenCalledWith(
      { tab: 'theme' },
      expect.objectContaining({ semanticId: 'settings.open' }),
    );

    state.enabled = false;
    expect(registry.activate('settings.open')).toBe(false);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('supports Pixi-style min/max bounds and guarded unregister', () => {
    const displayObject = createDisplayObject({
      minX: 10,
      minY: 20,
      maxX: 40,
      maxY: 80,
    });
    const registry = new SemanticTargetRegistry();
    registry.register({
      semanticId: 'garden.plot.1',
      tutorialId: 'garden:plot:1',
      displayObject,
    });

    expect(registry.getBounds('garden.plot.1')).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 60,
    });
    expect(
      registry.unregister('garden.plot.1', { displayObject: createDisplayObject() }),
    ).toBe(false);
    expect(registry.unregister('garden.plot.1', { displayObject })).toBe(true);
    expect(registry.getTutorialTargets('garden:plot:1')).toEqual([]);
  });

  it('rejects duplicate semantic ids and invalid bounds', () => {
    const registry = new SemanticTargetRegistry();
    registry.register({
      semanticId: 'target',
      displayObject: createDisplayObject(),
    });

    expect(() =>
      registry.register({
        semanticId: 'target',
        displayObject: createDisplayObject(),
      }),
    ).toThrow(/already registered/);

    registry.register({
      semanticId: 'bad-bounds',
      displayObject: createDisplayObject({ x: 0 }),
    });
    expect(() => registry.resolve('bad-bounds')).toThrow(/invalid bounds/);
  });
});

function createDisplayObject(bounds = { x: 0, y: 0, width: 20, height: 20 }) {
  return {
    visible: true,
    renderable: true,
    eventMode: 'static',
    getBounds: vi.fn(() => bounds),
  };
}
