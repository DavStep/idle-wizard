export const GUILD_UNLOCK_LEVEL = 15;
export const GUILD_CHARTER_COST_GOLD = 1500;
export const GUILD_STATE_VERSION = 1;
export const GUILD_STATS = Object.freeze([
  'strength',
  'endurance',
  'agility',
  'wisdom',
  'cunning',
  'charisma',
  'luck',
  'discipline',
]);

export const GUILD_SECRETARY_LEVELS = Object.freeze([
  { level: 1, costGold: 0, hiredCap: 1, boardSlots: 3, minLevel: 1, maxLevel: 25 },
  { level: 2, costGold: 3000, hiredCap: 2, boardSlots: 5, minLevel: 10, maxLevel: 40 },
  { level: 3, costGold: 9000, hiredCap: 3, boardSlots: 7, minLevel: 25, maxLevel: 60 },
  { level: 4, costGold: 27000, hiredCap: 4, boardSlots: 9, minLevel: 45, maxLevel: 80 },
  { level: 5, costGold: 81000, hiredCap: 5, boardSlots: 12, minLevel: 65, maxLevel: 100 },
]);

const PERSONALITIES = Object.freeze([
  {
    id: 'drinker',
    label: 'drinker',
    life: 'looks for a tavern with a chair near the door.',
    weights: { strength: 2, endurance: 2, charisma: 1, luck: 1 },
    boldness: 1,
  },
  {
    id: 'family',
    label: 'family-minded',
    life: 'walks home with bread under one arm.',
    weights: { endurance: 2, wisdom: 2, discipline: 2, charisma: 1 },
    boldness: -1,
  },
  {
    id: 'burglar',
    label: 'burglar',
    life: 'counts windows and pockets with the same smile.',
    weights: { agility: 3, cunning: 3, luck: 1 },
    boldness: 1,
  },
  {
    id: 'gloryHound',
    label: 'glory hound',
    life: 'rehearses a victory bow for people who are not watching.',
    weights: { strength: 2, agility: 1, charisma: 2, luck: 1 },
    boldness: 2,
  },
  {
    id: 'scholar',
    label: 'scholar',
    life: 'reads old margins and misses lunch.',
    weights: { wisdom: 3, cunning: 1, discipline: 2 },
    boldness: -1,
  },
  {
    id: 'gambler',
    label: 'gambler',
    life: 'flips a bent coin and trusts it too much.',
    weights: { luck: 3, charisma: 1, cunning: 1, agility: 1 },
    boldness: 1,
  },
  {
    id: 'brawler',
    label: 'brawler',
    life: 'finds someone broad enough to spar with.',
    weights: { strength: 3, endurance: 2, discipline: 1 },
    boldness: 1,
  },
  {
    id: 'coward',
    label: 'careful coward',
    life: 'checks the latch twice and calls it wisdom.',
    weights: { wisdom: 2, agility: 1, discipline: 2, luck: 1 },
    boldness: -2,
  },
  {
    id: 'romantic',
    label: 'romantic',
    life: 'writes a dramatic letter and seals it badly.',
    weights: { charisma: 3, wisdom: 1, luck: 1, discipline: 1 },
    boldness: 0,
  },
  {
    id: 'loyal',
    label: 'loyal',
    life: 'repairs guild straps without being asked.',
    weights: { endurance: 2, discipline: 3, strength: 1 },
    boldness: 0,
  },
  {
    id: 'reckless',
    label: 'reckless',
    life: 'looks bored unless something can go wrong.',
    weights: { strength: 1, agility: 2, luck: 2, charisma: 1 },
    boldness: 3,
  },
]);

const FIRST_NAMES = Object.freeze([
  'andrea',
  'david',
  'mira',
  'rowan',
  'corvin',
  'juniper',
  'tessa',
  'bram',
  'ivor',
  'nina',
  'oren',
  'selka',
  'viktor',
  'lina',
  'maro',
  'yasmin',
]);

const SURNAMES = Object.freeze([
  'ashbell',
  'blackstairs',
  'copperhand',
  'dusk',
  'fen',
  'graymoss',
  'lowhill',
  'northgate',
  'redwell',
  'sourleaf',
  'stonebent',
  'thorn',
]);

const EPITHETS = Object.freeze([
  'the bad-luck bell',
  'of the broken stair',
  'the north-road nuisance',
  'the mule-kicker',
  'the dragon-slanderer',
  'of black pine',
  'the coin-biter',
  'the candle thief',
  'the soup champion',
  'the almost brave',
  'the wet-boot hero',
  'the quiet blade',
]);

