// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { gameAssetAtlasFrames } from '../../assets/generated/game-asset-atlas.generated.js';
import {
  createStatusIcon,
  getStatusIconFrame,
  STATUS_ICON_CHECK,
  STATUS_ICON_LOCK,
} from './statusIcon.js';

describe('statusIcon', () => {
  it('uses prop_checkmark.png as the only shared checkmark artwork', () => {
    const frameName = getStatusIconFrame(STATUS_ICON_CHECK);
    const icon = createStatusIcon('test-checkmark-icon', STATUS_ICON_CHECK);

    expect(frameName).toBe('status:checkDefault');
    expect(gameAssetAtlasFrames[frameName]?.source).toBe(
      'assets/game/source/ui/prop_checkmark.png',
    );
    expect(icon?.dataset.assetAtlasFrame).toBe(frameName);
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses prop_lock.png as the only shared lock artwork', () => {
    const frameName = getStatusIconFrame(STATUS_ICON_LOCK);
    const icon = createStatusIcon('test-lock-icon', STATUS_ICON_LOCK);

    expect(frameName).toBe('status:lockDefault');
    expect(gameAssetAtlasFrames[frameName]?.source).toBe(
      'assets/game/source/ui/prop_lock.png',
    );
    expect(icon?.dataset.assetAtlasFrame).toBe(frameName);
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
