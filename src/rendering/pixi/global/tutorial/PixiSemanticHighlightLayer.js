import { RenderLayer } from 'pixi.js';

import { resolveSemanticTutorialTarget } from './TutorialPixiGeometry.js';

/**
 * Shared retained target-promotion layer used by tutorial and focused action
 * scenes. Targets remain in their owning scene graph and render exactly once
 * above the caller's uninterrupted dim backdrop.
 */
export class PixiSemanticHighlightLayer {
  constructor({ semanticRegistry = null, label = 'semanticHighlightLayer' } = {}) {
    this.semanticRegistry = semanticRegistry;
    this.layer = new RenderLayer();
    this.layer.label = label;
    this.targets = new Map();
  }

  sync(targetIds = [], { active = true } = {}) {
    const nextTargets = new Set();

    if (active) {
      for (const targetId of targetIds) {
        const snapshot = resolveSemanticTutorialTarget(
          this.semanticRegistry,
          targetId,
        );
        const target = snapshot?.displayObject;
        if (
          target?.parent &&
          target.destroyed !== true &&
          snapshot.state?.active !== false &&
          snapshot.state?.visible !== false
        ) {
          nextTargets.add(target);
        }
      }
    }

    for (const target of this.targets.keys()) {
      if (!nextTargets.has(target)) {
        this.release(target);
      }
    }
    for (const target of nextTargets) {
      if (this.targets.has(target)) {
        continue;
      }
      const previousLayer = target.parentRenderLayer ?? null;
      this.layer.attach(target);
      this.targets.set(target, previousLayer);
    }

    return nextTargets.size;
  }

  release(target) {
    const previousLayer = this.targets.get(target) ?? null;
    if (target?.parentRenderLayer === this.layer) {
      this.layer.detach(target);
    }
    if (
      previousLayer &&
      previousLayer.destroyed !== true &&
      target?.parent
    ) {
      previousLayer.attach(target);
    }
    this.targets.delete(target);
  }

  clear() {
    for (const target of [...this.targets.keys()]) {
      this.release(target);
    }
  }
}
