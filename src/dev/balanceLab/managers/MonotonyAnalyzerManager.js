const DEFAULT_WINDOW_SECONDS = 45 * 60;
const MIN_ACTIONS = 8;

export class MonotonyAnalyzerManager {
  analyze(report) {
    const windows = [];
    const actionEvents = report.events.filter((event) => event.type === 'action');

    for (const sample of report.samples) {
      const startSeconds = sample.seconds - DEFAULT_WINDOW_SECONDS;
      if (startSeconds < 0) {
        continue;
      }

      const actions = actionEvents.filter(
        (event) => event.seconds > startSeconds && event.seconds <= sample.seconds,
      );
      const unlocks = report.events.filter(
        (event) =>
          event.seconds > startSeconds &&
          event.seconds <= sample.seconds &&
          ['level', 'research', 'prestige'].includes(event.type),
      );
      const actionTypes = new Set(actions.map((event) => event.actionType));

      if (actions.length < MIN_ACTIONS || actionTypes.size > 2 || unlocks.length > 0) {
        continue;
      }

      windows.push({
        startSeconds,
        endSeconds: sample.seconds,
        durationSeconds: DEFAULT_WINDOW_SECONDS,
        actionCount: actions.length,
        actionTypes: [...actionTypes],
      });
    }

    return this.mergeWindows(windows);
  }

  mergeWindows(windows) {
    const merged = [];

    for (const window of windows) {
      const previous = merged.at(-1);
      if (
        previous &&
        window.startSeconds <= previous.endSeconds &&
        sameSet(previous.actionTypes, window.actionTypes)
      ) {
        previous.endSeconds = window.endSeconds;
        previous.durationSeconds = previous.endSeconds - previous.startSeconds;
        previous.actionCount = Math.max(previous.actionCount, window.actionCount);
        continue;
      }

      merged.push({ ...window });
    }

    return merged;
  }
}

function sameSet(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value) => right.includes(value));
}