const QUEST_TYPES = Object.freeze([
  quest('cellar trouble', 'rats hit the flour sacks like tax men.', 'trivial', ['strength', 'endurance'], ['village']),
  quest('lost courier', 'a letter goes missing between bells.', 'easy', ['agility', 'wisdom'], ['road']),
  quest('old road escort', 'a nervous trader wants one honest shadow.', 'easy', ['endurance', 'charisma'], ['road', 'trade']),
  quest('bandit toll', 'a toll rope appears where no toll belongs.', 'medium', ['strength', 'agility'], ['road', 'danger']),
  quest('fever ward run', 'medicine must cross town before the fever climbs.', 'medium', ['wisdom', 'discipline'], ['medical']),
  quest('broken bridge watch', 'someone must guard the workers through dusk.', 'easy', ['endurance', 'discipline'], ['village']),
  quest('sealed crypt survey', 'a clerk wants names copied from a shut stone door.', 'hard', ['wisdom', 'luck'], ['crypt']),
  quest('smuggler tunnel', 'lanterns move under the fish market.', 'medium', ['cunning', 'agility'], ['crime']),
  quest('tavern debt', 'a debt collector needs a witness with teeth.', 'easy', ['charisma', 'strength'], ['tavern']),
  quest('noble blackmail', 'a sealed note has too many fingerprints.', 'medium', ['charisma', 'cunning'], ['political']),
  quest('mine breach', 'miners heard stone breathe behind the brace.', 'hard', ['strength', 'endurance'], ['mine']),
  quest('cursed well', 'the bucket comes up whispering.', 'medium', ['wisdom', 'discipline'], ['curse']),
  quest('missing apprentice', 'a young fool follows glowcap rumors.', 'easy', ['wisdom', 'charisma'], ['village']),
  quest('night watch', 'the watch needs eyes that stay open.', 'medium', ['discipline', 'endurance'], ['guard']),
  quest('relic inventory', 'old boxes need old lies sorted out.', 'easy', ['wisdom', 'cunning'], ['research']),
  quest('arena challenge', 'a pit champion laughs at guild badges.', 'hard', ['strength', 'endurance'], ['arena']),
  quest('mirror maze', 'the wrong reflection keeps the key.', 'hard', ['wisdom', 'luck'], ['magic']),
  quest('road ambush', 'fresh arrows mark the cart track.', 'hard', ['agility', 'strength'], ['road', 'danger']),
  quest('deep dungeon', 'a stair goes down past sane maps.', 'deadly', ['strength', 'wisdom'], ['dungeon']),
  quest('silent contract', 'no one says the name twice.', 'deadly', ['cunning', 'discipline'], ['crime']),
]);

