export class TutorialRevealManager {
  constructor() {
    this.stage = null;
  }

  setStage(stage) {
    this.clear();
    this.stage = stage ?? null;
  }

  update({ step, revealTokens = step?.revealTokens ?? [] } = {}) {
    if (!this.stage) {
      return;
    }

    const tokens = Array.isArray(revealTokens)
      ? revealTokens.filter((token) => typeof token === 'string' && token.length > 0)
      : [];

    if (tokens.length === 0) {
      this.clear();
      return;
    }

    this.stage.dataset.tutorialReveal = tokens.join(' ');
  }

  clear() {
    if (!this.stage) {
      return;
    }

    delete this.stage.dataset.tutorialReveal;
  }

}
