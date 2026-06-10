export class WorkshopRoomViewManager {
  constructor() {
    this.root = null;
    this.uiLayer = null;
    this.popupLayer = null;
  }

  mount(stage) {
    if (!stage) {
      throw new Error('WorkshopRoomViewManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('article');
    this.root.className = 'workshop-page';
    this.root.setAttribute('aria-label', 'Workshop room');
    this.root.append(this.createWall(), this.createFloor(), this.createUiLayer());
    stage.append(this.root, this.createPopupLayer());

    return this.root;
  }

  getUiLayer() {
    if (!this.uiLayer) {
      throw new Error('WorkshopRoomViewManager UI layer is not mounted.');
    }

    return this.uiLayer;
  }

  getPopupLayer() {
    if (!this.popupLayer) {
      throw new Error('WorkshopRoomViewManager popup layer is not mounted.');
    }

    return this.popupLayer;
  }

  unmount() {
    this.root?.remove();
    this.popupLayer?.remove();
    this.root = null;
    this.uiLayer = null;
    this.popupLayer = null;
  }

  createWall() {
    const wall = document.createElement('div');
    wall.className = 'workshop-page__wall';
    wall.setAttribute('aria-hidden', 'true');
    wall.append(this.createWallTrim());
    return wall;
  }

  createWallTrim() {
    const trim = document.createElement('div');
    trim.className = 'workshop-page__wall-trim';
    return trim;
  }

  createFloor() {
    const floor = document.createElement('div');
    floor.className = 'workshop-page__floor';
    floor.setAttribute('aria-hidden', 'true');

    const boards = document.createElement('div');
    boards.className = 'workshop-page__floor-boards';
    floor.append(boards);

    return floor;
  }

  createUiLayer() {
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = 'workshop-page__ui-layer';
    return this.uiLayer;
  }

  createPopupLayer() {
    this.popupLayer = document.createElement('div');
    this.popupLayer.className = 'room-page__popup-layer workshop-page__popup-layer';
    return this.popupLayer;
  }
}
