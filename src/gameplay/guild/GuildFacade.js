import { DEFAULT_TRADE_ALLIANCE_TAG_COLOR, normalizeTradeAllianceTagColor } from '../../shared/tradeAllianceTagColors.js';
import {
  GUILD_CHARTER_COST_GOLD,
  GUILD_SECRETARY_LEVELS,
  GUILD_STATE_VERSION,
  GUILD_STATS,
  GUILD_UNLOCK_LEVEL,
  GuildGenerationManager,
  getNextSecretaryLevel,
  getSecretaryLevel,
} from './managers/GuildGenerationManager.js';
import { GuildPeriodManager } from './managers/GuildPeriodManager.js';
import { GuildSimulationManager } from './managers/GuildSimulationManager.js';

const MAX_GUILD_NAME_LENGTH = 24;
const MIN_GUILD_TAG_LENGTH = 2;
const MAX_GUILD_TAG_LENGTH = 5;
const MAX_BOARD_SEQUENCE = 1_000_000;

export { GUILD_CHARTER_COST_GOLD, GUILD_STATS, GUILD_UNLOCK_LEVEL };

export class GuildFacade {
  static explain =
    'Runs the player guild: a private hall where hired adventurers choose board requests and live their own small lives.';

  constructor({
    goldFacade,
    itemsFacade,
    playerLevelFacade,
    worldNoticeFacade,
    now = () => Date.now(),
  } = {}) {
    this.goldFacade = goldFacade;
    this.itemsFacade = itemsFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.worldNoticeFacade = worldNoticeFacade;
    this.periodManager = new GuildPeriodManager({ now });
    this.generationManager = new GuildGenerationManager();
    this.simulationManager = new GuildSimulationManager();
    this.state = this.createEmptyState();
  }

  createGuild({ name, tag, color } = {}) {
    if (!this.isUnlocked()) {
      return {
        ok: false,
        reason: 'locked',
        unlockLevel: GUILD_UNLOCK_LEVEL,
      };
    }

    if (this.state.profile) {
      return {
        ok: false,
        reason: 'already_created',
      };
    }

    const profile = this.sanitizeProfile({ name, tag, color });

    if (!this.isValidProfile(profile)) {
      return {
        ok: false,
        reason: 'invalid_profile',
      };
    }

    if (!this.goldFacade?.canSpend?.(GUILD_CHARTER_COST_GOLD)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        costGold: GUILD_CHARTER_COST_GOLD,
        currentGold: this.goldFacade?.getSnapshot?.().current ?? 0,
      };
    }

    this.goldFacade.spend(GUILD_CHARTER_COST_GOLD);
    this.state = {
      ...this.createEmptyState(),
      profile: {
        ...profile,
        createdAtMs: this.periodManager.getNowMs(),
      },
      lastSimAtMs: this.periodManager.getAlignedSimTick(),
    };
    this.ensureGeneratedState();
    this.addLog(`guild charter signed for ${profile.name}.`, 'orange');

