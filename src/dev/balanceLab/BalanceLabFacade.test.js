import { describe, expect, it } from 'vitest';

import { BalanceLabFacade } from './BalanceLabFacade.js';

describe('BalanceLabFacade', () => {
  it('runs a short real-gameplay simulation and reports samples', async () => {
    const facade = new BalanceLabFacade();
    const report = await facade.run({
      days: 0.001,
      policy: 'active',
      sampleEverySeconds: 30,
      stepSeconds: 10,
      writeReports: false,
    });

    expect(report.samples.length).toBeGreaterThan(0);
    expect(report.final.level).toBeGreaterThanOrEqual(0);
    expect(report.events.some((event) => event.type === 'action')).toBe(true);
    expect(report.markdown).toContain('Idle Wizard Balance Lab');
  });
});
