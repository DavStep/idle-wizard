import { describe, expect, it } from 'vitest';

import { hasCurrentVisualSettingsConfigShape } from './visualSettingsConfig';

describe('hasCurrentVisualSettingsConfigShape', () => {
  it('rejects the legacy hosted catalog so module init backfills current options', () => {
    expect(
      hasCurrentVisualSettingsConfigShape({
        costsCrystal: {
          theme: { midnight: 0, witchcraft: 0 },
          font: { lexend: 0 },
          color: { resources: 0 },
          character: { elara: 0 },
          progressBar: { regular: 0 },
          plotView: { boxes: 0 },
          icons: { icons: 0 },
        },
      }),
    ).toBe(false);
  });

  it('accepts the current day/night catalog with frames', () => {
    expect(
      hasCurrentVisualSettingsConfigShape({
        costsCrystal: {
          theme: { night: 0, day: 0 },
          font: { 'lilita-one': 0, 'comic-sans-mono': 0 },
          character: { elara: 0 },
          frame: { classic: 0 },
          progressBar: { regular: 0 },
          plotView: { boxes: 0 },
        },
      }),
    ).toBe(true);
  });
});
