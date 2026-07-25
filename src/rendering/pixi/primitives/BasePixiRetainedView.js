import { Container } from 'pixi.js';

/**
 * Shared DOM-free lifecycle for retained Pixi pages and dialogs.
 * Subclasses override the protected on* hooks; their display tree is created
 * once in the constructor and destroyed only with the application.
 */
export class BasePixiRetainedView {
  constructor({ label = 'retainedPixiView', root = new Container() } = {}) {
    this.root = root;
    this.root.label = label;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.viewModel = null;
    this.theme = null;
    this.viewportProjection = null;
    this.active = false;
    this.destroyed = false;
    this.activeCleanups = new Set();
  }

  bind(viewModel) {
    this.assertUsable('bind');
    this.viewModel = viewModel ?? null;
    this.onBind(this.viewModel);
  }

  applyTheme(themeSnapshot) {
    this.assertUsable('apply a theme');
    this.theme = themeSnapshot ?? null;
    this.onApplyTheme(this.theme);
  }

  layout(viewportProjection) {
    this.assertUsable('lay out');
    this.viewportProjection = viewportProjection ?? null;
    this.onLayout(this.viewportProjection);
  }

  activate() {
    this.assertUsable('activate');
    if (this.active) {
      return;
    }
    this.active = true;
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = 'passive';
    this.onActivate();
  }

  deactivate() {
    this.assertUsable('deactivate');
    if (!this.active) {
      return;
    }
    this.onDeactivate();
    this.clearActiveCleanups();
    this.active = false;
    this.root.eventMode = 'none';
    this.root.renderable = false;
    this.root.visible = false;
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    if (this.active) {
      this.deactivate();
    }
    this.onDestroy();
    this.root.destroy({ children: true });
    this.viewModel = null;
    this.theme = null;
    this.viewportProjection = null;
    this.destroyed = true;
  }

  addActiveCleanup(cleanup) {
    this.assertUsable('track active cleanup');
    if (typeof cleanup !== 'function') {
      throw new TypeError('Active cleanup must be a function.');
    }
    this.activeCleanups.add(cleanup);
    return () => {
      if (!this.activeCleanups.delete(cleanup)) {
        return false;
      }
      cleanup();
      return true;
    };
  }

  clearActiveCleanups() {
    const errors = [];
    for (const cleanup of [...this.activeCleanups].reverse()) {
      this.activeCleanups.delete(cleanup);
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, 'Retained Pixi view cleanup failed.');
    }
  }

  getRoot() {
    return this.root;
  }

  onBind() {}

  onApplyTheme() {}

  onLayout() {}

  onActivate() {}

  onDeactivate() {}

  onDestroy() {}

  assertUsable(action) {
    if (this.destroyed) {
      throw new Error(`Cannot ${action} a destroyed Pixi view.`);
    }
  }
}
