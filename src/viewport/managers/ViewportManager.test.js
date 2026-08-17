/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import { ViewportManager } from './ViewportManager.js';

function createTouchEvent(type, touchCount) {
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'touches', {
    value: Array.from({ length: touchCount }, (_, index) => ({ identifier: index })),
  });
  return event;
}

describe('ViewportManager', () => {
  it('locks browser viewport zoom so world gestures own scaling', () => {
    const html = readFileSync(`${cwd()}/index.html`, 'utf8');
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const canvasCss = readFileSync(`${cwd()}/src/styles/canvas.css`, 'utf8');
    const viewportMeta = html.match(
      /<meta\s+name="viewport"\s+content="(?<content>[^"]+)"/,
    )?.groups?.content;

    expect(viewportMeta).toContain('initial-scale=1');
    expect(viewportMeta).toContain('maximum-scale=1');
    expect(viewportMeta).toContain('user-scalable=no');
    expect(viewportMeta).toContain('viewport-fit=cover');
    expect(viewportMeta).toContain('interactive-widget=overlays-content');
    expect(html).toContain('<meta name="theme-color" content="#242938" />');
    expect(canvasCss).toMatch(
      /body::before\s*\{[^}]*height:\s*env\(safe-area-inset-top,\s*0px\);[^}]*background:\s*var\(--top-panel-safe-area-fill\);/s,
    );
    expect(canvasCss).toMatch(
      /#game-canvas\s*\{[^}]*top:\s*env\(safe-area-inset-top,\s*0px\);/s,
    );
    const gameCanvasRule = canvasCss.match(
      /#game-canvas\s*\{(?<body>[^}]*)\}/s,
    )?.groups?.body;
    expect(gameCanvasRule).toContain('100lvh');
    expect(gameCanvasRule).not.toContain('100dvh');
    expect(canvasCss).toMatch(
      /#game-canvas\.is-splash-viewport\s*\{[^}]*top:\s*0;[^}]*left:\s*0;[^}]*width:\s*100vw;[^}]*height:\s*100dvh;/s,
    );
    expect(baseCss).toMatch(/html,\s*body,\s*#app\s*\{[^}]*touch-action:\s*pan-y;/s);
    expect(baseCss).toMatch(/\.app-shell\s*\{[^}]*touch-action:\s*pan-y;/s);
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

  it('keeps native Android text entry over the game instead of resizing it', () => {
    const capacitorConfig = JSON.parse(
      readFileSync(`${cwd()}/capacitor.config.json`, 'utf8'),
    );
    const manifest = readFileSync(
      `${cwd()}/android/app/src/main/AndroidManifest.xml`,
      'utf8',
    );
    const mainActivity = readFileSync(
      `${cwd()}/android/app/src/main/java/com/idlewizard/game/MainActivity.java`,
      'utf8',
    );
    const textEntryPlugin = readFileSync(
      `${cwd()}/android/app/src/main/java/com/idlewizard/game/IdleWizardTextEntryPlugin.java`,
      'utf8',
    );

    expect(manifest).toContain('android:windowSoftInputMode="adjustNothing"');
    expect(capacitorConfig.plugins?.SystemBars?.insetsHandling).toBe('disable');
    expect(mainActivity).toContain(
      'WindowCompat.setDecorFitsSystemWindows(getWindow(), false);',
    );
    expect(textEntryPlugin).toContain(
      'layoutParams.gravity = Gravity.TOP | Gravity.END;',
    );
    expect(textEntryPlugin).toContain(
      'WindowCompat.setDecorFitsSystemWindows(activity.getWindow(), false);',
    );
    expect(textEntryPlugin).toMatch(
      /private void reactivateEditorInput\(boolean restartInput\)[\s\S]*?enforceKeyboardOverlayWindow\(activity\);[\s\S]*?targetEditor\.requestFocus\(\);[\s\S]*?inputMethodManager\.restartInput\(targetEditor\);[\s\S]*?inputMethodManager\.showSoftInput\(/,
    );
    expect(textEntryPlugin).toContain(
      'WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING',
    );
    expect(textEntryPlugin).toMatch(
      /keyCode == KeyEvent\.KEYCODE_BACK\s*&&\s*onBack != null[\s\S]*?event\.getAction\(\) == KeyEvent\.ACTION_UP[\s\S]*?onBack\.run\(\);[\s\S]*?return true;/,
    );
  });

  it('uses the splash color during launch and the top-panel color in game', () => {
    const androidStyles = readFileSync(
      `${cwd()}/android/app/src/main/res/values/styles.xml`,
      'utf8',
    );

    expect(androidStyles).toMatch(
      /<style name="AppTheme\.NoActionBar"[\s\S]*?<item name="android:statusBarColor">#242938<\/item>/,
    );
    expect(androidStyles).toMatch(
      /<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<item name="android:windowSplashScreenBackground">#07040e<\/item>/,
    );
    expect(androidStyles).toMatch(
      /<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<item name="android:statusBarColor">#07040e<\/item>/,
    );
  });

  it('blocks native page zoom gestures while keeping single-touch gestures available', () => {
    const parent = document.createElement('main');
    const manager = new ViewportManager({ viewport: { width: 1080, height: 2170 } });

    manager.mount(parent);

    const singleTouchStart = createTouchEvent('touchstart', 1);
    const multiTouchStart = createTouchEvent('touchstart', 2);
    const multiTouchMove = createTouchEvent('touchmove', 2);
    const gestureStart = new window.Event('gesturestart', {
      bubbles: true,
      cancelable: true,
    });
    const gestureChange = new window.Event('gesturechange', {
      bubbles: true,
      cancelable: true,
    });
    const gestureEnd = new window.Event('gestureend', {
      bubbles: true,
      cancelable: true,
    });
    const ctrlWheel = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    const plainWheel = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(singleTouchStart);
    document.dispatchEvent(multiTouchStart);
    document.dispatchEvent(multiTouchMove);
    document.dispatchEvent(gestureStart);
    document.dispatchEvent(gestureChange);
    document.dispatchEvent(gestureEnd);
    document.dispatchEvent(ctrlWheel);
    document.dispatchEvent(plainWheel);

    expect(singleTouchStart.defaultPrevented).toBe(false);
    expect(multiTouchStart.defaultPrevented).toBe(true);
    expect(multiTouchMove.defaultPrevented).toBe(true);
    expect(gestureStart.defaultPrevented).toBe(true);
    expect(gestureChange.defaultPrevented).toBe(true);
    expect(gestureEnd.defaultPrevented).toBe(true);
    expect(ctrlWheel.defaultPrevented).toBe(true);
    expect(plainWheel.defaultPrevented).toBe(false);

    manager.unmount();

    const afterUnmountTouchMove = createTouchEvent('touchmove', 2);
    const afterUnmountCtrlWheel = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });

    document.dispatchEvent(afterUnmountTouchMove);
    document.dispatchEvent(afterUnmountCtrlWheel);

    expect(afterUnmountTouchMove.defaultPrevented).toBe(false);
    expect(afterUnmountCtrlWheel.defaultPrevented).toBe(false);
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
