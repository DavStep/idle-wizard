import { describe, expect, it, vi } from 'vitest';

import { SpacetimeConnectionManager } from './SpacetimeConnectionManager.js';

function createFakeDbConnection() {
  const builders = [];

  class FakeBuilder {
    constructor() {
      this.callbacks = {};
      this.token = undefined;
      this.uri = undefined;
      this.databaseName = undefined;
    }

    withUri(uri) {
      this.uri = uri;
      return this;
    }

    withDatabaseName(databaseName) {
      this.databaseName = databaseName;
      return this;
    }

    withToken(token) {
      this.token = token;
      return this;
    }

    onConnect(callback) {
      this.callbacks.onConnect = callback;
      return this;
    }

    onConnectError(callback) {
      this.callbacks.onConnectError = callback;
      return this;
    }

    onDisconnect(callback) {
      this.callbacks.onDisconnect = callback;
      return this;
    }

    build() {
      builders.push(this);
      return {
        id: builders.length,
      };
    }
  }

  return {
    builders,
    DbConnection: {
      builder: () => new FakeBuilder(),
    },
  };
}

describe('SpacetimeConnectionManager', () => {
  it('retries once without a stored token before surfacing connect errors', async () => {
    const { DbConnection, builders } = createFakeDbConnection();
    const authSessionManager = {
      getConnectionAuth: vi.fn(async () => ({
        token: 'stale-token',
        canRetryWithoutToken: true,
      })),
      acceptConnection: vi.fn(),
    };
    const onConnect = vi.fn();
    const onConnectError = vi.fn();
    const manager = new SpacetimeConnectionManager({
      uri: 'https://maincloud.spacetimedb.com',
      databaseName: 'idle-wizard',
      authSessionManager,
    });

    await manager.connect(DbConnection, { onConnect, onConnectError });
    builders[0].callbacks.onConnectError({}, new Error('bad token'));

    expect(builders).toHaveLength(2);
    expect(builders[0].token).toBe('stale-token');
    expect(builders[1].token).toBeUndefined();
    expect(onConnectError).not.toHaveBeenCalled();

    builders[1].callbacks.onConnect('connection-2', 'identity-2', 'token-2');

    expect(authSessionManager.acceptConnection).toHaveBeenCalledWith({
      identity: 'identity-2',
      token: 'token-2',
    });
    expect(onConnect).toHaveBeenCalledWith('connection-2', 'identity-2', 'token-2');
  });

  it('surfaces the retry error if anonymous connection also fails', async () => {
    const { DbConnection, builders } = createFakeDbConnection();
    const authSessionManager = {
      getConnectionAuth: vi.fn(async () => ({
        token: 'stale-token',
        canRetryWithoutToken: true,
      })),
      acceptConnection: vi.fn(),
    };
    const onConnectError = vi.fn();
    const manager = new SpacetimeConnectionManager({
      uri: 'https://maincloud.spacetimedb.com',
      databaseName: 'idle-wizard',
      authSessionManager,
    });

    await manager.connect(DbConnection, { onConnectError });
    builders[0].callbacks.onConnectError({}, new Error('bad token'));
    builders[1].callbacks.onConnectError({}, new Error('server down'));

    expect(onConnectError).toHaveBeenCalledTimes(1);
    expect(onConnectError.mock.calls[0][0].message).toBe('server down');
  });

  it('does not retry OIDC connection tokens anonymously', async () => {
    const { DbConnection, builders } = createFakeDbConnection();
    const authSessionManager = {
      getConnectionAuth: vi.fn(async () => ({
        token: 'oidc-token',
        canRetryWithoutToken: false,
      })),
      acceptConnection: vi.fn(),
    };
    const onConnectError = vi.fn();
    const manager = new SpacetimeConnectionManager({
      uri: 'https://maincloud.spacetimedb.com',
      databaseName: 'idle-wizard',
      authSessionManager,
    });

    await manager.connect(DbConnection, { onConnectError });
    builders[0].callbacks.onConnectError({}, new Error('oidc rejected'));

    expect(builders).toHaveLength(1);
    expect(onConnectError).toHaveBeenCalledTimes(1);
  });
});
