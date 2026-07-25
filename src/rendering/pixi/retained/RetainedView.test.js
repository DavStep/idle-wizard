import { describe, expect, it, vi } from 'vitest';

import { RetainedUiCounters, RETAINED_UI_COUNTERS } from './RetainedUiCounters.js';
import { RetainedViewLifecycle, assertRetainedView } from './RetainedView.js';

describe('RetainedViewLifecycle', () => {
  it('validates every retained view method', () => {
    expect(() => assertRetainedView({ activate() {} }, { label: 'test view' })).toThrow(
      'test view must expose bind().',
    );
  });

  it('forwards data operations and keeps activation lifecycle idempotent', () => {
    const calls = [];
    const counters = new RetainedUiCounters();
    const view = createView({
      activate: () => calls.push('activate'),
      deactivate: () => calls.push('deactivate'),
      destroy: () => calls.push('destroy'),
    });
    const lifecycle = new RetainedViewLifecycle(view, {
      label: 'test view',
      counters,
    });
    const viewModel = { value: 2 };
    const theme = { id: 'midnight' };
    const viewport = { width: 1080, height: 2170 };

    expect(lifecycle.bind(viewModel)).toBe(view);
    lifecycle.applyTheme(theme);
    lifecycle.layout(viewport);
    expect(lifecycle.activate()).toBe(true);
    expect(lifecycle.activate()).toBe(false);
    expect(lifecycle.deactivate()).toBe(true);
    expect(lifecycle.deactivate()).toBe(false);
    expect(lifecycle.destroy()).toBe(true);
    expect(lifecycle.destroy()).toBe(false);

    expect(view.bind).toHaveBeenCalledWith(viewModel);
    expect(view.applyTheme).toHaveBeenCalledWith(theme);
    expect(view.layout).toHaveBeenCalledWith(viewport);
    expect(calls).toEqual(['activate', 'deactivate', 'destroy']);
    expect(counters.get(RETAINED_UI_COUNTERS.VIEW_ACTIVATED)).toBe(1);
    expect(counters.get(RETAINED_UI_COUNTERS.VIEW_DEACTIVATED)).toBe(1);
    expect(counters.get(RETAINED_UI_COUNTERS.VIEW_DESTROYED)).toBe(1);
    expect(() => lifecycle.bind({})).toThrow(/destroyed test view/);
  });

  it('deactivates an active view before destroying it', () => {
    const calls = [];
    const lifecycle = new RetainedViewLifecycle(
      createView({
        activate: () => calls.push('activate'),
        deactivate: () => calls.push('deactivate'),
        destroy: () => calls.push('destroy'),
      }),
    );

    lifecycle.activate();
    lifecycle.destroy();

    expect(calls).toEqual(['activate', 'deactivate', 'destroy']);
  });
});

function createView(overrides = {}) {
  return {
    bind: vi.fn(),
    applyTheme: vi.fn(),
    layout: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    destroy: vi.fn(),
    ...overrides,
  };
}
