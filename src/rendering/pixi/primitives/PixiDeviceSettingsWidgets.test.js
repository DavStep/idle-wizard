import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';

import { RootRunDevicePreferencesPanel } from './PixiDeviceSettingsWidgets.js';

describe('RootRunDevicePreferencesPanel', () => {
  it('constructs its nine-slice at a valid initial size before rows are bound', () => {
    const panel = new RootRunDevicePreferencesPanel({
      assetManager: {
        getTexture: () => Texture.EMPTY,
      },
      width: 264,
    });

    expect(panel.background.frameWidth).toBe(264);
    expect(panel.background.frameHeight).toBe(panel.panelHeight);
    expect(panel.panelHeight).toBe(20);

    panel.destroy({ children: true });
  });
});
