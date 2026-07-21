import { describe, expect, it, vi } from 'vitest';

import { QaDataFacade } from './QaDataFacade.js';
import { QaDataTemplateManager } from './managers/QaDataTemplateManager.js';

function createFetch({ manifest, templates = {} } = {}) {
  return vi.fn((path) => {
    const value = path.endsWith('/manifest.json') ? manifest : templates[path];

    if (!value) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => null,
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => value,
    });
  });
}

describe('QaDataFacade', () => {
  it('lists local QA data templates from the manifest', async () => {
    const manifest = {
      generatedAt: '2026-06-23T00:00:00.000Z',
      templates: [
        {
          id: 'ftwizard',
          aliases: ['everything-unlocked'],
          label: 'Ftwizard (level 15)',
          username: 'Ftwizard',
          level: 15,
          updatedAt: '2026-06-22T14:49:33.592018+00:00',
          path: '/qa-data/templates/ftwizard.json',
        },
      ],
      aliases: {
        'everything-unlocked': 'ftwizard',
      },
    };
    const facade = new QaDataFacade({
      templateManager: new QaDataTemplateManager({
        fetchFn: createFetch({ manifest }),
      }),
    });

    await expect(facade.listTemplates()).resolves.toEqual({
      ok: true,
      generatedAt: manifest.generatedAt,
      templates: [
        {
          id: 'ftwizard',
          aliases: ['everything-unlocked'],
          label: 'Ftwizard (level 15)',
          username: 'Ftwizard',
          level: 15,
          updatedAt: '2026-06-22T14:49:33.592018+00:00',
          path: '/qa-data/templates/ftwizard.json',
        },
      ],
      aliases: {
        'everything-unlocked': 'ftwizard',
      },
    });
  });

  it('loads a template alias into gameplay and refreshes savedAt', async () => {
    const loadPersistenceSave = vi.fn(() => true);
    const savePersistenceSnapshotAndFlush = vi.fn(() => Promise.resolve(true));
    const gameplayFacade = {
      loadPersistenceSave,
      savePersistenceSnapshotAndFlush,
      getSnapshot: () => ({ coin: { current: 25 } }),
    };
    const manifest = {
      templates: [
        {
          id: 'ftwizard',
          aliases: ['everything-unlocked'],
          label: 'Ftwizard (level 15)',
          username: 'Ftwizard',
          level: 15,
          path: '/qa-data/templates/ftwizard.json',
        },
      ],
      aliases: {
        'everything-unlocked': 'ftwizard',
      },
    };
    const template = {
      save: {
        version: 7,
        savedAt: 100,
        coin: { current: 25, totalGenerated: 25 },
      },
    };
    const facade = new QaDataFacade({
      templateManager: new QaDataTemplateManager({
        gameplayFacade,
        fetchFn: createFetch({
          manifest,
          templates: {
            '/qa-data/templates/ftwizard.json': template,
          },
        }),
        now: () => 500,
      }),
    });

    await expect(facade.loadTemplate('everything-unlocked')).resolves.toMatchObject({
      ok: true,
      template: 'ftwizard',
      level: 15,
      username: 'Ftwizard',
      snapshot: { coin: { current: 25 } },
    });
    expect(loadPersistenceSave).toHaveBeenCalledWith({
      version: 7,
      savedAt: 500,
      coin: { current: 25, totalGenerated: 25 },
    });
    expect(savePersistenceSnapshotAndFlush).toHaveBeenCalledTimes(1);
  });

  it('persists high-level templates through each server-accepted level step', async () => {
    let currentLevel = 18;
    const loadedTotalGenerated = [];
    const loadPersistenceSave = vi.fn((save) => {
      currentLevel = save.tasks.currentLevel;
      loadedTotalGenerated.push(save.coin.totalGenerated);
      save.coin.totalGenerated -= 1;
      return true;
    });
    const savePersistenceSnapshotAndFlush = vi.fn(() => Promise.resolve(true));
    const gameplayFacade = {
      loadPersistenceSave,
      savePersistenceSnapshotAndFlush,
      getSnapshot: () => ({ tasks: { currentLevel } }),
    };
    const manifest = {
      templates: [
        {
          id: 'aloofbaker2',
          label: 'Aloofbaker2 (level 20)',
          level: 20,
          path: '/qa-data/templates/aloofbaker2.json',
        },
      ],
    };
    const template = {
      save: {
        version: 7,
        coin: { current: 50, totalGenerated: 100 },
        tasks: {
          currentLevel: 20,
          tasks: [{ taskId: 'level21-task', progressQuantity: 0 }],
        },
      },
    };
    const facade = new QaDataFacade({
      templateManager: new QaDataTemplateManager({
        gameplayFacade,
        fetchFn: createFetch({
          manifest,
          templates: {
            '/qa-data/templates/aloofbaker2.json': template,
          },
        }),
        now: () => 500,
      }),
    });

    await expect(facade.loadTemplate('Aloofbaker2')).resolves.toMatchObject({
      ok: true,
      template: 'aloofbaker2',
      level: 20,
    });
    expect(loadPersistenceSave.mock.calls.map(([save]) => save.tasks.currentLevel)).toEqual([
      19,
      20,
    ]);
    expect(savePersistenceSnapshotAndFlush).toHaveBeenCalledTimes(2);
    expect(loadedTotalGenerated).toEqual([100, 100]);
  });

  it('rejects template paths outside the local QA data directory', async () => {
    const facade = new QaDataFacade({
      templateManager: new QaDataTemplateManager({
        gameplayFacade: {},
        fetchFn: createFetch({
          manifest: {
            templates: [{ id: 'bad', path: '/secret.json' }],
          },
        }),
      }),
    });

    await expect(facade.loadTemplate('bad')).resolves.toMatchObject({
      ok: false,
      reason: 'unknown_template',
    });
  });
});
