import { describe, expect, it } from 'vitest';

import {
  normalizeTutorialNotificationPolicy,
  projectChromeNotificationPages,
  projectPageNotificationState,
  projectPageViewModelNotifications,
} from './PixiNotificationProjection.js';

describe('PixiNotificationProjection', () => {
  it('suppresses every page and child notification for an empty tutorial allow-list', () => {
    const pages = createNotificationPages();
    const policy = { active: true, allowedTutorialIds: [] };

    const chrome = projectChromeNotificationPages(pages, policy);
    const workshop = projectPageNotificationState(
      'workshop',
      pages.workshop,
      policy,
    );

    expect(Object.values(chrome).every((notification) => notification === false))
      .toBe(true);
    expect(workshop).toEqual({
      active: false,
      children: {
        seeds: false,
        tasks: false,
        alliance: false,
      },
    });
    expect(pages.workshop).toEqual({
      active: true,
      tone: 'red',
      children: {
        seeds: true,
        tasks: 'orange',
        alliance: true,
      },
    });
  });

  it('keeps workshop summon and task dots only for their semantic tutorial targets', () => {
    const notification = createNotificationPages().workshop;
    const policy = {
      active: true,
      allowedTutorialIds: [
        'workshop:summonSeed',
        'task:level1-sage-seeds',
      ],
    };
    const projectedNotification = projectPageNotificationState(
      'workshop',
      notification,
      policy,
    );
    const sourceModel = {
      workshop: {
        summon: { enabled: true },
        tasks: {
          rows: [
            {
              id: 'level1-sage-seeds',
              tutorialId: 'task:level1-sage-seeds',
              enabled: true,
            },
            {
              id: 'other',
              tutorialId: 'task:other',
              enabled: true,
              notification: true,
            },
          ],
        },
        features: [
          {
            id: 'alliance',
            notification: true,
          },
        ],
      },
    };

    const model = projectPageViewModelNotifications(
      'workshop',
      sourceModel,
      policy,
      { pageNotification: projectedNotification },
    );

    expect(projectedNotification.children).toEqual({
      seeds: true,
      tasks: 'orange',
      alliance: false,
    });
    expect(model.workshop.summon.notification).toBe(true);
    expect(model.workshop.tasks.rows.map((row) => row.notification)).toEqual([
      true,
      false,
    ]);
    expect(model.workshop.features[0].notification).toBe(false);
    expect(sourceModel.workshop.summon.notification).toBeUndefined();
    expect(sourceModel.workshop.tasks.rows[1].notification).toBe(true);
  });

  it('keeps only the concrete Garden, Research, Shop, and Brewing target dots', () => {
    const garden = projectPageViewModelNotifications(
      'garden',
      {
        garden: {
          plots: [
            { tileNumber: 1, notification: true },
            { tileNumber: 2, notification: true },
          ],
        },
      },
      {
        active: true,
        allowedTutorialIds: ['garden:plot:2:label'],
      },
    );
    const research = projectPageViewModelNotifications(
      'research',
      {
        research: {
          tabs: [
            {
              id: 'regular',
              notification: true,
              boxes: [
                {
                  researches: [
                    { id: 'mint', canResearch: true },
                    { id: 'sage', canResearch: true },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        active: true,
        allowedTutorialIds: ['research:mint'],
      },
    );
    const shop = projectPageViewModelNotifications(
      'shop',
      {
        shop: {
          traders: {
            stalls: [
              { slotNumber: 1, notification: true },
              { slotNumber: 2, notification: true },
            ],
          },
          players: {
            market: {
              browseNotification: true,
              proceedsNotification: true,
            },
          },
        },
      },
      {
        active: true,
        allowedTutorialIds: ['shop:stand:1'],
      },
    );
    const brewing = projectPageViewModelNotifications(
      'brewing',
      {
        brewing: {
          cauldrons: [
            {
              id: 0,
              canBrew: true,
              notification: true,
            },
          ],
          inventory: {
            herbs: {
              rows: [
                { key: 'sage', notification: true },
                { key: 'mint', notification: true },
              ],
            },
          },
        },
      },
      {
        active: true,
        allowedTutorialIds: ['brewing:herb:sage'],
      },
    );

    expect(garden.garden.plots.map((plot) => plot.notification)).toEqual([
      false,
      true,
    ]);
    const researchItems =
      research.research.tabs[0].boxes[0].researches;
    expect(researchItems.map((item) => item.notification)).toEqual([
      true,
      false,
    ]);
    expect(researchItems.map((item) => item.canResearch)).toEqual([
      true,
      true,
    ]);
    expect(
      shop.shop.traders.stalls.map((stall) => stall.notification),
    ).toEqual([true, false]);
    expect(shop.shop.players.market).toEqual({
      browseNotification: false,
      proceedsNotification: false,
    });
    expect(
      brewing.brewing.inventory.herbs.rows.map(
        (herb) => herb.notification,
      ),
    ).toEqual([true, false]);
    expect(brewing.brewing.cauldrons[0].notification).toBe(false);
  });

  it('exposes page badges only for matching page targets, including Guild', () => {
    const pages = createNotificationPages();
    const projected = projectChromeNotificationPages(pages, {
      active: true,
      allowedTutorialIds: [
        'page:garden',
        'page:brewing',
        'page:research',
        'page:shop',
        'page:guild',
      ],
    });

    expect(projected.workshop).toBe(false);
    expect(projected.garden).toBe(pages.garden);
    expect(projected.brewing).toBe(pages.brewing);
    expect(projected.research).toBe(pages.research);
    expect(projected.shop).toBe(pages.shop);
    expect(projected.guild).toBe(pages.guild);
    expect(projected.prestige).toBe(false);
  });

  it('projects a separate Guild person-dot override without changing status', () => {
    const source = {
      guild: {
        adventurers: [
          {
            id: 'urgent',
            status: 'hospital',
            tutorialId: 'guild:urgent',
          },
          {
            id: 'other',
            status: 'dead',
            tutorialId: 'guild:other',
          },
        ],
        applicants: [
          {
            id: 'candidate',
            status: 'idle',
            notification: true,
          },
        ],
      },
    };

    const projected = projectPageViewModelNotifications(
      'guild',
      source,
      {
        active: true,
        allowedTutorialIds: ['guild:urgent'],
      },
    );

    expect(
      projected.guild.adventurers.map(
        (person) => person.notificationVisible,
      ),
    ).toEqual([true, false]);
    expect(projected.guild.applicants[0]).toMatchObject({
      notification: false,
      notificationVisible: false,
      status: 'idle',
    });
    expect(source.guild.adventurers[0].notificationVisible).toBeUndefined();
  });

  it('restores the original page models and normal active chrome badges when policy clears', () => {
    const pages = createNotificationPages();
    const model = {
      research: {
        tabs: [
          {
            boxes: [
              {
                researches: [
                  { id: 'mint', canResearch: true },
                ],
              },
            ],
          },
        ],
      },
    };

    expect(
      projectPageViewModelNotifications('research', model, null),
    ).toBe(model);
    expect(normalizeTutorialNotificationPolicy(null)).toBeNull();
    expect(projectChromeNotificationPages(pages, null)).toEqual({
      workshop: pages.workshop,
      brewing: pages.brewing,
      garden: pages.garden,
      research: pages.research,
      shop: pages.shop,
      guild: pages.guild,
      prestige: false,
    });
  });
});

function createNotificationPages() {
  return {
    workshop: {
      active: true,
      tone: 'red',
      children: {
        seeds: true,
        tasks: 'orange',
        alliance: true,
      },
    },
    brewing: {
      active: true,
      tone: 'orange',
      children: { action: 'orange' },
    },
    garden: {
      active: true,
      tone: 'red',
      children: { plots: true },
    },
    research: {
      active: true,
      tone: 'red',
      children: { research: true },
    },
    shop: {
      active: true,
      tone: 'orange',
      children: { npcListing: 'orange' },
    },
    guild: {
      active: true,
      tone: 'red',
      children: { guild: true },
    },
  };
}
