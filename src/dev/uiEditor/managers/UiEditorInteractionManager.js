const CAPTURE_OPTIONS = { capture: true, passive: false };

export class UiEditorInteractionManager {
  constructor({
    stage,
    getSelectedDescriptor = () => null,
    getSelectedOverride = () => ({}),
    onSelectElement = () => {},
    onPatch = () => {},
    onSave = () => {},
    onModeChange = () => {},
    onFrame = () => {},
  } = {}) {
    this.stage = stage;
    this.getSelectedDescriptor = getSelectedDescriptor;
    this.getSelectedOverride = getSelectedOverride;
    this.onSelectElement = onSelectElement;
    this.onPatch = onPatch;
    this.onSave = onSave;
    this.onModeChange = onModeChange;
    this.onFrame = onFrame;
    this.mode = 'select';
    this.frame = null;
    this.dragState = null;
    this.handleStagePointer = (event) => this.onStagePointer(event);
    this.handleKeyDown = (event) => this.onKeyDown(event);
    this.handleDragMove = (event) => this.onDragMove(event);
    this.handleDragEnd = () => this.endDrag();
    this.handleFrame = () => this.tick();
  }

  mount() {
    if (!this.stage) {
      return;
    }

    this.stage.addEventListener('pointerdown', this.handleStagePointer, CAPTURE_OPTIONS);
    this.stage.addEventListener('pointerup', this.handleStagePointer, CAPTURE_OPTIONS);
    this.stage.addEventListener('click', this.handleStagePointer, CAPTURE_OPTIONS);
    window.addEventListener('keydown', this.handleKeyDown, true);
    this.frame = window.requestAnimationFrame(this.handleFrame);
  }

  unmount() {
    this.stage?.removeEventListener('pointerdown', this.handleStagePointer, CAPTURE_OPTIONS);
    this.stage?.removeEventListener('pointerup', this.handleStagePointer, CAPTURE_OPTIONS);
    this.stage?.removeEventListener('click', this.handleStagePointer, CAPTURE_OPTIONS);
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.endDrag();

    if (this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  setMode(mode) {
    this.mode = mode === 'interact' ? 'interact' : 'select';
  }

  onStagePointer(event) {
    if (this.mode !== 'select') {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.type === 'pointerdown') {
      const element = event.target instanceof globalThis.Element
        ? event.target
        : this.stage;
      this.onSelectElement(element);
    }
  }

  startDrag(event) {
    const descriptor = this.getSelectedDescriptor();

    if (!descriptor || descriptor.selector === ':scope') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const override = this.getSelectedOverride();
    this.dragState = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: Number(override.offsetX) || 0,
      offsetY: Number(override.offsetY) || 0,
      scale: descriptor.layout.scale || 1,
    };
    window.addEventListener('pointermove', this.handleDragMove, CAPTURE_OPTIONS);
    window.addEventListener('pointerup', this.handleDragEnd, CAPTURE_OPTIONS);
    window.addEventListener('pointercancel', this.handleDragEnd, CAPTURE_OPTIONS);
  }

  onDragMove(event) {
    if (!this.dragState) {
      return;
    }

    event.preventDefault();
    const x = this.dragState.offsetX
      + (event.clientX - this.dragState.startX) / this.dragState.scale;
    const y = this.dragState.offsetY
      + (event.clientY - this.dragState.startY) / this.dragState.scale;
    this.onPatch({
      offsetX: Math.round(x * 100) / 100,
      offsetY: Math.round(y * 100) / 100,
    });
  }

  endDrag() {
    this.dragState = null;
    window.removeEventListener('pointermove', this.handleDragMove, CAPTURE_OPTIONS);
    window.removeEventListener('pointerup', this.handleDragEnd, CAPTURE_OPTIONS);
    window.removeEventListener('pointercancel', this.handleDragEnd, CAPTURE_OPTIONS);
  }

  onKeyDown(event) {
    if (this.isTextEntry(event.target)) {
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.onSave();
      return;
    }

    if (event.key.toLowerCase() === 'v') {
      event.preventDefault();
      const mode = this.mode === 'select' ? 'interact' : 'select';
      this.setMode(mode);
      this.onModeChange(mode);
      return;
    }

    const axis = {
      ArrowLeft: ['offsetX', -1],
      ArrowRight: ['offsetX', 1],
      ArrowUp: ['offsetY', -1],
      ArrowDown: ['offsetY', 1],
    }[event.key];

    if (!axis || !this.getSelectedDescriptor()) {
      return;
    }

    event.preventDefault();
    const [field, direction] = axis;
    const override = this.getSelectedOverride();
    const amount = event.shiftKey ? 10 : 1;
    this.onPatch({ [field]: (Number(override[field]) || 0) + direction * amount });
  }

  tick() {
    this.onFrame();
    this.frame = window.requestAnimationFrame(this.handleFrame);
  }

  isTextEntry(target) {
    return target instanceof globalThis.Element
      && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }
}