const EVENT_QUEST_TYPES = Object.freeze({
  'military danger': [
    quest('field bottle escort', 'stonebridge needs bottles under arrow weather.', 'medium', ['endurance', 'discipline'], ['event', 'military']),
    quest('wall-run messenger', 'one runner must cross the killing ground.', 'hard', ['agility', 'luck'], ['event', 'military']),
    quest('mud scout', 'enemy fires show where the road sinks.', 'medium', ['wisdom', 'agility'], ['event', 'military']),
    quest('siege map recovery', 'a lost map lies near the burned tent.', 'hard', ['cunning', 'discipline'], ['event', 'military']),
    quest('black banner raid', 'a banner captain sleeps behind three sentries.', 'deadly', ['strength', 'cunning'], ['event', 'military']),
  ],
  'village crisis': [
    quest('sickroom watch', 'someone must sit where the coughing is worst.', 'medium', ['endurance', 'wisdom'], ['event', 'medical']),
    quest('clean water line', 'buckets need guarding from panic.', 'easy', ['discipline', 'charisma'], ['event', 'medical']),
    quest('fever cart', 'the cart crosses narrow alleys after dark.', 'medium', ['strength', 'wisdom'], ['event', 'medical']),
    quest('quarantine dispute', 'one locked door becomes six arguments.', 'hard', ['charisma', 'discipline'], ['event', 'medical']),
    quest('tainted cellar', 'the smell below the mill has teeth.', 'deadly', ['wisdom', 'luck'], ['event', 'medical']),
  ],
  'political change': [
    quest('seal runner', 'a fresh seal must reach a cold office.', 'easy', ['agility', 'charisma'], ['event', 'political']),
    quest('charter audit', 'old ink decides who eats tomorrow.', 'medium', ['wisdom', 'cunning'], ['event', 'political']),
    quest('guarded witness', 'a witness changes rooms every bell.', 'medium', ['discipline', 'charisma'], ['event', 'political']),
    quest('palace cellar copy', 'the second ledger is never upstairs.', 'hard', ['cunning', 'luck'], ['event', 'political']),
    quest('crownless duel', 'two captains ask the street to pick.', 'deadly', ['strength', 'discipline'], ['event', 'political']),
  ],
  'exploration discovery': [
    quest('first stair rope', 'the new stair eats careless boots.', 'easy', ['agility', 'discipline'], ['event', 'exploration']),
    quest('marking copy', 'wall marks shift when not watched.', 'medium', ['wisdom', 'luck'], ['event', 'exploration']),
    quest('lamp run', 'the first chamber drinks oil fast.', 'medium', ['endurance', 'wisdom'], ['event', 'exploration']),
    quest('sealed room breath', 'air moves through a room without doors.', 'hard', ['cunning', 'discipline'], ['event', 'exploration']),
    quest('lower dark claim', 'something below scratches back.', 'deadly', ['strength', 'luck'], ['event', 'exploration']),
  ],
  'trade disruption': [
    quest('replacement convoy', 'thin shelves make merchants brave.', 'easy', ['endurance', 'charisma'], ['event', 'trade']),
    quest('black pine sweep', 'lost wheels leave marks in wet roots.', 'medium', ['wisdom', 'agility'], ['event', 'trade']),
    quest('warehouse dispute', 'two ledgers claim the same crate.', 'medium', ['charisma', 'cunning'], ['event', 'trade']),
    quest('road thief nest', 'stolen bolts hang from a pine like flags.', 'hard', ['strength', 'cunning'], ['event', 'trade']),
    quest('caravan rescue', 'one wagon bell rings under the hill.', 'deadly', ['endurance', 'luck'], ['event', 'trade']),
  ],
});

const DIFFICULTY_SCORE = Object.freeze({
  trivial: 18,
  easy: 26,
  medium: 36,
  hard: 50,
  deadly: 68,
});

const DIFFICULTY_DURATION_MS = Object.freeze({
  trivial: 20 * 60 * 1000,
  easy: 40 * 60 * 1000,
  medium: 90 * 60 * 1000,
  hard: 3 * 60 * 60 * 1000,
  deadly: 6 * 60 * 60 * 1000,
});

function quest(title, lore, difficulty, stats, tags) {
  return {
    title,
    lore,
    difficulty,
    stats,
    tags,
  };
}

export class GuildGenerationManager {
  createApplicants({ periodKey, secretaryLevel = 1, currentLevel = GUILD_UNLOCK_LEVEL } = {}) {
    return [0, 1, 2].map((index) =>
      this.createAdventurer({
        seed: `${periodKey}:applicant:${index}:s${secretaryLevel}:l${currentLevel}`,
        idPrefix: 'applicant',
        index,
        secretaryLevel,
        currentLevel,
      }),
    );
  }

  createAdventurer({ seed, idPrefix = 'adventurer', index = 0, secretaryLevel = 1, currentLevel = GUILD_UNLOCK_LEVEL }) {
    const rng = createRng(seed);
    const secretary = getSecretaryLevel(secretaryLevel);
    const playerLift = Math.max(0, Math.floor((Math.max(1, currentLevel) - GUILD_UNLOCK_LEVEL) / 2));
    const minLevel = Math.min(100, secretary.minLevel + playerLift);
    const maxLevel = Math.min(120, secretary.maxLevel + playerLift);
    const level = randomInt(rng, minLevel, Math.max(minLevel, maxLevel));
    const personality = pick(rng, PERSONALITIES);
    const name = pick(rng, FIRST_NAMES);
    const surname = pick(rng, SURNAMES);
    const epithet = pick(rng, EPITHETS);
    const stats = distributeStats({ level, personality, rng });

    return {
      id: `${idPrefix}:${hashString(`${seed}:${index}`).toString(36)}`,
      name,
      surname,
      epithet,
      level,
      xp: 0,
      nextLevelXp: getNextLevelXp(level),
      personalityId: personality.id,
      personalityLabel: personality.label,
      personalityLife: personality.life,
      status: 'idle',
      morale: randomInt(rng, 45, 70),
      fatigue: randomInt(rng, 0, 18),
      injury: 0,
      stats,
      currentQuest: null,
      lifeText: personality.life,
      history: [],
      hiredAtMs: null,
    };
  }

