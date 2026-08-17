import { describe, expect, it, vi } from 'vitest';

import { EcsFacade } from '../../ecs/EcsFacade.js';
import { ItemsFacade } from './ItemsFacade.js';

function createItemsFacade() {
  const ecsFacade = new EcsFacade();
  const itemsFacade = new ItemsFacade();
  ecsFacade.createWorld();
  itemsFacade.initialize(ecsFacade.getManagers());
  return itemsFacade;
}

describe('ItemsFacade ingredients', () => {
  it('reads indexed inventory quantities without scanning every ECS stack', () => {
    const itemsFacade = createItemsFacade();
    const sageSeed = itemsFacade.getItemDefinitionByKey('sageSeed');
    const mintSeed = itemsFacade.getItemDefinitionByKey('mintSeed');
    const getStackEntities = vi.spyOn(
      itemsFacade.inventoryStackManager,
      'getStackEntities',
    );

    itemsFacade.addItem(sageSeed.id, 3);
    getStackEntities.mockClear();

    expect(itemsFacade.getItemQuantity(sageSeed.id)).toBe(3);
    expect(itemsFacade.getItemQuantity(mintSeed.id)).toBe(0);
    expect(getStackEntities).not.toHaveBeenCalled();

    expect(itemsFacade.removeItem(sageSeed.id, 3)).toMatchObject({
      itemTypeId: sageSeed.id,
      quantity: 3,
    });
    expect(itemsFacade.getItemQuantity(sageSeed.id)).toBe(0);
    itemsFacade.addItem(sageSeed.id, 2);
    expect(itemsFacade.getItemQuantity(sageSeed.id)).toBe(2);
  });

  it('includes rarity in ingredient inventory and preserves owned quantities', () => {
    const itemsFacade = createItemsFacade();
    const cyclopsEye = itemsFacade.getItemDefinitionByKey('cyclopsEye');

    itemsFacade.addItem(cyclopsEye.id, 3);

    expect(
      itemsFacade
        .getIngredientInventorySnapshot()
        .find((ingredient) => ingredient.key === 'cyclopsEye'),
    ).toEqual({
      itemTypeId: 3021,
      key: 'cyclopsEye',
      label: 'cyclops eye',
      kind: 'ingredient',
      rarity: 'rare',
      quantity: 3,
    });

    const restoredItemsFacade = createItemsFacade();
    restoredItemsFacade.applyPersistenceSnapshot(itemsFacade.getPersistenceSnapshot());

    expect(restoredItemsFacade.getItemQuantity(cyclopsEye.id)).toBe(3);
  });

  it('distinguishes newly produced items from ordinary inventory returns', () => {
    const itemsFacade = createItemsFacade();
    const sageSeed = itemsFacade.getItemDefinitionByKey('sageSeed');
    const productions = [];
    itemsFacade.subscribeProducedItems((production) => productions.push(production));

    itemsFacade.addItem(sageSeed.id, 3);
    itemsFacade.addProducedItem(sageSeed.id, 2);

    expect(itemsFacade.getItemQuantity(sageSeed.id)).toBe(5);
    expect(productions).toEqual([{ itemTypeId: sageSeed.id, quantity: 2 }]);
  });
});
