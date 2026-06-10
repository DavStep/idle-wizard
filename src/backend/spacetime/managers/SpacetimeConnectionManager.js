export class SpacetimeConnectionManager {
  constructor({ uri, databaseName, authSessionManager }) {
    this.uri = uri;
    this.databaseName = databaseName;
    this.authSessionManager = authSessionManager;
    this.connection = null;
  }

  async connect(DbConnection, { onConnect, onDisconnect, onConnectError } = {}) {
    if (!DbConnection?.builder) {
      throw new Error('SpacetimeConnectionManager requires generated DbConnection bindings.');
    }

    let builder = DbConnection.builder()
      .withUri(this.uri)
      .withDatabaseName(this.databaseName)
      .onConnect((connection, identity, token) => {
        this.connection = connection;
        this.authSessionManager.acceptConnection({ identity, token });
        onConnect?.(connection, identity, token);
      })
      .onConnectError((_context, error) => {
        this.connection = null;
        onConnectError?.(error);
      })
      .onDisconnect((_context, error) => {
        this.connection = null;
        onDisconnect?.(error);
      });

    const token = await this.authSessionManager.getConnectionToken();
    if (token) {
      builder = builder.withToken(token);
    }

    this.connection = builder.build();
    return this.connection;
  }

  disconnect() {
    this.connection?.disconnect();
    this.connection = null;
  }

  getConfigSnapshot() {
    return {
      uri: this.uri,
      databaseName: this.databaseName,
      connected: Boolean(this.connection),
    };
  }
}
