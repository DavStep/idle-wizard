export class ShopRoomViewManager {
  constructor() {
    this.root = null;
    this.uiLayer = null;
    this.popupLayer = null;
  }

  mount(stage) {
    if (!stage) {
      throw new Error('ShopRoomViewManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('article');
    this.root.className = 'shop-page';
    this.root.setAttribute('aria-label', 'Market room');
    this.root.append(this.createWall(), this.createFloor(), this.createUiLayer());
    stage.append(this.root, this.createPopupLayer());

    return this.root;
  }

  getUiLayer() {
    if (!this.uiLayer) {
      throw new Error('ShopRoomViewManager UI layer is not mounted.');
    }

    return this.uiLayer;
  }

  getPopupLayer() {
    if (!this.popupLayer) {
      throw new Error('ShopRoomViewManager popup layer is not mounted.');
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
    wall.className = 'shop-page__wall';
    wall.setAttribute('aria-hidden', 'true');
    return wall;
  }

  createFloor() {
    const floor = document.createElement('div');
    floor.className = 'shop-page__floor';
    floor.setAttribute('aria-hidden', 'true');
    return floor;
  }

  createUiLayer() {
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = 'shop-page__ui-layer';
    return this.uiLayer;
  }

  createPopupLayer() {
    this.popupLayer = document.createElement('div');
    this.popupLayer.className = 'room-page__popup-layer shop-page__popup-layer';
    return this.popupLayer;
  }
}
