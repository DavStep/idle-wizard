const PLAYER_PROFILE_QUERY = 'SELECT * FROM own_player_profile';
const LEGACY_PLAYER_QUERY = 'SELECT * FROM player WHERE identity =';

export class PlayerProfileSubscriptionManager {
  constructor({ onProfile } = {}) {
    this.onProfile = onProfile;
    this.connection = null;
    this.identity = null;
    this.table = null;
    this.subscription = null;
    this.subscriptionApplied = false;
    this.handleTableInsert = (_context, row) => this.publishOwnProfile(row);
    this.handleTableUpdate = (_context, _oldRow, newRow) => this.publishOwnProfile(newRow);
    this.handleTableDelete = (_context, row) => {
      if (this.isOwnRow(row)) {
        this.publish(null);
      }
    };
  }

  connect(connection, identity) {
    this.disconnect();
    this.connection = connection;
    this.identity = identity;
    this.table = this.findProfileTable(connection);
    this.subscriptionApplied = false;

    if (!this.table || !this.identity) {
      this.publish(null);
      return;
    }

    const query = this.getPlayerQuery();
    if (!query) {
      this.publish(null);
      return;
    }

    this.table.onInsert?.(this.handleTableInsert);
    this.table.onUpdate?.(this.handleTableUpdate);
    this.table.onDelete?.(this.handleTableDelete);

    this.subscription = connection
      .subscriptionBuilder()
      .onApplied(() => {
        this.subscriptionApplied = true;
        this.publishFromTable();
      })
      .onError(() => this.publish(null))
      .subscribe(query);
  }

  disconnect() {
    if (this.table) {
      this.table.removeOnInsert?.(this.handleTableInsert);
      this.table.removeOnUpdate?.(this.handleTableUpdate);
      this.table.removeOnDelete?.(this.handleTableDelete);
    }

    if (this.subscription && !this.subscription.isEnded?.()) {
      this.subscription.unsubscribe();
    }

    this.connection = null;
    this.identity = null;
    this.table = null;
    this.subscription = null;
    this.subscriptionApplied = false;
  }

  publishFromTable() {
    if (!this.table || !this.identity) {
      this.publish(null);
      return;
    }

    const row = Array.from(this.table.iter()).find((playerRow) => this.isOwnRow(playerRow));

    if (row || this.subscriptionApplied) {
      this.publish(row ? this.mapProfile(row) : null);
    }
  }

  publishOwnProfile(row) {
    if (!this.isOwnRow(row)) {
      return;
    }

    this.publish(this.mapProfile(row));
  }

  mapProfile(row) {
    return {
      username: row.username,
      theme: row.theme ?? 'white',
      font: row.font ?? 'lexend',
      colorMode: row.colorMode ?? row.color_mode ?? 'monochrome',
      usernamePromptSeen: Boolean(
        row.usernamePromptSeen ?? row.username_prompt_seen,
      ),
    };
  }

  isOwnRow(row) {
    if (!row || !this.identity) {
      return false;
    }

    if (
      this.table === this.connection?.db?.ownPlayerProfile ||
      this.table === this.connection?.db?.own_player_profile
    ) {
      return true;
    }

    return this.toIdentityKey(row.identity) === this.toIdentityKey(this.identity);
  }

  publish(profile) {
    this.onProfile?.(profile);
  }

  toIdentityKey(identity) {
    if (!identity) {
      return '';
    }

    if (typeof identity === 'string') {
      return identity;
    }

    if (typeof identity.toHexString === 'function') {
      return identity.toHexString();
    }

    return String(identity);
  }

  getPlayerQuery() {
    if (
      this.connection?.db?.ownPlayerProfile ||
      this.connection?.db?.own_player_profile
    ) {
      return PLAYER_PROFILE_QUERY;
    }

    const identitySql = this.toIdentitySqlLiteral(this.identity);
    return identitySql ? `${LEGACY_PLAYER_QUERY} ${identitySql}` : '';
  }

  toIdentitySqlLiteral(identity) {
    const identityKey = this.toIdentityKey(identity).replace(/^0x/i, '');
    return /^[0-9a-f]{64}$/i.test(identityKey) ? `0x${identityKey}` : '';
  }

  findProfileTable(connection) {
    return (
      connection?.db?.ownPlayerProfile ??
      connection?.db?.own_player_profile ??
      connection?.db?.player ??
      null
    );
  }
}
