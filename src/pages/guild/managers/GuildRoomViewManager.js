export class GuildRoomViewManager {
  constructor() {
    this.root = null;
    this.uiLayer = null;
    this.popupLayer = null;
  }

  mount(stage) {
    if (!stage) {
      throw new Error('GuildRoomViewManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('article');
    this.root.className = 'guild-page';
    this.root.setAttribute('aria-label', 'Guild room');
    this.root.append(this.createWall(), this.createFloor(), this.createUiLayer());
    stage.append(this.root, this.createPopupLayer());

    return this.root;
  }

  getUiLayer() {
    if (!this.uiLayer) {
      throw new Error('GuildRoomViewManager UI layer is not mounted.');
    }

    return this.uiLayer;
  }

  getPopupLayer() {
    if (!this.popupLayer) {
      throw new Error('GuildRoomViewManager popup layer is not mounted.');
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
    wall.className = 'guild-page__wall';
    wall.setAttribute('aria-hidden', 'true');
    return wall;
  }

  createFloor() {
    const floor = document.createElement('div');
    floor.className = 'guild-page__floor';
    floor.setAttribute('aria-hidden', 'true');
    return floor;
  }

  createUiLayer() {
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = 'guild-page__ui-layer style-page-scroll';
    this.uiLayer.dataset.scrollCueProgress = 'inline';
    return this.uiLayer;
  }

  createPopupLayer() {
    this.popupLayer = document.createElement('div');
    this.popupLayer.className = 'room-page__popup-layer guild-page__popup-layer';
    return this.popupLayer;
  }
}
