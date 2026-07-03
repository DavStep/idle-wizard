import {
  normalizePrestigeRunFocus,
  prestigeRunFocusOptions,
} from '../prestigeUnlocks.js';

export class PrestigeRunFocusManager {
  constructor() {
    this.runFocus = 'none';
  }

  setRunFocus(focusId, { unlocked = true } = {}) {
    const runFocus = unlocked ? normalizePrestigeRunFocus(focusId) : 'none';
    this.runFocus = runFocus;

    return {
      ok: true,
      runFocus,
    };
  }

  getRunFocus() {
    return this.runFocus;
  }

  getSnapshot({ unlocked = false } = {}) {
    return {
      unlocked: unlocked === true,
      selected: unlocked === true ? this.runFocus : 'none',
      options: prestigeRunFocusOptions,
    };
  }

  applyPersistenceSnapshot(snapshot = {}, { unlocked = true } = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      this.runFocus = 'none';
      return;
    }

    this.setRunFocus(snapshot.runFocus, { unlocked });
  }
}
