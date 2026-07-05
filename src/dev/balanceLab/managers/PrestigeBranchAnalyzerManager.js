const STALL_AFTER_PRESTIGE_AVAILABLE_SECONDS = 2 * 60 * 60;

export class PrestigeBranchAnalyzerManager {
  analyze(report) {
    const recommendations = [];

    for (const sample of report.samples) {
      if (!sample.prestigeAvailable) {
        continue;
      }

      const later = report.samples.find(
        (candidate) =>
          candidate.seconds >= sample.seconds + STALL_AFTER_PRESTIGE_AVAILABLE_SECONDS,
      );
      const levelGain = later ? later.level - sample.level : report.final.level - sample.level;

      if (levelGain <= 0) {
        recommendations.push({
          level: sample.prestigeAvailable,
          seconds: sample.seconds,
          reason: 'prestige milestone is available and the run stalls for 2h',
        });
        break;
      }
    }

    if (recommendations.length <= 0) {
      return {
        recommendations,
        summary: 'No forced prestige point detected in this run.',
      };
    }

    return {
      recommendations,
      summary: `Prestige pressure detected at level ${recommendations[0].level}.`,
    };
  }
}
