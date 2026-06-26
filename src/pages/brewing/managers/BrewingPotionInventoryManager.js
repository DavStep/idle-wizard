import { isItemResearched } from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { RoomInventoryBoxManager } from '../../shared/RoomInventoryBoxManager.js';

export class BrewingPotionInventoryBoxManager extends RoomInventoryBoxManager {
  constructor({ gameplayFacade } = {}) {
    super({
      gameplayFacade,
      kind: 'potion',
      title: 'potions',
      containerClassName: 'room-inventory-box brewing-page__inventory',
      rowsBaseClassName: 'room-inventory-box__rows brewing-page__inventory-rows',
      rootClassName: 'brewing-page__potions',
      rowsClassName: 'brewing-page__potion-rows',
      rowClassName: 'brewing-page__potion-row',
      dividerClassName: 'brewing-page__potion-divider',
      countClassName: 'room-inventory-box__count brewing-page__inventory-count',
      toggleClassName: 'room-inventory-box__toggle brewing-page__inventory-toggle',
      getItems: (snapshot) => this.getPotionRows(snapshot),
      filterItems: (_snapshot, potion) => potion.researched || potion.quantity > 0,
      setRowIcon: (label, potion) =>
        setItemIconLabel(
          label,
          'potion',
          potion.display.unknown ? 'unknownPotion' : potion.key,
        ),
    });
  }

  getPotionRows(snapshot = {}) {
    const ownedPotions = (snapshot.inventory ?? []).filter((item) => item.kind === 'potion');
    const ownedByKey = new Map(ownedPotions.map((potion) => [potion.key, potion]));
    const recipeRows = (snapshot.brewing?.recipes ?? []).map((recipe) => {
      const owned = ownedByKey.get(recipe.key);

      return {
        itemTypeId: recipe.potionTypeId ?? recipe.itemTypeId,
        key: recipe.key,
        label: recipe.label,
        kind: 'potion',
        quantity: owned?.quantity ?? 0,
        discoveryType: recipe.discoveryType,
        type: recipe.type,
        unknown: recipe.unknown,
        known: recipe.known,
        researchable: recipe.researchable,
        discovered: recipe.discovered,
        researched: Boolean(recipe.unlocked),
        unlocked: Boolean(recipe.unlocked),
      };
    });
    const recipeKeys = new Set(recipeRows.map((potion) => potion.key));
    const extraOwnedRows = ownedPotions
      .filter((potion) => !recipeKeys.has(potion.key))
      .map((potion) => ({
        ...potion,
        researched: isItemResearched(snapshot, potion),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));

    return [...recipeRows, ...extraOwnedRows];
  }
}
