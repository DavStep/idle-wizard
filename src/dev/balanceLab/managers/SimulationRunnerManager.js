import { EcsFacade } from '../../../ecs/EcsFacade.js';
import { GameplayFacade } from '../../../gameplay/GameplayFacade.js';

const DEFAULT_DAYS = 3;
const DEFAULT_STEP_SECONDS = 5;
const DEFAULT_SAMPLE_EVERY_SECONDS = 10 * 60;
const DEFAULT_SEED = 0x12345678;
const MAX_POLICY_ACTIONS_PER_SESSION = 80;
const PROGRESS_EPSILON = 0.0001;

export class SimulationRunnerManager {
  constructor({ bottleneckAnalyzerManager, playerPolicyManager }) {
    this.bottleneckAnalyzerManager = bottleneckAnalyzerManager;
    this.playerPolicyManager = playerPolicyManager;
  }

  async run(options = {}) {
    const normalized = this.normalizeOptions(options);
    const context = this.createContext(normalized);
    const report = this.createInitialReport(normalized);
    let nextSampleSeconds = 0;

    while (context.timeSeconds <= normalized.totalSeconds) {
      if (this.playerPolicyManager.shouldAct(context, normalized)) {
        const actions = await this.runPolicySession(context, normalized);
        for (const action of actions) {
          report.events.push({
            seconds: context.timeSeconds,
            ...action,
          });
        }
      }

      this.recordUnlockEvents(context, report);
      if (context.timeSeconds >= nextSampleSeconds) {
        report.samples.push(this.createSample(context, report));
        nextSampleSeconds += normalized.sampleEverySeconds;
      }

      if (context.timeSeconds >= normalized.totalSeconds) {
        break;
      }

      this.advanceTime(context, normalized);
    }

    report.final = this.createSummary(context);
    report.levels = this.createLevelTimeline(report.events);
    report.bottlenecks = this.bottleneckAnalyzerManager.summarize(report.samples);
    return report;
  }

  normalizeOptions(options = {}) {
    const days = readPositiveNumber(options.days, DEFAULT_DAYS);
    const stepSeconds = readPositiveNumber(options.stepSeconds, DEFAULT_STEP_SECONDS);
    const sampleEverySeconds = readPositiveNumber(
      options.sampleEverySeconds,
      DEFAULT_SAMPLE_EVERY_SECONDS,
    );

    return {
      allowPrestige: options.allowPrestige === true,
      days,
      policy: this.playerPolicyManager.normalizePolicy(options.policy),
      sampleEverySeconds,
      seed: readPositiveInteger(options.seed, DEFAULT_SEED),
      stepSeconds,
      totalSeconds: Math.max(stepSeconds, days * 24 * 60 * 60),
    };
  }

  createContext(options) {
    const ecsFacade = new EcsFacade();
    let nowMs = 0;
    const gameplayFacade = new GameplayFacade({
      persistenceNow: () => nowMs,
      shopNow: () => nowMs,
    });

    ecsFacade.createWorld();
    gameplayFacade.initialize(ecsFacade);
    gameplayFacade.setNpcMarketFacade(this.createNpcMarketFacade(gameplayFacade));
    gameplayFacade.seedSummoningFacade.seedDropWeightManager.random = createRng(options.seed);

    return {
      ecsFacade,
      gameplayFacade,
      lastSnapshot: gameplayFacade.getSnapshot(),
      nextPolicyActionSeconds: 0,
      nowMs,
      policyState: {},
      timeSeconds: 0,
      setNowMs(value) {
        nowMs = value;
        this.nowMs = value;
      },
    };
  }

