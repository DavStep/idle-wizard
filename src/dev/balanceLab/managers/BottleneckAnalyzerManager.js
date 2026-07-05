const SOFT_WALL_SECONDS = 30 * 60;

export class BottleneckAnalyzerManager {
  getCurrentBottleneck(snapshot) {
    const completion = snapshot.tasks.level.completion;

    if (completion.canComplete && snapshot.coin.current < completion.costCoin) {
      return {
        type: 'coin',
        severity: 'soft',
        detail: `needs ${completion.costCoin - snapshot.coin.current} coin to level`,
      };
    }

    for (const task of snapshot.tasks.level.tasks) {
      if (task.completed) {
        continue;
      }

      const bottleneck = this.getTaskBottleneck(snapshot, task);
      if (bottleneck) {
        return bottleneck;
      }
    }

    if (snapshot.mana.current >= snapshot.mana.cap) {
      return {
        type: 'decision',
        severity: 'soft',
        detail: 'mana capped while no policy action is available',
      };
    }

    return {
      type: 'waiting',
      severity: 'none',
      detail: 'normal timer or session wait',
    };
  }

  getTaskBottleneck(snapshot, task) {
    if (task.type === 'research') {
      return this.getResearchBottleneck(snapshot, task);
    }

    if (task.type === 'summon') {
      if (snapshot.seedSummoning.canSummon) {
        return { type: 'player_action', severity: 'none', detail: 'can summon' };
      }
      return {
        type: snapshot.mana.current < snapshot.seedSummoning.cost ? 'mana' : 'research',
        severity: 'soft',
        detail: `summon ${task.itemKey}`,
      };
    }

    if (task.type === 'grow' || (task.type === 'turnIn' && task.itemKind === 'herb')) {
      if (task.ownedQuantity < task.remainingQuantity) {
        const activePlot = snapshot.garden.plot.tiles.some(
          (tile) => tile.phase === 'growing' || tile.phase === 'harvesting',
        );
        return {
          type: activePlot ? 'garden_timer' : 'herb_supply',
          severity: 'soft',
          detail: `${task.itemKey} ${task.progressQuantity}/${task.requiredQuantity}`,
        };
      }
    }

    if (task.type === 'brew' || (task.type === 'turnIn' && task.itemKind === 'potion')) {
      if (task.ownedQuantity < task.remainingQuantity) {
        const activeBrew = snapshot.brewing.cauldrons.some(
          (cauldron) => cauldron.activeBrew,
        );
        return {
          type: activeBrew ? 'brew_timer' : 'potion_supply',
          severity: 'soft',
          detail: `${task.itemKey} ${task.progressQuantity}/${task.requiredQuantity}`,
        };
      }
    }

    if (task.type === 'sell' && task.progressQuantity < task.requiredQuantity) {
      return {
        type: task.ownedQuantity > 0 ? 'player_action' : 'item_supply',
        severity: 'soft',
        detail: `sell ${task.itemKey}`,
      };
    }

    if (task.type === 'turnIn' && task.ownedQuantity < task.remainingQuantity) {
      return {
        type: 'item_supply',
        severity: 'soft',
        detail: `${task.itemKey} ${task.progressQuantity}/${task.requiredQuantity}`,
      };
    }

    return {
      type: 'player_action',
      severity: 'none',
      detail: `${task.type} ${task.itemKey}`,
    };
  }

  getResearchBottleneck(snapshot, task) {
    const research = snapshot.research.tabs
      .flatMap((tab) => tab.boxes)
      .flatMap((box) => box.researches)
      .find((candidate) => candidate.id === task.researchId);

    if (!research) {
      return {
        type: 'research_missing',
        severity: 'hard',
        detail: task.researchId,
      };
    }

    if (research.inProgress) {
      return {
        type: 'research_timer',
        severity: 'soft',
        detail: `${task.researchId} ${Math.ceil(research.remainingSeconds)}s`,
      };
    }

    if (research.locked) {
      return {
        type: 'research_lock',
        severity: 'hard',
        detail: research.requiredPlayerLevel
          ? `${task.researchId} requires player level ${research.requiredPlayerLevel}`
          : task.researchId,
      };
    }

    if (!research.canResearch) {
      return {
        type: research.costCurrency ?? 'coin',
        severity: 'soft',
        detail: `cannot afford ${task.researchId}`,
      };
    }

    return {
      type: 'player_action',
      severity: 'none',
      detail: `can research ${task.researchId}`,
    };
  }

  summarize(samples) {
    if (samples.length <= 0) {
      return [];
    }

    const windows = [];
    let current = null;

    for (const sample of samples) {
      const type = sample.bottleneck?.type ?? 'unknown';

      if (!current || current.type !== type) {
        if (current) {
          windows.push(current);
        }
        current = {
          type,
          severity: sample.bottleneck?.severity ?? 'none',
          detail: sample.bottleneck?.detail ?? '',
          startSeconds: sample.seconds,
          endSeconds: sample.seconds,
          sampleCount: 1,
        };
        continue;
      }

      current.endSeconds = sample.seconds;
      current.sampleCount += 1;
      if (sample.bottleneck?.severity === 'hard') {
        current.severity = 'hard';
      }
    }

    if (current) {
      windows.push(current);
    }

    return windows.map((window) => ({
      ...window,
      durationSeconds: Math.max(0, window.endSeconds - window.startSeconds),
      wall:
        window.severity === 'hard'
          ? 'hard'
          : window.endSeconds - window.startSeconds >= SOFT_WALL_SECONDS
            ? 'soft'
            : 'none',
    }));
  }
}
