import { describe, expect, it } from 'vitest';

import { ViewportProjectionManager } from './ViewportProjectionManager.js';

describe('ViewportProjectionManager', () => {
  it('keeps the authored room unchanged at its design viewport', () => {
    const projection = new ViewportProjectionManager().project({
      width: 1080,
      height: 2170,
    });

    expect(projection).toMatchObject({
      fitScale: 1,
      uiScale: 3,
      stageLogicalWidth: 1080,
      stageLogicalHeight: 2170,
      authoredOffsetX: 0,
      sourceOffsetX: 0,
      sourceWidth: 360,
      isWide: false,
    });
  });

  it('centers the source room without stretching it in wide desktop gutters', () => {
    const projection = new ViewportProjectionManager().project({
      width: 1440,
      height: 900,
    });

    expect(projection.fitScale).toBeCloseTo(900 / 2170, 8);
    expect(projection.stageLogicalWidth).toBeCloseTo(3472, 0);
    expect(projection.authoredScreenWidth).toBeCloseTo(448, 0);
    expect(projection.authoredOffsetX).toBeCloseTo(1196, 0);
    expect(projection.sourceOffsetX).toBeCloseTo(398.67, 1);
    expect(projection.isWide).toBe(true);
  });

  it('preserves layout height while a native keyboard overlaps the canvas', () => {
    const manager = new ViewportProjectionManager();
    manager.project({ width: 1080, height: 2170 });
    manager.lockTextEntry();
    const projection = manager.project({
      width: 1080,
      height: 1300,
      visibleHeight: 1300,
      keyboardInset: 870,
    });

    expect(projection.viewportPx.height).toBe(2170);
    expect(projection.fitScale).toBe(1);
    expect(projection.dialogShift).toBe(-145);
    expect(projection.topDialogShift).toBe(-56);
  });
});
