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
  constructor({ gameplayFacade, onSeedDragStart = null } = {}) {
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
    this.onSeedDragStart = onSeedDragStart;
    this.configureRow = (refs, item) => this.configureSeedRow(refs, item);
    this.syncRow = (refs, item) => this.syncSeedRow(refs, item);
  }

  configureSeedRow(refs, item) {
    refs.row.dataset.gardenSeedItemTypeId = String(item.itemTypeId);
    refs.row.addEventListener('pointerdown', (event) =>
      this.onSeedPointerDown(event, item.itemTypeId),
    );
    refs.row.addEventListener('dragstart', (event) => event.preventDefault());
  }

  syncSeedRow(refs, item) {
    const draggable =
      typeof this.onSeedDragStart === 'function' &&
      item.quantity > 0 &&
      item.display?.locked !== true &&
      item.display?.unknown !== true;

    refs.row.classList.toggle('is-draggable', draggable);
    if (draggable) {
      refs.row.dataset.pageSwipeBlock = 'true';
    } else {
      delete refs.row.dataset.pageSwipeBlock;
    }
  }

  onSeedPointerDown(event, itemTypeId) {
    if (event.button !== 0 || typeof this.onSeedDragStart !== 'function') {
      return;
    }

    const seed = (this.gameplayFacade?.getSnapshot?.()?.garden?.seeds ?? []).find(
      (candidate) => candidate.itemTypeId === itemTypeId,
    );

    if (!seed || seed.quantity <= 0) {
      return;
    }

    this.onSeedDragStart(event, seed);
  }
}