    return {
      ok: true,
      costGold: GUILD_CHARTER_COST_GOLD,
      profile: this.state.profile,
    };
  }

  updateGuildProfile(profile = {}) {
    if (!this.state.profile) {
      return {
        ok: false,
        reason: 'not_created',
      };
    }

    const nextProfile = this.sanitizeProfile({
      ...this.state.profile,
      ...profile,
    });

    if (!this.isValidProfile(nextProfile)) {
      return {
        ok: false,
        reason: 'invalid_profile',
      };
    }

    this.state.profile = {
      ...this.state.profile,
      ...nextProfile,
    };
    this.addLog(`guild records now read ${nextProfile.name}.`, null);

    return {
      ok: true,
      profile: this.state.profile,
    };
  }

  hireApplicant(applicantId) {
    if (!this.state.profile) {
      return {
        ok: false,
        reason: 'not_created',
      };
    }

    this.ensureGeneratedState();
    const secretary = getSecretaryLevel(this.state.secretaryLevel);
    const hired = this.getLivingAdventurers();

    if (hired.length >= secretary.hiredCap) {
      return {
        ok: false,
        reason: 'roster_full',
        hiredCap: secretary.hiredCap,
      };
    }

    const index = this.state.applicants.findIndex((applicant) => applicant.id === applicantId);

    if (index < 0) {
      return {
        ok: false,
        reason: 'unknown_applicant',
      };
    }

    const [applicant] = this.state.applicants.splice(index, 1);
    const adventurer = {
      ...applicant,
      id: `adventurer:${applicant.id.split(':').pop()}`,
      hiredAtMs: this.periodManager.getNowMs(),
      history: [`${this.getAdventurerName(applicant)} joins the guild.`].map((text) => ({
        text,
        atMs: this.periodManager.getNowMs(),
      })),
    };
    this.state.adventurers.push(adventurer);
    this.addLog(`${this.getAdventurerName(adventurer)} joins the guild.`, 'orange');

    return {
      ok: true,
      adventurer: this.createAdventurerSnapshot(adventurer),
    };
  }

  fireAdventurer(adventurerId) {
    const adventurer = this.state.adventurers.find((candidate) => candidate.id === adventurerId);

    if (!adventurer) {
      return {
        ok: false,
        reason: 'unknown_adventurer',
      };
    }

    if (adventurer.status === 'questing') {
      return {
        ok: false,
        reason: 'questing',
      };
    }

    adventurer.status = 'fired';
    adventurer.firedAtMs = this.periodManager.getNowMs();
    this.addLog(`${this.getAdventurerName(adventurer)} is fired.`, null);

    return {
      ok: true,
    };
  }

  removeRequest(requestId) {
    const index = this.state.board.findIndex((request) => request.id === requestId);

    if (index < 0) {
      return {
        ok: false,
        reason: 'unknown_request',
      };
    }

    const [request] = this.state.board.splice(index, 1);
    this.addLog(`${request.title} is pulled from the board.`, null);

    return {
      ok: true,
      requestId,
    };
  }

  upgradeSecretary() {
    if (!this.state.profile) {
      return {
        ok: false,
        reason: 'not_created',
      };
    }

    const nextLevel = getNextSecretaryLevel(this.state.secretaryLevel);

    if (!nextLevel) {
      return {
        ok: false,
        reason: 'max_level',
      };
    }

    if (!this.goldFacade?.canSpend?.(nextLevel.costGold)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        costGold: nextLevel.costGold,
        currentGold: this.goldFacade?.getSnapshot?.().current ?? 0,
      };
    }

    this.goldFacade.spend(nextLevel.costGold);
    this.state.secretaryLevel = nextLevel.level;
    this.addLog(`guild secretary reaches level ${nextLevel.level}.`, 'orange');
    this.ensureBoardFilled({ force: true });

    return {
      ok: true,
      secretary: this.createSecretarySnapshot(),
    };
  }

  getSnapshot() {
    const unlocked = this.isUnlocked();

    if (!unlocked) {
      return {
        unlocked: false,
        unlockLevel: GUILD_UNLOCK_LEVEL,
        charterCostGold: GUILD_CHARTER_COST_GOLD,
        created: false,
      };
    }

    if (!this.state.profile) {
      return {
        unlocked: true,
        unlockLevel: GUILD_UNLOCK_LEVEL,
        charterCostGold: GUILD_CHARTER_COST_GOLD,
        canCreate: this.goldFacade?.canSpend?.(GUILD_CHARTER_COST_GOLD) === true,
        currentGold: this.goldFacade?.getSnapshot?.().current ?? 0,
        created: false,
      };
    }

    this.ensureGeneratedState();
    this.runSimulation();

    const secretary = this.createSecretarySnapshot();
    const adventurers = this.state.adventurers
      .filter((adventurer) => adventurer.status !== 'fired')
      .map((adventurer) => this.createAdventurerSnapshot(adventurer));
    const applicants = (this.state.applicants ?? []).map((applicant) =>
      this.createAdventurerSnapshot(applicant),
    );
    const board = (this.state.board ?? []).map((request) => this.createRequestSnapshot(request));
    const daily = this.periodManager.getDailyPeriod();
    const boardWave = this.periodManager.getBoardWave();

    return {
      unlocked: true,
      unlockLevel: GUILD_UNLOCK_LEVEL,
      charterCostGold: GUILD_CHARTER_COST_GOLD,
      created: true,
      profile: { ...this.state.profile },
      secretary,
      applicants,
      adventurers,
      board,
      eventBoard: board.filter((request) => request.event),
      normalBoard: board.filter((request) => !request.event),
      logs: [...(this.state.logs ?? [])],
      applicantResetLabel: daily.resetLabel,
      boardWaveLabel: boardWave.resetLabel,
      notifications: this.createNotificationSnapshot({ applicants, adventurers, board }),
    };
  }

  getPersistenceSnapshot() {
    return this.clone(this.state);
  }

  getFrameSnapshotKey() {
    if (!this.state.profile) {
      return 'guild:none';
    }

    return JSON.stringify({
      tick: this.periodManager.getAlignedSimTick(),
      applicants: this.state.applicantPeriodKey,
      board: this.state.boardWaveKey,
    });
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      this.state = this.createEmptyState();
      return;
    }

    this.state = {
      ...this.createEmptyState(),
      version: GUILD_STATE_VERSION,
      profile: snapshot.profile ? this.sanitizeProfile(snapshot.profile) : null,
      secretaryLevel: clampInt(snapshot.secretaryLevel, 1, GUILD_SECRETARY_LEVELS.length),
      applicantPeriodKey: typeof snapshot.applicantPeriodKey === 'string' ? snapshot.applicantPeriodKey : '',
      boardWaveKey: typeof snapshot.boardWaveKey === 'string' ? snapshot.boardWaveKey : '',
      boardSequence: clampInt(snapshot.boardSequence, 0, MAX_BOARD_SEQUENCE),
      lastSimAtMs: Number.isFinite(snapshot.lastSimAtMs) ? snapshot.lastSimAtMs : null,
      applicants: Array.isArray(snapshot.applicants)
        ? snapshot.applicants.map((applicant) => this.sanitizeAdventurer(applicant)).filter(Boolean)
        : [],
      adventurers: Array.isArray(snapshot.adventurers)
        ? snapshot.adventurers.map((adventurer) => this.sanitizeAdventurer(adventurer)).filter(Boolean)
        : [],
      board: Array.isArray(snapshot.board)
        ? snapshot.board.map((request) => this.sanitizeRequest(request)).filter(Boolean)
        : [],
      logs: Array.isArray(snapshot.logs) ? snapshot.logs.slice(0, 80) : [],
      nextLogId: clampInt(snapshot.nextLogId, 1, 1_000_000),
    };
  }

  ensureGeneratedState() {
    if (!this.state.profile) {
      return false;
    }

    let changed = false;
    const daily = this.periodManager.getDailyPeriod();

    if (this.state.applicantPeriodKey !== daily.periodKey) {
      this.state.applicantPeriodKey = daily.periodKey;
      this.state.applicants = this.generationManager.createApplicants({
        periodKey: daily.periodKey,
        secretaryLevel: this.state.secretaryLevel,
        currentLevel: this.getCurrentLevel(),
      });
      this.addLog('three applicants arrive at the guild door.', 'orange');
      changed = true;
    }

    changed = this.ensureBoardFilled() || changed;
    return changed;
  }

  ensureBoardFilled({ force = false } = {}) {
    const secretary = getSecretaryLevel(this.state.secretaryLevel);
    const boardWave = this.periodManager.getBoardWave();
    const missing = Math.max(0, secretary.boardSlots - this.state.board.length);

    if (missing <= 0) {
      this.state.boardWaveKey = boardWave.waveKey;
      return false;
    }

    if (!force && this.state.boardWaveKey === boardWave.waveKey && this.state.board.length > 0) {
      return false;
    }

    const requests = this.generationManager.createRequests({
      count: missing,
      sequence: this.state.boardSequence,
      periodKey: boardWave.waveKey,
      worldNotice: this.worldNoticeFacade?.getSnapshot?.().current ?? null,
    });

    for (const request of requests) {
      request.createdAtMs = this.periodManager.getNowMs();
    }

    this.state.board.push(...requests);
    this.state.boardSequence = (this.state.boardSequence + missing) % MAX_BOARD_SEQUENCE;
    this.state.boardWaveKey = boardWave.waveKey;

    if (requests.length > 0) {
      this.addLog(`${requests.length} request${requests.length === 1 ? '' : 's'} pinned to the board.`, null);
    }

    return requests.length > 0;
  }

  runSimulation() {
    const result = this.simulationManager.run({
      state: this.state,
      nowMs: this.periodManager.getNowMs(),
      generationManager: this.generationManager,
      worldNotice: this.worldNoticeFacade?.getSnapshot?.().current ?? null,
    });

    for (const reward of result.rewards ?? []) {
      this.applyReward(reward);
    }

    if ((result.rewards ?? []).length > 0) {
      this.ensureBoardFilled({ force: true });
    }

    return result.changed || (result.rewards ?? []).length > 0;
  }

  applyReward(reward) {
    const quantity = Math.max(1, Math.floor(Number(reward?.quantity) || 1));

    if (reward?.kind === 'gold') {
      this.goldFacade?.add?.(quantity);
      this.addLog(`${reward.questTitle} pays ${quantity} gold.`, 'orange');
      return;
    }

    const definitions =
      reward?.kind === 'herb'
        ? this.itemsFacade?.getHerbDefinitions?.()
        : this.itemsFacade?.getSeedDefinitions?.();
    const definition = definitions?.[0];

    if (!definition?.id) {
      return;
    }

    this.itemsFacade?.addItem?.(definition.id, quantity);
    this.addLog(`${reward.questTitle} brings ${quantity} ${definition.label}.`, 'orange');
  }

  createSecretarySnapshot() {
    const secretary = getSecretaryLevel(this.state.secretaryLevel);
    const next = getNextSecretaryLevel(this.state.secretaryLevel);

    return {
      ...secretary,
      next,
      canUpgrade: Boolean(next) && this.goldFacade?.canSpend?.(next.costGold) === true,
    };
  }

  createNotificationSnapshot({ applicants, adventurers, board }) {
    const urgent = adventurers.some((adventurer) => adventurer.status === 'dead' || adventurer.status === 'hospital');
    const returned = adventurers.some((adventurer) => adventurer.status === 'idle' && (adventurer.history ?? [])[0]?.text?.includes('completes'));
    const newApplicants = applicants.length > 0 && adventurers.length < this.createSecretarySnapshot().hiredCap;
    const emptyBoardSlots = board.length < this.createSecretarySnapshot().boardSlots;

    return {
      active: urgent || returned || newApplicants || emptyBoardSlots,
      tone: urgent ? 'red' : 'orange',
      urgent,
      returned,
      newApplicants,
      emptyBoardSlots,
    };
  }

  createAdventurerSnapshot(adventurer) {
    return {
      ...adventurer,
      displayName: this.getAdventurerName(adventurer),
      statusLabel: this.getStatusLabel(adventurer),
      statTotal: GUILD_STATS.reduce(
        (sum, stat) => sum + Math.max(0, Math.floor(Number(adventurer.stats?.[stat]) || 0)),
        0,
      ),
    };
  }

  createRequestSnapshot(request) {
    return {
      ...request,
      statLabel: (request.stats ?? []).join(' / '),
      eventLabel: request.event?.headline ?? '',
    };
  }

  getStatusLabel(adventurer) {
    if (adventurer.status === 'questing') {
      return adventurer.currentQuest?.title ?? 'questing';
    }

    if (adventurer.status === 'hospital') {
      return 'hospital';
    }

    if (adventurer.status === 'dead') {
      return 'dead';
    }

    return 'idle';
  }

  getAdventurerName(adventurer) {
    return `${adventurer?.name ?? ''} ${adventurer?.epithet ?? ''}`.trim();
  }

  getLivingAdventurers() {
    return this.state.adventurers.filter(
      (adventurer) => adventurer.status !== 'dead' && adventurer.status !== 'fired',
    );
  }

  isUnlocked() {
    return this.getCurrentLevel() >= GUILD_UNLOCK_LEVEL;
  }

  getCurrentLevel() {
    const level = this.playerLevelFacade?.getSnapshot?.().currentLevel ?? 1;
    return Math.max(1, Math.floor(Number(level) || 1));
  }

  createEmptyState() {
    return {
      version: GUILD_STATE_VERSION,
      profile: null,
      secretaryLevel: 1,
      applicantPeriodKey: '',
      boardWaveKey: '',
      boardSequence: 0,
      lastSimAtMs: null,
      applicants: [],
      adventurers: [],
      board: [],
      logs: [],
      nextLogId: 1,
    };
  }

  sanitizeProfile(profile = {}) {
    return {
      name: String(profile.name ?? '').trim().slice(0, MAX_GUILD_NAME_LENGTH),
      tag: String(profile.tag ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_GUILD_TAG_LENGTH),
      color: normalizeTradeAllianceTagColor(profile.color ?? profile.tagColor ?? DEFAULT_TRADE_ALLIANCE_TAG_COLOR),
      createdAtMs: Number.isFinite(profile.createdAtMs) ? profile.createdAtMs : 0,
    };
  }

  isValidProfile(profile = {}) {
    return (
      Boolean(profile.name) &&
      profile.tag.length >= MIN_GUILD_TAG_LENGTH &&
      profile.tag.length <= MAX_GUILD_TAG_LENGTH
    );
  }

  sanitizeAdventurer(adventurer = {}) {
    if (!adventurer?.id) {
      return null;
    }

    const stats = {};

    for (const stat of GUILD_STATS) {
      stats[stat] = clampInt(adventurer.stats?.[stat], 0, 999);
    }

    return {
      ...adventurer,
      id: String(adventurer.id),
      name: String(adventurer.name ?? 'nameless').slice(0, 24),
      surname: String(adventurer.surname ?? '').slice(0, 24),
      epithet: String(adventurer.epithet ?? '').slice(0, 40),
      level: clampInt(adventurer.level, 1, 999),
      xp: clampInt(adventurer.xp, 0, 1_000_000),
      nextLevelXp: clampInt(adventurer.nextLevelXp, 1, 1_000_000),
      personalityId: String(adventurer.personalityId ?? 'loyal'),
      personalityLabel: String(adventurer.personalityLabel ?? 'loyal'),
      personalityLife: String(adventurer.personalityLife ?? ''),
      status: ['idle', 'questing', 'hospital', 'dead', 'fired'].includes(adventurer.status)
        ? adventurer.status
        : 'idle',
      morale: clampInt(adventurer.morale, 0, 100),
      fatigue: clampInt(adventurer.fatigue, 0, 100),
      injury: clampInt(adventurer.injury, 0, 100),
      stats,
      currentQuest: adventurer.currentQuest ? this.sanitizeRequest(adventurer.currentQuest) : null,
      lifeText: String(adventurer.lifeText ?? ''),
      history: Array.isArray(adventurer.history) ? adventurer.history.slice(0, 16) : [],
      hiredAtMs: Number.isFinite(adventurer.hiredAtMs) ? adventurer.hiredAtMs : null,
      hospitalUntilMs: Number.isFinite(adventurer.hospitalUntilMs) ? adventurer.hospitalUntilMs : null,
    };
  }

  sanitizeRequest(request = {}) {
    if (!request?.id) {
      return null;
    }

    return {
      ...request,
      id: String(request.id),
      title: String(request.title ?? 'request').slice(0, 48),
      lore: String(request.lore ?? '').slice(0, 160),
      difficulty: String(request.difficulty ?? 'medium'),
      difficultyScore: clampInt(request.difficultyScore, 1, 999),
      durationMs: clampInt(request.durationMs, 60_000, 24 * 60 * 60 * 1000),
      stats: Array.isArray(request.stats)
        ? request.stats.filter((stat) => GUILD_STATS.includes(stat)).slice(0, 2)
        : ['strength', 'wisdom'],
      tags: Array.isArray(request.tags) ? request.tags.map(String).slice(0, 8) : [],
      event: request.event && typeof request.event === 'object' ? { ...request.event } : null,
      rewardText: String(request.rewardText ?? ''),
      createdAtMs: Number.isFinite(request.createdAtMs) ? request.createdAtMs : 0,
      startedAtMs: Number.isFinite(request.startedAtMs) ? request.startedAtMs : undefined,
      returnAtMs: Number.isFinite(request.returnAtMs) ? request.returnAtMs : undefined,
    };
  }

  addLog(text, tone = null) {
    this.state.logs = [
      {
        id: this.state.nextLogId,
        text,
        tone,
      },
      ...(this.state.logs ?? []),
    ].slice(0, 80);
    this.state.nextLogId += 1;
  }

  clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
}

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Math.floor(Number(value) || 0)));
}
