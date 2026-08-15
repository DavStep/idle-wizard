import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

describe('Android haptics integration', () => {
  it('disables framework WebView haptics so long presses do not add a native pulse', () => {
    const mainActivity = readFileSync(
      `${cwd()}/android/app/src/main/java/com/idlewizard/game/MainActivity.java`,
      'utf8',
    );

    expect(mainActivity).toContain('webView.setHapticFeedbackEnabled(false);');
  });

  it('keeps the native fallback pulse aligned with the subtle UI tap contract', () => {
    const nativePlugin = readFileSync(
      `${cwd()}/android/app/src/main/java/com/idlewizard/game/IdleWizardHapticsPlugin.java`,
      'utf8',
    );

    expect(nativePlugin).toContain('DEFAULT_DURATION_MS = 5;');
    expect(nativePlugin).toContain('DEFAULT_AMPLITUDE = 0.35;');
  });
});
