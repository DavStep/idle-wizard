import {
  GUILD_STATS,
  createRng,
  getNextLevelXp,
  getPersonality,
  getRewardRange,
  pick,
  randomInt,
} from './GuildGenerationManager.js';

const MAX_HISTORY = 16;
const MAX_LOGS = 80;
const TICK_MS = 10 * 60 * 1000;
const HOSPITAL_BASE_MS = 2 * 60 * 60 * 1000;

const LIFE_ACTIONS = Object.freeze([
  { id: 'train', label: 'Training', text: 'Trains until the straps complain.', morale: 0, fatigue: 5 },
  { id: 'read', label: 'Studying', text: 'Reads old warnings and takes some seriously.', morale: 1, fatigue: 2 },
  { id: 'tavern', label: 'At The Tavern', text: 'Drinks at the tavern and laughs too loudly.', morale: 8, fatigue: 8 },
  { id: 'family', label: 'Visiting Home', text: 'Visits home and returns with cleaner hands.', morale: 10, fatigue: -2 },
  { id: 'redLantern', label: 'In Town', text: 'Spends coin in the red-lantern lane.', morale: 6, fatigue: 4 },
  { id: 'theft', label: 'In Town', text: 'Tries a quiet theft and calls it practice.', morale: 4, fatigue: 3 },
  { id: 'sleep', label: 'Resting', text: 'Sleeps like a dropped sack.', morale: 2, fatigue: -20 },
  { id: 'argue', label: 'In The Hall', text: 'Argues over nothing useful.', morale: -5, fatigue: 2 },
]);

const SOCIAL_ACTIONS = Object.freeze([
  {
    id: 'sharedSupper',
    text: 'share supper and trade stories from the road.',
    morale: 6,
    fatigue: -2,
  },
  {
    id: 'sparring',
    text: 'spar behind the hall until both call it a draw.',
    morale: 3,
    fatigue: 7,
  },
  {
    id: 'mapStudy',
    text: 'compare notes over an old field map.',
    morale: 2,
    fatigue: 1,
  },
  {
    id: 'gearRepair',
    text: 'repair each other\'s battered travelling gear.',
    morale: 4,
    fatigue: 0,
  },
  {
    id: 'argument',
    text: 'argue over who bent the practice sword.',
    morale: -3,
    fatigue: 2,
  },
]);

const SOCIAL_ACTION_CHANCE = 0.32;

export class GuildSimulationManager {
  run({ state, nowMs, generationManager, worldNotice } = {}) {
    if (!state?.profile) {
      return {
        changed: false,
        rewards: [],
      };
    }

    const startTick = Number.isFinite(state.lastSimAtMs)
      ? state.lastSimAtMs + TICK_MS
      : nowMs;
    const finalTick = Math.floor(Math.max(0, nowMs) / TICK_MS) * TICK_MS;
    const rewards = [];
    let changed = false;

    if (!Number.isFinite(state.lastSimAtMs)) {
      state.lastSimAtMs = finalTick;
      return {
        changed: true,
        rewards,
      };
    }

    for (let tickAtMs = startTick; tickAtMs <= finalTick; tickAtMs += TICK_MS) {
      changed = this.resolveQuestReturns(state, tickAtMs, rewards) || changed;
      changed = this.recoverHospitalAdventurers(state, tickAtMs) || changed;
      changed =
        this.runIdleAdventurers({
          state,
          tickAtMs,
          generationManager,
          worldNotice,
        }) || changed;
      state.lastSimAtMs = tickAtMs;
    }

    return {
      changed,
      rewards,
    };
  }

