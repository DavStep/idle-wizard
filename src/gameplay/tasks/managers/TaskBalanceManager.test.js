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
});
