export class ResearchRoomViewManager {
  constructor() {
    this.root = null;
    this.uiLayer = null;
  }

  mount(stage) {
    if (!stage) {
      throw new Error('ResearchRoomViewManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('article');
    this.root.className = 'research-page';
    this.root.setAttribute('aria-label', 'Research room');
    this.root.append(this.createWall(), this.createFloor(), this.createUiLayer());
    stage.append(this.root);

    return this.root;
  }

  getUiLayer() {
    if (!this.uiLayer) {
      throw new Error('ResearchRoomViewManager UI layer is not mounted.');
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
    wall.className = 'research-page__wall';
    wall.setAttribute('aria-hidden', 'true');
    return wall;
  }

  createFloor() {
    const floor = document.createElement('div');
    floor.className = 'research-page__floor';
    floor.setAttribute('aria-hidden', 'true');
    return floor;
  }

  createUiLayer() {
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = 'research-page__ui-layer';
    return this.uiLayer;
  }
}
