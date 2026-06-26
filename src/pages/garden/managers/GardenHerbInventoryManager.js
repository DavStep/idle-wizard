import { RoomInventoryBoxManager } from '../../shared/RoomInventoryBoxManager.js';

export class GardenHerbInventoryManager extends RoomInventoryBoxManager {
  constructor({ gameplayFacade } = {}) {
    super({
      gameplayFacade,
      kind: 'herb',
      title: 'herbs',
      containerClassName: 'room-inventory-box garden-page__inventory',
      rowsBaseClassName: 'room-inventory-box__rows garden-page__inventory-rows',
      rootClassName: 'garden-page__herbs',
      rowsClassName: 'garden-page__herb-rows',
      rowClassName: 'garden-page__herb-row',
      dividerClassName: 'garden-page__herb-divider',
      countClassName: 'room-inventory-box__count garden-page__inventory-count',
      toggleClassName: 'room-inventory-box__toggle garden-page__inventory-toggle',
      getItems: (snapshot) => snapshot.garden?.herbs ?? [],
    });
  }
}

export class GardenSeedInventoryManager extends RoomInventoryBoxManager {
  constructor({ gameplayFacade } = {}) {
    super({
      gameplayFacade,
      kind: 'seed',
      title: 'seeds',
      containerClassName: 'room-inventory-box garden-page__inventory',
      rowsBaseClassName: 'room-inventory-box__rows garden-page__inventory-rows',
      rootClassName: 'garden-page__seeds',
      rowsClassName: 'garden-page__seed-inventory-rows',
      rowClassName: 'garden-page__seed-inventory-row',
      dividerClassName: 'garden-page__seed-inventory-divider',
      countClassName: 'room-inventory-box__count garden-page__inventory-count',
      toggleClassName: 'room-inventory-box__toggle garden-page__inventory-toggle',
      getItems: (snapshot) => snapshot.garden?.seeds ?? [],
    });
  }
}
