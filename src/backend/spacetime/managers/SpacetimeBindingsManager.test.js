import { describe, expect, it } from 'vitest';

import { SpacetimeBindingsManager } from './SpacetimeBindingsManager.js';

describe('SpacetimeBindingsManager', () => {
  it('loads generated DbConnection binding when available', async () => {
    class DbConnectionFake {}
    const manager = new SpacetimeBindingsManager({
      importBindings: () => Promise.resolve({ DbConnection: DbConnectionFake }),
    });

    await expect(manager.loadDbConnection()).resolves.toBe(DbConnectionFake);
    expect(manager.getSnapshot()).toEqual({
      available: true,
      error: null,
    });
  });

  it('returns null when generated bindings are missing', async () => {
    const manager = new SpacetimeBindingsManager({
      importBindings: () => Promise.reject(new Error('missing module')),
    });

    await expect(manager.loadDbConnection()).resolves.toBeNull();
    expect(manager.getSnapshot()).toEqual({
      available: false,
      error: 'missing module',
    });
  });
});
