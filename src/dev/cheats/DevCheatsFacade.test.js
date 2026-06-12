import { describe, expect, it, vi } from 'vitest';

import { EcsFacade } from '../../ecs/EcsFacade.js';
import { GameplayFacade } from '../../gameplay/GameplayFacade.js';
import { DevCheatsFacade } from './DevCheatsFacade.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function createApp({ backendFacade, persistenceStorage = createMemoryStorage() } = {}) {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade({ persistenceStorage, persistenceNow: () => 0 });
  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);
  return { ecsFacade, app: { backendFacade, gameplayFacade }, persistenceStorage };
}

describe('DevCheatsFacade', () => {
  it('registers console helpers and restores previous globals', () => {
    const { app } = createApp();
    const target = {
      cheats: { previous: true },
      cheat: () => 'previous',
    };
    const logger = { info: vi.fn() };
    const facade = new DevCheatsFacade({ app, target, logger });

    facade.mount();

    expect(target.cheats.help()).toMatchObject({ ok: true });
    expect(target.cheat('addGold 25')).toMatchObject({ ok: true });
    expect(app.gameplayFacade.getSnapshot().gold.current).toBe(25);
    expect(logger.info).toHaveBeenCalledWith('Dev cheats enabled. Run cheats.help().');

    facade.unmount();

    expect(target.cheats).toEqual({ previous: true });
    expect(target.cheat()).toBe('previous');
  });

  it('mutates gameplay through explicit cheat commands', () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.fillMana()).toMatchObject({
      ok: true,
      mana: { current: 50, cap: 50 },
    });
    expect(target.cheats.addGold(100)).toMatchObject({
      ok: true,
      gold: { current: 100, totalGenerated: 100 },
    });
    expect(target.cheats.addCrystal(7)).toMatchObject({
      ok: true,
      crystal: { current: 7 },
    });
    expect(target.cheats.addItem('sageSeed', 3)).toMatchObject({
      ok: true,
      item: {
        key: 'sageSeed',
        quantity: 3,
      },
      addedQuantity: 3,
    });
    expect(target.cheats.unlockSeed('sage')).toMatchObject({
      ok: true,
      researchId: 'unlockSeed:sageSeed',
    });

    const snapshot = target.cheats.snapshot().snapshot;
    expect(snapshot.inventory).toContainEqual(
      expect.objectContaining({ key: 'sageSeed', quantity: 3 }),
    );
    expect(snapshot.research.completedResearchIds).toContain('unlockSeed:sageSeed');
  });

  it('rejects unknown items and research ids', () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.addItem('missingItem', 1)).toEqual({
      ok: false,
      reason: 'unknown_item',
      itemKeyOrId: 'missingItem',
    });
    expect(target.cheats.completeResearch('missingResearch')).toEqual({
      ok: false,
      reason: 'unknown_research',
      researchId: 'missingResearch',
    });
  });

  it('requires confirmation before resetting data', async () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();
    target.cheats.addGold(50);

    await expect(target.cheats.resetData()).resolves.toEqual({
      ok: false,
      reason: 'confirmation_required',
      confirmation: 'RESET',
    });
    expect(app.gameplayFacade.getSnapshot().gold.current).toBe(50);
  });

  it('resets gameplay data and clears server player-market progress', async () => {
    const clearOwnProgress = vi.fn(() => Promise.resolve({ ok: true }));
    const backendFacade = {
      getGameplaySaveFacade: () => ({
        getSnapshot: () => ({ connected: true }),
      }),
      getPlayerShopFacade: () => ({
        clearOwnProgress,
      }),
    };
    const { app, persistenceStorage } = createApp({ backendFacade });
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();
    target.cheats.fillMana();
    target.cheats.addGold(100);
    target.cheats.addCrystal(7);
    target.cheats.addItem('sageSeed', 3);
    target.cheats.unlockSeed('sage');

    await expect(target.cheats.resetData('RESET')).resolves.toMatchObject({
      ok: true,
      scope: 'gameplay_progress',
      playerShop: { ok: true },
      snapshot: {
        mana: { current: 0, cap: 50, perSecond: 1 },
        gold: { current: 0, totalGenerated: 0 },
        crystal: { current: 0 },
        inventory: [],
        research: { completedResearchIds: [] },
      },
    });
    expect(clearOwnProgress).toHaveBeenCalledTimes(1);

    const saved = JSON.parse(persistenceStorage.getItem('idle-wizard.gameplay.save'));
    expect(saved).toMatchObject({
      version: 2,
      gold: { current: 0, totalGenerated: 0 },
      crystal: { current: 0 },
      inventory: [],
      research: { completedIds: [] },
    });
  });

  it('does not reset while the backend save is not ready', async () => {
    const backendFacade = {
      getGameplaySaveFacade: () => ({
        getSnapshot: () => ({ connected: false }),
      }),
    };
    const { app } = createApp({ backendFacade });
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();
    target.cheats.addGold(50);

    await expect(target.cheats.resetData('RESET')).resolves.toEqual({
      ok: false,
      reason: 'backend_save_not_ready',
    });
    expect(app.gameplayFacade.getSnapshot().gold.current).toBe(50);
  });
});
