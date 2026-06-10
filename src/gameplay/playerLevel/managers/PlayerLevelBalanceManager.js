import playerLevelBalance from '../player-level-balance.json';

export class PlayerLevelBalanceManager {
  constructor({ balance = playerLevelBalance } = {}) {
    this.balance = balance;
    this.setBalance(balance);
  }

  setRuntimeBalance(balance) {
    this.setBalance(balance);
  }

  setBalance(balance) {
    const maxLevel = this.readMaxLevel(balance);
    const manaProgression = this.readManaProgression(balance);
    const milestones = this.readMilestones(balance, maxLevel);

    this.balance = balance;
    this.maxLevel = maxLevel;
    this.manaProgression = manaProgression;
    this.milestones = milestones;
  }

  getLevels() {
    return this.milestones.map((milestone) => ({ ...milestone }));
  }

  getMaxLevel() {
    return this.maxLevel;
  }

  getConfiguredMaxGardenTiles() {
    return Math.max(...this.milestones.map((milestone) => milestone.maxGardenTiles));
  }

  getConfiguredMaxShopSlots() {
    return this.getConfiguredMaxNpcMarketStands();
  }

  getConfiguredMaxCauldrons() {
    return Math.max(...this.milestones.map((milestone) => milestone.maxCauldrons));
  }

  getConfiguredMaxNpcMarketStands() {
    return Math.max(...this.milestones.map((milestone) => milestone.maxNpcMarketStands));
  }

  getConfiguredMaxPlayerMarketStands() {
    return Math.max(...this.milestones.map((milestone) => milestone.maxPlayerMarketStands));
  }

  getEffects(levelNumber) {
    const level = this.getLevel(levelNumber);
    const manaEffects = this.getManaEffects(levelNumber);

    const effects = {
      maxGardenTiles: level.maxGardenTiles,
      maxCauldrons: level.maxCauldrons,
      maxShopSlots: level.maxNpcMarketStands,
      maxNpcMarketStands: level.maxNpcMarketStands,
      maxPlayerMarketStands: level.maxPlayerMarketStands,
    };

    if (manaEffects) {
      effects.maxManaCap = manaEffects.maxManaCap;
      effects.manaPerSecond = manaEffects.manaPerSecond;
    }

    return effects;
  }

  getManaEffects(levelNumber) {
    if (!this.manaProgression) {
      return null;
    }

    const safeLevel = this.clampLevelNumber(levelNumber);

    return {
      maxManaCap: this.roundStat(
        this.manaProgression.baseMaxManaCap +
          (safeLevel - 1) * this.manaProgression.maxManaCapPerLevel,
      ),
      manaPerSecond: this.roundStat(
        this.manaProgression.baseManaPerSecond +
          (safeLevel - 1) * this.manaProgression.manaPerSecondPerLevel,
      ),
    };
  }

  getRequiredLevelForGardenTile(tileNumber) {
    return this.getRequiredLevelForLimit('maxGardenTiles', tileNumber);
  }

  getRequiredLevelForShopSlot(slotNumber) {
    return this.getRequiredLevelForNpcMarketStand(slotNumber);
  }

  getRequiredLevelForNpcMarketStand(standNumber) {
    return this.getRequiredLevelForLimit('maxNpcMarketStands', standNumber);
  }

  getRequiredLevelForPlayerMarketStand(standNumber) {
    return this.getRequiredLevelForLimit('maxPlayerMarketStands', standNumber);
  }

  getLevelSummaries(currentLevel) {
    return Array.from({ length: this.maxLevel }, (_unused, index) => {
      const levelNumber = index + 1;
      const milestoneIndex = this.milestones.findIndex(
        (milestone) => milestone.level === levelNumber,
      );
      const milestone = milestoneIndex >= 0 ? this.milestones[milestoneIndex] : null;

      return {
        level: levelNumber,
        current: levelNumber === currentLevel,
        unlocked: levelNumber <= currentLevel,
        milestone: Boolean(milestone),
        totals: this.getEffects(levelNumber),
        effects: this.describeLevelSummary({
          levelNumber,
          milestone,
          previousMilestone: this.milestones[milestoneIndex - 1] ?? null,
        }),
      };
    });
  }

  getLevel(levelNumber) {
    const safeLevel = Number.isInteger(levelNumber) ? levelNumber : 1;
    let level = this.milestones[0];

    for (const milestone of this.milestones) {
      if (milestone.level > safeLevel) {
        break;
      }

      level = milestone;
    }

    return level;
  }

  getRequiredLevelForLimit(key, value) {
    const level = this.milestones.find((candidate) => candidate[key] >= value);
    return level?.level ?? null;
  }

  describeLevel(level, previousLevel) {
    const effects = [];

    if (!previousLevel || level.maxGardenTiles > previousLevel.maxGardenTiles) {
      effects.push(`max garden tiles ${level.maxGardenTiles}`);
    }

    if (!previousLevel || level.maxCauldrons > previousLevel.maxCauldrons) {
      effects.push(`max cauldrons ${level.maxCauldrons}`);
    }

    if (!previousLevel || level.maxNpcMarketStands > previousLevel.maxNpcMarketStands) {
      effects.push(`max npc market stands ${level.maxNpcMarketStands}`);
    }

    if (!previousLevel || level.maxPlayerMarketStands > previousLevel.maxPlayerMarketStands) {
      effects.push(`max player market stands ${level.maxPlayerMarketStands}`);
    }

    for (const unlock of level.unlocks) {
      effects.push(`unlocks ${unlock}`);
    }

    for (const researchName of level.researchUnlocks) {
      effects.push(`allows researching "${researchName}"`);
    }

    return effects;
  }