  resolveQuestReturns(state, tickAtMs, rewards) {
    let changed = false;

    for (const adventurer of state.adventurers ?? []) {
      const currentQuest = adventurer.currentQuest;

      if (
        adventurer.status !== 'questing' ||
        !currentQuest ||
        Math.max(0, Number(currentQuest.returnAtMs) || 0) > tickAtMs
      ) {
        continue;
      }

      const result = this.resolveQuest(adventurer, currentQuest, tickAtMs);
      adventurer.currentQuest = null;
      adventurer.status = result.status;
      adventurer.morale = clamp(adventurer.morale + result.moraleDelta, 0, 100);
      adventurer.fatigue = clamp(adventurer.fatigue + result.fatigueDelta, 0, 100);
      adventurer.injury = clamp(result.injury, 0, 100);

      if (result.status === 'hospital') {
        adventurer.hospitalUntilMs = tickAtMs + result.hospitalMs;
      } else {
        delete adventurer.hospitalUntilMs;
      }

      if (result.status === 'dead') {
        adventurer.diedAtMs = tickAtMs;
      }

      adventurer.lifeActionId = result.status;
      adventurer.lifeText = result.activityText;
      adventurer.activityAtMs = tickAtMs;
      delete adventurer.activityPartnerId;
      delete adventurer.activityPartnerName;

      if (result.reward) {
        rewards.push(result.reward);
      }

      if (result.xp > 0 && adventurer.status !== 'dead') {
        const levelSummaries = this.applyXp(adventurer, result.xp, tickAtMs);
        for (const levelSummary of levelSummaries) {
          this.pushLog(state, levelSummary, 'orange', {
            actorId: adventurer.id,
            atMs: tickAtMs,
            kind: 'level',
          });
        }
      }

      this.pushHistory(adventurer, result.summary, tickAtMs);
      this.pushLog(state, result.summary, result.urgent ? 'red' : 'orange', {
        actorId: adventurer.id,
        atMs: tickAtMs,
        kind: result.status === 'dead' ? 'death' : 'return',
      });
      changed = true;
    }

    return changed;
  }

  recoverHospitalAdventurers(state, tickAtMs) {
    let changed = false;

    for (const adventurer of state.adventurers ?? []) {
      if (adventurer.status !== 'hospital') {
        continue;
      }

      if (Math.max(0, Number(adventurer.hospitalUntilMs) || 0) > tickAtMs) {
        continue;
      }

      adventurer.status = 'idle';
      adventurer.injury = Math.max(0, Math.floor((Number(adventurer.injury) || 0) / 2));
      adventurer.fatigue = Math.max(0, Math.floor((Number(adventurer.fatigue) || 0) / 2));
      delete adventurer.hospitalUntilMs;
      const summary = `${formatName(adventurer)} leaves the guild hospital.`;
      adventurer.lifeActionId = 'recovered';
      adventurer.lifeText = 'Rests in the hall after leaving the guild hospital.';
      adventurer.activityAtMs = tickAtMs;
      delete adventurer.activityPartnerId;
      delete adventurer.activityPartnerName;
      this.pushHistory(adventurer, summary, tickAtMs);
      this.pushLog(state, summary, 'orange', {
        actorId: adventurer.id,
        atMs: tickAtMs,
        kind: 'recovery',
      });
      changed = true;
    }

    return changed;
  }

  runIdleAdventurers({ state, tickAtMs }) {
    let changed = false;
    const board = Array.isArray(state.board) ? state.board : [];
    const handledIds = new Set();

    for (const adventurer of state.adventurers ?? []) {
      if (adventurer.status !== 'idle' || handledIds.has(adventurer.id)) {
        continue;
      }

      const rng = createRng(`${tickAtMs}:${adventurer.id}:choice`);
      const personality = getPersonality(adventurer.personalityId);
      const takeChance = clamp(
        0.18 +
          personality.boldness * 0.035 +
          ((Number(adventurer.morale) || 0) - 50) / 500 -
          (Number(adventurer.fatigue) || 0) / 700,
        0.04,
        0.48,
      );

      if (board.length > 0 && rng() < takeChance) {
        const request = this.chooseRequest({ adventurer, board, rng });

        if (request) {
          this.startQuest({ state, adventurer, request, tickAtMs });
          handledIds.add(adventurer.id);
          changed = true;
          continue;
        }
      }

      const partners = (state.adventurers ?? []).filter(
        (candidate) =>
          candidate.id !== adventurer.id &&
          candidate.status === 'idle' &&
          !handledIds.has(candidate.id),
      );

      if (partners.length > 0 && rng() < SOCIAL_ACTION_CHANCE) {
        const partner = pick(rng, partners);
        this.applySocialAction({
          state,
          adventurer,
          partner,
          tickAtMs,
          rng,
        });
        handledIds.add(adventurer.id);
        handledIds.add(partner.id);
        changed = true;
        continue;
      }

      this.applyLifeAction({ adventurer, tickAtMs });
      handledIds.add(adventurer.id);
      changed = true;
    }

    return changed;
  }

