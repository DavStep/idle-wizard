export class WorkshopRoomViewManager {
  constructor() {
    this.root = null;
    this.uiLayer = null;
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
    stage.append(this.root);

    return this.root;
  }

  getUiLayer() {
    if (!this.uiLayer) {
      throw new Error('WorkshopRoomViewManager UI layer is not mounted.');
    }

    return this.uiLayer;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
    this.uiLayer = null;
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
}
