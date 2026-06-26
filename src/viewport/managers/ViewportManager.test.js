/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import { ViewportManager } from './ViewportManager.js';

describe('ViewportManager', () => {
  it('locks browser viewport zoom so world gestures own scaling', () => {
    const html = readFileSync(`${cwd()}/index.html`, 'utf8');
    const viewportMeta = html.match(
      /<meta\s+name="viewport"\s+content="(?<content>[^"]+)"/,
    )?.groups?.content;

    expect(viewportMeta).toContain('initial-scale=1');
    expect(viewportMeta).toContain('maximum-scale=1');
    expect(viewportMeta).toContain('user-scalable=no');
    expect(viewportMeta).toContain('viewport-fit=cover');
  });

  it('disables native Android WebView zoom', () => {
    const mainActivity = readFileSync(
      `${cwd()}/android/app/src/main/java/com/idlewizard/game/MainActivity.java`,
      'utf8',
    );

    expect(mainActivity).toContain('settings.setSupportZoom(false);');
    expect(mainActivity).toContain('settings.setBuiltInZoomControls(false);');
    expect(mainActivity).toContain('settings.setDisplayZoomControls(false);');
  });

  it('stages the initial control reveal and clears it after startup', () => {
    vi.useFakeTimers();

    try {
      const parent = document.createElement('main');
      const manager = new ViewportManager({ viewport: { width: 1080, height: 2170 } });

      const stage = manager.mount(parent);

      expect(stage.classList.contains('is-control-revealing')).toBe(true);

      vi.advanceTimersByTime(720);

      expect(stage.classList.contains('is-control-revealing')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
