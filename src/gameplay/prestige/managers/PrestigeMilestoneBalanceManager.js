const MILESTONE_STEP = 10;
const MIN_VISIBLE_MAX_LEVEL = 100;

export class PrestigeMilestoneBalanceManager {
  getMilestones({ maxLevel = MIN_VISIBLE_MAX_LEVEL, completedLevels = [] } = {}) {
    const maxCompletedLevel = completedLevels.reduce(
      (max, level) => Math.max(max, this.normalizeLevel(level) ?? 0),
      0,
    );
    const safeMaxLevel = Math.max(
      MIN_VISIBLE_MAX_LEVEL,
      this.normalizeLevel(maxLevel) ?? 0,
      maxCompletedLevel,
    );
    const milestoneMaxLevel = Math.floor(safeMaxLevel / MILESTONE_STEP) * MILESTONE_STEP;
    const milestones = [];

    for (let level = MILESTONE_STEP; level <= milestoneMaxLevel; level += MILESTONE_STEP) {
      milestones.push(this.getMilestone(level));
    }

    return milestones;
  }

  getMilestone(level) {
    const normalizedLevel = this.normalizeLevel(level);

    if (!this.isMilestoneLevel(normalizedLevel)) {
      return null;
    }

    return {
      level: normalizedLevel,
      rewardRuby: this.getRewardRuby(normalizedLevel),
    };
  }

  getRewardRuby(level) {
    const normalizedLevel = this.normalizeLevel(level);

    if (normalizedLevel === 100) {
      return 5;
    }

    if (normalizedLevel === 50) {
      return 2;
    }

    return 1;
  }

  getTotalRuby(completedLevels = []) {
    return this.normalizeCompletedLevels(completedLevels).reduce((total, level) => {
      const milestone = this.getMilestone(level);
      return milestone ? total + milestone.rewardRuby : total;
    }, 0);
  }

  getCreditedLevelsForClaim(level, completedLevels = []) {
    const normalizedLevel = this.normalizeLevel(level);

    if (!this.isMilestoneLevel(normalizedLevel)) {
      return [];
    }

    const completed = new Set(this.normalizeCompletedLevels(completedLevels));
    return this.getMilestoneLevelsThrough(normalizedLevel).filter(
      (milestoneLevel) => !completed.has(milestoneLevel),
    );
  }

  normalizeCompletedLevels(levels = []) {
    const normalizedLevels = [...new Set(
      levels
        .map((level) => this.normalizeLevel(level))
        .filter((level) => this.isMilestoneLevel(level)),
    )].sort((left, right) => left - right);
    const maxLevel = normalizedLevels.at(-1);

    if (!maxLevel) {
      return [];
    }

    return this.getMilestoneLevelsThrough(maxLevel);
  }

  getMilestoneLevelsThrough(level) {
    const normalizedLevel = this.normalizeLevel(level);

    if (!this.isMilestoneLevel(normalizedLevel)) {
      return [];
    }

    const levels = [];
    for (let milestoneLevel = MILESTONE_STEP; milestoneLevel <= normalizedLevel; milestoneLevel += MILESTONE_STEP) {
      levels.push(milestoneLevel);
    }

    return levels;
  }

  isMilestoneLevel(level) {
    return Number.isInteger(level) && level >= MILESTONE_STEP && level % MILESTONE_STEP === 0;
  }

  normalizeLevel(level) {
    const value = Math.floor(Number(level));
    return Number.isFinite(value) && value > 0 ? value : null;
  }
}
