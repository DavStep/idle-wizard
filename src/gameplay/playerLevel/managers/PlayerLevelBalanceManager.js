const DEFAULT_MANA_PER_SECOND_PER_LEVEL_RANGES = [
  { fromLevel: 2, toLevel: 5, amount: 1 },
  { fromLevel: 6, toLevel: 10, amount: 0.5 },
  { fromLevel: 11, amount: 0.25 },
];

export const DEFAULT_PLAYER_LEVEL_BALANCE = {
  "maxLevel": 100,
  "mana": {
    "baseMaxManaCap": 50,
    "maxManaCapPerLevel": 50,
    "baseManaPerSecond": 1,
    "manaPerSecondPerLevelRanges": DEFAULT_MANA_PER_SECOND_PER_LEVEL_RANGES
  },
  "crystal": {
    "perLevel": 1
  },
  "milestones": [
    {
      "level": 1,
      "maxGardenTiles": 2,
      "maxCauldrons": 1,
      "maxNpcMarketStands": 0,
      "maxPlayerMarketStands": 0
    },
    {
      "level": 2,
      "maxGardenTiles": 3,
      "maxCauldrons": 1,
      "maxNpcMarketStands": 0,
      "maxPlayerMarketStands": 0
    },
    {
      "level": 3,
      "maxGardenTiles": 3,
      "maxCauldrons": 1,
      "maxNpcMarketStands": 0,
      "maxPlayerMarketStands": 0
    },
    {
      "level": 4,
      "maxGardenTiles": 3,
      "maxCauldrons": 1,
      "maxNpcMarketStands": 1,
      "maxPlayerMarketStands": 1
    },
    {
      "level": 5,
      "maxGardenTiles": 5,
      "maxCauldrons": 3,
      "maxNpcMarketStands": 2,
      "maxPlayerMarketStands": 2
    },
    {
      "level": 8,
      "maxGardenTiles": 7,
      "maxCauldrons": 3,
      "maxNpcMarketStands": 2,
      "maxPlayerMarketStands": 2
    },
    {
      "level": 10,
      "maxGardenTiles": 8,
      "maxCauldrons": 3,
      "maxNpcMarketStands": 3,
      "maxPlayerMarketStands": 3
    },
    {
      "level": 13,
      "maxGardenTiles": 9,
      "maxCauldrons": 3,
      "maxNpcMarketStands": 4,
      "maxPlayerMarketStands": 4
    },
    {
      "level": 17,
      "maxGardenTiles": 10,
      "maxCauldrons": 3,
      "maxNpcMarketStands": 5,
      "maxPlayerMarketStands": 5
    },
    {
      "level": 21,
      "maxGardenTiles": 10,
      "maxCauldrons": 4,
      "maxNpcMarketStands": 5,
      "maxPlayerMarketStands": 5
    },
    {
      "level": 25,
      "maxGardenTiles": 10,
      "maxCauldrons": 5,
      "maxNpcMarketStands": 5,
      "maxPlayerMarketStands": 5
    }
  ]
};

export class PlayerLevelBalanceManager {
  constructor({ balance = DEFAULT_PLAYER_LEVEL_BALANCE } = {}) {
    this.revision = 0;
    this.balance = balance;
    this.setBalance(balance);
  }

  setRuntimeBalance(balance) {
    this.setBalance(balance);
  }

  setBalance(balance) {
    const maxLevel = this.readMaxLevel(balance);
    const manaProgression = this.readManaProgression(balance, maxLevel);
    const crystalRewards = this.readCrystalRewards(balance);
    const milestones = this.readMilestones(balance, maxLevel);

    this.balance = balance;
    this.maxLevel = maxLevel;
    this.manaProgression = manaProgression;
    this.crystalRewards = crystalRewards;
    this.milestones = milestones;
    this.revision += 1;
  }