  describeLevelSummary({ levelNumber, milestone, previousMilestone }) {
    const effects = [
      ...(milestone ? this.describeLevel(milestone, previousMilestone) : []),
      ...this.describeManaLevel(levelNumber),
    ];

    return effects.length > 0 ? effects : ['no new unlock'];
  }

  describeManaLevel(levelNumber) {
    if (!this.manaProgression) {
      return [];
    }

    const effects = [];
    const manaEffects = this.getManaEffects(levelNumber);
    const previousManaEffects = levelNumber > 1 ? this.getManaEffects(levelNumber - 1) : null;

    if (!previousManaEffects || manaEffects.maxManaCap > previousManaEffects.maxManaCap) {
      effects.push(`max mana cap ${this.formatStat(manaEffects.maxManaCap)}`);
    }

    if (!previousManaEffects || manaEffects.manaPerSecond > previousManaEffects.manaPerSecond) {
      effects.push(`mana regen ${this.formatStat(manaEffects.manaPerSecond)}/sec`);
    }

    return effects;
  }

  readMaxLevel(balance = this.balance) {
    const maxLevel = balance?.maxLevel ?? balance?.levels?.at(-1)?.level ?? 1;

    if (!Number.isInteger(maxLevel) || maxLevel <= 0) {
      throw new Error('player-level-balance.json requires positive maxLevel.');
    }

    return maxLevel;
  }

  readMilestones(balance = this.balance, maxLevel = this.maxLevel) {
    const milestones = balance?.milestones ?? balance?.levels;

    if (!Array.isArray(milestones) || milestones.length <= 0) {
      throw new Error('player-level-balance.json requires milestones.');
    }

    let previousGardenTiles = 0;
    let previousCauldrons = 0;
    let previousNpcMarketStands = 0;
    let previousPlayerMarketStands = 0;
    let previousLevel = 0;

    return milestones.map((level) => {
      if (
        !Number.isInteger(level?.level) ||
        level.level <= previousLevel ||
        level.level > maxLevel
      ) {
        throw new Error(
          'player-level-balance.json milestones must use increasing levels within maxLevel.',
        );
      }

      const maxGardenTiles = level.maxGardenTiles ?? previousGardenTiles;
      const maxCauldrons = level.maxCauldrons ?? previousCauldrons;
      const maxNpcMarketStands =
        level.maxNpcMarketStands ?? level.maxShopSlots ?? previousNpcMarketStands;
      const maxPlayerMarketStands =
        level.maxPlayerMarketStands ?? level.maxShopSlots ?? previousPlayerMarketStands;
      const unlocks = this.readStringList(level.unlocks, 'unlocks');
      const researchUnlocks = this.readStringList(
        level.researchUnlocks ?? level.allowsResearch ?? level.allowsResearching,
        'researchUnlocks',
      );

      if (!Number.isInteger(maxGardenTiles) || maxGardenTiles < previousGardenTiles) {
        throw new Error('player-level-balance.json maxGardenTiles must be non-decreasing integers.');
      }

      if (!Number.isInteger(maxCauldrons) || maxCauldrons < previousCauldrons) {
        throw new Error('player-level-balance.json maxCauldrons must be non-decreasing integers.');
      }

      if (
        !Number.isInteger(maxNpcMarketStands) ||
        maxNpcMarketStands < previousNpcMarketStands
      ) {
        throw new Error(
          'player-level-balance.json maxNpcMarketStands must be non-decreasing integers.',
        );
      }

      if (
        !Number.isInteger(maxPlayerMarketStands) ||
        maxPlayerMarketStands < previousPlayerMarketStands
      ) {
        throw new Error(
          'player-level-balance.json maxPlayerMarketStands must be non-decreasing integers.',
        );
      }

      previousLevel = level.level;
      previousGardenTiles = maxGardenTiles;
      previousCauldrons = maxCauldrons;
      previousNpcMarketStands = maxNpcMarketStands;
      previousPlayerMarketStands = maxPlayerMarketStands;

      return {
        level: level.level,
        maxGardenTiles,
        maxCauldrons,
        maxNpcMarketStands,
        maxPlayerMarketStands,
        unlocks,
        researchUnlocks,
      };
    });
  }

  readManaProgression(balance = this.balance) {
    const mana = balance?.mana ?? balance?.manaProgression;

    if (mana === undefined) {
      return null;
    }

    return {
      baseMaxManaCap: this.readNonNegativeNumber(
        mana.baseMaxManaCap ?? mana.baseCap,
        'mana.baseMaxManaCap',
      ),
      maxManaCapPerLevel: this.readNonNegativeNumber(
        mana.maxManaCapPerLevel ?? mana.capPerLevel,
        'mana.maxManaCapPerLevel',
      ),
      baseManaPerSecond: this.readNonNegativeNumber(
        mana.baseManaPerSecond ?? mana.basePerSecond,
        'mana.baseManaPerSecond',
      ),
      manaPerSecondPerLevel: this.readNonNegativeNumber(
        mana.manaPerSecondPerLevel ?? mana.perSecondPerLevel,
        'mana.manaPerSecondPerLevel',
      ),
    };
  }

  readStringList(value, key) {
    if (value === undefined) {
      return [];
    }

    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry)) {
      throw new Error(`player-level-balance.json ${key} must be a string array.`);
    }

    return [...value];
  }

  readNonNegativeNumber(value, key) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`player-level-balance.json ${key} must be a non-negative number.`);
    }

    return value;
  }

  clampLevelNumber(levelNumber) {
    const safeLevel = Number.isInteger(levelNumber) ? levelNumber : 1;
    return Math.max(1, Math.min(safeLevel, this.maxLevel));
  }

  roundStat(value) {
    return Number(value.toFixed(4));
  }

  formatStat(value) {
    return String(this.roundStat(value));
  }
}
