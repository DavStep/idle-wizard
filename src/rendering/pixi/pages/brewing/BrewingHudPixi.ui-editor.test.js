import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  hud: {
    bind: vi.fn(),
    destroy: vi.fn(),
    layout: vi.fn(),
    root: {},
    updateActiveTimer: vi.fn(),
  },
  layoutCallsAtSurfaceMount: 0,
  createSurface: vi.fn(async ({ createControl }) => {
    const control = await createControl({ assets: {}, input: {} });
    harness.layoutCallsAtSurfaceMount = harness.hud.layout.mock.calls.length;
    return { control };
  }),
}));

vi.mock(
  '../../../../uiEditor/widgets/createUiEditorPixiSurface.js',
  () => ({ createUiEditorPixiSurface: harness.createSurface }),
);

vi.mock('./BrewingHudPixi.js', () => ({
  BrewingHudPixi: vi.fn(function BrewingHudPixi() {
    return harness.hud;
  }),
}));

import integration from './BrewingHudPixi.ui-editor.js';

describe('Brewing HUD UI editor integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.layoutCallsAtSurfaceMount = 0;
  });

  it('lays out the production HUD before mounting its Pixi surface', async () => {
    const scenario = integration.scenarios.find(({ id }) => id === 'ready');
    const context = {
      clock: {
        now: () => 0,
        play: vi.fn(),
        reset: vi.fn(),
        subscribe: vi.fn(() => () => {}),
      },
      emit: vi.fn(),
      invalidate: vi.fn(),
      registerCleanup: vi.fn(),
    };

    await scenario.mount(context, scenario.fixture);

    expect(harness.layoutCallsAtSurfaceMount).toBe(1);
    expect(harness.hud.layout).toHaveBeenCalledWith(390);
  });
});
