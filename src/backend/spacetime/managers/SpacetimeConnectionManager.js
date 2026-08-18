export class SpacetimeConnectionManager {
  constructor({ uri, databaseName, authSessionManager, connectTimeoutMs = 15_000 }) {
    this.uri = uri;
    this.databaseName = databaseName;
    this.authSessionManager = authSessionManager;
    this.connectTimeoutMs = connectTimeoutMs;
    this.connection = null;
    this.connectTimeoutId = null;
    this.connectAttemptId = 0;
  }

  async connect(DbConnection, { onConnect, onDisconnect, onConnectError } = {}) {
    if (!DbConnection?.builder) {
      throw new Error('SpacetimeConnectionManager requires generated DbConnection bindings.');
    }

    this.disconnect();
    const attemptId = this.connectAttemptId + 1;
    this.connectAttemptId = attemptId;
    const auth = await this.getConnectionAuth();
    let retriedWithoutToken = false;

    const buildConnection = ({ token, canRetryWithoutToken, fallbackTokens = [] }) => {
      this.clearConnectTimeout();
      let activeConnection = null;

      const handleConnectFailure = (error) => {
        if (attemptId !== this.connectAttemptId) {
          return;
        }

        this.clearConnectTimeout();
        activeConnection?.disconnect?.();
        this.connection = null;

        const authenticationFailure = this.isAuthenticationFailure(error);
        const [fallbackToken, ...remainingFallbackTokens] = fallbackTokens;
        if (authenticationFailure && fallbackToken) {
          this.connection = buildConnection({
            token: fallbackToken,
            canRetryWithoutToken,
            fallbackTokens: remainingFallbackTokens,
          });
          return;
        }

        if (
          authenticationFailure &&
          token &&
          canRetryWithoutToken &&
          !retriedWithoutToken
        ) {
          retriedWithoutToken = true;
          this.connection = buildConnection({
            token: undefined,
            canRetryWithoutToken: false,
            fallbackTokens: [],
          });
          return;
        }

        if (retriedWithoutToken) {
          void this.authSessionManager.clearSession?.();
        }

        onConnectError?.(error);
      };

      let builder = DbConnection.builder()
        .withUri(this.uri)
        .withDatabaseName(this.databaseName)
        .onConnect((connection, identity, token) => {
          if (attemptId !== this.connectAttemptId) {
            return;
          }

          this.clearConnectTimeout();
          const finishConnect = () => {
            if (attemptId !== this.connectAttemptId) {
              connection?.disconnect?.();
              return;
            }

            this.connection = connection;
            onConnect?.(connection, identity, token);
          };

          let acceptResult;
          try {
            acceptResult = this.authSessionManager.acceptConnection({ identity, token });
          } catch (error) {
            handleConnectFailure(error);
            return;
          }

          if (!acceptResult || typeof acceptResult.then !== 'function') {
            finishConnect();
            return;
          }

          void acceptResult.then(finishConnect).catch((error) => {
            handleConnectFailure(error);
          });
        })
        .onConnectError((_context, error) => {
          handleConnectFailure(error);
        })
        .onDisconnect((_context, error) => {
          if (attemptId !== this.connectAttemptId) {
            return;
          }

          this.clearConnectTimeout();
          this.connection = null;
          onDisconnect?.(error);
        });

      if (token) {
        builder = builder.withToken(token);
      }

      activeConnection = builder.build();
      this.armConnectTimeout(() => {
        handleConnectFailure(new Error('connection timed out'));
      });
      return activeConnection;
    };

    this.connection = buildConnection({
      ...auth,
      fallbackTokens: this.normalizeFallbackTokens(auth.fallbackTokens, auth.token),
    });
    return this.connection;
  }

  isAuthenticationFailure(error) {
    const status = Number(error?.status ?? error?.statusCode);
    if (status === 401 || status === 403) {
      return true;
    }

    const code = String(error?.code ?? '').toLowerCase();
    if (
      code === 'unauthenticated' ||
      code === 'unauthorized' ||
      code === 'invalid_token'
    ) {
      return true;
    }

    const message = String(error?.message ?? error ?? '').toLowerCase();
    return (
      /\bfailed to verify token\b/u.test(message) ||
      /\b(?:unauthenticated|unauthorized)\b/u.test(message) ||
      /\bauthentication\s+(?:failed|rejected)\b/u.test(message) ||
      /\b(?:bad|expired|invalid|rejected)\b[^.\n]{0,40}\b(?:token|credential|jwt)\b/u.test(
        message,
      ) ||
      /\b(?:token|credential|jwt)\b[^.\n]{0,40}\b(?:bad|expired|invalid|rejected)\b/u.test(
        message,
      )
    );
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
    this.connectAttemptId += 1;
    this.clearConnectTimeout();
    this.connection?.disconnect();
    this.connection = null;
  }

  normalizeFallbackTokens(fallbackTokens = [], currentToken) {
    return Array.from(
      new Set(
        fallbackTokens
          .map((token) => String(token ?? '').trim())
          .filter((token) => token && token !== currentToken),
      ),
    );
  }

  armConnectTimeout(callback) {
    if (!Number.isFinite(this.connectTimeoutMs) || this.connectTimeoutMs <= 0) {
      return;
    }

    this.connectTimeoutId = globalThis.setTimeout(callback, this.connectTimeoutMs);
  }

  clearConnectTimeout() {
    if (!this.connectTimeoutId) {
      return;
    }

    globalThis.clearTimeout(this.connectTimeoutId);
    this.connectTimeoutId = null;
  }

  getConfigSnapshot() {
    return {
      uri: this.uri,
      databaseName: this.databaseName,
      connected: Boolean(this.connection),
    };
  }
}