  chooseRequest({ adventurer, board, rng }) {
    const personality = getPersonality(adventurer.personalityId);
    const scored = board.map((request) => {
      const fit = getQuestStatPower(adventurer, request);
      const danger = Math.max(0, Number(request.difficultyScore) || 0) - fit;
      const boldness = personality.boldness * 7;
      const random = Math.floor(rng() * 10);
      return {
        request,
        score: fit + boldness - Math.abs(danger - boldness) + random,
      };
    });

    scored.sort((left, right) => right.score - left.score);
    return scored[0]?.request ?? null;
  }

  startQuest({ state, adventurer, request, tickAtMs }) {
    const index = state.board.findIndex((candidate) => candidate.id === request.id);

    if (index >= 0) {
      state.board.splice(index, 1);
    }

    adventurer.status = 'questing';
    adventurer.currentQuest = {
      ...request,
      startedAtMs: tickAtMs,
      returnAtMs: tickAtMs + Math.max(TICK_MS, Number(request.durationMs) || TICK_MS),
    };
    adventurer.fatigue = clamp(adventurer.fatigue + 4, 0, 100);
    adventurer.lifeActionId = 'questing';
    adventurer.lifeText = `Travels for ${request.title}.`;
    adventurer.activityAtMs = tickAtMs;
    delete adventurer.activityPartnerId;
    delete adventurer.activityPartnerName;

    const summary = `${formatName(adventurer)} takes ${request.title}.`;
    this.pushHistory(adventurer, summary, tickAtMs);
    this.pushLog(state, summary, request.event ? 'orange' : null, {
      actorId: adventurer.id,
      atMs: tickAtMs,
      kind: 'departure',
    });
  }

  applyLifeAction({ adventurer, tickAtMs }) {
    const personality = getPersonality(adventurer.personalityId);
    const rng = createRng(`${tickAtMs}:${adventurer.id}:life`);
    const actionPool = this.getLifeActionPool(personality);
    const action = pick(rng, actionPool);
    adventurer.lifeActionId = action.id;
    adventurer.lifeText = action.text;
    adventurer.activityAtMs = tickAtMs;
    delete adventurer.activityPartnerId;
    delete adventurer.activityPartnerName;
    adventurer.morale = clamp(adventurer.morale + action.morale, 0, 100);
    adventurer.fatigue = clamp(adventurer.fatigue + action.fatigue, 0, 100);

    if (action.id === 'theft' && rng() < 0.08) {
      adventurer.injury = clamp(adventurer.injury + 8, 0, 100);
      adventurer.lifeText = 'Gets chased from a quiet theft and limps back.';
    }

    if (rng() < 0.12) {
      this.pushHistory(
        adventurer,
        `${formatName(adventurer)} ${lowercaseFirst(adventurer.lifeText)}`,
        tickAtMs,
      );
    }
  }

  applySocialAction({ state, adventurer, partner, tickAtMs, rng }) {
    const action = pick(rng, SOCIAL_ACTIONS);
    const adventurerName = formatName(adventurer);
    const partnerName = formatName(partner);
    const summary = `${adventurerName} and ${partnerName} ${action.text}`;
    const activityText = action.text.replace(/\.$/, '');

    for (const [person, other] of [
      [adventurer, partner],
      [partner, adventurer],
    ]) {
      person.lifeActionId = action.id;
      person.lifeText = `${capitalizeFirst(activityText)} with ${formatName(other)}.`;
      person.activityPartnerId = other.id;
      person.activityPartnerName = formatName(other);
      person.activityAtMs = tickAtMs;
      person.morale = clamp(person.morale + action.morale, 0, 100);
      person.fatigue = clamp(person.fatigue + action.fatigue, 0, 100);
      this.pushHistory(person, summary, tickAtMs);
    }

    this.pushLog(state, summary, action.morale < 0 ? null : 'orange', {
      actorId: adventurer.id,
      partnerId: partner.id,
      atMs: tickAtMs,
      kind: 'social',
    });
  }

