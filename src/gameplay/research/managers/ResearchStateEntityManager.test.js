import { describe, expect, it } from 'vitest';

import { ResearchStateEntityManager } from './ResearchStateEntityManager.js';

function createResearchDefinitionManagerFake() {
  const knownResearchIds = new Set(['unlockSeed:sageSeed', 'automation:autoPlantTile:1']);

  return {
    getResearches: () => [...knownResearchIds].map((id) => ({ id })),
    hasConfiguredResearch: (researchId) => knownResearchIds.has(researchId),
    normalizeResearchId: (researchId) => String(researchId ?? '').trim(),
  };
}

function createEcsManagersFake() {
  let nextEntityId = 1;

  return {
    entities: {
      createEntity: () => nextEntityId++,
    },
    components: {
      add: () => {},
    },
    world: {
      getWorld: () => ({}),
    },
  };
}

describe('ResearchStateEntityManager', () => {
  it('treats unknown restored automation research as incomplete instead of throwing', () => {
    const manager = new ResearchStateEntityManager({
      defaultCompletedResearchIds: [],
      researchDefinitionManager: createResearchDefinitionManagerFake(),
    });

    manager.initialize(createEcsManagersFake());
    manager.setCompletedResearchIds([
      'unlockSeed:sageSeed',
      'automation:autoPlantTile:11',
    ]);
    manager.setInProgressResearches([
      {
        researchId: 'automation:autoPlantTile:11',
        totalSeconds: 60,
        remainingSeconds: 30,
      },
    ]);

    expect(manager.getCompletedResearchIds()).toEqual(['unlockSeed:sageSeed']);
    expect(manager.isCompleted('automation:autoPlantTile:11')).toBe(false);
    expect(manager.isInProgress('automation:autoPlantTile:11')).toBe(false);
    expect(manager.getProgressSnapshot('automation:autoPlantTile:11')).toEqual({
      inProgress: false,
      totalSeconds: 0,
      remainingSeconds: 0,
      progress: 0,
    });
  });
});
