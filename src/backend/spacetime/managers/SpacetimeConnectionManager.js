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

    const auth = await this.getConnectionAuth();
    let retriedWithoutToken = false;

    const buildConnection = ({ token, canRetryWithoutToken }) => {
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

          if (token && canRetryWithoutToken && !retriedWithoutToken) {
            retriedWithoutToken = true;
            this.connection = buildConnection({
              token: undefined,
              canRetryWithoutToken: false,
            });
            return;
          }

          if (retriedWithoutToken) {
            this.authSessionManager.clearSession?.();
          }

          onConnectError?.(error);
        })
        .onDisconnect((_context, error) => {
          this.connection = null;
          onDisconnect?.(error);
        });

      if (token) {
        builder = builder.withToken(token);
      }

      return builder.build();
    };

    this.connection = buildConnection(auth);
    return this.connection;
  }

  async getConnectionAuth() {
    if (typeof this.authSessionManager.getConnectionAuth === 'function') {
      return this.authSessionManager.getConnectionAuth();
    }

    const token = await this.authSessionManager.getConnectionToken();
    return {
      token,
      canRetryWithoutToken: Boolean(token),
    };
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
