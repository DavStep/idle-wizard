import { AuthFacade } from './auth/AuthFacade.js';
import { AccountSessionBackendFacade } from './accountSession/AccountSessionBackendFacade.js';
import { FeedbackBackendFacade } from './feedback/FeedbackBackendFacade.js';
import { GameConfigBackendFacade } from './gameConfig/GameConfigBackendFacade.js';
import { GameplaySaveBackendFacade } from './gameplaySave/GameplaySaveBackendFacade.js';
import { LeaderboardBackendFacade } from './leaderboard/LeaderboardBackendFacade.js';
import { MaintenanceBackendFacade } from './maintenance/MaintenanceBackendFacade.js';
import { NpcMarketBackendFacade } from './npcMarket/NpcMarketBackendFacade.js';
import { PlayerInboxBackendFacade } from './playerInbox/PlayerInboxBackendFacade.js';
import { PlayerInfoBackendFacade } from './playerInfo/PlayerInfoBackendFacade.js';
import { PlayerBackendSyncFacade } from './playerSync/PlayerBackendSyncFacade.js';
import { PlayerShopBackendFacade } from './playerShop/PlayerShopBackendFacade.js';
import { PotionDiscoveryBackendFacade } from './potionDiscoveries/PotionDiscoveryBackendFacade.js';
import { SpacetimeDbFacade } from './spacetime/SpacetimeDbFacade.js';
import { TradeAllianceBackendFacade } from './tradeAlliance/TradeAllianceBackendFacade.js';
import { WorldChatBackendFacade } from './worldChat/WorldChatBackendFacade.js';
import { WorldEventLeaderboardBackendFacade } from './worldEventLeaderboard/WorldEventLeaderboardBackendFacade.js';

export class BackendFacade {
  static explain =
    'Keeps online identity and server access in one place so game rules never talk to the network directly.';

