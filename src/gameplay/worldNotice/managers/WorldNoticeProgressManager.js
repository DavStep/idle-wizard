import { WORLD_NOTICE_LEADERBOARD_QUALIFICATION_POINTS } from './WorldNoticeContributionManager.js';

export const WORLD_NOTICE_RESPONSE_TIERS = Object.freeze({
  SMALL: 'small',
  STEADY: 'steady',
  STRONG: 'strong',
});

export class WorldNoticeProgressManager {
  getResponseTier(notice) {
    const points = Math.max(
      0,
      Math.floor(Number(notice?.contributionPoints) || 0),
    );

    if (points >= WORLD_NOTICE_LEADERBOARD_QUALIFICATION_POINTS) {
      return WORLD_NOTICE_RESPONSE_TIERS.STRONG;
    }

    if (points > 0) {
      return WORLD_NOTICE_RESPONSE_TIERS.STEADY;
    }

    return WORLD_NOTICE_RESPONSE_TIERS.SMALL;
  }
}
