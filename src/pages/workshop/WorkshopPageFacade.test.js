// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { WorkshopPageFacade } from './WorkshopPageFacade.js';

describe('WorkshopPageFacade requirement connection', () => {
  it('connects a matching summoned item to the current requirement row', () => {
    const facade = new WorkshopPageFacade();
    const target = document.createElement('div');
    const source = document.createElement('button');
    const getCurrentRequirementRowForItemTypeIds = vi.fn(() => target);
    const show = vi.fn();

    facade.taskManager = { getCurrentRequirementRowForItemTypeIds };
    facade.requirementConnectionManager = { show };
    facade.actionBarManager = { refs: { summonButton: source } };

    facade.showRequirementConnection({
      type: 'seed_summoned',
      seedCounts: [{ seed: { id: 1, label: 'sage seed' }, quantity: 1 }],
      seed: { id: 2, label: 'mint seed' },
    });

    const [itemTypeIds] = getCurrentRequirementRowForItemTypeIds.mock.calls[0];
    expect([...itemTypeIds]).toEqual([1, 2]);
    expect(show).toHaveBeenCalledWith({ source, target });
  });

  it('does not play when the created item is not the current requirement', () => {
    const facade = new WorkshopPageFacade();
    const getCurrentRequirementRowForItemTypeIds = vi.fn(() => null);
    const show = vi.fn();

    facade.taskManager = { getCurrentRequirementRowForItemTypeIds };
    facade.requirementConnectionManager = { show };
    facade.actionBarManager = { refs: {} };

    facade.showRequirementConnection({
      type: 'herb_harvested',
      herb: { itemTypeId: 1001, label: 'sage' },
    });

    expect(getCurrentRequirementRowForItemTypeIds.mock.calls[0][0].has(1001)).toBe(true);
    expect(show).not.toHaveBeenCalled();
  });
});
