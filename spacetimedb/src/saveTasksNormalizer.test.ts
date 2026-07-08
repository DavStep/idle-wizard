import { describe, expect, it } from 'vitest';

import { normalizeSaveTasks, type SaveTaskCatalog } from './saveTasksNormalizer';

function createTaskCatalog(): SaveTaskCatalog {
  const levels = Array.from({ length: 20 }, (_, index) => index + 1);
  const tasks = levels.flatMap((level) => [
    {
      id: `level${level}-task-a`,
      level,
      quantity: level * 2,
    },
    {
      id: level === 18 ? 'level18-sell-briar-herb' : `level${level}-task-b`,
      level,
      quantity: level === 18 ? 38 : level * 3,
    },
  ]);

  return {
    levels,
    tasks,
    initialLevel: 1,
    maxLevel: 20,
  };
}

describe('normalizeSaveTasks', () => {
  it('keeps paid level 43 active level 44 star anise progress after backend save normalization', () => {
    const taskCatalog: SaveTaskCatalog = {
      levels: [43, 44],
      tasks: [
        {
          id: 'level43-research-star-anise-seed',
          level: 43,
          quantity: 1,
        },
        {
          id: 'level44-summon-star-anise-seed',
          level: 44,
          quantity: 143,
        },
        {
          id: 'level44-grow-star-anise-herb',
          level: 44,
          quantity: 52,
        },
        {
          id: 'level44-turn-in-star-anise-herb',
          level: 44,
          quantity: 38,
        },
        {
          id: 'level44-brew-mana-tonic',
          level: 44,
          quantity: 16,
        },
        {
          id: 'level44-turn-in-nettle-vigor',
          level: 44,
          quantity: 11,
        },
      ],
      initialLevel: 1,
      maxLevel: 44,
    };

    expect(
      normalizeSaveTasks(
        {
          currentLevel: 43,
          tasks: [
            {
              taskId: 'level44-summon-star-anise-seed',
              progressQuantity: 143,
              completed: true,
            },
            {
              taskId: 'level44-grow-star-anise-herb',
              progressQuantity: 12,
              completed: false,
            },
            {
              taskId: 'level44-turn-in-star-anise-herb',
              progressQuantity: 38,
              completed: true,
            },
            {
              taskId: 'level44-brew-mana-tonic',
              progressQuantity: 0,
              completed: false,
            },
            {
              taskId: 'level44-turn-in-nettle-vigor',
              progressQuantity: 11,
              completed: true,
            },
          ],
        },
        taskCatalog,
        43,
      ),
    ).toEqual({
      currentLevel: 43,
      tasks: [
        {
          taskId: 'level44-summon-star-anise-seed',
          progressQuantity: 143,
          completed: true,
        },
        {
          taskId: 'level44-grow-star-anise-herb',
          progressQuantity: 12,
          completed: false,
        },
        {
          taskId: 'level44-turn-in-star-anise-herb',
          progressQuantity: 38,
          completed: true,
        },
        {
          taskId: 'level44-turn-in-nettle-vigor',
          progressQuantity: 11,
          completed: true,
        },
      ],
    });
  });

  it('keeps active next-level sell progress for paid level 17 players', () => {
    const taskCatalog = createTaskCatalog();

    expect(
      normalizeSaveTasks(
        {
          currentLevel: 17,
          tasks: [
            {
              taskId: 'level18-sell-briar-herb',
              progressQuantity: 12,
              completed: false,
            },
          ],
        },
        taskCatalog,
        17,
      ),
    ).toEqual({
      currentLevel: 17,
      tasks: [
        {
          taskId: 'level18-sell-briar-herb',
          progressQuantity: 12,
          completed: false,
        },
      ],
    });
  });

  it('keeps completed unpaid active requirement rows without advancing the paid level', () => {
    const taskCatalog = createTaskCatalog();

    expect(
      normalizeSaveTasks(
        {
          currentLevel: 17,
          tasks: [
            {
              taskId: 'level18-sell-briar-herb',
              progressQuantity: 38,
              completed: true,
            },
          ],
        },
        taskCatalog,
        17,
      ),
    ).toEqual({
      currentLevel: 17,
      tasks: [
        {
          taskId: 'level18-sell-briar-herb',
          progressQuantity: 38,
          completed: true,
        },
      ],
    });
  });
});
