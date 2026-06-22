import { WORLD_NOTICE_ACTIONS } from './WorldNoticeCatalogManager.js';

export const WORLD_NOTICE_LEADERBOARD_QUALIFICATION_POINTS = 2_000;

export const WORLD_NOTICE_LEADERBOARD_REWARD_TIERS = Object.freeze([
  { rankLabel: '1', emerald: 5, crystal: 10 },
  { rankLabel: '2', emerald: 3, crystal: 7 },
  { rankLabel: '3', emerald: 2, crystal: 5 },
  { rankLabel: '4-10', emerald: 1, crystal: 3 },
  { rankLabel: '11-25', emerald: 0, crystal: 2 },
  { rankLabel: '26-100', emerald: 0, crystal: 1 },
  { rankLabel: '101+ qualified', emerald: 0, crystal: 1 },
]);

const COIN_PER_POINT = 25;

const ACTION_POINT_RULES = Object.freeze({
  [WORLD_NOTICE_ACTIONS.BREW_POTIONS]: { pointsPerUnit: 25, label: 'potion' },
  [WORLD_NOTICE_ACTIONS.COMPLETE_RESEARCH]: { pointsPerUnit: 100, label: 'research' },
  [WORLD_NOTICE_ACTIONS.DONATE_COIN]: {
    pointsPerUnit: 1 / COIN_PER_POINT,
    label: `${COIN_PER_POINT} coin`,
  },
  [WORLD_NOTICE_ACTIONS.EARN_COIN]: {
    pointsPerUnit: 1 / COIN_PER_POINT,
    label: `${COIN_PER_POINT} coin`,
  },
  [WORLD_NOTICE_ACTIONS.HARVEST_HERBS]: { pointsPerUnit: 5, label: 'herb' },
  [WORLD_NOTICE_ACTIONS.SELL_ITEMS]: { pointsPerUnit: 3, label: 'item sold' },
  [WORLD_NOTICE_ACTIONS.SUMMON_SEEDS]: { pointsPerUnit: 2, label: 'seed' },
});

const ITEM_POINT_VALUES = Object.freeze({
  manaTonic: 25,
  minorHealingPotion: 60,
  nettleVigor: 80,
  calmingDraught: 120,
  briarWard: 180,
  healingPotion: 300,
});

export class WorldNoticeContributionManager {
  getPointsForAction(actionType, quantity = 1, detail = {}) {
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));

    if (amount <= 0) {
      return 0;
    }

    const itemPoints = this.getItemPoints(detail);

    if (itemPoints > 0) {
      return itemPoints * amount;
    }

    const rule = ACTION_POINT_RULES[String(actionType ?? '')];

    if (!rule) {
      return amount;
    }

    return Math.floor(amount * rule.pointsPerUnit);
  }

  getPointsForProgress(actionType, previousProgress = 0, nextProgress = 0, detail = {}) {
    const previous = Math.max(0, Math.floor(Number(previousProgress) || 0));
    const next = Math.max(previous, Math.floor(Number(nextProgress) || 0));
    const amount = next - previous;

    if (amount <= 0) {
      return 0;
    }

    const itemPoints = this.getItemPoints(detail);

    if (itemPoints > 0) {
      return itemPoints * amount;
    }

    const rule = ACTION_POINT_RULES[String(actionType ?? '')];

    if (!rule) {
      return amount;
    }

    return (
      Math.floor(next * rule.pointsPerUnit) -
      Math.floor(previous * rule.pointsPerUnit)
    );
  }

  getItemPoints(detail = {}) {
    const itemKey =
      detail?.item?.key ??
      detail?.potion?.key ??
      detail?.herb?.key ??
      detail?.seed?.key ??
      detail?.itemKey ??
      '';

    return Math.max(0, Math.floor(Number(ITEM_POINT_VALUES[itemKey]) || 0));
  }

  addPoints(notice, points = 0) {
    if (!notice) {
      return 0;
    }

    const safePoints = Math.max(0, Math.floor(Number(points) || 0));

    if (safePoints <= 0) {
      return 0;
    }

    notice.contributionPoints =
      Math.max(0, Math.floor(Number(notice.contributionPoints) || 0)) + safePoints;
    return safePoints;
  }

  addRequestPoints(request, points = 0) {
    if (!request) {
      return 0;
    }

    const safePoints = Math.max(0, Math.floor(Number(points) || 0));

    if (safePoints <= 0) {
      return 0;
    }

    request.contributionPoints =
      Math.max(0, Math.floor(Number(request.contributionPoints) || 0)) + safePoints;
    return safePoints;
  }

  addRequestActionPoints(request, actionType, quantity = 1, detail = {}) {
    if (!request) {
      return 0;
    }

    const amount = Math.max(0, Math.floor(Number(quantity) || 0));

    if (amount <= 0) {
      return 0;
    }

    const previousQuantity = this.getRequestPointProgressQuantity(request);
    const nextQuantity = previousQuantity + amount;
    request.pointProgressQuantity = nextQuantity;

    return this.addRequestPoints(
      request,
      this.getPointsForProgress(actionType, previousQuantity, nextQuantity, detail),
    );
  }

  getRequestPointProgressQuantity(request) {
    const pointProgressQuantity = Number(request?.pointProgressQuantity);

    if (Number.isFinite(pointProgressQuantity)) {
      return Math.max(0, Math.floor(pointProgressQuantity));
    }

    return Math.max(0, Math.floor(Number(request?.progressQuantity) || 0));
  }

  createLeaderboardSnapshot(points = 0) {
    const currentPoints = Math.max(0, Math.floor(Number(points) || 0));
    const qualificationPoints = WORLD_NOTICE_LEADERBOARD_QUALIFICATION_POINTS;

    return {
      currentPoints,
      qualificationPoints,
      qualified: currentPoints >= qualificationPoints,
      remainingQualificationPoints: Math.max(0, qualificationPoints - currentPoints),
      rewardTiers: WORLD_NOTICE_LEADERBOARD_REWARD_TIERS.map((tier) => ({ ...tier })),
    };
  }

  getActionPointText(actionType) {
    const rule = ACTION_POINT_RULES[String(actionType ?? '')];

    if (!rule) {
      return '1 point';
    }

    if (rule.pointsPerUnit < 1) {
      return `${rule.label} = 1 point`;
    }

    return `${rule.pointsPerUnit} points each`;
  }
}
