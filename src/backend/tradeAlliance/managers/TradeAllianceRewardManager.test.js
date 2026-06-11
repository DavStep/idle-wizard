import { describe, expect, it, vi } from 'vitest';

import { TradeAllianceRewardManager } from './TradeAllianceRewardManager.js';

const REWARD = {
  rewardKey: 'reward-1',
  questId: 'allianceIncomeEasy',
  questLabel: 'small caravan',
  dayKey: '2026-06-11',
  crystalReward: 1,
};

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('TradeAllianceRewardManager', () => {
  it('waits for gameplay save readiness before applying reward inbox rows', async () => {
    const actionManager = {
      collectReward: vi.fn(() => Promise.resolve({ ok: true })),
    };
    const gameplayFacade = {
      claimTradeAllianceCrystalReward: vi.fn(() => ({ ok: true })),
    };
    const manager = new TradeAllianceRewardManager({ actionManager });

    manager.setGameplayFacade(gameplayFacade);
    manager.processSnapshot({
      connected: true,
      rewardInbox: [REWARD],
    });
    await flushPromises();

    expect(gameplayFacade.claimTradeAllianceCrystalReward).not.toHaveBeenCalled();
    expect(actionManager.collectReward).not.toHaveBeenCalled();

    manager.setReady(true);
    await flushPromises();

    expect(gameplayFacade.claimTradeAllianceCrystalReward).toHaveBeenCalledWith(REWARD);
    expect(actionManager.collectReward).toHaveBeenCalledWith('reward-1');
  });

  it('ignores collected reward rows if the server includes claimed history', async () => {
    const actionManager = {
      collectReward: vi.fn(() => Promise.resolve({ ok: true })),
    };
    const gameplayFacade = {
      claimTradeAllianceCrystalReward: vi.fn(() => ({ ok: true })),
    };
    const manager = new TradeAllianceRewardManager({ actionManager });

    manager.setGameplayFacade(gameplayFacade);
    manager.setReady(true);
    manager.processSnapshot({
      connected: true,
      rewardInbox: [{ ...REWARD, collected: true }],
    });
    await flushPromises();

    expect(gameplayFacade.claimTradeAllianceCrystalReward).not.toHaveBeenCalled();
    expect(actionManager.collectReward).not.toHaveBeenCalled();
  });
});
