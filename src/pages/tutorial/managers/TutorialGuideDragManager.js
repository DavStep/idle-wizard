const ELARA_PLACEMENT_STORAGE_KEY = 'idle-wizard.tutorial.elaraPlacement.v1';

export class TutorialGuideDragManager {
  constructor({ storage = getDefaultStorage() } = {}) {
    this.storage = storage;
    this.placement = null;
    this.load();
  }

  getPlacement() {
    return this.placement ? { ...this.placement } : null;
  }

  setPlacement(placement, { save = true } = {}) {
    const nextPlacement = normalizePlacement(placement);

    if (!nextPlacement) {
      return;
    }

    this.placement = nextPlacement;

    if (save) {
      this.save();
    }
  }

  load() {
    try {
      const raw = this.storage?.getItem?.(ELARA_PLACEMENT_STORAGE_KEY);
      this.placement = normalizePlacement(raw ? JSON.parse(raw) : null);
    } catch {
      this.placement = null;
    }
  }

  save() {
    if (!this.placement) {
      return;
    }

    try {
      this.storage?.setItem?.(ELARA_PLACEMENT_STORAGE_KEY, JSON.stringify(this.placement));
    } catch {
      // Elara placement is only a local UI preference; storage failures should not block play.
    }
  }
}

function normalizePlacement(placement) {
  const buttonLeft = Number(placement?.buttonLeft);
  const buttonTop = Number(placement?.buttonTop);

  if (!Number.isFinite(buttonLeft) || !Number.isFinite(buttonTop)) {
    return null;
  }

  return {
    buttonLeft: Math.round(buttonLeft),
    buttonTop: Math.round(buttonTop),
  };
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
