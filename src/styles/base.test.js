import { readFileSync, readdirSync } from 'node:fs';
import { cwd } from 'node:process';

import pngjs from 'pngjs';
import { describe, expect, it } from 'vitest';

const { PNG } = pngjs;
const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

function getRuleBody(pattern) {
  return baseCss.match(pattern)?.groups?.body ?? '';
}

function findRuleBody(pattern, predicate) {
  return (
    [...baseCss.matchAll(pattern)]
      .map((match) => match.groups?.body ?? '')
      .find(predicate) ?? ''
  );
}

describe('base styles', () => {
  it('uses stroked box and dialog titles only in the root fallback', () => {
    const rootRule = getRuleBody(/:root\s*\{(?<body>[^}]*)\}/);
    const nonWhiteThemeRule = getRuleBody(
      /:root\[data-style-theme="black"\],\s*:root\[data-style-theme="midnight"\],\s*:root\[data-style-theme="witchcraft"\]\s*\{(?<body>[^}]*)\}/,
    );
    const titleRule = findRuleBody(
      /\.style-box__title\s*\{(?<body>[^}]*)\}/g,
      (body) => body.includes('position: absolute;'),
    );
    const dialogTitleRule = getRuleBody(
      /\.style-dialog > \.style-box__title\s*\{(?<body>[^}]*)\}/,
    );

    expect(rootRule).toContain('--style-title-text-stroke-width: 2px;');
    expect(rootRule).toContain(
      '--style-title-text-stroke-color: var(--style-surface);',
    );
    expect(rootRule).toContain(
      '0 1px 0 var(--style-title-text-stroke-color),',
    );
    expect(nonWhiteThemeRule).toContain('--style-title-text-stroke-width: 0px;');
    expect(nonWhiteThemeRule).toContain('--style-title-text-stroke-shadow: none;');
    expect(titleRule).toContain(
      '-webkit-text-stroke: var(--style-title-text-stroke-width)',
    );
    expect(titleRule).toContain(
      'padding: 0 var(--style-box-border-label-padding-x);',
    );
    expect(titleRule).toContain('var(--style-title-text-stroke-color);');
    expect(titleRule).toContain('paint-order: stroke fill;');
    expect(titleRule).toContain(
      'text-shadow: var(--style-title-text-stroke-shadow);',
    );
    expect(titleRule).toContain('background: var(--style-surface);');
    expect(dialogTitleRule).toContain(
      'font-size: var(--style-dialog-title-font-size);',
    );
  });

  it('uses the midnight box frame for standalone buttons and the button frame inside boxes or dialogs', () => {
    const rootRule = getRuleBody(/:root\[data-style-theme="midnight"\]\s*\{(?<body>[^}]*)\}/);
    const sharedFrameRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*:where\(\s*\.style-panel,[\s\S]*?\)\s*\{(?<body>[^}]*)\}/,
    );
    const midnightRules = baseCss
      .split('}')
      .filter((rule) => rule.includes(':root[data-style-theme="midnight"]'));
    const nestedButtonFrameRule = midnightRules.find(
      (rule) =>
        rule.includes('.style-box .style-button:not(.workshop-page__summon-button),') &&
        rule.includes('border-image-source: var(--style-midnight-button-frame);'),
    );
    const globalButtonFrameRule = midnightRules.find(
      (rule) =>
        rule.includes('.style-button:not(.workshop-page__summon-button),') &&
        !rule.includes('.style-box .style-button:not(.workshop-page__summon-button),') &&
        rule.includes('border-image-source: var(--style-midnight-button-frame);'),
    );

    expect(rootRule).toContain(
      '--style-midnight-panel-frame: url("/ui/player-card-panel-9slice.png");',
    );
    expect(rootRule).toContain(
      '--style-midnight-panel-selected-frame: url("/ui/player-card-panel-selected-9slice.png");',
    );
    expect(sharedFrameRule).toContain(
      'border-image-source: var(--style-midnight-panel-frame);',
    );
    expect(baseCss).toContain(
      '.style-box .style-button:not(.workshop-page__summon-button),',
    );
    expect(baseCss).toContain(
      '.style-dialog .style-button:not(.workshop-page__summon-button),',
    );
    expect(nestedButtonFrameRule).toBeDefined();
    expect(globalButtonFrameRule).toBeUndefined();
  });

  it('keeps midnight 9-slice transparent corners clear of rectangular backing fills', () => {
    const sharedFrameRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*:where\(\s*\.style-panel,[\s\S]*?\)\s*\{(?<body>[^}]*)\}/,
    );
    const controlFrameRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*:where\(\s*\.style-button,[\s\S]*?\)\s*\{(?<body>[^}]*)\}/,
    );
    const progressFrameRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*:is\(\.style-progress\)\s*\{(?<body>[^}]*)\}/,
    );
    const activeControlRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*\.style-button:is\(:active, \.is-pressing\)[\s\S]*?\.workshop-page__summon-button-text\s*\{(?<body>[^}]*)\}/,
    );
    const dialogBackingRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*\.style-dialog::before\s*\{(?<body>[^}]*)\}/,
    );

    expect(sharedFrameRule).toContain('background: transparent;');
    expect(sharedFrameRule).toContain('background-clip: padding-box;');
    expect(sharedFrameRule).not.toContain('background: var(--style-surface);');
    expect(controlFrameRule).toContain('background: transparent;');
    expect(progressFrameRule).toContain('background: transparent;');
    expect(activeControlRule).toContain('background: transparent;');
    expect(dialogBackingRule).toContain('background: transparent;');
  });

  it('keeps first-run cutscene art fixed to the authored source width', () => {
    const rootRule = getRuleBody(/\.first-run-intro\s*\{(?<body>[^}]*)\}/);
    const sceneRule = getRuleBody(/\.first-run-intro__scene\s*\{(?<body>[^}]*)\}/);
    const backdropLayerRule = getRuleBody(
      /\.first-run-intro__backdrop-layer\s*\{(?<body>[^}]*)\}/,
    );
    const defeatedDemonRule = getRuleBody(
      /\.first-run-intro__demon--defeated\s*\{(?<body>[^}]*)\}/,
    );
    const defeatedDemonEnterRule = getRuleBody(
      /\.first-run-intro--step-enter\[data-scene="defeated"\]\s+\.first-run-intro__demon--defeated\s*\{(?<body>[^}]*)\}/,
    );
    const rainbowRule = getRuleBody(/\.first-run-intro__rainbow\s*\{(?<body>[^}]*)\}/);
    const panelRule = getRuleBody(
      /\.style-dialog\.first-run-intro__panel\s*\{(?<body>[^}]*)\}/,
    );

    expect(rootRule).toContain('width: calc(100% / var(--style-ui-scale));');
    expect(sceneRule).toContain('left: var(--style-source-ui-gutter-x);');
    expect(sceneRule).toContain('width: var(--style-source-ui-width);');
    expect(backdropLayerRule).toContain('transform: scale(1.01);');
    expect(backdropLayerRule).toContain('will-change: opacity, transform, filter;');
    expect(panelRule).toContain(
      'right: calc(var(--style-source-ui-gutter-x) + 20px);',
    );
    expect(panelRule).toContain(
      'left: calc(var(--style-source-ui-gutter-x) + 20px);',
    );
    expect(defeatedDemonRule).toContain('top: 370px;');
    expect(defeatedDemonEnterRule).toContain(
      'animation: first-run-intro-defeated-enter 360ms',
    );
    expect(baseCss).toMatch(
      /@keyframes first-run-intro-defeated-enter \{[\s\S]*?transform: translateY\(-350px\) scaleX\(0\.86\) scaleY\(0\.96\);/,
    );
    expect(baseCss).toMatch(
      /54% \{[\s\S]*?transform: translateY\(0\) scaleX\(0\.925\) scaleY\(0\.875\);/,
    );
    expect(baseCss).toMatch(
      /72% \{[\s\S]*?transform: translateY\(-6px\) scaleX\(0\.887\) scaleY\(0\.914\);/,
    );
    expect(baseCss).toMatch(
      /100% \{[\s\S]*?transform: translateY\(0\) scale\(0\.9\);/,
    );
    expect(rainbowRule).toContain('height: 154px;');
    expect(rainbowRule).toContain('ellipse at 50% 92%');
    expect(rainbowRule).toContain('mask-composite: intersect;');
    expect(baseCss).toMatch(
      /\.first-run-intro--stable-backdrop\.first-run-intro--step-enter\s+\.first-run-intro__transition-shade,[\s\S]*?animation:\s*none;/,
    );
    expect(baseCss).toMatch(
      /\.first-run-intro--stable-backdrop\.first-run-intro--step-enter\s+\.first-run-intro__backdrop-layer,[\s\S]*?animation:\s*none;/,
    );
    expect(baseCss).toContain(
      '.first-run-intro--step-enter[data-scene="peace"] .first-run-intro__backdrop-layer',
    );
    expect(baseCss).toContain(
      '.first-run-intro--step-enter[data-scene="workshop"] .first-run-intro__backdrop-layer',
    );
    expect(baseCss).toContain('@keyframes first-run-intro-peace-push');
    expect(baseCss).toContain(
      '.first-run-intro--step-enter[data-scene="peace"] .first-run-intro__rainbow',
    );
    expect(baseCss).toContain('@keyframes first-run-intro-rainbow-enter');
    expect(baseCss).toContain(
      '.first-run-intro--step-enter .first-run-intro__rainbow,',
    );
    expect(baseCss).not.toContain('data-step="reward"');
    expect(baseCss).not.toContain('data-step="better-use"');
    expect(baseCss).not.toContain('first-run-intro__coin-pile');
    expect(baseCss).not.toContain('@keyframes first-run-intro-coin-drop');
    expect(baseCss).not.toContain('@keyframes first-run-intro-coin-collect');
    expect(baseCss).toMatch(
      /\.first-run-intro--step-enter\[data-step="workshop"\]\s+\.first-run-intro__workshop-sale\s*\{[\s\S]*?animation:\s*first-run-intro-workshop-sale-enter 520ms/,
    );
    expect(baseCss).not.toContain('data-step="buy-workshop"');
    expect(baseCss).not.toContain('@keyframes first-run-intro-workshop-price-boink');
    expect(baseCss).toContain('@keyframes first-run-intro-workshop-sale-enter');
    expect(baseCss).toContain('@keyframes first-run-intro-workshop-sale-exit');
  });

  it('keeps the first-run intro dialog on the dedicated filled 9-slices', () => {
    const introSkinRule = getRuleBody(
      /\.first-run-intro \.style-dialog\.first-run-intro__panel,\s*\.style-box\.tutorial-layer__lesson\.is-intro-dialog\s*\{(?<body>[^}]*)\}/,
    );
    const introTitleRule = getRuleBody(
      /\.first-run-intro \.style-dialog\.first-run-intro__panel > \.style-box__title,\s*\.style-box\.tutorial-layer__lesson\.is-intro-dialog > \.style-box__title\s*\{(?<body>[^}]*)\}/,
    );
    const introButtonRule = getRuleBody(
      /\.first-run-intro \.style-button\.first-run-intro__advance\s*\{(?<body>[^}]*)\}/,
    );
    const introPanelShadowRule = getRuleBody(
      /\.first-run-intro \.style-dialog\.first-run-intro__panel::after\s*\{(?<body>[^}]*)\}/,
    );
    const introLessonRule = findRuleBody(
      /\.style-box\.tutorial-layer__lesson\.is-intro-dialog\s*\{(?<body>[^}]*)\}/g,
      (body) => body.includes('box-shadow: none;'),
    );
    const introLessonShadowRule = getRuleBody(
      /\.style-box\.tutorial-layer__lesson\.is-intro-dialog::after\s*\{(?<body>[^}]*)\}/,
    );

    expect(introSkinRule).toContain(
      '--intro-dialog-panel-frame: url("/ui/intro-dialog-panel-9slice.png");',
    );
    expect(introSkinRule).toContain(
      '--intro-dialog-tab-frame: url("/ui/intro-dialog-header-tab-9slice.png");',
    );
    expect(introSkinRule).toContain(
      '--intro-dialog-button-frame: url("/ui/intro-dialog-button-9slice.png");',
    );
    expect(introSkinRule).toContain(
      '--intro-dialog-panel-slice: 31 29 31 29 fill;',
    );
    expect(introSkinRule).toContain(
      '--intro-dialog-tab-slice: 31 29 31 29 fill;',
    );
    expect(introSkinRule).toContain(
      '--intro-dialog-button-slice: 31 29 31 29 fill;',
    );
    expect(introSkinRule).toContain(
      '--intro-dialog-shadow-filter: drop-shadow(var(--intro-dialog-shadow));',
    );
    expect(introSkinRule).toContain('background: transparent;');
    expect(introSkinRule).toContain(
      'border-image-source: var(--intro-dialog-panel-frame);',
    );
    expect(introSkinRule).toContain(
      'border-image-slice: var(--intro-dialog-panel-slice);',
    );
    expect(introSkinRule).not.toContain('linear-gradient(');
    expect(introTitleRule).toContain(
      'border-image-source: var(--intro-dialog-tab-frame);',
    );
    expect(introTitleRule).toContain(
      'border-image-slice: var(--intro-dialog-tab-slice);',
    );
    expect(introTitleRule).toContain('top: -16px;');
    expect(introTitleRule).toContain('padding: 2px 18px 3px;');
    expect(introTitleRule).toContain('line-height: 16px;');
    expect(introTitleRule).not.toContain('linear-gradient(');
    expect(introButtonRule).toContain(
      'border-image-source: var(--intro-dialog-button-frame);',
    );
    expect(introButtonRule).toContain(
      'border-image-slice: var(--intro-dialog-button-slice);',
    );
    expect(introButtonRule).not.toContain('linear-gradient(');
    expect(introPanelShadowRule).toContain('box-shadow: none;');
    expect(introPanelShadowRule).toContain(
      'filter: var(--intro-dialog-shadow-filter);',
    );
    expect(introLessonRule).toContain('box-shadow: none;');
    expect(introLessonShadowRule).toContain(
      'border-image-source: var(--intro-dialog-panel-frame);',
    );
    expect(introLessonShadowRule).toContain(
      'border-image-slice: var(--intro-dialog-panel-slice);',
    );
    expect(introLessonShadowRule).toContain(
      'filter: var(--intro-dialog-shadow-filter);',
    );
    expect(baseCss).not.toMatch(
      /\.first-run-intro \.style-dialog\.first-run-intro__panel::before,\s*\.style-box\.tutorial-layer__lesson\.is-intro-dialog::before\s*\{/,
    );
  });

  it('snaps the initial tutorial reveal gate hidden before Elara paints', () => {
    const primingRule = getRuleBody(
      /\.game-stage\.is-tutorial-reveal-priming\[data-tutorial-reveal\][\s\S]*?\.room-top-panel__resource\[aria-label="mana"\]\s*\{(?<body>[^}]*)\}/,
    );

    expect(baseCss).toContain(
      '.game-stage.is-tutorial-reveal-priming[data-tutorial-reveal]',
    );
    expect(baseCss).toContain('.room-bottom-panel-layer');
    expect(baseCss).toContain('.workshop-page__tasks');
    expect(primingRule).toContain('transition: none;');
  });

  it('keeps Workshop requirement row actions compact for long labels', () => {
    const taskRowRule = getRuleBody(/\.workshop-page__task-row\s*\{(?<body>[^}]*)\}/);
    const taskButtonRule = getRuleBody(
      /\.style-button\.workshop-page__task-button\s*\{(?<body>[^}]*)\}/,
    );

    expect(taskRowRule).toContain(
      'grid-template-columns: minmax(0, 1fr) minmax(40px, max-content) 58px;',
    );
    expect(taskRowRule).toContain('column-gap: var(--style-row-column-gap);');
    expect(taskButtonRule).toContain('box-sizing: border-box;');
    expect(taskButtonRule).toContain('width: 58px;');
    expect(taskButtonRule).toContain('font-size: var(--style-tiny-font-size);');
    expect(taskButtonRule).toContain('overflow: hidden;');
    expect(taskButtonRule).toContain('text-overflow: ellipsis;');
    expect(taskButtonRule).toContain('white-space: nowrap;');
  });

  it('keeps the intro header top stretch band free of line artifacts', () => {
    const header = PNG.sync.read(
      readFileSync(`${cwd()}/public/ui/intro-dialog-header-tab-9slice.png`),
    );
    const xStart = 29;
    const xEnd = header.width - 29;
    const yStart = 5;
    const yEnd = 31;

    function pixelLuminance(x, y) {
      const offset = (y * header.width + x) * 4;
      return (
        header.data[offset] * 0.2126 +
        header.data[offset + 1] * 0.7152 +
        header.data[offset + 2] * 0.0722
      );
    }

    function rowLuminance(y) {
      let total = 0;
      let count = 0;
      for (let x = xStart; x < xEnd; x += 1) {
        const offset = (y * header.width + x) * 4;
        if (header.data[offset + 3] === 0) {
          continue;
        }

        total += pixelLuminance(x, y);
        count += 1;
      }

      return total / count;
    }

    const maxInternalRowJump = Array.from(
      { length: yEnd - yStart },
      (_, index) =>
        Math.abs(rowLuminance(yStart + index + 1) - rowLuminance(yStart + index)),
    ).reduce((max, jump) => Math.max(max, jump), 0);

    expect(maxInternalRowJump).toBeLessThan(1);
  });

  it('uses the alpha-cropped guild quest slices in CSS top-right-bottom-left order', () => {
    const generatorSlices = [
      ['--guild-page-paper-frame-slice', { left: 41, top: 41, right: 42, bottom: 42 }],
      [
        '--guild-page-quest-dialog-frame-slice',
        { left: 43, top: 43, right: 44, bottom: 43 },
      ],
      [
        '--guild-page-quest-paper-frame-slice',
        { left: 41, top: 41, right: 42, bottom: 42 },
      ],
      [
        '--guild-page-quest-list-row-frame-slice',
        { left: 31, top: 24, right: 32, bottom: 23 },
      ],
      [
        '--guild-page-quest-button-frame-slice',
        { left: 43, top: 27, right: 43, bottom: 28 },
      ],
      [
        '--guild-page-quest-close-frame-slice',
        { left: 27, top: 28, right: 28, bottom: 27 },
      ],
    ];

    for (const [property, slice] of generatorSlices) {
      const cssSlice = [slice.top, slice.right, slice.bottom, slice.left].join(' ');

      expect(baseCss).toContain(`${property}: ${cssSlice} fill;`);
    }
  });

  it('keeps guild quest PNG assets free of green-screen matte edges', () => {
    const assetDir = `${cwd()}/public/ui/guild-quest`;
    const assetNames = readdirSync(assetDir).filter((name) => name.endsWith('.png'));
    const failures = [];

    function isBrightGreen(r, g, b) {
      return (r === 0 && g === 255 && b === 0) || (g >= 220 && r <= 80 && b <= 80);
    }

    function isDarkGreenMatte(r, g, b) {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);

      return (
        g > Math.max(r, b) + 15 &&
        max > 0 &&
        (max - min) / max >= 0.7 &&
        max / 255 <= 0.32
      );
    }

    function isNearTransparentEdge(png, x, y) {
      const radius = 3;

      if (
        x < radius ||
        y < radius ||
        x >= png.width - radius ||
        y >= png.height - radius
      ) {
        return true;
      }

      for (
        let yy = Math.max(0, y - radius);
        yy < Math.min(png.height, y + radius + 1);
        yy += 1
      ) {
        for (
          let xx = Math.max(0, x - radius);
          xx < Math.min(png.width, x + radius + 1);
          xx += 1
        ) {
          const offset = (yy * png.width + xx) * 4;
          if (png.data[offset + 3] === 0) {
            return true;
          }
        }
      }

      return false;
    }

    for (const assetName of assetNames) {
      const png = PNG.sync.read(readFileSync(`${assetDir}/${assetName}`));
      let brightGreen = 0;
      let matteEdge = 0;

      for (let y = 0; y < png.height; y += 1) {
        for (let x = 0; x < png.width; x += 1) {
          const offset = (y * png.width + x) * 4;
          const r = png.data[offset];
          const g = png.data[offset + 1];
          const b = png.data[offset + 2];
          const a = png.data[offset + 3];

          if (a === 0) {
            continue;
          }

          if (isBrightGreen(r, g, b)) {
            brightGreen += 1;
          }

          if (
            assetName !== 'icon-herbs.png' &&
            isDarkGreenMatte(r, g, b) &&
            isNearTransparentEdge(png, x, y)
          ) {
            matteEdge += 1;
          }
        }
      }

      if (brightGreen > 0 || matteEdge > 0) {
        failures.push(`${assetName}: bright=${brightGreen}, matteEdge=${matteEdge}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps Workshop level reward text left and point values right under a centered title', () => {
    const titleRule = getRuleBody(/\.workshop-page__level-payoff-title\s*\{(?<body>[^}]*)\}/);
    const rowsRule = getRuleBody(/\.workshop-page__level-payoff-rows\s*\{(?<body>[^}]*)\}/);
    const rowRule = getRuleBody(/\.workshop-page__level-payoff-row\s*\{(?<body>[^}]*)\}/);
    const listRowRule = getRuleBody(
      /\.workshop-page__level-payoff-row--list\s*\{(?<body>[^}]*)\}/,
    );
    const valueRule = getRuleBody(/\.workshop-page__level-payoff-value\s*\{(?<body>[^}]*)\}/);
    const listValueRule = getRuleBody(
      /\.workshop-page__level-payoff-value--list\s*\{(?<body>[^}]*)\}/,
    );
    const valueLineRule = getRuleBody(
      /\.workshop-page__level-payoff-value-line\s*\{(?<body>[^}]*)\}/,
    );
    const pageIconRule = getRuleBody(
      /\.workshop-page__level-payoff-page-icon\s*\{(?<body>[^}]*)\}/,
    );

    expect(titleRule).toContain('text-align: center;');
    expect(rowsRule).toContain('display: grid;');
    expect(rowsRule).toContain('width: 100%;');
    expect(rowRule).toContain(
      'grid-template-columns: minmax(0, 1fr) max-content;',
    );
    expect(rowRule).toContain('width: 100%;');
    expect(listRowRule).toContain(
      'grid-template-columns: max-content minmax(0, 1fr);',
    );
    expect(valueRule).toContain('justify-self: end;');
    expect(valueRule).toContain('text-align: right;');
    expect(listValueRule).toContain('justify-self: start;');
    expect(listValueRule).toContain('align-items: flex-start;');
    expect(listValueRule).toContain('text-align: left;');
    expect(valueLineRule).toContain('display: inline-flex;');
    expect(valueLineRule).toContain('align-items: center;');
    expect(pageIconRule).toContain('width: 1.25em;');
    expect(pageIconRule).toContain('height: 1.25em;');
  });

});

describe('interaction typography', () => {
  it('keeps font weight stable across interaction states', () => {
    const stateSelector =
      /:focus|\.is-(?:active|current|selected)(?![-\w])|\[aria-(?:checked|pressed|selected)="true"\]|selected-(?:item|label)/;
    const boldStateSelectors = [...baseCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selector, body]) => {
        return (
          stateSelector.test(selector) &&
          /font-weight\s*:\s*(?:700|bold)\s*;/.test(body)
        );
      })
      .map(([, selector]) => selector.trim().replace(/\s+/g, ' '));

    expect(boldStateSelectors).toEqual([]);
  });
});
