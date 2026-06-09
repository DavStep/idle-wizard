import { query } from 'bitecs';

import {
  ActiveBrew,
  activeBrewPhaseLabels,
  activeBrewPhases,
} from '../components/BrewingComponents.js';

export class BrewingProcessEntityManager {
  constructor({ itemsFacade }) {
    this.itemsFacade = itemsFacade;
    this.ecsManagers = null;
  }

  initialize(ecsManagers) {
    this.ecsManagers = ecsManagers;
  }

  startBrew({ resultItemTypeId, totalSeconds, bottlingTotalSeconds }) {
    if (this.hasActiveBrew()) {
      return false;
    }

    const entityId = this.ecsManagers.entities.createEntity();
    const safeTotalSeconds = this.toNonNegativeSeconds(totalSeconds);
    this.ecsManagers.components.add(entityId, ActiveBrew);
    ActiveBrew.resultItemTypeId[entityId] = resultItemTypeId;
    ActiveBrew.resultQuantity[entityId] = 1;
    ActiveBrew.phase[entityId] =
      safeTotalSeconds <= 0 ? activeBrewPhases.brewed : activeBrewPhases.brewing;
    ActiveBrew.totalSeconds[entityId] = safeTotalSeconds;
    ActiveBrew.remainingSeconds[entityId] = safeTotalSeconds;
    ActiveBrew.bottlingTotalSeconds[entityId] =
      this.toNonNegativeSeconds(bottlingTotalSeconds);
    return true;
  }

  restoreActiveBrew({
    resultItemTypeId,
    phase = 'brewing',
    totalSeconds,
    remainingSeconds,
    bottlingTotalSeconds = 0,
  }) {
    this.clearActiveBrew();

    const safeTotalSeconds = this.toNonNegativeSeconds(totalSeconds);
    const safeRemainingSeconds = Math.max(
      0,
      Math.min(this.toNonNegativeSeconds(remainingSeconds), safeTotalSeconds),
    );
    const entityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(entityId, ActiveBrew);
    ActiveBrew.resultItemTypeId[entityId] = resultItemTypeId;
    ActiveBrew.resultQuantity[entityId] = 1;
    const normalizedPhase = this.normalizePhase(phase);
    ActiveBrew.phase[entityId] =
      normalizedPhase === activeBrewPhases.brewing && safeRemainingSeconds <= 0
        ? activeBrewPhases.brewed
        : normalizedPhase;
    ActiveBrew.totalSeconds[entityId] = safeTotalSeconds;
    ActiveBrew.remainingSeconds[entityId] = safeRemainingSeconds;
    ActiveBrew.bottlingTotalSeconds[entityId] =
      this.toNonNegativeSeconds(bottlingTotalSeconds);
    return true;
  }

  clearActiveBrew() {
    const entityId = this.getActiveBrewEntityId();

    if (entityId !== null) {
      this.ecsManagers.entities.removeEntity(entityId);
    }
  }

  hasActiveBrew() {
    return this.getActiveBrewEntityId() !== null;
  }

  reduceRemainingSeconds(deltaSeconds) {
    const entityId = this.getActiveBrewEntityId();

    if (entityId === null) {
      return null;
    }

    if (
      ActiveBrew.phase[entityId] === activeBrewPhases.brewed ||
      ActiveBrew.phase[entityId] === activeBrewPhases.ready
    ) {
      return this.getActiveBrewSnapshot();
    }

    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      return this.getActiveBrewSnapshot();
    }

    ActiveBrew.remainingSeconds[entityId] = Math.max(
      0,
      (ActiveBrew.remainingSeconds[entityId] ?? 0) - deltaSeconds,
    );

