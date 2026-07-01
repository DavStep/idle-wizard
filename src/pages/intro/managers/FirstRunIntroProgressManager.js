export const FIRST_RUN_INTRO_STORAGE_KEY = 'idle-wizard.firstRunIntro.v1';

const INTRO_STATE_PENDING = 'pending';
const INTRO_STATE_COMPLETE = 'complete';

export class FirstRunIntroProgressManager {
  constructor({ storage = globalThis.localStorage } = {}) {
    this.storage = storage;
  }

  isPending() {
    return this.readState() === INTRO_STATE_PENDING;
  }

  markPending() {
    this.writeState(INTRO_STATE_PENDING);
  }

  markComplete() {
    this.writeState(INTRO_STATE_COMPLETE);
  }

  reset() {
    this.markPending();
  }

  readState() {
    try {
      const raw = this.storage?.getItem?.(FIRST_RUN_INTRO_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.state === INTRO_STATE_PENDING || parsed?.state === INTRO_STATE_COMPLETE
        ? parsed.state
        : null;
    } catch {
      return null;
    }
  }

  writeState(state) {
    try {
      this.storage?.setItem?.(
        FIRST_RUN_INTRO_STORAGE_KEY,
        JSON.stringify({ state }),
      );
    } catch {
      // Intro progress is UI guidance; storage failures should not block play.
    }
  }
}
