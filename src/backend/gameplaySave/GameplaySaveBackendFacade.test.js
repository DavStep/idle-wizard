import { describe, expect, it, vi } from 'vitest';

import { GameplaySaveBackendFacade } from './GameplaySaveBackendFacade.js';

describe('GameplaySaveBackendFacade', () => {
  it('scopes the pending-save journal to the connected player identity', () => {
    const facade = new GameplaySaveBackendFacade();
    const connection = {};
    const identity = { toHexString: () => 'player-1' };

    facade.sendManager.setReadyToSend = vi.fn();
    facade.sendManager.connect = vi.fn();
    facade.subscriptionManager.connect = vi.fn(() => true);

    expect(facade.connect(connection, identity)).toBe(true);
    expect(facade.sendManager.connect).toHaveBeenCalledWith(connection, identity);
  });

  it('marks hydration before ready work and forwards every server snapshot to the sender', () => {
    const facade = new GameplaySaveBackendFacade();
    const save = {
      version: 3,
      clientSaveSessionId: 'server-session',
      clientSaveSequence: 4,
    };
    const events = [];

    facade.sendManager.setHydrated = vi.fn((hydrated) => {
      events.push(`hydrated:${hydrated}`);
    });
    facade.sendManager.observeServerSave = vi.fn((observedSave) => {
      events.push(observedSave === save ? 'snapshot' : 'other-snapshot');
    });
    facade.sendManager.connect = vi.fn();
    facade.subscriptionManager.connect = vi.fn((_connection, _identity, { onReady }) => {
      facade.subscriptionManager.onSnapshot({
        connected: true,
        save,
        updatedAtMs: 12,
      });
      onReady({ ok: true, save, updatedAtMs: 12 });
      return true;
    });

    expect(
      facade.connect({}, 'player-1', {
        onReady: () => events.push('ready'),
      }),
    ).toBe(true);
    expect(events).toEqual(['hydrated:false', 'snapshot', 'hydrated:true', 'ready']);
    expect(facade.sendManager.observeServerSave).toHaveBeenCalledWith(save);
  });
});