  getLifeActionPool(personality) {
    const base = [...LIFE_ACTIONS];

    if (personality.id === 'drinker') {
      base.push(LIFE_ACTIONS.find((action) => action.id === 'tavern'));
    }

    if (personality.id === 'family') {
      base.push(LIFE_ACTIONS.find((action) => action.id === 'family'));
    }

    if (personality.id === 'burglar') {
      base.push(LIFE_ACTIONS.find((action) => action.id === 'theft'));
    }

    return base.filter(Boolean);
  }

  resolveQuest(adventurer, quest) {
    const rng = createRng(`${adventurer.id}:${quest.id}:${quest.startedAtMs}:resolve`);
    const rolls = [rollD20(rng), rollD20(rng), rollD20(rng)];
    const ones = rolls.filter((roll) => roll === 1).length;
    const twenties = rolls.filter((roll) => roll === 20).length;
    const power = getQuestStatPower(adventurer, quest);
    const fatiguePenalty = Math.floor((Number(adventurer.fatigue) || 0) / 12);
    const injuryPenalty = Math.floor((Number(adventurer.injury) || 0) / 15);
    const moraleBonus = Math.floor(((Number(adventurer.morale) || 0) - 50) / 18);
    const difficulty = Math.max(1, Number(quest.difficultyScore) || 1);
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + power + moraleBonus - fatiguePenalty - injuryPenalty;
    const gap = total - difficulty;
    const disaster = difficulty - power;
    const rollText = rolls.map((roll) => `d20:${roll}`).join(', ');
    const name = formatName(adventurer);

    if (ones >= 3 && disaster > -24) {
      return {
        status: 'dead',
        urgent: true,
        moraleDelta: -100,
        fatigueDelta: 100,
        injury: 100,
        hospitalMs: 0,
        xp: 0,
        reward: null,
        activityText: `Dies while pursuing ${quest.title}.`,
        summary: `${name} dies on ${quest.title}. ${rollText}.`,
      };
    }

    if (gap < -18 || (ones >= 2 && disaster > 10)) {
      const deathChance = clamp((disaster - 10) / 70 + ones * 0.08, 0, 0.65);

      if (rng() < deathChance) {
        return {
          status: 'dead',
          urgent: true,
          moraleDelta: -100,
          fatigueDelta: 100,
          injury: 100,
          hospitalMs: 0,
          xp: 0,
          reward: null,
          activityText: `Is killed while pursuing ${quest.title}.`,
          summary: `${name} is killed by ${quest.title}. ${rollText}.`,
        };
      }

      return {
        status: 'hospital',
        urgent: true,
        moraleDelta: -18,
        fatigueDelta: 35,
        injury: randomInt(rng, 35, 80),
        hospitalMs: HOSPITAL_BASE_MS + randomInt(rng, 0, 4) * 60 * 60 * 1000,
        xp: Math.floor(getQuestXp(quest.difficulty) / 2),
        reward: null,
        activityText: `Recovers in the guild hospital after ${quest.title}.`,
        summary: `${name} returns from ${quest.title} and goes to the guild hospital. ${rollText}.`,
      };
    }

    if (gap < 0 || ones >= 2) {
      return {
        status: 'idle',
        urgent: false,
        moraleDelta: -8,
        fatigueDelta: 22,
        injury: clamp((Number(adventurer.injury) || 0) + randomInt(rng, 5, 28), 0, 100),
        hospitalMs: 0,
        xp: Math.floor(getQuestXp(quest.difficulty) * 0.65),
        reward: this.createReward({ quest, rng, multiplier: 0.4 }),
        activityText: `Unpacks after a rough return from ${quest.title}.`,
        summary: `${name} survives ${quest.title} with little to show. ${rollText}.`,
      };
    }

    const critical = twenties > 0 && gap >= 12;
    return {
      status: 'idle',
      urgent: false,
      moraleDelta: critical ? 12 : 6,
      fatigueDelta: 14,
      injury: Math.max(0, (Number(adventurer.injury) || 0) - 4),
      hospitalMs: 0,
      xp: getQuestXp(quest.difficulty),
      reward: this.createReward({ quest, rng, multiplier: critical ? 1.25 : 1 }),
      activityText: `Unpacks after completing ${quest.title}${critical ? ' cleanly' : ''}.`,
      summary: `${name} completes ${quest.title}${critical ? ' cleanly' : ''}. ${rollText}.`,
    };
  }