  createRequests({
    count,
    sequence = 0,
    periodKey = 'guild',
    worldNotice = null,
  } = {}) {
    const total = Math.max(0, Math.floor(Number(count) || 0));
    const requests = [];

    for (let index = 0; index < total; index += 1) {
      requests.push(this.createRequest({
        seed: `${periodKey}:request:${sequence}:${index}`,
        sequence: sequence + index,
        worldNotice,
        preferEvent: index === 0 && Boolean(worldNotice?.family),
      }));
    }

    return requests;
  }

  createRequest({ seed, sequence = 0, worldNotice = null, preferEvent = false } = {}) {
    const rng = createRng(seed);
    const eventTypes = this.getEventQuestTypes(worldNotice);
    const useEvent = preferEvent || (eventTypes.length > 0 && rng() < 0.22);
    const source = useEvent ? pick(rng, eventTypes) : pick(rng, QUEST_TYPES);
    const event = useEvent && worldNotice
      ? {
          eventId: worldNotice.eventId,
          headline: worldNotice.headline,
          family: worldNotice.family,
        }
      : null;

    return {
      id: `request:${hashString(`${seed}:${source.title}`).toString(36)}`,
      sequence,
      title: source.title,
      lore: source.lore,
      difficulty: source.difficulty,
      difficultyScore: DIFFICULTY_SCORE[source.difficulty] ?? DIFFICULTY_SCORE.medium,
      durationMs: DIFFICULTY_DURATION_MS[source.difficulty] ?? DIFFICULTY_DURATION_MS.medium,
      stats: [...source.stats],
      tags: [...source.tags],
      event,
      createdAtMs: 0,
      rewardText: this.getRewardText(source.difficulty),
    };
  }

  getEventQuestTypes(worldNotice = null) {
    if (!worldNotice?.family) {
      return [];
    }

    return EVENT_QUEST_TYPES[worldNotice.family] ?? [];
  }

  getRewardText(difficulty) {
    const reward = getRewardRange(difficulty);
    return `${reward.gold[0]}-${reward.gold[1]} gold, ${reward.seeds[0]}-${reward.seeds[1]} seeds, or ${reward.herbs[0]}-${reward.herbs[1]} herbs`;
  }
}

export function getSecretaryLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return (
    GUILD_SECRETARY_LEVELS.find((entry) => entry.level === normalizedLevel) ??
    GUILD_SECRETARY_LEVELS[0]
  );
}

export function getNextSecretaryLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return GUILD_SECRETARY_LEVELS.find((entry) => entry.level === normalizedLevel + 1) ?? null;
}

export function getPersonality(personalityId) {
  return (
    PERSONALITIES.find((personality) => personality.id === personalityId) ??
    PERSONALITIES[0]
  );
}

export function getNextLevelXp(level) {
  return 50 + Math.max(1, Math.floor(Number(level) || 1)) * 5;
}

export function getRewardRange(difficulty) {
  const ranges = {
    trivial: { gold: [100, 140], seeds: [10, 20], herbs: [20, 35] },
    easy: { gold: [130, 180], seeds: [16, 28], herbs: [30, 50] },
    medium: { gold: [170, 230], seeds: [24, 38], herbs: [45, 70] },
    hard: { gold: [220, 300], seeds: [34, 50], herbs: [65, 100] },
    deadly: { gold: [260, 300], seeds: [40, 50], herbs: [80, 100] },
  };

  return ranges[difficulty] ?? ranges.medium;
}

export function distributeStats({ level, personality, rng }) {
  const stats = Object.fromEntries(GUILD_STATS.map((stat) => [stat, 10]));
  const weights = personality?.weights ?? {};
  const weightedStats = GUILD_STATS.flatMap((stat) =>
    Array.from({ length: Math.max(1, Math.floor(Number(weights[stat]) || 1)) }, () => stat),
  );
  const points = Math.max(0, Math.floor(Number(level) || 0));

  for (let point = 0; point < points; point += 1) {
    stats[pick(rng, weightedStats)] += 1;
  }

  return stats;
}

export function createRng(seedText) {
  let state = hashString(seedText) || 0x9e3779b9;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

export function hashString(value) {
  const text = String(value ?? '');
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function pick(rng, items) {
  const list = Array.isArray(items) && items.length > 0 ? items : [''];
  return list[Math.floor(rng() * list.length) % list.length];
}

export function randomInt(rng, min, max) {
  const low = Math.floor(Number(min) || 0);
  const high = Math.max(low, Math.floor(Number(max) || low));
  return low + Math.floor(rng() * (high - low + 1));
}