    return this.getActiveBrewSnapshot();
  }

  advanceTime(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      return this.getActiveBrewSnapshot();
    }

    let remainingDeltaSeconds = deltaSeconds;

    while (remainingDeltaSeconds >= 0) {
      const entityId = this.getActiveBrewEntityId();

      if (entityId === null) {
        return null;
      }

      if (
        ActiveBrew.phase[entityId] === activeBrewPhases.brewed ||
        ActiveBrew.phase[entityId] === activeBrewPhases.ready
      ) {
        return this.getActiveBrewSnapshot();
      }

      const phaseRemainingSeconds = Math.max(
        0,
        ActiveBrew.remainingSeconds[entityId] ?? 0,
      );

      if (remainingDeltaSeconds < phaseRemainingSeconds) {
        ActiveBrew.remainingSeconds[entityId] = phaseRemainingSeconds - remainingDeltaSeconds;
        return this.getActiveBrewSnapshot();
      }

      ActiveBrew.remainingSeconds[entityId] = 0;
      remainingDeltaSeconds -= phaseRemainingSeconds;

      const advanced = this.advanceCompletedPhase();

      if (!advanced || advanced.canStartBottling || advanced.canCollect) {
        return advanced;
      }
    }

    return this.getActiveBrewSnapshot();
  }

  advanceCompletedPhase() {
    const entityId = this.getActiveBrewEntityId();

    if (entityId === null || (ActiveBrew.remainingSeconds[entityId] ?? 0) > 0) {
      return null;
    }

    if (ActiveBrew.phase[entityId] === activeBrewPhases.brewing) {
      ActiveBrew.phase[entityId] = activeBrewPhases.brewed;
      ActiveBrew.remainingSeconds[entityId] = 0;
      return this.getActiveBrewSnapshot();
    }

    if (ActiveBrew.phase[entityId] === activeBrewPhases.brewed) {
      return this.getActiveBrewSnapshot();
    }

    if (ActiveBrew.phase[entityId] === activeBrewPhases.bottling) {
      ActiveBrew.phase[entityId] = activeBrewPhases.ready;
      ActiveBrew.totalSeconds[entityId] = 0;
      ActiveBrew.remainingSeconds[entityId] = 0;
      return this.getActiveBrewSnapshot();
    }

    return null;
  }

  startBottling() {
    const entityId = this.getActiveBrewEntityId();

    if (entityId === null || ActiveBrew.phase[entityId] !== activeBrewPhases.brewed) {
      return null;
    }

    const bottlingTotalSeconds = ActiveBrew.bottlingTotalSeconds[entityId] ?? 0;
    ActiveBrew.phase[entityId] = activeBrewPhases.bottling;
    ActiveBrew.totalSeconds[entityId] = bottlingTotalSeconds;
    ActiveBrew.remainingSeconds[entityId] = bottlingTotalSeconds;
    return this.getActiveBrewSnapshot();
  }

  collectReadyBrew() {
    const entityId = this.getActiveBrewEntityId();

    if (entityId === null || ActiveBrew.phase[entityId] !== activeBrewPhases.ready) {
      return null;
    }

    const result = {
      resultItemTypeId: ActiveBrew.resultItemTypeId[entityId],
      resultQuantity: ActiveBrew.resultQuantity[entityId] || 1,
    };
    this.ecsManagers.entities.removeEntity(entityId);
    return result;
  }

  getActiveBrewSnapshot() {
    const entityId = this.getActiveBrewEntityId();

    if (entityId === null) {
      return null;
    }

    const resultItemTypeId = ActiveBrew.resultItemTypeId[entityId];
    const definition = this.itemsFacade.getItemDefinition(resultItemTypeId);
    const phase = ActiveBrew.phase[entityId] ?? activeBrewPhases.brewing;
    const totalSeconds = ActiveBrew.totalSeconds[entityId] ?? 0;
    const remainingSeconds = ActiveBrew.remainingSeconds[entityId] ?? 0;

    return {
      resultItemTypeId,
      key: definition.key,
      label: definition.label,
      phase: activeBrewPhaseLabels[phase] ?? 'brewing',
      canStartBottling: phase === activeBrewPhases.brewed,
      canCollect: phase === activeBrewPhases.ready,
      remainingMs: Math.ceil(remainingSeconds * 1_000),
      totalMs: Math.ceil(totalSeconds * 1_000),
      bottlingTotalMs: Math.ceil((ActiveBrew.bottlingTotalSeconds[entityId] ?? 0) * 1_000),
      progress:
        totalSeconds <= 0 ? 1 : Math.min(1, (totalSeconds - remainingSeconds) / totalSeconds),
    };
  }

  getActiveBrewEntityId() {
    return query(this.ecsManagers.world.getWorld(), [ActiveBrew])[0] ?? null;
  }

  normalizePhase(phase) {
    if (typeof phase === 'number' && activeBrewPhaseLabels[phase]) {
      return phase;
    }

    if (phase === 'bottling') {
      return activeBrewPhases.bottling;
    }

    if (phase === 'brewed') {
      return activeBrewPhases.brewed;
    }

    if (phase === 'ready') {
      return activeBrewPhases.ready;
    }

    return activeBrewPhases.brewing;
  }

  toNonNegativeSeconds(value) {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
}
