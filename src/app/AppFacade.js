import { App as CapacitorApp } from '@capacitor/app';

import { BackendFacade } from '../backend/BackendFacade.js';
import { EcsFacade } from '../ecs/EcsFacade.js';
import { GameplayFacade } from '../gameplay/GameplayFacade.js';
import { HapticsFacade } from './haptics/HapticsFacade.js';
import { PagesFacade } from '../pages/PagesFacade.js';
import { PlayerFacade } from '../player/PlayerFacade.js';
import { RenderFacade } from '../rendering/RenderFacade.js';
import { SoundSettingsFacade } from '../audio/soundSettings/SoundSettingsFacade.js';
import { UiClickSoundFacade } from '../audio/uiClicks/UiClickSoundFacade.js';
import { ViewportFacade } from '../viewport/ViewportFacade.js';
import { AppDeployRefreshManager } from './managers/AppDeployRefreshManager.js';
import { AppLifecycleManager } from './managers/AppLifecycleManager.js';
import { AppOnlineGateManager } from './managers/AppOnlineGateManager.js';
import { AppShellManager } from './managers/AppShellManager.js';
import { AppThemeManager } from './managers/AppThemeManager.js';
import { AppVisibilityManager } from './managers/AppVisibilityManager.js';

export class AppFacade {
  static explain =
    'Starts the game room, wires the main helpers together, and shuts everything down cleanly.';

  constructor({ root }) {
    this.shellManager = new AppShellManager({ root });
    this.viewportFacade = new ViewportFacade();
    this.renderFacade = new RenderFacade();
    this.ecsFacade = new EcsFacade();
    this.gameplayFacade = new GameplayFacade();
    this.hapticsFacade = new HapticsFacade();
    this.playerFacade = new PlayerFacade();
    this.uiClickSoundFacade = new UiClickSoundFacade();
    this.soundSettingsFacade = new SoundSettingsFacade({
      uiClickSoundFacade: this.uiClickSoundFacade,
    });
    this.backendFacade = new BackendFacade();
    this.onlineGateManager = new AppOnlineGateManager();
    this.deployRefreshManager = new AppDeployRefreshManager({
      beforeReload: () => this.gameplayFacade.savePersistenceSnapshotAndFlush(),
    });
    this.appThemeManager = new AppThemeManager();
    this.gameplayFacade.setPersistenceStorage(this.backendFacade.getGameplaySaveFacade());
    this.gameplayFacade.setGameConfigFacade(this.backendFacade.getGameConfigFacade());
    this.gameplayFacade.setNpcMarketFacade(this.backendFacade.getNpcMarketFacade());
    this.gameplayFacade.setPlayerShopFacade(this.backendFacade.getPlayerShopFacade());
    this.gameplayFacade.setPotionDiscoveryFacade(
      this.backendFacade.getPotionDiscoveryFacade(),
    );
    this.gameplayFacade.setWorldChatFacade(this.backendFacade.getWorldChatFacade());
    this.pagesFacade = new PagesFacade({
      gameplayFacade: this.gameplayFacade,
      playerFacade: this.playerFacade,
      leaderboardFacade: this.backendFacade.getLeaderboardFacade(),
      worldEventLeaderboardFacade: this.backendFacade.getWorldEventLeaderboardFacade(),
      worldChatFacade: this.backendFacade.getWorldChatFacade(),
      tradeAllianceFacade: this.backendFacade.getTradeAllianceFacade(),
      feedbackFacade: this.backendFacade.getFeedbackFacade(),
      playerInboxFacade: this.backendFacade.getPlayerInboxFacade(),
      playerInfoFacade: this.backendFacade.getPlayerInfoFacade(),
      playerShopFacade: this.backendFacade.getPlayerShopFacade(),
      npcMarketFacade: this.backendFacade.getNpcMarketFacade(),
      authFacade: this.backendFacade.getAuthFacade(),
      hapticsFacade: this.hapticsFacade,
      soundSettingsFacade: this.soundSettingsFacade,
      uiClickSoundFacade: this.uiClickSoundFacade,
      pixiProgressOverlayManager: this.renderFacade.getPixiProgressOverlayManager(),
    });

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
      onlineGateManager: this.onlineGateManager,
      deployRefreshManager: this.deployRefreshManager,
      appThemeManager: this.appThemeManager,
      appVisibilityManager: new AppVisibilityManager({ appPlugin: CapacitorApp }),
    });
  }

  start() {
    this.lifecycleManager.start();
  }

  stop() {
    this.lifecycleManager.stop();
    this.soundSettingsFacade.destroy();
    this.uiClickSoundFacade.destroy();
    this.hapticsFacade.destroy();
  }
}