  createReward({ quest, rng, multiplier = 1 }) {
    const range = getRewardRange(quest.difficulty);
    const rewardKind = pick(rng, ['coin', 'seed', 'herb']);

    if (rewardKind === 'coin') {
      return {
        kind: 'coin',
        quantity: Math.max(1, Math.floor(randomInt(rng, range.coin[0], range.coin[1]) * multiplier)),
        questTitle: quest.title,
      };
    }

    if (rewardKind === 'seed') {
      return {
        kind: 'seed',
        quantity: Math.max(1, Math.floor(randomInt(rng, range.seeds[0], range.seeds[1]) * multiplier)),
        questTitle: quest.title,
      };
    }

    return {
      kind: 'herb',
      quantity: Math.max(1, Math.floor(randomInt(rng, range.herbs[0], range.herbs[1]) * multiplier)),
      questTitle: quest.title,
    };
  }

  applyXp(adventurer, xp, atMs) {
    const levelSummaries = [];
    adventurer.xp = Math.max(0, Math.floor(Number(adventurer.xp) || 0) + Math.floor(xp));
    adventurer.nextLevelXp = getNextLevelXp(adventurer.level);

    while (adventurer.xp >= adventurer.nextLevelXp) {
      adventurer.xp -= adventurer.nextLevelXp;
      adventurer.level += 1;
      this.applyLevelStat(adventurer);
      adventurer.nextLevelXp = getNextLevelXp(adventurer.level);
      const summary = `${formatName(adventurer)} reaches level ${adventurer.level}.`;
      this.pushHistory(adventurer, summary, atMs);
      levelSummaries.push(summary);
    }

    return levelSummaries;
  }

  applyLevelStat(adventurer) {
    const personality = getPersonality(adventurer.personalityId);
    const rng = createRng(`${adventurer.id}:level:${adventurer.level}`);
    const weightedStats = GUILD_STATS.flatMap((stat) =>
      Array.from(
        { length: Math.max(1, Math.floor(Number(personality.weights?.[stat]) || 1)) },
        () => stat,
      ),
    );
    const stat = pick(rng, weightedStats);
    adventurer.stats[stat] = Math.max(0, Math.floor(Number(adventurer.stats[stat]) || 0)) + 1;
  }

  pushHistory(adventurer, text, atMs) {
    adventurer.history = [
      {
        text,
        atMs: Number.isFinite(atMs) ? atMs : Date.now(),
      },
      ...(adventurer.history ?? []),
    ].slice(0, MAX_HISTORY);
  }

  pushLog(state, text, tone = null, details = {}) {
    state.logs = [
      {
        id: state.nextLogId,
        text,
        tone,
        ...details,
      },
      ...(state.logs ?? []),
    ].slice(0, MAX_LOGS);
    state.nextLogId = Math.max(1, Math.floor(Number(state.nextLogId) || 1) + 1);
  }
}

function getQuestStatPower(adventurer, quest) {
  const stats = Array.isArray(quest?.stats) && quest.stats.length > 0 ? quest.stats : GUILD_STATS;
  const statTotal = stats.reduce(
    (sum, stat) => sum + Math.max(0, Math.floor(Number(adventurer.stats?.[stat]) || 0)),
    0,
  );
  const statAverage = statTotal / stats.length;
  return Math.floor(statAverage + Math.max(1, Number(adventurer.level) || 1) / 4);
}

function getQuestXp(difficulty) {
  const xp = {
    trivial: 5,
    easy: 10,
    medium: 20,
    hard: 40,
    deadly: 80,
  };

  return xp[difficulty] ?? xp.medium;
}

function rollD20(rng) {
  return randomInt(rng, 1, 20);
}

function formatName(adventurer) {
  return `${adventurer?.name ?? 'someone'} ${adventurer?.epithet ?? ''}`.trim();
}

function capitalizeFirst(value) {
  const text = String(value ?? '');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
}

function lowercaseFirst(value) {
  const text = String(value ?? '');
  return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : '';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
