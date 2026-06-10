import { AuthFacade } from './auth/AuthFacade.js';
import { LeaderboardBackendFacade } from './leaderboard/LeaderboardBackendFacade.js';
import { NpcMarketBackendFacade } from './npcMarket/NpcMarketBackendFacade.js';
import { PlayerBackendSyncFacade } from './playerSync/PlayerBackendSyncFacade.js';
import { PlayerShopBackendFacade } from './playerShop/PlayerShopBackendFacade.js';
import { SpacetimeDbFacade } from './spacetime/SpacetimeDbFacade.js';
import { WorldChatBackendFacade } from './worldChat/WorldChatBackendFacade.js';

export class BackendFacade {
  static explain =
    'Keeps online identity and server access in one place so game rules never talk to the network directly.';

  constructor({
    uri = import.meta.env.VITE_SPACETIME_URI ?? 'ws://localhost:3000',
    databaseName = import.meta.env.VITE_SPACETIME_DATABASE ?? 'idle-wizard',
  } = {}) {
    this.authFacade = new AuthFacade();
    this.leaderboardFacade = new LeaderboardBackendFacade();
    this.worldChatFacade = new WorldChatBackendFacade();
    this.npcMarketFacade = new NpcMarketBackendFacade();
    this.playerSyncFacade = new PlayerBackendSyncFacade();
    this.playerShopFacade = new PlayerShopBackendFacade();
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

  async start({ gameplayFacade, playerFacade, onOnline, onOffline } = {}) {
    this.leaderboardFacade.setGameplayFacade(gameplayFacade);
    this.playerSyncFacade.setPlayerFacade(playerFacade);

    return this.spacetimeDbFacade.connectGeneratedBindings({
      onConnect: (connection, identity) => {
        this.leaderboardFacade.connect(connection);
        this.worldChatFacade.connect(connection);
        this.npcMarketFacade.connect(connection);
        this.playerSyncFacade.connect(connection, identity);
        this.playerShopFacade.connect(connection, identity);
        onOnline?.({ connection, identity });
      },
      onConnectError: (error) => {
        this.leaderboardFacade.disconnect();
        this.worldChatFacade.disconnect();
        this.npcMarketFacade.disconnect();
        this.playerSyncFacade.disconnect();
        this.playerShopFacade.disconnect();
        onOffline?.({ reason: 'connect_error', error });
      },
      onDisconnect: () => {
        this.leaderboardFacade.disconnect();
        this.worldChatFacade.disconnect();
        this.npcMarketFacade.disconnect();
        this.playerSyncFacade.disconnect();
        this.playerShopFacade.disconnect();
        onOffline?.({ reason: 'disconnect' });
      },
    });
  }

  stop() {
    this.leaderboardFacade.disconnect();
    this.leaderboardFacade.setGameplayFacade(null);
    this.worldChatFacade.disconnect();
    this.npcMarketFacade.disconnect();
    this.playerSyncFacade.disconnect();
    this.playerShopFacade.disconnect();
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

  getWorldChatFacade() {
    return this.worldChatFacade;
  }

  getNpcMarketFacade() {
    return this.npcMarketFacade;
  }

  getPlayerShopFacade() {
    return this.playerShopFacade;
  }
}
