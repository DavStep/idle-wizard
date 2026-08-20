import { describe, expect, it } from 'vitest';

import integrations from './WorkshopWidgets.ui-editor.js';

describe('Workshop widget UI editor integrations', () => {
  it('keeps every reusable Workshop widget independently selectable', () => {
    expect(integrations.map(({ id }) => id)).toEqual([
      'compound.workshop-task-panel',
      'compound.workshop-task-row',
      'compound.workshop-summon-control',
      'compound.root-run-side-action',
      'compound.world-event-donation-option-row',
      'compound.trade-alliance-banner',
      'primitive.alliance-emblem-option',
      'compound.alliance-directory-row',
      'compound.alliance-member-row',
      'compound.alliance-quest-row',
      'compound.leaderboard-row',
      'compound.world-event-reward-row',
      'compound.potion-discovery-page',
      'compound.workshop-dialog-row',
    ]);
    expect(integrations.every(({ kind, scenarios }) =>
      kind === 'widget' && scenarios.length > 0 &&
      scenarios.every(({ mount }) => typeof mount === 'function')),
    ).toBe(true);
    expect(
      integrations.find(({ id }) => id === 'compound.workshop-task-panel')
        ?.childWidgetIds,
    ).toEqual([
      'compound.market-title-ribbon',
      'compound.workshop-task-row',
      'text-button',
    ]);
    expect(
      integrations.find(
        ({ id }) => id === 'compound.world-event-donation-option-row',
      )?.childWidgetIds,
    ).toEqual(['text-button', 'primitive.notification-badge']);
    expect(
      integrations.find(
        ({ id }) => id === 'compound.world-event-donation-option-row',
      )?.scenarios.map(({ id }) => id),
    ).toEqual(['available', 'notified', 'unavailable', 'seed-pack']);
    expect(
      integrations.find(({ id }) => id === 'compound.trade-alliance-banner')
        ?.scenarios.map(({ id }) => id),
    ).toEqual([
      'unity',
      'crown',
      'crescent',
      'crossed-wands',
      'owl',
      'flame',
      'oak-leaf',
      'key',
      'tower',
      'sunburst',
      'hourglass',
      'dragon',
    ]);
    expect(
      integrations.find(({ id }) => id === 'primitive.alliance-emblem-option')
        ?.scenarios,
    ).toHaveLength(12);
    expect(
      integrations.find(({ id }) => id === 'compound.root-run-side-action')
        ?.childWidgetIds,
    ).toEqual([
      'primitive.notification-badge',
      'compound.trade-alliance-banner',
    ]);
    expect(
      integrations.find(({ id }) => id === 'compound.root-run-side-action')
        ?.scenarios.map(({ id }) => id),
    ).toContain('alliance-member');
    expect(
      integrations.find(({ id }) => id === 'compound.alliance-directory-row')
        ?.childWidgetIds,
    ).toEqual([
      'compound.trade-alliance-banner',
      'compound.player-profile',
      'primitive.resource-label',
      'text-button',
    ]);
    expect(
      integrations.find(({ id }) => id === 'compound.leaderboard-row')
        ?.childWidgetIds,
    ).toEqual([
      'compound.player-profile',
      'compound.trade-alliance-banner',
      'primitive.star-level-label',
      'primitive.resource-label',
    ]);
    expect(
      integrations.find(({ id }) => id === 'compound.alliance-quest-row')
        ?.childWidgetIds,
    ).toEqual(['primitive.resource-label', 'text-button']);
    expect(
      integrations.find(({ id }) => id === 'compound.alliance-quest-row')
        ?.scenarios.map(({ id }) => id),
    ).toEqual(['fill', 'route', 'claim', 'claimed', 'overflow']);
    expect(
      integrations.find(
        ({ id }) => id === 'compound.world-event-reward-row',
      )?.scenarios.map(({ id }) => id),
    ).toEqual(['two-rewards', 'current-rank', 'one-reward', 'long-rank']);
  });
});
