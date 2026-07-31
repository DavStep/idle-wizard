import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from './DialogRegistry.js';

describe('DialogRegistry', () => {
  it('constructs a dialog lazily once and retains it after close', () => {
    const dialog = createView();
    const factory = vi.fn(() => dialog);
    const registry = new DialogRegistry({
      dialogs: [['settings', factory]],
    });

    expect(registry.get('settings')).toBeNull();
    expect(factory).not.toHaveBeenCalled();

    expect(registry.open('settings', { tab: 'account' })).toBe(dialog);
    expect(registry.close('settings')).toBe(true);
    expect(registry.open('settings', { tab: 'theme' })).toBe(dialog);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(dialog.bind).toHaveBeenNthCalledWith(1, { tab: 'account' });
    expect(dialog.bind).toHaveBeenNthCalledWith(2, { tab: 'theme' });
    expect(dialog.activate).toHaveBeenCalledTimes(2);
    expect(dialog.deactivate).toHaveBeenCalledTimes(1);
    expect(dialog.destroy).not.toHaveBeenCalled();
    expect(registry.getStats()).toMatchObject({ constructed: 1, open: 1 });
  });

  it('applies cached theme and layout when a lazy dialog is first created', () => {
    const dialog = createView();
    const registry = new DialogRegistry({
      dialogs: [['settings', () => dialog]],
    });
    const theme = { id: 'midnight' };
    const viewport = { width: 1080, height: 2170 };

    registry.applyTheme(theme);
    registry.layout(viewport);
    registry.open('settings', {});

    expect(dialog.applyTheme).toHaveBeenCalledWith(theme);
    expect(dialog.layout).toHaveBeenCalledWith(viewport);
    expect(dialog.applyTheme.mock.invocationCallOrder[0]).toBeLessThan(
      dialog.activate.mock.invocationCallOrder[0],
    );
  });

  it('tracks stack order, reorders an already-open dialog, and closes the top', () => {
    const settings = createView();
    const inventory = createView();
    const registry = new DialogRegistry({
      dialogs: [
        ['settings', () => settings],
        ['inventory', () => inventory],
      ],
    });

    registry.open('settings', {});
    registry.open('inventory', {});
    registry.open('settings', { tab: 'theme' });

    expect(registry.getOpenDialogIds()).toEqual(['inventory', 'settings']);
    expect(settings.activate).toHaveBeenCalledTimes(1);
    expect(registry.closeTop()).toBe(true);
    expect(registry.getTopDialogId()).toBe('inventory');
    expect(registry.closeAll()).toBe(1);
    expect(registry.getOpenDialogIds()).toEqual([]);
  });

  it('plays the open cue only when a dialog actually activates', () => {
    const onOpen = vi.fn();
    const registry = new DialogRegistry({
      dialogs: [['settings', () => createView()]],
      onOpen,
    });

    registry.open('settings', {});
    registry.open('settings', { tab: 'theme' });
    registry.close('settings');
    registry.open('settings', {});

    expect(onOpen).toHaveBeenNthCalledWith(1, 'settings');
    expect(onOpen).toHaveBeenNthCalledWith(2, 'settings');
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('destroys only constructed dialogs at shutdown', () => {
    const settings = createView();
    const unopened = createView();
    const registry = new DialogRegistry({
      dialogs: [
        ['settings', () => settings],
        ['unopened', () => unopened],
      ],
    });
    registry.open('settings', {});

    registry.destroy();

    expect(settings.deactivate).toHaveBeenCalledTimes(1);
    expect(settings.destroy).toHaveBeenCalledTimes(1);
    expect(unopened.destroy).not.toHaveBeenCalled();
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