  getRevision() {
    return this.revision;
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
          this.getManaPerSecondIncrease(safeLevel),
      ),
    };
  }

  getManaPerSecondIncrease(levelNumber) {
    if (Array.isArray(this.manaProgression.manaPerSecondPerLevelRanges)) {
      return this.getRangeStatIncrease(
        this.manaProgression.manaPerSecondPerLevelRanges,
        levelNumber,
      );
    }

    return (levelNumber - 1) * this.manaProgression.manaPerSecondPerLevel;
  }

  getRangeStatIncrease(ranges, levelNumber) {
    const safeLevel = this.clampLevelNumber(levelNumber);

    return ranges.reduce((total, range) => {
      const fromLevel = Math.max(2, range.fromLevel);
      const toLevel = Math.min(safeLevel, range.toLevel);

      if (toLevel < fromLevel) {
        return total;
      }

      return total + (toLevel - fromLevel + 1) * range.amount;
    }, 0);
  }

  getCrystalRewardForLevel(levelNumber) {
    const safeLevel = this.clampLevelNumber(levelNumber);

    if (safeLevel <= 1) {
      return 0;
    }

    return this.crystalRewards.perLevel;
  }

  getCrystalRewardForLevelRange(levelBefore, levelAfter) {
    const safeLevelBefore = this.clampLevelNumber(levelBefore);
    const safeLevelAfter = this.clampLevelNumber(levelAfter);

    if (safeLevelAfter <= safeLevelBefore) {
      return 0;
    }

    const firstRewardLevel = Math.max(2, safeLevelBefore + 1);

    if (safeLevelAfter < firstRewardLevel) {
      return 0;
    }

    return this.roundStat(
      (safeLevelAfter - firstRewardLevel + 1) * this.crystalRewards.perLevel,
    );
  }

  getRequiredLevelForGardenTile(tileNumber) {
    return this.getRequiredLevelForLimit('maxGardenTiles', tileNumber);
  }

  getRequiredLevelForCauldron(cauldronNumber) {
    return this.getRequiredLevelForLimit('maxCauldrons', cauldronNumber);
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
      ...this.describeCrystalLevel(levelNumber),
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

  describeCrystalLevel(levelNumber) {
    const crystalReward = this.getCrystalRewardForLevel(levelNumber);

    if (crystalReward <= 0) {
      return [];
    }

    return [`crystal reward ${this.formatStat(crystalReward)}`];
  }

  readMaxLevel(balance = this.balance) {
    const maxLevel = balance?.maxLevel ?? balance?.levels?.at(-1)?.level ?? 1;

    if (!Number.isInteger(maxLevel) || maxLevel <= 0) {
      throw new Error('game_config.playerLevel requires positive maxLevel.');
    }

    return maxLevel;
  }

  readMilestones(balance = this.balance, maxLevel = this.maxLevel) {
    const milestones = balance?.milestones ?? balance?.levels;

    if (!Array.isArray(milestones) || milestones.length <= 0) {
      throw new Error('game_config.playerLevel requires milestones.');
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
          'game_config.playerLevel milestones must use increasing levels within maxLevel.',
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
        throw new Error('game_config.playerLevel maxGardenTiles must be non-decreasing integers.');
      }

      if (!Number.isInteger(maxCauldrons) || maxCauldrons < previousCauldrons) {
        throw new Error('game_config.playerLevel maxCauldrons must be non-decreasing integers.');
      }

      if (
        !Number.isInteger(maxNpcMarketStands) ||
        maxNpcMarketStands < previousNpcMarketStands
      ) {
        throw new Error(
          'game_config.playerLevel maxNpcMarketStands must be non-decreasing integers.',
        );
      }

      if (
        !Number.isInteger(maxPlayerMarketStands) ||
        maxPlayerMarketStands < previousPlayerMarketStands
      ) {
        throw new Error(
          'game_config.playerLevel maxPlayerMarketStands must be non-decreasing integers.',
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

  readManaProgression(balance = this.balance, maxLevel = this.maxLevel) {
    const mana = balance?.mana ?? balance?.manaProgression;

    if (mana === undefined) {
      return null;
    }

    const manaPerSecondPerLevelRanges = this.readManaPerSecondPerLevelRanges(
      mana.manaPerSecondPerLevelRanges ?? mana.perSecondPerLevelRanges,
      maxLevel,
    );
    const legacyManaPerSecondPerLevel =
      mana.manaPerSecondPerLevel ?? mana.perSecondPerLevel;

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
      manaPerSecondPerLevelRanges,
      manaPerSecondPerLevel:
        manaPerSecondPerLevelRanges === null
          ? this.readNonNegativeNumber(
              legacyManaPerSecondPerLevel,
              'mana.manaPerSecondPerLevel',
            )
          : 0,
    };
  }

  readManaPerSecondPerLevelRanges(value, maxLevel) {
    if (value === undefined) {
      return null;
    }

    if (!Array.isArray(value) || value.length <= 0) {
      throw new Error('game_config.playerLevel mana.manaPerSecondPerLevelRanges must be an array.');
    }

    let expectedFromLevel = 2;

    const ranges = value.map((range, index) => {
      if (!range || typeof range !== 'object' || Array.isArray(range)) {
        throw new Error(
          'game_config.playerLevel mana.manaPerSecondPerLevelRanges entries must be objects.',
        );
      }

      const fromLevel = range.fromLevel ?? range.minLevel ?? range.level;
      const toLevel = range.toLevel ?? range.maxLevel ?? maxLevel;
      const amount = range.amount ?? range.perLevel ?? range.perSecond;

      if (
        !Number.isInteger(fromLevel) ||
        !Number.isInteger(toLevel) ||
        fromLevel !== expectedFromLevel ||
        toLevel < fromLevel ||
        toLevel > maxLevel
      ) {
        throw new Error(
          'game_config.playerLevel mana.manaPerSecondPerLevelRanges must cover each level after 1 once.',
        );
      }

      expectedFromLevel = toLevel + 1;

      return {
        fromLevel,
        toLevel,
        amount: this.readNonNegativeNumber(
          amount,
          `mana.manaPerSecondPerLevelRanges[${index}].amount`,
        ),
      };
    });

    if (maxLevel > 1 && expectedFromLevel !== maxLevel + 1) {
      throw new Error(
        'game_config.playerLevel mana.manaPerSecondPerLevelRanges must cover each level after 1 once.',
      );
    }

    return ranges;
  }

  readCrystalRewards(balance = this.balance) {
    const crystal = balance?.crystal;

    if (
      crystal !== undefined &&
      crystal !== null &&
      (typeof crystal !== 'object' || Array.isArray(crystal))
    ) {
      throw new Error('game_config.playerLevel crystal must be an object.');
    }

    const nestedPerLevel =
      crystal
        ? crystal.perLevel ?? crystal.perLevelUp
        : undefined;
    const perLevel =
      nestedPerLevel ?? balance?.crystalPerLevel ?? balance?.crystalPerLevelUp;

    return {
      perLevel:
        perLevel === undefined
          ? DEFAULT_PLAYER_LEVEL_BALANCE.crystal.perLevel
          : this.readNonNegativeInteger(perLevel, 'crystal.perLevel'),
    };
  }

  readStringList(value, key) {
    if (value === undefined) {
      return [];
    }

    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry)) {
      throw new Error(`game_config.playerLevel ${key} must be a string array.`);
    }

    return [...value];
  }

  readNonNegativeNumber(value, key) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`game_config.playerLevel ${key} must be a non-negative number.`);
    }

    return value;
  }

  readNonNegativeInteger(value, key) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`game_config.playerLevel ${key} must be a non-negative integer.`);
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
