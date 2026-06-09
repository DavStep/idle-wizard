import { PlayerResearch } from '../components/ResearchComponents.js';

export class ResearchStateEntityManager {
  constructor({ researchDefinitionManager }) {
    this.researchDefinitionManager = researchDefinitionManager;
    this.entityIdsByResearchId = new Map();
  }

  initialize(ecsManagers) {
    if (this.entityIdsByResearchId.size > 0) {
      return;
    }

    for (const research of this.researchDefinitionManager.getResearches()) {
      const entityId = ecsManagers.entities.createEntity();
      ecsManagers.components.add(entityId, PlayerResearch);
      PlayerResearch.researchId[entityId] = research.id;
      PlayerResearch.isCompleted[entityId] = 0;
      this.entityIdsByResearchId.set(research.id, entityId);
    }
  }

  isCompleted(researchId) {
    return PlayerResearch.isCompleted[this.getEntityId(this.normalizeResearchId(researchId))] === 1;
  }

  complete(researchId) {
    PlayerResearch.isCompleted[this.getEntityId(this.normalizeResearchId(researchId))] = 1;
  }

  setCompletedResearchIds(researchIds = []) {
    for (const researchId of this.entityIdsByResearchId.keys()) {
      PlayerResearch.isCompleted[this.getEntityId(researchId)] = 0;
    }

    for (const researchId of researchIds) {
      const normalizedResearchId = this.normalizeResearchId(researchId);

      if (!this.researchDefinitionManager.hasResearch(normalizedResearchId)) {
        continue;
      }

      PlayerResearch.isCompleted[this.getEntityId(normalizedResearchId)] = 1;
    }
  }

  getCompletedResearchIds() {
    return [...this.entityIdsByResearchId.keys()].filter((researchId) =>
      this.isCompleted(researchId),
    );
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
}
