import { PlayerResearch } from '../components/ResearchComponents.js';

export class ResearchStateEntityManager {
  constructor({ researchDefinitionManager }) {
    this.researchDefinitionManager = researchDefinitionManager;
    this.entityIdsByResearchId = new Map();
    this.ecsManagers = null;
  }

  initialize(ecsManagers) {
    this.ecsManagers = ecsManagers;
    this.syncResearchEntities();
  }

  syncResearchEntities() {
    if (!this.ecsManagers) {
      return;
    }

    for (const research of this.researchDefinitionManager.getResearches({
      includeLevelLockedAutomation: true,
    })) {
      if (this.entityIdsByResearchId.has(research.id)) {
        continue;
      }

      const entityId = this.ecsManagers.entities.createEntity();
      this.ecsManagers.components.add(entityId, PlayerResearch);
      PlayerResearch.researchId[entityId] = research.id;
      PlayerResearch.isCompleted[entityId] = 0;
      PlayerResearch.isInProgress[entityId] = 0;
      PlayerResearch.totalSeconds[entityId] = 0;
      PlayerResearch.remainingSeconds[entityId] = 0;
      this.entityIdsByResearchId.set(research.id, entityId);
    }
  }

  isCompleted(researchId) {
    this.syncResearchEntities();
    return PlayerResearch.isCompleted[this.getEntityId(this.normalizeResearchId(researchId))] === 1;
  }

  isInProgress(researchId) {
    this.syncResearchEntities();
    return (
      PlayerResearch.isInProgress[this.getEntityId(this.normalizeResearchId(researchId))] === 1
    );
  }

  start(researchId, durationSeconds) {
    this.syncResearchEntities();
    const entityId = this.getEntityId(this.normalizeResearchId(researchId));
    const safeDurationSeconds = this.normalizeDurationSeconds(durationSeconds);

    if (safeDurationSeconds <= 0) {
      this.complete(researchId);
      return;
    }

    PlayerResearch.isCompleted[entityId] = 0;
    PlayerResearch.isInProgress[entityId] = 1;
    PlayerResearch.totalSeconds[entityId] = safeDurationSeconds;
    PlayerResearch.remainingSeconds[entityId] = safeDurationSeconds;
  }

  complete(researchId) {
    this.syncResearchEntities();
    const entityId = this.getEntityId(this.normalizeResearchId(researchId));

    PlayerResearch.isCompleted[entityId] = 1;
    PlayerResearch.isInProgress[entityId] = 0;
    PlayerResearch.totalSeconds[entityId] = 0;
    PlayerResearch.remainingSeconds[entityId] = 0;
  }

  advanceTime(deltaSeconds) {
    this.syncResearchEntities();

    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return [];
    }

    const completedResearchIds = [];

    for (const researchId of this.entityIdsByResearchId.keys()) {
      const entityId = this.getEntityId(researchId);

      if (PlayerResearch.isInProgress[entityId] !== 1) {
        continue;
      }

      const remainingSeconds = Math.max(
        0,
        (PlayerResearch.remainingSeconds[entityId] ?? 0) - deltaSeconds,
      );
      PlayerResearch.remainingSeconds[entityId] = remainingSeconds;

      if (remainingSeconds > 0) {
        continue;
      }

      this.complete(researchId);
      completedResearchIds.push(researchId);
    }

    return completedResearchIds;
  }

  setCompletedResearchIds(researchIds = []) {
    this.syncResearchEntities();

    for (const researchId of this.entityIdsByResearchId.keys()) {
      const entityId = this.getEntityId(researchId);
      PlayerResearch.isCompleted[entityId] = 0;
      PlayerResearch.isInProgress[entityId] = 0;
      PlayerResearch.totalSeconds[entityId] = 0;
      PlayerResearch.remainingSeconds[entityId] = 0;
    }

    for (const researchId of researchIds) {
      const normalizedResearchId = this.normalizeResearchId(researchId);

      if (!this.researchDefinitionManager.hasConfiguredResearch(normalizedResearchId)) {
        continue;
      }

      PlayerResearch.isCompleted[this.getEntityId(normalizedResearchId)] = 1;
    }
  }

  setInProgressResearches(researches = []) {
    this.syncResearchEntities();

    for (const progress of researches) {
      const normalizedResearchId = this.normalizeResearchId(progress?.researchId);

      if (
        !normalizedResearchId ||
        !this.researchDefinitionManager.hasConfiguredResearch(normalizedResearchId) ||
        this.isCompleted(normalizedResearchId)
      ) {
        continue;
      }

      const totalSeconds = this.normalizeDurationSeconds(progress?.totalSeconds);
      const remainingSeconds = this.normalizeDurationSeconds(progress?.remainingSeconds);

      if (totalSeconds <= 0 || remainingSeconds <= 0) {
        continue;
      }

      const entityId = this.getEntityId(normalizedResearchId);
      PlayerResearch.isInProgress[entityId] = 1;
      PlayerResearch.totalSeconds[entityId] = totalSeconds;
      PlayerResearch.remainingSeconds[entityId] = Math.min(remainingSeconds, totalSeconds);
    }
  }

  getCompletedResearchIds() {
    this.syncResearchEntities();

    return [...this.entityIdsByResearchId.keys()].filter((researchId) =>
      this.isCompleted(researchId),
    );
  }

  getInProgressResearches() {
    this.syncResearchEntities();

    return [...this.entityIdsByResearchId.keys()]
      .map((researchId) => ({
        researchId,
        ...this.getProgressSnapshot(researchId),
      }))
      .filter((progress) => progress.inProgress)
      .map((progress) => ({
        researchId: progress.researchId,
        totalSeconds: progress.totalSeconds,
        remainingSeconds: progress.remainingSeconds,
      }));
  }

  getProgressSnapshot(researchId) {
    this.syncResearchEntities();
    const entityId = this.getEntityId(this.normalizeResearchId(researchId));

    if (PlayerResearch.isInProgress[entityId] !== 1) {
      return {
        inProgress: false,
        totalSeconds: 0,
        remainingSeconds: 0,
        progress: 0,
      };
    }

    const totalSeconds = Math.max(0, PlayerResearch.totalSeconds[entityId] ?? 0);
    const remainingSeconds = Math.max(0, PlayerResearch.remainingSeconds[entityId] ?? 0);

    return {
      inProgress: true,
      totalSeconds,
      remainingSeconds,
      progress: totalSeconds > 0 ? Math.min(1, 1 - remainingSeconds / totalSeconds) : 1,
    };
  }

  getEntityId(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    const entityId = this.entityIdsByResearchId.get(normalizedResearchId);

    if (entityId === undefined) {
      throw new Error(`Unknown research: ${normalizedResearchId}`);
    }

    return entityId;
  }

  normalizeResearchId(researchId) {
    return this.researchDefinitionManager.normalizeResearchId(researchId);
  }

  normalizeDurationSeconds(durationSeconds) {
    const value = Number(durationSeconds);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return value;
  }
}
