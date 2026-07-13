import { PlayerResearch } from '../components/ResearchComponents.js';

const DEFAULT_COMPLETED_RESEARCH_IDS = ['unlockSeed:sageSeed'];

export class ResearchStateEntityManager {
  constructor({
    defaultCompletedResearchIds = DEFAULT_COMPLETED_RESEARCH_IDS,
    researchDefinitionManager,
  }) {
    this.researchDefinitionManager = researchDefinitionManager;
    this.defaultCompletedResearchIds = defaultCompletedResearchIds;
    this.entityIdsByResearchId = new Map();
    this.crystalCostsByResearchId = new Map();
    this.ecsManagers = null;
    this.researchEntitiesSynced = false;
  }

  initialize(ecsManagers) {
    this.ecsManagers = ecsManagers;
    this.syncResearchEntities();
  }

  syncResearchEntities() {
    if (!this.ecsManagers) {
      return;
    }

    if (this.researchEntitiesSynced) {
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

    this.researchEntitiesSynced = true;
    this.applyDefaultCompletedResearch();
  }

  isCompleted(researchId) {
    this.syncResearchEntities();
    const entityId = this.getKnownEntityId(researchId);
    return entityId !== undefined && PlayerResearch.isCompleted[entityId] === 1;
  }

  isInProgress(researchId) {
    this.syncResearchEntities();
    const entityId = this.getKnownEntityId(researchId);
    return entityId !== undefined && PlayerResearch.isInProgress[entityId] === 1;
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

    for (const researchId of this.withDefaultCompletedResearchIds(researchIds)) {
      const normalizedResearchId = this.normalizeResearchId(researchId);

      if (!this.researchDefinitionManager.hasConfiguredResearch(normalizedResearchId)) {
        continue;
      }

      const entityId = this.getKnownEntityId(normalizedResearchId);
      if (entityId === undefined) {
        continue;
      }

      PlayerResearch.isCompleted[entityId] = 1;
    }
  }

  applyDefaultCompletedResearch() {
    for (const researchId of this.defaultCompletedResearchIds) {
      const normalizedResearchId = this.normalizeResearchId(researchId);

      if (!this.researchDefinitionManager.hasConfiguredResearch(normalizedResearchId)) {
        continue;
      }

      const entityId = this.getKnownEntityId(normalizedResearchId);
      if (entityId === undefined) {
        continue;
      }

      PlayerResearch.isCompleted[entityId] = 1;
      PlayerResearch.isInProgress[entityId] = 0;
      PlayerResearch.totalSeconds[entityId] = 0;
      PlayerResearch.remainingSeconds[entityId] = 0;
    }
  }

  withDefaultCompletedResearchIds(researchIds = []) {
    return [...new Set([...this.defaultCompletedResearchIds, ...researchIds])];
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

    const completedResearchIds = [];

    for (const [researchId, entityId] of this.entityIdsByResearchId.entries()) {
      if (PlayerResearch.isCompleted[entityId] === 1) {
        completedResearchIds.push(researchId);
      }
    }

    return completedResearchIds;
  }

  getInProgressResearches() {
    this.syncResearchEntities();

    const inProgressResearches = [];

    for (const [researchId, entityId] of this.entityIdsByResearchId.entries()) {
      if (PlayerResearch.isInProgress[entityId] !== 1) {
        continue;
      }

      inProgressResearches.push({
        researchId,
        totalSeconds: Math.max(0, PlayerResearch.totalSeconds[entityId] ?? 0),
        remainingSeconds: Math.max(0, PlayerResearch.remainingSeconds[entityId] ?? 0),
      });
    }

    return inProgressResearches;
  }

  setCrystalCostsByResearchId(costsByResearchId = {}) {
    this.syncResearchEntities();
    this.crystalCostsByResearchId.clear();

    if (!costsByResearchId || typeof costsByResearchId !== 'object') {
      return;
    }

    for (const [researchId, cost] of Object.entries(costsByResearchId)) {
      const normalizedResearchId = this.normalizeResearchId(researchId);
      const safeCost = Math.floor(Number(cost));

      if (
        !this.entityIdsByResearchId.has(normalizedResearchId) ||
        !Number.isFinite(safeCost) ||
        safeCost < 0 ||
        (!this.isCompleted(normalizedResearchId) && !this.isInProgress(normalizedResearchId))
      ) {
        continue;
      }

      this.crystalCostsByResearchId.set(normalizedResearchId, safeCost);
    }
  }

  recordCrystalCost(researchId, cost) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    const safeCost = Math.floor(Number(cost));

    if (
      !this.entityIdsByResearchId.has(normalizedResearchId) ||
      !Number.isFinite(safeCost) ||
      safeCost < 0
    ) {
      return;
    }

    this.crystalCostsByResearchId.set(normalizedResearchId, safeCost);
  }

  getCrystalCost(researchId) {
    return this.crystalCostsByResearchId.get(this.normalizeResearchId(researchId));
  }

  getCrystalCostsByResearchId() {
    const committedResearchIds = new Set([
      ...this.getCompletedResearchIds(),
      ...this.getInProgressResearches().map((research) => research.researchId),
    ]);

    return Object.fromEntries(
      [...this.crystalCostsByResearchId].filter(([researchId]) =>
        committedResearchIds.has(researchId),
      ),
    );
  }

  hasInProgressResearches() {
    this.syncResearchEntities();

    for (const entityId of this.entityIdsByResearchId.values()) {
      if (PlayerResearch.isInProgress[entityId] === 1) {
        return true;
      }
    }

    return false;
  }

  getProgressSnapshot(researchId) {
    this.syncResearchEntities();
    const entityId = this.getKnownEntityId(researchId);

    if (entityId === undefined) {
      return {
        inProgress: false,
        totalSeconds: 0,
        remainingSeconds: 0,
        progress: 0,
      };
    }

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

  getKnownEntityId(researchId) {
    return this.entityIdsByResearchId.get(this.normalizeResearchId(researchId));
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
