import { describe, expect, it } from 'vitest';

import { ViewportProjectionManager } from './ViewportProjectionManager.js';

describe('ViewportProjectionManager', () => {
  it('maps the authored 390x844 source surface without browser resampling', () => {
    const projection = new ViewportProjectionManager().project({
      width: 390,
      height: 844,
    });

    expect(projection).toMatchObject({
      fitScale: 1 / 3,
      uiScale: 1,
      stageLogicalWidth: 1170,
      stageLogicalHeight: 2532,
      authoredScreenWidth: 390,
      authoredScreenHeight: 844,
      sourceWidth: 390,
      sourceHeight: 844,
      isWide: false,
    });
  });

  it('keeps the authored room unchanged at its design viewport', () => {
    const projection = new ViewportProjectionManager().project({
      width: 1170,
      height: 2532,
    });

    expect(projection).toMatchObject({
      fitScale: 1,
      uiScale: 3,
      stageLogicalWidth: 1170,
      stageLogicalHeight: 2532,
      authoredOffsetX: 0,
      sourceOffsetX: 0,
      sourceWidth: 390,
      isWide: false,
    });
  });

  it('centers the source room without stretching it in wide desktop gutters', () => {
    const projection = new ViewportProjectionManager().project({
      width: 1440,
      height: 900,
    });

    expect(projection.fitScale).toBeCloseTo(900 / 2532, 8);
    expect(projection.stageLogicalWidth).toBeCloseTo(4051, 0);
    expect(projection.authoredScreenWidth).toBeCloseTo(416, 0);
    expect(projection.authoredOffsetX).toBeCloseTo(1441, 0);
    expect(projection.sourceOffsetX).toBeCloseTo(480.2, 1);
    expect(projection.isWide).toBe(true);
  });

  it('preserves layout height while a native keyboard overlaps the canvas', () => {
    const manager = new ViewportProjectionManager();
    manager.project({ width: 1170, height: 2532 });
    manager.lockTextEntry();
    const projection = manager.project({
      width: 1170,
      height: 1662,
      visibleHeight: 1662,
      keyboardInset: 870,
    });

    expect(projection.viewportPx.height).toBe(2532);
    expect(projection.fitScale).toBe(1);
    expect(projection.dialogShift).toBe(-145);
    expect(projection.topDialogShift).toBe(-56);
  });
});
