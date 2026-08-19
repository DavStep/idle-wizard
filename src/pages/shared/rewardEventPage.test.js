import { describe, expect, it } from 'vitest';

import {
  getRewardEventPageId,
  isRewardEventForPage,
} from './rewardEventPage.js';

describe('reward event page ownership', () => {
  it.each([
    ['seed_summoned', 'workshop'],
    ['personal_task_reward_claimed', 'workshop'],
    ['garden_seed_planted', 'garden'],
    ['herb_harvested', 'garden'],
    ['potion_collected', 'brewing'],
    ['item_sold', 'shop'],
    ['item_bought', 'shop'],
    ['coin_collected', 'shop'],
  ])('owns %s feedback on %s', (type, pageId) => {
    expect(getRewardEventPageId({ type })).toBe(pageId);
    expect(isRewardEventForPage({ type }, pageId)).toBe(true);
    expect(isRewardEventForPage({ type }, 'research')).toBe(false);
  });

  it('lets an explicit page override classify future event types', () => {
    const event = {
      type: 'future_reward',
      pageId: 'guild',
    };

    expect(getRewardEventPageId(event)).toBe('guild');
    expect(isRewardEventForPage(event, 'guild')).toBe(true);
    expect(isRewardEventForPage(event, 'workshop')).toBe(false);
  });
});
