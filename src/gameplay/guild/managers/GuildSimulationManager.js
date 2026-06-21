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
  { id: 'train', text: 'trains until the straps complain.', morale: 0, fatigue: 5 },
  { id: 'read', text: 'reads old warnings and takes some seriously.', morale: 1, fatigue: 2 },
  { id: 'tavern', text: 'drinks at the tavern and laughs too loudly.', morale: 8, fatigue: 8 },
  { id: 'family', text: 'visits home and returns with cleaner hands.', morale: 10, fatigue: -2 },
  { id: 'redLantern', text: 'spends coin in the red-lantern lane.', morale: 6, fatigue: 4 },
  { id: 'theft', text: 'tries a quiet theft and calls it practice.', morale: 4, fatigue: 3 },
  { id: 'sleep', text: 'sleeps like a dropped sack.', morale: 2, fatigue: -20 },
  { id: 'argue', text: 'argues over nothing useful.', morale: -5, fatigue: 2 },
]);

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

      if (result.reward) {
        rewards.push(result.reward);
      }

      if (result.xp > 0 && adventurer.status !== 'dead') {
        this.applyXp(adventurer, result.xp);
      }

      this.pushHistory(adventurer, result.summary);
      this.pushLog(state, result.summary, result.urgent ? 'red' : 'orange');
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
      this.pushHistory(adventurer, summary);
      this.pushLog(state, summary, 'orange');
      changed = true;
    }

    return changed;
  }

  runIdleAdventurers({ state, tickAtMs }) {
    let changed = false;
    const board = Array.isArray(state.board) ? state.board : [];

    for (const adventurer of state.adventurers ?? []) {
      if (adventurer.status !== 'idle') {
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
          changed = true;
          continue;
        }
      }

      this.applyLifeAction({ adventurer, tickAtMs });
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

    const summary = `${formatName(adventurer)} takes ${request.title}.`;
    this.pushHistory(adventurer, summary);
    this.pushLog(state, summary, request.event ? 'orange' : null);
  }

  applyLifeAction({ adventurer, tickAtMs }) {
    const personality = getPersonality(adventurer.personalityId);
    const rng = createRng(`${tickAtMs}:${adventurer.id}:life`);
    const actionPool = this.getLifeActionPool(personality);
    const action = pick(rng, actionPool);
    adventurer.lifeText = action.text;
    adventurer.morale = clamp(adventurer.morale + action.morale, 0, 100);
    adventurer.fatigue = clamp(adventurer.fatigue + action.fatigue, 0, 100);

    if (action.id === 'theft' && rng() < 0.08) {
      adventurer.injury = clamp(adventurer.injury + 8, 0, 100);
      adventurer.lifeText = 'gets chased from a quiet theft and limps back.';
    }

    if (rng() < 0.12) {
      this.pushHistory(adventurer, `${formatName(adventurer)} ${adventurer.lifeText}`);
    }
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
      summary: `${name} completes ${quest.title}${critical ? ' cleanly' : ''}. ${rollText}.`,
    };
  }

  createReward({ quest, rng, multiplier = 1 }) {
    const range = getRewardRange(quest.difficulty);
    const rewardKind = pick(rng, ['gold', 'seed', 'herb']);

    if (rewardKind === 'gold') {
      return {
        kind: 'gold',
        quantity: Math.max(1, Math.floor(randomInt(rng, range.gold[0], range.gold[1]) * multiplier)),
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

  applyXp(adventurer, xp) {
    adventurer.xp = Math.max(0, Math.floor(Number(adventurer.xp) || 0) + Math.floor(xp));
    adventurer.nextLevelXp = getNextLevelXp(adventurer.level);

    while (adventurer.xp >= adventurer.nextLevelXp) {
      adventurer.xp -= adventurer.nextLevelXp;
      adventurer.level += 1;
      this.applyLevelStat(adventurer);
      adventurer.nextLevelXp = getNextLevelXp(adventurer.level);
      this.pushHistory(adventurer, `${formatName(adventurer)} reaches level ${adventurer.level}.`);
    }
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

  pushHistory(adventurer, text) {
    adventurer.history = [
      {
        text,
        atMs: Date.now(),
      },
      ...(adventurer.history ?? []),
    ].slice(0, MAX_HISTORY);
  }

  pushLog(state, text, tone = null) {
    state.logs = [
      {
        id: state.nextLogId,
        text,
        tone,
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