  createNpcMarketFacade(gameplayFacade) {
    const getItem = (itemKey) => gameplayFacade.itemsFacade.safeGetDefinitionByKey(itemKey);
    const getBasePrice = (itemKey) => {
      const price = Number(getItem(itemKey)?.baseSellPrice);
      return Number.isFinite(price) && price > 0 ? price : null;
    };

    return {
      getNpcBuyPriceCoin: getBasePrice,
      getNpcNeed: () => 1_000_000,
      getNpcSellPriceCoin(itemKey) {
        const price = getBasePrice(itemKey);
        return price === null ? null : Math.round(price * 1.2 * 100) / 100;
      },
      getNpcStock: () => 1_000_000,
      getPrice(itemKey) {
        const item = getItem(itemKey);
        const basePriceCoin = getBasePrice(itemKey);

        if (!item || basePriceCoin === null) {
          return null;
        }

        return {
          itemKey,
          itemKind: item.kind,
          basePriceCoin,
          marketPriceCoin: basePriceCoin,
          npcBuyPriceCoin: basePriceCoin,
          npcSellPriceCoin: Math.round(basePriceCoin * 1.2 * 100) / 100,
          npcNeed: 1_000_000,
          targetNeed: 1_000_000,
          maxNeed: 1_500_000,
          npcStock: 1_000_000,
          targetStock: 1_000_000,
          lastTickAtMs: 0,
          updatedAtMs: 0,
        };
      },
      retainPrices: () => () => {},
      sellToNpc: () => Promise.resolve({ ok: true, fake: true }),
      buyFromNpc: () => Promise.resolve({ ok: true, fake: true }),
    };
  }

  async runPolicySession(context, options) {
    const actions = [];
    let guard = 0;
    let changed = true;

    while (changed && guard < MAX_POLICY_ACTIONS_PER_SESSION) {
      guard += 1;
      changed = false;
      const before = this.getProgressSignature(context.gameplayFacade.getSnapshot());
      const action = await this.playerPolicyManager.takeNextAction(context, options);

      if (!action) {
        continue;
      }

      const after = this.getProgressSignature(context.gameplayFacade.getSnapshot());
      changed = Math.abs(after - before) > PROGRESS_EPSILON || action.changed === true;
      actions.push(action);
    }

    this.playerPolicyManager.scheduleNextAction(context, options);
    return actions;
  }

  getProgressSignature(snapshot) {
    const taskProgress = snapshot.tasks.level.tasks.reduce(
      (total, task) => total + task.progress,
      0,
    );
    return (
      snapshot.tasks.currentLevel * 1_000_000 +
      taskProgress * 1_000 +
      snapshot.coin.current +
      snapshot.inventory.reduce((total, item) => total + item.quantity, 0)
    );
  }

  recordUnlockEvents(context, report) {
    const snapshot = context.gameplayFacade.getSnapshot();
    const previous = context.lastSnapshot;

    if (snapshot.tasks.currentLevel !== previous.tasks.currentLevel) {
      report.events.push({
        type: 'level',
        seconds: context.timeSeconds,
        label: `level ${snapshot.tasks.currentLevel}`,
        level: snapshot.tasks.currentLevel,
      });
    }

    for (const researchId of snapshot.research.completedResearchIds) {
      if (!previous.research.completedResearchIds.includes(researchId)) {
        report.events.push({
          type: 'research',
          seconds: context.timeSeconds,
          label: `research ${researchId}`,
          researchId,
        });
      }
    }

    const completedPrestige = snapshot.prestige.completedLevels ?? [];
    const previousPrestige = previous.prestige.completedLevels ?? [];
    for (const level of completedPrestige) {
      if (!previousPrestige.includes(level)) {
        report.events.push({
          type: 'prestige',
          seconds: context.timeSeconds,
          label: `prestige ${level}`,
          level,
        });
      }
    }

    context.lastSnapshot = snapshot;
  }

