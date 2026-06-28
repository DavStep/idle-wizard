import { describe, expect, it, vi } from 'vitest';

import { InboxRewardGrantManager } from './InboxRewardGrantManager.js';

function createManager() {
  const coinFacade = { add: vi.fn() };
  const crystalFacade = { add: vi.fn() };
  const rubyFacade = { add: vi.fn() };
  const emeraldFacade = { add: vi.fn() };
  const itemsFacade = {
    safeGetDefinitionByKey: vi.fn((itemKey) =>
      itemKey === 'sageSeed' ? { id: 1, key: 'sageSeed' } : null,
    ),
    addItem: vi.fn(),
  };
  const manager = new InboxRewardGrantManager({
    coinFacade,
    crystalFacade,
    rubyFacade,
    emeraldFacade,
    itemsFacade,
  });

  return { manager, coinFacade, crystalFacade, rubyFacade, emeraldFacade, itemsFacade };
}

describe('InboxRewardGrantManager', () => {
  it('grants every reward type once and marks coin as not generated', () => {
    const { manager, coinFacade, crystalFacade, rubyFacade, emeraldFacade, itemsFacade } =
      createManager();
    const mail = {
      mailKey: 'admin:gift:identity',
      reward: {
        coin: 5,
        crystal: 2,
        ruby: 1,
        emerald: 3,
        items: [{ itemKey: 'sageSeed', quantity: 4 }],
      },
    };

    expect(manager.claim(mail)).toEqual({
      ok: true,
      reward: mail.reward,
    });
    expect(manager.claim(mail)).toEqual({
      ok: true,
      alreadyClaimed: true,
      reward: mail.reward,
    });

    expect(coinFacade.add).toHaveBeenCalledTimes(1);
    expect(coinFacade.add).toHaveBeenCalledWith(5, { trackGenerated: false });
    expect(crystalFacade.add).toHaveBeenCalledWith(2);
    expect(rubyFacade.add).toHaveBeenCalledWith(1);
    expect(emeraldFacade.add).toHaveBeenCalledWith(3);
    expect(itemsFacade.addItem).toHaveBeenCalledWith(1, 4);
  });

  it('restores claimed mail keys from persistence', () => {
    const { manager, coinFacade } = createManager();

    manager.applyPersistenceSnapshot({
      claimedMailKeys: ['admin:gift:identity'],
    });

    expect(
      manager.claim({
        mailKey: 'admin:gift:identity',
        reward: { coin: 1, crystal: 0, ruby: 0, emerald: 0, items: [] },
      }),
    ).toMatchObject({ ok: true, alreadyClaimed: true });
    expect(coinFacade.add).not.toHaveBeenCalled();
  });
});
