import { RetainedViewLifecycle, assertRetainedView } from './RetainedView.js';
import {
  assertRetainedUiCounters,
  incrementRetainedUiCounter,
  RETAINED_UI_COUNTERS,
} from './RetainedUiCounters.js';

/**
 * Registers dialog factories, constructs each dialog at most once, and retains
 * closed instances for their next open.
 */
export class DialogRegistry {
  /**
   * @param {{
   *   dialogs?: Iterable<[string, () => import('./RetainedView.js').RetainedView]>,
   *   counters?: import('./RetainedUiCounters.js').RetainedUiCounters | null,
   *   onOpen?: ((dialogId: string) => void) | null,
   * }} [options]
   */
  constructor({ dialogs = [], counters = null, onOpen = null } = {}) {
    this.counters = assertRetainedUiCounters(counters);
    this.onOpen = typeof onOpen === 'function' ? onOpen : null;
    this.factories = new Map();
    this.dialogs = new Map();
    this.openDialogIds = [];
    this.themeSnapshot = undefined;
    this.viewportProjection = undefined;
    this.hasThemeSnapshot = false;
    this.hasViewportProjection = false;
    this.destroyed = false;

    for (const [dialogId, factory] of dialogs) {
      this.register(dialogId, factory);
    }
  }

  register(dialogId, factory) {
    this.assertUsable('register dialogs');
    const safeDialogId = validateId(dialogId);

    if (this.factories.has(safeDialogId)) {
      throw new Error(`Dialog "${safeDialogId}" is already registered.`);
    }

    if (typeof factory !== 'function') {
      throw new TypeError(`Dialog "${safeDialogId}" requires a factory function.`);
    }

    this.factories.set(safeDialogId, factory);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.DIALOG_REGISTERED,
    );
  }

  has(dialogId) {
    return this.factories.has(dialogId);
  }

  hasInstance(dialogId) {
    return this.dialogs.has(dialogId);
  }

  isOpen(dialogId) {
    return this.openDialogIds.includes(dialogId);
  }

  get(dialogId) {
    return this.getLifecycle(dialogId, { create: false })?.getView() ?? null;
  }

  getDialogIds() {
    return Object.freeze([...this.factories.keys()]);
  }

  getOpenDialogIds() {
    return Object.freeze([...this.openDialogIds]);
  }

  getTopDialogId() {
    return this.openDialogIds.at(-1) ?? null;
  }

  open(dialogId, viewModel) {
    this.assertUsable('open dialogs');
    const safeDialogId = validateId(dialogId);
    const lifecycle = this.getLifecycle(safeDialogId, { create: true });

    lifecycle.bind(viewModel);

    if (lifecycle.activate()) {
      this.openDialogIds.push(safeDialogId);
      incrementRetainedUiCounter(
        this.counters,
        RETAINED_UI_COUNTERS.DIALOG_OPENED,
      );
      this.onOpen?.(safeDialogId);
    } else {
      moveToEnd(this.openDialogIds, safeDialogId);
    }

    // Keep the visual display order identical to the logical modal stack.
    // Dialog instances are retained, so reopening one must raise its existing
    // root instead of rebuilding it or leaving it behind a newer sibling.
    const view = lifecycle.getView();
    const root = view?.getRoot?.() ?? view?.root;
    root?.parent?.addChild?.(root);

    return view;
  }

  refresh(dialogId, viewModel) {
    this.assertUsable('refresh dialogs');
    const safeDialogId = validateId(dialogId);

    if (!this.factories.has(safeDialogId)) {
      throw new Error(`Unknown dialog: ${safeDialogId}`);
    }

    if (!this.isOpen(safeDialogId)) {
      return false;
    }

    const lifecycle = this.dialogs.get(safeDialogId);
    lifecycle.bind(viewModel);
    return lifecycle.getView();
  }

  close(dialogId) {
    this.assertUsable('close dialogs');
    const safeDialogId = validateId(dialogId);

    if (!this.factories.has(safeDialogId)) {
      throw new Error(`Unknown dialog: ${safeDialogId}`);
    }

    const lifecycle = this.dialogs.get(safeDialogId);

    if (!lifecycle?.deactivate()) {
      return false;
    }

    removeValue(this.openDialogIds, safeDialogId);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.DIALOG_CLOSED,
    );
    return true;
  }

  closeTop() {
    const topDialogId = this.getTopDialogId();
    return topDialogId === null ? false : this.close(topDialogId);
  }

  closeAll() {
    this.assertUsable('close dialogs');
    const dialogIds = [...this.openDialogIds].reverse();

    for (const dialogId of dialogIds) {
      this.close(dialogId);
    }

    return dialogIds.length;
  }

  applyTheme(themeSnapshot) {
    this.assertUsable('apply dialog themes');
    this.themeSnapshot = themeSnapshot;
    this.hasThemeSnapshot = true;

    for (const lifecycle of this.dialogs.values()) {
      lifecycle.applyTheme(themeSnapshot);
    }
  }

  layout(viewportProjection) {
    this.assertUsable('lay out dialogs');
    this.viewportProjection = viewportProjection;
    this.hasViewportProjection = true;

    for (const lifecycle of this.dialogs.values()) {
      lifecycle.layout(viewportProjection);
    }
  }

  destroy() {
    if (this.destroyed) {
      return false;
    }

    const errors = [];

    for (const lifecycle of this.dialogs.values()) {
      try {
        lifecycle.destroy();
      } catch (error) {
        errors.push(error);
      }
    }

    this.dialogs.clear();
    this.factories.clear();
    this.openDialogIds.length = 0;
    this.onOpen = null;
    this.destroyed = true;
    throwRegistryErrors(errors, 'Failed to destroy one or more retained dialogs.');
    return true;
  }

  getStats() {
    return Object.freeze({
      registered: this.factories.size,
      constructed: this.dialogs.size,
      open: this.openDialogIds.length,
      destroyed: this.destroyed,
    });
  }

  getLifecycle(dialogId, { create }) {
    this.assertUsable('access dialogs');
    const safeDialogId = validateId(dialogId);

    if (!this.factories.has(safeDialogId)) {
      throw new Error(`Unknown dialog: ${safeDialogId}`);
    }

    const existingLifecycle = this.dialogs.get(safeDialogId);

    if (existingLifecycle || !create) {
      return existingLifecycle ?? null;
    }

    const dialog = this.factories.get(safeDialogId)();
    assertRetainedView(dialog, { label: `dialog "${safeDialogId}"` });
    const lifecycle = new RetainedViewLifecycle(dialog, {
      label: `dialog "${safeDialogId}"`,
      counters: this.counters,
    });

    try {
      if (this.hasThemeSnapshot) {
        lifecycle.applyTheme(this.themeSnapshot);
      }

      if (this.hasViewportProjection) {
        lifecycle.layout(this.viewportProjection);
      }
    } catch (error) {
      try {
        lifecycle.destroy();
      } catch (destroyError) {
        throw new AggregateError(
          [error, destroyError],
          `Failed to initialize dialog "${safeDialogId}".`,
        );
      }

      throw error;
    }

    this.dialogs.set(safeDialogId, lifecycle);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.DIALOG_CREATED,
    );
    return lifecycle;
  }

  assertUsable(action) {
    if (this.destroyed) {
      throw new Error(`Cannot ${action} after the dialog registry is destroyed.`);
    }
  }
}

function validateId(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('Dialog ids must be non-empty strings.');
  }

  return value;
}

function moveToEnd(values, value) {
  removeValue(values, value);
  values.push(value);
}

function removeValue(values, value) {
  const index = values.indexOf(value);

  if (index >= 0) {
    values.splice(index, 1);
  }
}

function throwRegistryErrors(errors, message) {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}
