import { AuthFacade } from './auth/AuthFacade.js';
import { LeaderboardBackendFacade } from './leaderboard/LeaderboardBackendFacade.js';
import { PlayerBackendSyncFacade } from './playerSync/PlayerBackendSyncFacade.js';
import { SpacetimeDbFacade } from './spacetime/SpacetimeDbFacade.js';

export class BackendFacade {
  static explain =
    'Keeps online identity and server access in one place so game rules never talk to the network directly.';

  constructor({
    uri = import.meta.env.VITE_SPACETIME_URI ?? 'ws://localhost:3000',
    databaseName = import.meta.env.VITE_SPACETIME_DATABASE ?? 'idle-wizard',
  } = {}) {
    this.authFacade = new AuthFacade();
    this.leaderboardFacade = new LeaderboardBackendFacade();
    this.playerSyncFacade = new PlayerBackendSyncFacade();
    this.spacetimeDbFacade = new SpacetimeDbFacade({
      uri,
      databaseName,
      authSessionManager: this.authFacade.getSessionManager(),
    });
  }

  prepare() {
    return {
      auth: this.authFacade.prepare(),
      spacetime: this.spacetimeDbFacade.prepare(),
    };
  }

  async start({ playerFacade } = {}) {
    this.playerSyncFacade.setPlayerFacade(playerFacade);

    return this.spacetimeDbFacade.connectGeneratedBindings({
      onConnect: (connection) => {
        this.leaderboardFacade.connect(connection);
        this.playerSyncFacade.connect(connection);
      },
      onDisconnect: () => {
        this.leaderboardFacade.disconnect();
        this.playerSyncFacade.disconnect();
      },
    });
  }

  stop() {
    this.leaderboardFacade.disconnect();
    this.playerSyncFacade.disconnect();
    this.spacetimeDbFacade.disconnect();
  }

  getAuthFacade() {
    return this.authFacade;
  }

  getSpacetimeDbFacade() {
    return this.spacetimeDbFacade;
  }

  getLeaderboardFacade() {
    return this.leaderboardFacade;
  }
}
