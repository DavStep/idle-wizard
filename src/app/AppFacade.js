import { BackendFacade } from '../backend/BackendFacade.js';
import { EcsFacade } from '../ecs/EcsFacade.js';
import { GameplayFacade } from '../gameplay/GameplayFacade.js';
import { PagesFacade } from '../pages/PagesFacade.js';
import { PlayerFacade } from '../player/PlayerFacade.js';
import { RenderFacade } from '../rendering/RenderFacade.js';
import { ViewportFacade } from '../viewport/ViewportFacade.js';
import { AppLifecycleManager } from './managers/AppLifecycleManager.js';
import { AppOnlineGateManager } from './managers/AppOnlineGateManager.js';
import { AppShellManager } from './managers/AppShellManager.js';
import { AppThemeManager } from './managers/AppThemeManager.js';

export class AppFacade {
  static explain =
    'Starts the game room, wires the main helpers together, and shuts everything down cleanly.';

  constructor({ root }) {
    this.shellManager = new AppShellManager({ root });
    this.viewportFacade = new ViewportFacade();
    this.renderFacade = new RenderFacade();
    this.ecsFacade = new EcsFacade();
    this.gameplayFacade = new GameplayFacade();
    this.playerFacade = new PlayerFacade();
    this.backendFacade = new BackendFacade();
    this.onlineGateManager = new AppOnlineGateManager();
    this.appThemeManager = new AppThemeManager();
    this.gameplayFacade.setGameConfigFacade(this.backendFacade.getGameConfigFacade());
    this.gameplayFacade.setNpcMarketFacade(this.backendFacade.getNpcMarketFacade());
    this.gameplayFacade.setPotionDiscoveryFacade(
      this.backendFacade.getPotionDiscoveryFacade(),
    );
    this.gameplayFacade.setWorldChatFacade(this.backendFacade.getWorldChatFacade());
    this.pagesFacade = new PagesFacade({
      gameplayFacade: this.gameplayFacade,
      playerFacade: this.playerFacade,
      leaderboardFacade: this.backendFacade.getLeaderboardFacade(),
      worldChatFacade: this.backendFacade.getWorldChatFacade(),
      playerShopFacade: this.backendFacade.getPlayerShopFacade(),
      authFacade: this.backendFacade.getAuthFacade(),
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
      onlineGateManager: this.onlineGateManager,
      appThemeManager: this.appThemeManager,
    });
  }

  start() {
    this.lifecycleManager.start();
  }

  stop() {
    this.lifecycleManager.stop();
  }
}
