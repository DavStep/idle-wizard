import { describe, expect, it } from 'vitest';

import { ItemsFacade } from '../../items/ItemsFacade.js';
import { TaskBalanceManager } from './TaskBalanceManager.js';

describe('TaskBalanceManager', () => {
  it('keeps level 5 tasks on early progression items', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(5).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level5-sage-seeds', itemKey: 'sageSeed', requiredQuantity: 120 },
      { id: 'level5-mint-seeds', itemKey: 'mintSeed', requiredQuantity: 90 },
      { id: 'level5-sage-herb', itemKey: 'sageHerb', requiredQuantity: 80 },
      { id: 'level5-mint-herb', itemKey: 'mintHerb', requiredQuantity: 60 },
      { id: 'level5-mana-tonic', itemKey: 'manaTonic', requiredQuantity: 12 },
    ]);
  });

  it('keeps level 6 on nettle, lavender, and briar progression', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(6).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level6-nettle-seeds', itemKey: 'nettleSeed', requiredQuantity: 130 },
      { id: 'level6-lavender-herb', itemKey: 'lavenderHerb', requiredQuantity: 70 },
      { id: 'level6-briar-seeds', itemKey: 'briarSeed', requiredQuantity: 80 },
      { id: 'level6-calming-draught', itemKey: 'calmingDraught', requiredQuantity: 12 },
      { id: 'level6-briar-ward', itemKey: 'briarWard', requiredQuantity: 8 },
    ]);
  });
});
