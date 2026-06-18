export class TutorialRevealManager {
  constructor() {
    this.stage = null;
  }

  setStage(stage) {
    this.clear();
    this.stage = stage ?? null;
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

    this.stage.dataset.tutorialReveal = tokens.join(' ');

    const targetId = step?.targetId;

    if (typeof targetId === 'string' && targetId.length > 0) {
      this.stage.dataset.tutorialTargetId = targetId;
    } else {
      delete this.stage.dataset.tutorialTargetId;
    }
  }

  clear() {
    if (!this.stage) {
      return;
    }

    delete this.stage.dataset.tutorialReveal;
    delete this.stage.dataset.tutorialTargetId;
  }

}
