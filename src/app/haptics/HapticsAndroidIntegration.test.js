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
});
