import { AuthFacade } from './auth/AuthFacade.js';
import { FeedbackBackendFacade } from './feedback/FeedbackBackendFacade.js';
import { GameConfigBackendFacade } from './gameConfig/GameConfigBackendFacade.js';
import { GameplaySaveBackendFacade } from './gameplaySave/GameplaySaveBackendFacade.js';
import { LeaderboardBackendFacade } from './leaderboard/LeaderboardBackendFacade.js';
import { NpcMarketBackendFacade } from './npcMarket/NpcMarketBackendFacade.js';
import { PlayerBackendSyncFacade } from './playerSync/PlayerBackendSyncFacade.js';
import { PlayerShopBackendFacade } from './playerShop/PlayerShopBackendFacade.js';
import { PotionDiscoveryBackendFacade } from './potionDiscoveries/PotionDiscoveryBackendFacade.js';
import { SpacetimeDbFacade } from './spacetime/SpacetimeDbFacade.js';
import { TradeAllianceBackendFacade } from './tradeAlliance/TradeAllianceBackendFacade.js';
import { WorldChatBackendFacade } from './worldChat/WorldChatBackendFacade.js';

export class BackendFacade {
  static explain =
    'Keeps online identity and server access in one place so game rules never talk to the network directly.';

  constructor({
    uri = import.meta.env.VITE_SPACETIME_URI ?? 'ws://localhost:3000',
    databaseName = import.meta.env.VITE_SPACETIME_DATABASE ?? 'idle-wizard',
  } = {}) {
    this.authFacade = new AuthFacade();
    this.gameConfigFacade = new GameConfigBackendFacade();
    this.gameplaySaveFacade = new GameplaySaveBackendFacade();
    this.leaderboardFacade = new LeaderboardBackendFacade();
    this.worldChatFacade = new WorldChatBackendFacade();
    this.feedbackFacade = new FeedbackBackendFacade();
    this.npcMarketFacade = new NpcMarketBackendFacade();
    this.playerSyncFacade = new PlayerBackendSyncFacade();
    this.playerShopFacade = new PlayerShopBackendFacade();
    this.potionDiscoveryFacade = new PotionDiscoveryBackendFacade();
    this.tradeAllianceFacade = new TradeAllianceBackendFacade();
    this.spacetimeDbFacade = new SpacetimeDbFacade({
      uri,
      databaseName,
      authSessionManager: this.authFacade.getSessionManager(),
    });
  }

  prepare() {
    return Promise.resolve(this.authFacade.prepare()).then((auth) => ({
      auth,
      spacetime: this.spacetimeDbFacade.prepare(),
    }));
  }

  async start({
    gameplayFacade,
    playerFacade,
    onOnline,
    onOffline,
    onGameplaySaveReady,
  } = {}) {
    this.leaderboardFacade.setGameplayFacade(gameplayFacade);
    this.tradeAllianceFacade.setGameplayFacade(gameplayFacade);
    this.tradeAllianceFacade.setRewardProcessingReady(false);
    this.gameplaySaveFacade.setReadyToSend(false);
    this.playerSyncFacade.setLevelSyncReady(false);
    this.playerSyncFacade.setPlayerFacade(playerFacade);
    this.playerSyncFacade.setGameplayFacade(gameplayFacade);

    return this.spacetimeDbFacade.connectGeneratedBindings({
      onConnect: (connection, identity) => {
        let gameplaySaveReady = false;
        const finishGameplaySaveReady = (result) => {
          if (gameplaySaveReady) {
            return;
          }

          gameplaySaveReady = true;

          if (result?.ok === false) {
            this.disconnectBackendFacades();
            onOffline?.({ reason: result.reason });
            return;
          }

          this.gameplaySaveFacade.discardPreHydrationSave();
          this.playerSyncFacade.discardPreHydrationPlayerLevel();
          this.playerSyncFacade.markGameplaySaveHydrated();
          onGameplaySaveReady?.({
            save: result?.save ?? null,
            updatedAtMs: result?.updatedAtMs ?? 0,
          });
          this.gameplaySaveFacade.setReadyToSend(true);
          this.playerSyncFacade.setLevelSyncReady(true);

          if (gameplayFacade?.consumeProgressResetPending?.()) {
            void this.playerShopFacade.clearOwnProgress();
          }

          this.tradeAllianceFacade.setRewardProcessingReady(true);
          onOnline?.({ connection, identity });
        };

        this.gameConfigFacade.connect(connection);
        this.leaderboardFacade.connect(connection, identity);
        this.worldChatFacade.connect(connection);
        this.feedbackFacade.connect(connection);
        this.npcMarketFacade.connect(connection);
        this.playerSyncFacade.connect(connection, identity);
        this.playerShopFacade.connect(connection, identity);
        this.potionDiscoveryFacade.connect(connection);
        this.tradeAllianceFacade.connect(connection, identity);
        this.gameplaySaveFacade.connect(connection, identity, {
          onReady: finishGameplaySaveReady,
        });
      },
      onConnectError: (error) => {
        this.disconnectBackendFacades();
        onOffline?.({ reason: 'connect_error', error });
      },
      onDisconnect: () => {
        this.disconnectBackendFacades();
        onOffline?.({ reason: 'disconnect' });
      },
    });
  }

  stop() {
    this.disconnectBackendFacades();
    this.leaderboardFacade.setGameplayFacade(null);
    this.tradeAllianceFacade.setGameplayFacade(null);
    this.playerSyncFacade.setGameplayFacade(null);
    this.spacetimeDbFacade.disconnect();
  }

  disconnectBackendFacades() {
    this.gameConfigFacade.disconnect();
    this.gameplaySaveFacade.disconnect();
    this.leaderboardFacade.disconnect();
    this.worldChatFacade.disconnect();
    this.feedbackFacade.disconnect();
    this.npcMarketFacade.disconnect();
    this.playerSyncFacade.disconnect();
    this.playerShopFacade.disconnect();
    this.potionDiscoveryFacade.disconnect();
    this.tradeAllianceFacade.disconnect();
  }

  getAuthFacade() {
    return this.authFacade;
  }

  getGameConfigFacade() {
    return this.gameConfigFacade;
  }

  getGameplaySaveFacade() {
    return this.gameplaySaveFacade;
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

  getFeedbackFacade() {
    return this.feedbackFacade;
  }

  getNpcMarketFacade() {
    return this.npcMarketFacade;
  }

  getPlayerShopFacade() {
    return this.playerShopFacade;
  }

  getPotionDiscoveryFacade() {
    return this.potionDiscoveryFacade;
  }

  getTradeAllianceFacade() {
    return this.tradeAllianceFacade;
  }
}
