import { App as CapacitorApp } from '@capacitor/app';

import { BackendFacade } from '../backend/BackendFacade.js';
import { EcsFacade } from '../ecs/EcsFacade.js';
import { GameplayFacade } from '../gameplay/GameplayFacade.js';
import { HapticsFacade } from './haptics/HapticsFacade.js';
import { PlayerFacade } from '../player/PlayerFacade.js';
import { RenderFacade } from '../rendering/RenderFacade.js';
import { PixiAnnouncementPresenter } from '../rendering/pixi/presenters/PixiAnnouncementPresenter.js';
import { PixiExperienceFacade } from '../rendering/pixi/presenters/PixiExperienceFacade.js';
import { PixiGlobalDialogPresenter } from '../rendering/pixi/presenters/PixiGlobalDialogPresenter.js';
import { PixiPagesFacade } from '../rendering/pixi/presenters/PixiPagesFacade.js';
import {
  PixiCanvasClipboardBoundary,
  PixiCanvasHostManager,
  PixiCanvasViewportFacade,
  PixiInteractionLockManager,
} from '../rendering/pixi/runtime/PixiLifecycleAdapters.js';
import { SoundSettingsFacade } from '../audio/soundSettings/SoundSettingsFacade.js';
import { BackgroundMusicFacade } from '../audio/backgroundMusic/BackgroundMusicFacade.js';
import { GardenSoundFacade } from '../audio/gardenSounds/GardenSoundFacade.js';
import { UiClickSoundFacade } from '../audio/uiClicks/UiClickSoundFacade.js';
import { AppLifecycleManager } from './managers/AppLifecycleManager.js';
import { AppLiveUpdateManager } from './managers/AppLiveUpdateManager.js';
import { AppVisibilityManager } from './managers/AppVisibilityManager.js';

export class AppFacade {
  static explain =
    'Starts the game room, wires the main helpers together, and shuts everything down cleanly.';

