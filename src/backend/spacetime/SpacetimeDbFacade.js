import { SpacetimeConnectionManager } from './managers/SpacetimeConnectionManager.js';
import { SpacetimeBindingsManager } from './managers/SpacetimeBindingsManager.js';

export class SpacetimeDbFacade {
  static explain =
    'Connects the game room to the shared world database, using one guarded doorway.';

  constructor({ uri, databaseName, authSessionManager }) {
    this.connectionManager = new SpacetimeConnectionManager({
      uri,
      databaseName,
      authSessionManager,
    });
    this.bindingsManager = new SpacetimeBindingsManager();
  }

  prepare() {
    return this.connectionManager.getConfigSnapshot();
  }

  connect(DbConnection) {
    return this.connectionManager.connect(DbConnection);
  }

  async connectGeneratedBindings(callbacks) {
    const DbConnection = await this.bindingsManager.loadDbConnection();
    if (!DbConnection) {
      return {
        ok: false,
        reason: 'bindings_missing',
      };
    }

    return {
      ok: true,
      connection: this.connectionManager.connect(DbConnection, callbacks),
    };
  }

  disconnect() {
    this.connectionManager.disconnect();
  }
}