  createSample(context, report) {
    const snapshot = context.gameplayFacade.getSnapshot();
    const actionWindow = report.events.filter(
      (event) =>
        event.seconds > context.timeSeconds - 30 * 60 &&
        event.seconds <= context.timeSeconds &&
        event.type === 'action',
    );
    const actionCounts = countBy(actionWindow, (event) => event.actionType);
    const bottleneck = this.bottleneckAnalyzerManager.getCurrentBottleneck(snapshot);

    return {
      seconds: context.timeSeconds,
      level: snapshot.tasks.currentLevel,
      targetLevel: this.getActiveRequirementLevel(snapshot),
      coin: snapshot.coin.current,
      totalCoin: snapshot.coin.totalGenerated,
      mana: snapshot.mana.current,
      manaCap: snapshot.mana.cap,
      manaPerSecond: snapshot.mana.perSecond,
      crystal: snapshot.crystal.current,
      ruby: snapshot.ruby.current,
      completedResearch: snapshot.research.completedResearchIds.length,
      inProgressResearch: snapshot.research.inProgressResearches.length,
      gardenTiles: snapshot.garden.plot.unlockedTiles,
      cauldrons: snapshot.brewing.unlockedCauldrons,
      npcStands: snapshot.shop.shelf.unlockedSlots,
      prestigeAvailable: this.getAvailablePrestigeLevel(snapshot),
      bottleneck,
      actions: actionCounts,
      taskProgress: snapshot.tasks.level.tasks.map((task) => ({
        taskId: task.taskId,
        itemKey: task.itemKey,
        type: task.type,
        progressQuantity: task.progressQuantity,
        requiredQuantity: task.requiredQuantity,
        completed: task.completed,
      })),
    };
  }

  getAvailablePrestigeLevel(snapshot) {
    const milestone = snapshot.prestige.milestones.find(
      (candidate) => candidate.canComplete && !candidate.completed,
    );
    return milestone?.level ?? null;
  }

  advanceTime(context, options) {
    const deltaSeconds = Math.min(
      options.stepSeconds,
      options.totalSeconds - context.timeSeconds,
    );
    context.timeSeconds += deltaSeconds;
    context.setNowMs(Math.round(context.timeSeconds * 1_000));
    const frame = {
      deltaSeconds,
      timerDeltaSeconds: deltaSeconds,
      time: context.nowMs,
    };

    context.ecsFacade.update(frame);
    context.gameplayFacade.afterUpdate(frame);
  }

  createSummary(context) {
    const snapshot = context.gameplayFacade.getSnapshot();

    return {
      seconds: context.timeSeconds,
      level: snapshot.tasks.currentLevel,
      targetLevel: this.getActiveRequirementLevel(snapshot),
      coin: snapshot.coin.current,
      totalCoin: snapshot.coin.totalGenerated,
      mana: snapshot.mana,
      crystal: snapshot.crystal.current,
      ruby: snapshot.ruby.current,
      completedResearch: snapshot.research.completedResearchIds.length,
      inProgressResearch: snapshot.research.inProgressResearches.length,
      gardenTiles: snapshot.garden.plot.unlockedTiles,
      cauldrons: snapshot.brewing.unlockedCauldrons,
      npcStands: snapshot.shop.shelf.unlockedSlots,
      prestigeAvailable: this.getAvailablePrestigeLevel(snapshot),
      tasks: snapshot.tasks.level.tasks.map((task) => ({
        taskId: task.taskId,
        type: task.type,
        itemKey: task.itemKey,
        progressQuantity: task.progressQuantity,
        requiredQuantity: task.requiredQuantity,
        ownedQuantity: task.ownedQuantity,
        completed: task.completed,
      })),
      inventory: snapshot.inventory
        .filter((item) => item.quantity > 0)
        .sort((left, right) => right.quantity - left.quantity)
        .slice(0, 20),
    };
  }

  getActiveRequirementLevel(snapshot) {
    return snapshot.tasks.level.tasks[0]?.level ?? snapshot.tasks.level.level;
  }

  createInitialReport(options) {
    return {
      runId: createRunId(options),
      options,
      samples: [],
      events: [],
      levels: [],
      bottlenecks: [],
      final: null,
    };
  }

  createLevelTimeline(events) {
    return events
      .filter((event) => event.type === 'level')
      .map((event) => ({
        level: event.level,
        seconds: event.seconds,
      }));
  }
}

function readPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function readPositiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function createRng(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function countBy(values, getKey) {
  return values.reduce((counts, value) => {
    const key = getKey(value) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function createRunId(options) {
  const policy = String(options.policy ?? 'normal').replace(/[^a-z0-9-]/gi, '-');
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${policy}-${options.seed}`;
}