  constructor({
    uri = import.meta.env.VITE_SPACETIME_URI ?? 'ws://127.0.0.1:3000',
    databaseName = import.meta.env.VITE_SPACETIME_DATABASE ?? 'idle-wizard',
  } = {}) {
    this.authFacade = new AuthFacade();
    this.accountSessionFacade = new AccountSessionBackendFacade();
    this.gameConfigFacade = new GameConfigBackendFacade();
    this.maintenanceFacade = new MaintenanceBackendFacade({
      gameConfigFacade: this.gameConfigFacade,
    });
    this.gameplaySaveFacade = new GameplaySaveBackendFacade();
    this.leaderboardFacade = new LeaderboardBackendFacade();
    this.worldEventLeaderboardFacade = new WorldEventLeaderboardBackendFacade();
    this.worldChatFacade = new WorldChatBackendFacade();
    this.feedbackFacade = new FeedbackBackendFacade();
    this.npcMarketFacade = new NpcMarketBackendFacade();
    this.playerInboxFacade = new PlayerInboxBackendFacade();
    this.playerInfoFacade = new PlayerInfoBackendFacade();
    this.playerSyncFacade = new PlayerBackendSyncFacade();
    this.playerShopFacade = new PlayerShopBackendFacade();
    this.potionDiscoveryFacade = new PotionDiscoveryBackendFacade();
    this.tradeAllianceFacade = new TradeAllianceBackendFacade();
    this.accountSessionInactive = false;
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
    this.leaderboardFacade.setSyncReady(false);
    this.worldEventLeaderboardFacade.setGameplayFacade(gameplayFacade);
    this.worldEventLeaderboardFacade.setSyncReady(false);
    this.playerInboxFacade.setGameplayFacade(gameplayFacade);
    this.tradeAllianceFacade.setGameplayFacade(gameplayFacade);
    this.tradeAllianceFacade.setRewardProcessingReady(false);
    this.accountSessionInactive = false;
    this.gameplaySaveFacade.setReadyToSend(false);
    this.gameplaySaveFacade.setSyncUnhealthyHandler(({ reason, error } = {}) => {
      this.handleGameplaySaveSyncUnhealthy({ reason, error, onOffline });
    });
    this.playerSyncFacade.setLevelSyncReady(false);
    this.playerSyncFacade.setPlayerFacade(playerFacade);
    this.playerSyncFacade.setGameplayFacade(gameplayFacade);
    this.worldChatFacade.setBeforeSendMessage?.(() =>
      this.playerSyncFacade.flushPlayerLevelSync(),
    );

    return this.spacetimeDbFacade.connectGeneratedBindings({
      onConnect: (connection, identity) => {
        let gameplaySaveReady = false;
        let accountSessionInactive = false;
        const handleAccountSessionInactive = ({ reason = 'account_in_use' } = {}) => {
          if (accountSessionInactive) {
            return;
          }

          accountSessionInactive = true;
          this.accountSessionInactive = true;
          const sessionInvalidated = reason !== 'account_session_error';
          if (sessionInvalidated) {
            this.gameplaySaveFacade.discardPendingSaves();
            this.playerSyncFacade.discardPendingPlayerLevel();
          }
          const maintenanceActive = this.maintenanceFacade.getSnapshot()?.active === true;
          const keepMaintenanceFeed =
            maintenanceActive || reason === 'account_session_missing';
          this.disconnectBackendFacades({ keepGameConfig: keepMaintenanceFeed });

          if (!keepMaintenanceFeed) {
            this.spacetimeDbFacade.disconnect();
          }

          onOffline?.({
            reason: keepMaintenanceFeed
              ? 'maintenance_session_invalidated'
              : sessionInvalidated
                ? 'account_in_use'
                : 'disconnect',
          });
        };
        const finishGameplaySaveReady = async (result) => {
          if (gameplaySaveReady || accountSessionInactive) {
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

          try {
            const readyPayload = {
              save: result?.save ?? null,
              updatedAtMs: result?.updatedAtMs ?? 0,
            };
            if (readyPayload.save) {
              this.gameplaySaveFacade.discardHydratedSaveIfServerIsAtLeastAsNew?.(
                readyPayload.save,
              );
            } else {
              this.gameplaySaveFacade.discardPendingSaves();
            }
            const pendingHydratedSave =
              this.gameplaySaveFacade.getPendingHydratedSave?.() ?? null;

            if (pendingHydratedSave) {
              readyPayload.pendingHydratedSave = pendingHydratedSave;
            }

            let gameplaySaveSendingEnabled = false;
            const enableSaveSending = () => {
              if (gameplaySaveSendingEnabled || accountSessionInactive) {
                return false;
              }

              gameplaySaveSendingEnabled = true;
              this.gameplaySaveFacade.setReadyToSend(true);
              return true;
            };

            await onGameplaySaveReady?.(readyPayload, { enableSaveSending });

            if (!gameplaySaveSendingEnabled) {
              enableSaveSending();
            }
          } catch (error) {
            if (accountSessionInactive) {
              return;
            }

            this.disconnectBackendFacades();
            onOffline?.({ reason: 'gameplay_save_ready_error', error });
            return;
          }

          if (accountSessionInactive) {
            return;
          }

          this.leaderboardFacade.setSyncReady(true);
          this.worldEventLeaderboardFacade.setSyncReady(true);
          this.playerSyncFacade.setLevelSyncReady(true);

          if (gameplayFacade?.consumeProgressResetPending?.()) {
            void this.playerShopFacade.clearOwnProgress();
          }

          this.tradeAllianceFacade.setRewardProcessingReady(true);
          onOnline?.({ connection, identity });
        };

        this.gameConfigFacade.connect(connection);
        this.accountSessionFacade.connect(connection, {
          onInactive: handleAccountSessionInactive,
        });
        if (accountSessionInactive) {
          return;
        }

        this.leaderboardFacade.connect(connection, identity);
        this.worldEventLeaderboardFacade.connect(connection, identity);
        this.worldChatFacade.connect(connection);
        this.feedbackFacade.connect(connection);
        this.npcMarketFacade.connect(connection);
        this.playerInfoFacade.connect(connection);
        this.playerInboxFacade.connect(connection, identity);
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
        onOffline?.({ reason: this.getConnectErrorReason(error), error });
      },
      onDisconnect: () => {
        if (this.accountSessionInactive) {
          return;
        }

        this.disconnectBackendFacades();
        onOffline?.({ reason: 'disconnect' });
      },
    });
  }

  stop() {
    this.accountSessionInactive = false;
    this.disconnectBackendFacades();
    this.gameplaySaveFacade.setSyncUnhealthyHandler(null);
    this.leaderboardFacade.setGameplayFacade(null);
    this.worldEventLeaderboardFacade.setGameplayFacade(null);
    this.playerInboxFacade.setGameplayFacade(null);
    this.tradeAllianceFacade.setGameplayFacade(null);
    this.playerSyncFacade.setGameplayFacade(null);
    this.worldChatFacade.setBeforeSendMessage?.(null);
    this.authFacade.stop();
    this.spacetimeDbFacade.disconnect();
  }

  handleGameplaySaveSyncUnhealthy({
    reason = 'gameplay_save_error',
    error,
    onOffline,
  } = {}) {
    this.disconnectBackendFacades();
    this.spacetimeDbFacade.disconnect();
    onOffline?.({ reason, error });
  }

  getConnectErrorReason(error) {
    const message = String(error?.message ?? error ?? '').toLowerCase();

    if (message.includes('database is paused') || message.includes('database paused')) {
      return 'server_paused';
    }

    if (message.includes('out of energy') || message.includes('no energy')) {
      return 'server_no_energy';
    }

    if (message.includes('timed out') || message.includes('timeout')) {
      return 'connect_timeout';
    }

    return 'connect_error';
  }

  disconnectBackendFacades({ keepGameConfig = false } = {}) {
    this.accountSessionFacade.disconnect();
    if (!keepGameConfig) {
      this.gameConfigFacade.disconnect();
    }
    this.gameplaySaveFacade.disconnect();
    this.leaderboardFacade.disconnect();
    this.worldEventLeaderboardFacade.disconnect();
    this.worldChatFacade.disconnect();
    this.feedbackFacade.disconnect();
    this.npcMarketFacade.disconnect();
    this.playerInboxFacade.disconnect();
    this.playerInfoFacade.disconnect();
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

  getMaintenanceFacade() {
    return this.maintenanceFacade;
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

  getWorldEventLeaderboardFacade() {
    return this.worldEventLeaderboardFacade;
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

  getPlayerInfoFacade() {
    return this.playerInfoFacade;
  }

  getPlayerInboxFacade() {
    return this.playerInboxFacade;
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
