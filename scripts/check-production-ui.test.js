import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  analyzeProductionUiSource,
  evaluateProductionUiFindings,
  runProductionUiGuard,
  validateProductionHtml,
} from './check-production-ui.mjs';

describe('production UI guard', () => {
  it('rejects DOM UI construction, queries, computed styles, observers, and extra canvases', () => {
    const findings = analyzeProductionUiSource(
      `
        document.createElement('input');
        document.createElement('form');
        document.createElement('select');
        document.createElement('canvas');
        document.querySelector('.dialog');
        globalThis.getComputedStyle(dialog);
        new MutationObserver(update);
      `,
      { moduleId: '/repo/src/rendering/BadView.js' },
    );

    expect(findings.map(({ ruleId }) => ruleId)).toEqual([
      'html-input-creation',
      'html-form-creation',
      'html-select-creation',
      'extra-canvas-creation',
      'dom-query',
      'computed-style-read',
      'mutation-observer',
    ]);
  });

  it('ignores syntax in comments/strings and permits only exact auth and host-canvas exceptions', () => {
    const inert = analyzeProductionUiSource(
      `
        const example = "document.createElement('input')";
        // document.querySelector('.legacy')
      `,
      { moduleId: '/repo/src/rendering/Inert.js' },
    );
    expect(inert).toEqual([]);

    const hostFindings = analyzeProductionUiSource(
      `
        const canvas = document.querySelector('#game-canvas');
        const legacy = document.querySelector('.legacy');
      `,
      { moduleId: '/repo/src/main.js' },
    );
    const hostResult = evaluateProductionUiFindings(hostFindings, {
      root: '/repo',
      entryModuleIds: ['/repo/src/main.js'],
      canvasId: 'game-canvas',
    });
    expect(hostResult.exceptions).toHaveLength(1);
    expect(hostResult.violations).toEqual([
      expect.objectContaining({
        method: 'querySelector',
        argument: '.legacy',
      }),
    ]);

    const authFindings = analyzeProductionUiSource(
      `
        document.querySelector(\`script[src="\${src}"]\`) ??
          document.createElement('script');
        document.createElement('input');
      `,
      {
        moduleId:
          '/repo/src/backend/auth/managers/AuthOidcManager.js',
      },
    );
    const authResult = evaluateProductionUiFindings(authFindings, {
      root: '/repo',
      entryModuleIds: [],
      canvasId: 'game-canvas',
    });
    expect(authResult.exceptions).toHaveLength(2);
    expect(authResult.violations).toEqual([
      expect.objectContaining({ ruleId: 'html-input-creation' }),
    ]);
  });

  it('requires one identified canvas and no other authored body UI', () => {
    const valid = validateProductionHtml(`
      <!doctype html>
      <html>
        <body>
          <canvas id="game-canvas"></canvas>
          <script type="module" src="/src/main.js"></script>
        </body>
      </html>
    `);
    expect(valid).toMatchObject({
      canvasId: 'game-canvas',
      entryScripts: ['/src/main.js'],
      violations: [],
    });

    const invalid = validateProductionHtml(`
      <body>
        <div id="app"></div>
        <canvas id="one"></canvas>
        <canvas id="two"></canvas>
        <form><input /><select></select></form>
        <script type="module" src="/src/main.js"></script>
      </body>
    `);
    expect(invalid.violations.map(({ ruleId }) => ruleId)).toEqual(
      expect.arrayContaining([
        'production-html-extra-element',
        'production-html-canvas-count',
      ]),
    );
  });

  it('follows the emitted production module graph and ignores unreachable legacy files', async () => {
    const root = fixturePath('production-ui-graph-safe');
    const report = await runProductionUiGuard({
      root,
      configFile: false,
      logLevel: 'silent',
    });

    expect(report.ok).toBe(true);
    expect(report.modules.map(({ relativePath }) => relativePath)).toEqual(
      expect.arrayContaining(['src/main.js', 'src/safe.js']),
    );
    expect(report.modules.map(({ relativePath }) => relativePath)).not.toContain(
      'src/unreachable-legacy.js',
    );
  });

  it('fails when a violating module is reachable from the production entry', async () => {
    const root = fixturePath('production-ui-graph-bad');
    const report = await runProductionUiGuard({
      root,
      configFile: false,
      logLevel: 'silent',
    });

    expect(report.ok).toBe(false);
    expect(report.violations).toEqual([
      expect.objectContaining({
        relativePath: 'src/bad-ui.js',
        ruleId: 'html-input-creation',
      }),
    ]);
  });
});

function fixturePath(name) {
  return fileURLToPath(
    new URL(`./production-ui-guard/fixtures/${name}/`, import.meta.url),
  );
}
