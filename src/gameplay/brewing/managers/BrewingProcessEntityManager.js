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

  startBrew({ resultItemTypeId, totalSeconds, bottlingTotalSeconds, cauldronIndex = 0 }) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (this.hasActiveBrew(safeCauldronIndex)) {
      return false;
    }

    const entityId = this.ecsManagers.entities.createEntity();
    const safeTotalSeconds = this.toNonNegativeSeconds(totalSeconds);
    this.ecsManagers.components.add(entityId, ActiveBrew);
    ActiveBrew.cauldronIndex[entityId] = safeCauldronIndex;
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
    cauldronIndex = 0,
    resultItemTypeId,
    phase = 'brewing',
    totalSeconds,
    remainingSeconds,
    bottlingTotalSeconds = 0,
  }) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    this.clearActiveBrew(safeCauldronIndex);

    const safeTotalSeconds = this.toNonNegativeSeconds(totalSeconds);
    const safeRemainingSeconds = Math.max(
      0,
      Math.min(this.toNonNegativeSeconds(remainingSeconds), safeTotalSeconds),
    );
    const entityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(entityId, ActiveBrew);
    ActiveBrew.cauldronIndex[entityId] = safeCauldronIndex;
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

  clearActiveBrew(cauldronIndex = 0) {
    const entityId = this.getActiveBrewEntityId(cauldronIndex);

    if (entityId !== null) {
      this.ecsManagers.entities.removeEntity(entityId);
    }
  }

  clearAllActiveBrews() {
    for (const entityId of this.getActiveBrewEntityIds()) {
      this.ecsManagers.entities.removeEntity(entityId);
    }
  }

  hasActiveBrew(cauldronIndex = 0) {
    return this.getActiveBrewEntityId(cauldronIndex) !== null;
  }

  reduceRemainingSeconds(deltaSeconds, cauldronIndex = 0) {
    const entityId = this.getActiveBrewEntityId(cauldronIndex);

    if (entityId === null) {
      return null;
    }

    if (
      ActiveBrew.phase[entityId] === activeBrewPhases.brewed ||
      ActiveBrew.phase[entityId] === activeBrewPhases.ready
    ) {
      return this.getActiveBrewSnapshot(cauldronIndex);
    }

    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      return this.getActiveBrewSnapshot(cauldronIndex);
    }

    ActiveBrew.remainingSeconds[entityId] = Math.max(
      0,
      (ActiveBrew.remainingSeconds[entityId] ?? 0) - deltaSeconds,
    );

    return this.getActiveBrewSnapshot(cauldronIndex);
  }

  advanceTime(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      return this.getActiveBrewSnapshot();
    }

    for (const entityId of this.getActiveBrewEntityIds()) {
      this.advanceTimeForEntity(entityId, deltaSeconds);
    }

    return this.getActiveBrewSnapshot();
  }

  advanceTimeForEntity(entityId, deltaSeconds) {
    let remainingDeltaSeconds = deltaSeconds;

    while (remainingDeltaSeconds >= 0) {
      if (
        ActiveBrew.phase[entityId] === activeBrewPhases.brewed ||
        ActiveBrew.phase[entityId] === activeBrewPhases.ready
      ) {
        return this.getActiveBrewSnapshotForEntity(entityId);
      }

      const phaseRemainingSeconds = Math.max(
        0,
        ActiveBrew.remainingSeconds[entityId] ?? 0,
      );

      if (remainingDeltaSeconds < phaseRemainingSeconds) {
        ActiveBrew.remainingSeconds[entityId] = phaseRemainingSeconds - remainingDeltaSeconds;
        return this.getActiveBrewSnapshotForEntity(entityId);
      }

      ActiveBrew.remainingSeconds[entityId] = 0;
      remainingDeltaSeconds -= phaseRemainingSeconds;

      const advanced = this.advanceCompletedPhaseForEntity(entityId);

      if (!advanced || advanced.canStartBottling || advanced.canCollect) {
        return advanced;
      }
    }

    return this.getActiveBrewSnapshotForEntity(entityId);
  }

  advanceCompletedPhase(cauldronIndex = 0) {
    const entityId = this.getActiveBrewEntityId(cauldronIndex);

    if (entityId === null) {
      return null;
    }

    return this.advanceCompletedPhaseForEntity(entityId);
  }

  advanceCompletedPhaseForEntity(entityId) {
    const cauldronIndex = ActiveBrew.cauldronIndex[entityId] ?? 0;

    if ((ActiveBrew.remainingSeconds[entityId] ?? 0) > 0) {
      return null;
    }

    if (ActiveBrew.phase[entityId] === activeBrewPhases.brewing) {
      ActiveBrew.phase[entityId] = activeBrewPhases.brewed;
      ActiveBrew.remainingSeconds[entityId] = 0;
      return this.getActiveBrewSnapshot(cauldronIndex);
    }

    if (ActiveBrew.phase[entityId] === activeBrewPhases.brewed) {
      return this.getActiveBrewSnapshot(cauldronIndex);
    }

    if (ActiveBrew.phase[entityId] === activeBrewPhases.bottling) {
      ActiveBrew.phase[entityId] = activeBrewPhases.ready;
      ActiveBrew.totalSeconds[entityId] = 0;
      ActiveBrew.remainingSeconds[entityId] = 0;
      return this.getActiveBrewSnapshot(cauldronIndex);
    }

    return null;
  }

  startBottling(cauldronIndex = 0) {
    const entityId = this.getActiveBrewEntityId(cauldronIndex);

    if (entityId === null || ActiveBrew.phase[entityId] !== activeBrewPhases.brewed) {
      return null;
    }

    const bottlingTotalSeconds = ActiveBrew.bottlingTotalSeconds[entityId] ?? 0;
    ActiveBrew.phase[entityId] = activeBrewPhases.bottling;
    ActiveBrew.totalSeconds[entityId] = bottlingTotalSeconds;
    ActiveBrew.remainingSeconds[entityId] = bottlingTotalSeconds;
    return this.getActiveBrewSnapshot(cauldronIndex);
  }

  collectReadyBrew(cauldronIndex = 0) {
    const entityId = this.getActiveBrewEntityId(cauldronIndex);

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

  getActiveBrewSnapshot(cauldronIndex = 0) {
    const entityId = this.getActiveBrewEntityId(cauldronIndex);

    if (entityId === null) {
      return null;
    }

    return this.getActiveBrewSnapshotForEntity(entityId);
  }

  getActiveBrewSnapshots() {
    return this.getActiveBrewEntityIds().map((entityId) =>
      this.getActiveBrewSnapshotForEntity(entityId),
    );
  }

  getActiveBrewSnapshotForEntity(entityId) {
    const resultItemTypeId = ActiveBrew.resultItemTypeId[entityId];
    const definition = this.itemsFacade.getItemDefinition(resultItemTypeId);
    const phase = ActiveBrew.phase[entityId] ?? activeBrewPhases.brewing;
    const totalSeconds = ActiveBrew.totalSeconds[entityId] ?? 0;
    const remainingSeconds = ActiveBrew.remainingSeconds[entityId] ?? 0;
    const cauldronIndex = ActiveBrew.cauldronIndex[entityId] ?? 0;

    return {
      cauldronIndex,
      cauldronNumber: cauldronIndex + 1,
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

  getActiveBrewEntityId(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    return (
      query(this.ecsManagers.world.getWorld(), [ActiveBrew]).find(
        (entityId) => (ActiveBrew.cauldronIndex[entityId] ?? 0) === safeCauldronIndex,
      ) ?? null
    );
  }

  getActiveBrewEntityIds() {
    return query(this.ecsManagers.world.getWorld(), [ActiveBrew])
      .slice()
      .sort(
        (left, right) =>
          (ActiveBrew.cauldronIndex[left] ?? 0) -
          (ActiveBrew.cauldronIndex[right] ?? 0),
      );
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

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