  constructor({ canvas }) {
    if (!canvas) {
      throw new Error('AppFacade requires the authored production canvas.');
    }

    this.canvas = canvas;
    this.ecsFacade = new EcsFacade();
    this.gameplayFacade = new GameplayFacade();
    this.hapticsFacade = new HapticsFacade();
    this.playerFacade = new PlayerFacade();
    this.backgroundMusicFacade = new BackgroundMusicFacade();
    this.gardenSoundFacade = new GardenSoundFacade();
    this.uiClickSoundFacade = new UiClickSoundFacade();
    this.soundSettingsFacade = new SoundSettingsFacade({
      backgroundMusicFacade: this.backgroundMusicFacade,
      gardenSoundFacade: this.gardenSoundFacade,
      uiClickSoundFacade: this.uiClickSoundFacade,
    });
    this.backendFacade = new BackendFacade();
    this.liveUpdateManager = new AppLiveUpdateManager();
    this.gameplayFacade.setPersistenceStorage(this.backendFacade.getGameplaySaveFacade());
    this.gameplayFacade.setGameConfigFacade(this.backendFacade.getGameConfigFacade());
    this.gameplayFacade.setNpcMarketFacade(this.backendFacade.getNpcMarketFacade());
    this.gameplayFacade.setPlayerShopFacade(this.backendFacade.getPlayerShopFacade());
    this.gameplayFacade.setPotionDiscoveryFacade(
      this.backendFacade.getPotionDiscoveryFacade(),
    );
    this.gameplayFacade.setWorldChatFacade(this.backendFacade.getWorldChatFacade());
    this.renderFacade = new RenderFacade({
      canvas,
      hapticsFacade: this.hapticsFacade,
      uiClickSoundFacade: this.uiClickSoundFacade,
      beforeDeployReload: () =>
        this.gameplayFacade.savePersistenceSnapshotAndFlush(),
    });
    this.experienceFacade = new PixiExperienceFacade({
      renderFacade: this.renderFacade,
      gameplayFacade: this.gameplayFacade,
      getCurrentPageId: () =>
        this.pagesFacade?.getCurrentPageId?.() ?? 'workshop',
      onShowPage: (pageId) =>
        this.pagesFacade?.show?.(pageId) ?? false,
      onNotificationVisibilityPolicyChange: (policy) =>
        this.pagesFacade?.applyTutorialNotificationVisibilityPolicy?.(
          policy,
        ),
    });
    this.globalDialogPresenter = new PixiGlobalDialogPresenter({
      renderFacade: this.renderFacade,
      gameplayFacade: this.gameplayFacade,
      playerFacade: this.playerFacade,
      authFacade: this.backendFacade.getAuthFacade(),
      feedbackFacade: this.backendFacade.getFeedbackFacade(),
      playerInboxFacade: this.backendFacade.getPlayerInboxFacade(),
      playerInfoFacade: this.backendFacade.getPlayerInfoFacade(),
      tradeAllianceFacade:
        this.backendFacade.getTradeAllianceFacade(),
      hapticsFacade: this.hapticsFacade,
      soundSettingsFacade: this.soundSettingsFacade,
    });
    this.announcementPresenter = new PixiAnnouncementPresenter({
      renderFacade: this.renderFacade,
      gameplayFacade: this.gameplayFacade,
      playerFacade: this.playerFacade,
      presentTransientEffect: (model) => {
        if (model?.type === 'feature_unlocked' && model.pageId) {
          this.renderFacade
            .getUiRuntime?.()
            ?.getGlobalSurface?.('chrome.bottom')
            ?.setFeatureUnlockSource?.(
              model.pageId,
              model.sourceBounds,
            );
        }
        return (
          this.experienceFacade.transientEffects?.emitReward?.(model) ??
          false
        );
      },
    });
    this.pagesFacade = new PixiPagesFacade({
      renderFacade: this.renderFacade,
      experienceFacade: this.experienceFacade,
      globalDialogPresenter: this.globalDialogPresenter,
      announcementPresenter: this.announcementPresenter,
      gameplayFacade: this.gameplayFacade,
      playerFacade: this.playerFacade,
      leaderboardFacade: this.backendFacade.getLeaderboardFacade(),
      worldEventLeaderboardFacade: this.backendFacade.getWorldEventLeaderboardFacade(),
      worldChatFacade: this.backendFacade.getWorldChatFacade(),
      tradeAllianceFacade: this.backendFacade.getTradeAllianceFacade(),
      feedbackFacade: this.backendFacade.getFeedbackFacade(),
      gardenSoundFacade: this.gardenSoundFacade,
      playerInboxFacade: this.backendFacade.getPlayerInboxFacade(),
      playerInfoFacade: this.backendFacade.getPlayerInfoFacade(),
      playerShopFacade: this.backendFacade.getPlayerShopFacade(),
      npcMarketFacade: this.backendFacade.getNpcMarketFacade(),
      authFacade: this.backendFacade.getAuthFacade(),
      hapticsFacade: this.hapticsFacade,
      soundSettingsFacade: this.soundSettingsFacade,
      uiClickSoundFacade: this.uiClickSoundFacade,
      appPlugin: CapacitorApp,
    });

    this.shellManager = new PixiCanvasHostManager({ canvas });
    this.viewportFacade = new PixiCanvasViewportFacade({ canvas });
    this.interactionLockManager = new PixiInteractionLockManager({
      inputRouter: this.renderFacade.getInputRouter(),
    });
    this.textClipboardGuardManager = new PixiCanvasClipboardBoundary();
    this.lifecycleManager = new AppLifecycleManager({
      shellManager: this.shellManager,
      viewportFacade: this.viewportFacade,
      renderFacade: this.renderFacade,
      pagesFacade: this.pagesFacade,
      ecsFacade: this.ecsFacade,
      gameplayFacade: this.gameplayFacade,
      backendFacade: this.backendFacade,
      playerFacade: this.playerFacade,
      maintenanceFacade: this.backendFacade.getMaintenanceFacade(),
      onlineGateManager: this.renderFacade.getOnlineGateManager(),
      accountLinkChoiceManager:
        this.renderFacade.getAccountLinkChoiceManager(),
      freshStartChoiceManager:
        this.renderFacade.getFreshStartChoiceManager(),
      deployRefreshManager: this.renderFacade.getDeployRefreshManager(),
      interactionLockManager: this.interactionLockManager,
      textClipboardGuardManager: this.textClipboardGuardManager,
      appVisibilityManager: new AppVisibilityManager({ appPlugin: CapacitorApp }),
    });
    this.startPromise = null;
    this.disposed = false;
  }

  start() {
    if (this.disposed) {
      return Promise.reject(
        new Error('Cannot restart a disposed AppFacade.'),
      );
    }
    if (this.startPromise) {
      return this.startPromise;
    }

    void this.liveUpdateManager.notifyAppReady().catch(() => {
      // Mark OTA bundles ready before heavy rendering work can hit the native
      // rollback deadline. A later start() call retries transient failures.
    });

    this.startPromise = this.renderFacade
      .initialize({ playerFacade: this.playerFacade })
      .then(() => {
        if (!this.disposed) {
          this.backgroundMusicFacade?.start?.();
          this.lifecycleManager.start();
          void this.liveUpdateManager.start().catch(() => {
            // Live updates are best-effort; the bundled APK remains playable.
          });
        }
        return this;
      });
    return this.startPromise;
  }

  async stop() {
    if (this.disposed) {
      return false;
    }
    this.disposed = true;
    try {
      await this.startPromise;
    } catch {
      // Initialization errors are reported by the bootstrap. Cleanup still runs.
    }
    this.lifecycleManager.stop();
    this.renderFacade.destroy();
    this.soundSettingsFacade.destroy();
    this.backgroundMusicFacade.destroy();
    this.gardenSoundFacade.destroy();
    this.uiClickSoundFacade.destroy();
    this.hapticsFacade.destroy();
    return true;
  }
}
