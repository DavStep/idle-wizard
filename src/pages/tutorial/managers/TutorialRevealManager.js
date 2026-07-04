export class TutorialRevealManager {
  constructor() {
    this.stage = null;
    this.revealedTokens = new Set();
    this.summonRevealTimeoutId = null;
  }

  setStage(stage) {
    this.clear();
    this.stage = stage ?? null;
    this.revealedTokens = new Set();
  }

  update({ step, revealTokens } = {}) {
    if (!this.stage) {
      return;
    }

    const sourceTokens = Array.isArray(revealTokens)
      ? revealTokens
      : Array.isArray(step?.revealTokens)
        ? step.revealTokens
        : null;

    if (!sourceTokens) {
      this.clear();
      return;
    }

    const tokens = sourceTokens.filter((token) => typeof token === 'string' && token.length > 0);
    const tokenSet = new Set(tokens);
    const shouldPlaySummonReveal =
      tokenSet.has(SUMMON_REVEAL_TOKEN) && !this.revealedTokens.has(SUMMON_REVEAL_TOKEN);

    this.stage.dataset.tutorialReveal = tokens.join(' ');

    const targetId = step?.targetId;

    if (typeof targetId === 'string' && targetId.length > 0) {
      this.stage.dataset.tutorialTargetId = targetId;
    } else {
      delete this.stage.dataset.tutorialTargetId;
    }

    this.revealedTokens = tokenSet;

    if (shouldPlaySummonReveal) {
      this.playSummonReveal();
    }
  }

  playSummonReveal() {
    this.clearSummonReveal();
    this.stage?.classList.add(SUMMON_REVEAL_CLASS);

    const view = this.getWindow();

    if (typeof view?.setTimeout !== 'function') {
      return;
    }

    this.summonRevealTimeoutId = view.setTimeout(() => {
      this.summonRevealTimeoutId = null;
      this.stage?.classList.remove(SUMMON_REVEAL_CLASS);
    }, SUMMON_REVEAL_MS);
    this.summonRevealTimeoutId?.unref?.();
  }

  clearSummonReveal() {
    if (this.summonRevealTimeoutId !== null) {
      this.getWindow()?.clearTimeout?.(this.summonRevealTimeoutId);
      this.summonRevealTimeoutId = null;
    }

    this.stage?.classList.remove(SUMMON_REVEAL_CLASS);
  }

  clear() {
    if (!this.stage) {
      this.revealedTokens = new Set();
      return;
    }

    this.clearSummonReveal();
    delete this.stage.dataset.tutorialReveal;
    delete this.stage.dataset.tutorialTargetId;
    this.revealedTokens = new Set();
  }

  getWindow() {
    return this.stage?.ownerDocument?.defaultView ?? globalThis.window;
  }

}

const SUMMON_REVEAL_TOKEN = 'summon';
const SUMMON_REVEAL_CLASS = 'is-tutorial-summon-revealing';
const SUMMON_REVEAL_MS = 760;
