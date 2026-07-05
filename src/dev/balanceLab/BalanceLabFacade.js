import { BalanceReportManager } from './managers/BalanceReportManager.js';
import { BottleneckAnalyzerManager } from './managers/BottleneckAnalyzerManager.js';
import { MonotonyAnalyzerManager } from './managers/MonotonyAnalyzerManager.js';
import { PlayerPolicyManager } from './managers/PlayerPolicyManager.js';
import { PrestigeBranchAnalyzerManager } from './managers/PrestigeBranchAnalyzerManager.js';
import { SimulationRunnerManager } from './managers/SimulationRunnerManager.js';

export class BalanceLabFacade {
  static explain =
    'Runs fake players through the real gameplay rules so balance changes can be checked for walls, dull loops, and prestige timing.';

  constructor() {
    this.bottleneckAnalyzerManager = new BottleneckAnalyzerManager();
    this.monotonyAnalyzerManager = new MonotonyAnalyzerManager();
    this.prestigeBranchAnalyzerManager = new PrestigeBranchAnalyzerManager();
    this.playerPolicyManager = new PlayerPolicyManager();
    this.reportManager = new BalanceReportManager();
  }

  async run(options = {}) {
    const runner = new SimulationRunnerManager({
      bottleneckAnalyzerManager: this.bottleneckAnalyzerManager,
      playerPolicyManager: this.playerPolicyManager,
    });
    const report = await runner.run(options);
    const monotony = this.monotonyAnalyzerManager.analyze(report);
    const prestige = this.prestigeBranchAnalyzerManager.analyze({
      ...report,
      monotony,
    });
    const completeReport = {
      ...report,
      monotony,
      prestige,
    };

    return this.reportManager.createAndMaybeWrite(completeReport, options);
  }
}
