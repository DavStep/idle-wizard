import { readFileSync, readdirSync } from 'node:fs';
import { cwd } from 'node:process';

import pngjs from 'pngjs';
import { describe, expect, it } from 'vitest';

const { PNG } = pngjs;
const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
const mainJs = readFileSync(`${cwd()}/src/main.js`, 'utf8');
const rootRunUiRendererSource = readFileSync(
  `${cwd()}/src/rendering/pixi/RootRunUiRendererManager.js`,
  'utf8',
);
const pixiNotificationBadgeSource = readFileSync(
  `${cwd()}/src/rendering/pixi/global/transient/PixiNotificationBadges.js`,
  'utf8',
);

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
  it('matches Root Run station-upgrade button press and release motion', () => {
    const rootRule = getRuleBody(/:root\s*\{(?<body>[^}]*)\}/);
    const releaseRule = getRuleBody(
      /\.is-press-releasing\s*\{(?<body>[^}]*)\}/,
    );
    const releaseKeyframes = baseCss.match(
      /@keyframes style-button-release-bounce\s*\{[\s\S]*?\n\}/,
    )?.[0] ?? '';
    const reducedMotionRule = findRuleBody(
      /\.is-press-releasing\s*\{(?<body>[^}]*)\}/g,
      (body) => body.includes('animation: none;'),
    );

    expect(rootRule).toContain('--style-motion-button-press-in: 55ms;');
    expect(rootRule).toContain('--style-motion-button-release: 180ms;');
    expect(rootRule).toContain('--style-press-scale: 0.94;');
    expect(rootRule).toContain('--style-press-release-peak-scale: 1.055;');
    expect(releaseRule).toContain(
      'animation: style-button-release-bounce var(--style-motion-button-release) both;',
    );
    expect(releaseKeyframes).toContain('36%');
    expect(releaseKeyframes).toContain(
      'scale: var(--style-press-release-peak-scale);',
    );
    expect(reducedMotionRule).toContain('animation: none;');
    expect(reducedMotionRule).toContain('scale: 1;');
  });

  it('uses matching red and orange notification-circle assets', () => {
    const rootRule = getRuleBody(/:root\s*\{(?<body>[^}]*)\}/);
    const textTabBadgeRule = getRuleBody(
      /\.style-button\[class\*="tab-button"\]\[data-notification="true"\]::before\s*\{(?<body>[^}]*)\}/,
    );
    const assetDir = `${cwd()}/assets/game/source/ui`;
    const red = PNG.sync.read(
      readFileSync(`${assetDir}/notification-circle-red.png`),
    );
    const orange = PNG.sync.read(
      readFileSync(`${assetDir}/notification-circle-orange.png`),
    );
    const centerIndex =
      (Math.floor(red.height / 2) * red.width + Math.floor(red.width / 2)) * 4;

    expect(baseCss).toContain(
      '--style-notification-image-red: url("../../assets/game/source/ui/notification-circle-red.png");',
    );
    expect(baseCss).toContain(
      '--style-notification-image-orange: url("../../assets/game/source/ui/notification-circle-orange.png");',
    );
    expect(baseCss).toContain(
      '--style-notification-image-current: var(--style-notification-image-orange);',
    );
    expect(
      [
        ...baseCss.matchAll(
          /background:\s*var\(\s*--style-notification-image-current,\s*var\(--style-notification-image\)\s*\)\s*center \/ 100% 100% no-repeat;/g,
        ),
      ],
    ).toHaveLength(5);
    expect(baseCss).not.toMatch(
      /background:\s*var\(\s*--style-notification-current(?:,\s*var\(--style-notification\))?\s*\);/,
    );
    expect(rootRunUiRendererSource).toContain(
      'extractCssUrls(style.backgroundImage)',
    );
    expect(rootRunUiRendererSource).toContain(
      'new this.runtime.Sprite(texture)',
    );
    expect(rootRunUiRendererSource).not.toMatch(
      /drawNotification(?:Dot|Badge)[\s\S]*?\.circle\(/,
    );
    expect(pixiNotificationBadgeSource).toContain('new Sprite({');
    expect(pixiNotificationBadgeSource).not.toContain('.circle(');
    const retainedNotificationSources = readSourceFiles(
      `${cwd()}/src/rendering/pixi`,
    ).join('\n');
    expect(retainedNotificationSources).not.toMatch(
      /(?:notification|attentionDot|notificationDot)[^\n]*=\s*new Graphics/,
    );
    expect(retainedNotificationSources).not.toMatch(
      /\.circle\([\s\S]{0,160}PIXI_UI_GEOMETRY\.notificationSize/,
    );
    const notificationSize = Number(
      rootRule.match(/--style-notification-size:\s*([\d.]+)px;/)?.[1],
    );
    expect(notificationSize).toBe(12);
    expect(rootRule).toContain(
      '--style-notification-offset: 0px;',
    );
    expect(rootRule).toContain(
      '--style-notification-tab-inset: 4px;',
    );
    expect(textTabBadgeRule).toContain('top: 0;');
    expect(textTabBadgeRule).toContain('right: 0;');
    expect([red.width, red.height]).toEqual([61, 65]);
    expect([orange.width, orange.height]).toEqual([red.width, red.height]);
    expect([...red.data.slice(centerIndex, centerIndex + 4)]).toEqual([
      232, 27, 27, 255,
    ]);
    expect([...orange.data.slice(centerIndex, centerIndex + 4)]).toEqual([
      214, 106, 0, 255,
    ]);

    for (let index = 0; index < red.data.length; index += 4) {
      expect(orange.data[index + 3]).toBe(red.data[index + 3]);

      const redChannels = [
        red.data[index],
        red.data[index + 1],
        red.data[index + 2],
      ];
      const isNeutralPixel =
        Math.max(...redChannels) - Math.min(...redChannels) <= 2;

      if (isNeutralPixel) {
        expect([...orange.data.slice(index, index + 3)]).toEqual(redChannels);
      }
    }
  });

  it('keeps resource and currency text on normal component colors', () => {
    expect(baseCss).not.toMatch(/--style-resource-(?:mana|coin|crystal|emerald|ruby|seed|herb)\s*:/);
    expect(baseCss).not.toMatch(
      /\bcolor:\s*var\(--(?:style-resource-(?:mana|coin|crystal|emerald|ruby|seed|herb)|guild-page-paper-(?:coin|seed|herb)|color-preview-(?:mana|coin|seed|herb))\);/,
    );
    expect(baseCss).not.toMatch(/data-drop-(?:weight|rate)-color/);
  });

  it('bundles and applies the Root Run Lilita One font', () => {
    const rootRule = getRuleBody(/:root\s*\{(?<body>[^}]*)\}/);
    const lilitaRule = getRuleBody(
      /:root\[data-style-font="lilita-one"\]\s*\{(?<body>[^}]*)\}/,
    );

    expect(mainJs).toContain("import '@fontsource/lilita-one/latin-400.css';");
    expect(rootRule).toContain(
      '--style-font:\n    "Lilita One", "Arial Black", Arial,',
    );
    expect(lilitaRule).toContain(
      '"Lilita One", "Arial Black", Arial,',
    );
  });

  it('uses a 4px black outline on shared cost-button text', () => {
    const costButtonRule = getRuleBody(
      /\.style-button\.style-cost-button\.style-cost-button\s*\{(?<body>[^}]*)\}/,
    );

    expect(costButtonRule).toContain('-webkit-text-stroke: 4px #0a0a0a;');
  });

  it('outlines the coin amount flyout with the shared HUD stroke', () => {
    const rule = getRuleBody(
      /\.room-coin-amt-pop\s*\{(?<body>[^}]*)\}/,
    );

    expect(rule).toMatch(
      /-webkit-text-stroke:\s+var\(--style-page-tab-label-text-stroke-width\)/,
    );
    expect(rule).toContain(
      'var(--style-yellow-button-text-stroke);',
    );
    expect(rule).toContain('paint-order: stroke fill;');
    expect(rule).toContain(
      '0 1px 0 var(--style-yellow-button-text-stroke),',
    );
  });

  it('opens the Garden in its settled state without a page-entry animation', () => {
    const gardenPageRule = getRuleBody(/\.garden-page\s*\{(?<body>[^}]*)\}/);

    expect(gardenPageRule).toContain('position: absolute;');
    expect(gardenPageRule).not.toContain('animation:');
  });

  it('uses stroked box and dialog titles without a background', () => {
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
    expect(nonWhiteThemeRule).not.toContain('--style-title-text-stroke-width: 0px;');
    expect(nonWhiteThemeRule).not.toContain('--style-title-text-stroke-shadow: none;');
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
    expect(titleRule).toContain('background: transparent;');
    expect(dialogTitleRule).toContain(
      'font-size: var(--style-dialog-title-font-size);',
    );
  });

  it('uses the shared Root Run Expedition shell, purple title plaque, paper panel, and detached close asset', () => {
    const rootRule = getRuleBody(/:root\s*\{(?<body>[^}]*)\}/);
    const dialogRule = getRuleBody(
      /:root\s+\.style-dialog\s*\{(?<body>[^}]*)\}/,
    );
    const backRule = getRuleBody(
      /:root\s+\.style-dialog::before\s*\{(?<body>[^}]*)\}/,
    );
    const paperRule = getRuleBody(
      /:root\s+\.style-dialog::after\s*\{(?<body>[^}]*)\}/,
    );
    const titleRule = getRuleBody(
      /:root\s+\.style-dialog\s+> \.style-box__title\s*\{(?<body>[^}]*)\}/,
    );
    const closeRule = getRuleBody(
      /\.game-stage[\s\S]*?button:is\(\[class\*="__close"\], \[class\*="-close"\]\):not\([\s\S]*?\.guild-page__close\s*\{(?<body>[^}]*)\}/,
    );
    const assetDir = `${cwd()}/assets/game/source/ui/root-run-dialog`;
    const back = PNG.sync.read(
      readFileSync(`${assetDir}/expedition-dialog-back.png`),
    );
    const title = PNG.sync.read(
      readFileSync(`${assetDir}/expedition-dialog-title-purple.png`),
    );
    const paper = PNG.sync.read(
      readFileSync(`${assetDir}/expedition-dialog-front.png`),
    );
    const close = PNG.sync.read(
      readFileSync(`${assetDir}/expedition-dialog-close.png`),
    );

    expect(rootRule).toContain(
      '--style-dialog-frame: url("../../assets/game/source/ui/root-run-dialog/expedition-dialog-back.png");',
    );
    expect(rootRule).toContain('--style-dialog-frame-slice: 139 163 83 83 fill;');
    expect(rootRule).toContain(
      '--style-dialog-paper-frame: url("../../assets/game/source/ui/root-run-dialog/expedition-dialog-front.png");',
    );
    expect(rootRule).toContain('--style-dialog-paper-frame-slice: 99 53 72 84 fill;');
    expect(rootRule).toContain(
      '--style-dialog-title-frame: url("../../assets/game/source/ui/root-run-dialog/expedition-dialog-title-purple.png");',
    );
    expect(rootRule).toContain('--style-dialog-title-frame-slice: 0 132 0 85 fill;');
    expect(rootRule).toContain('--style-dialog-title-fill: #9d25db;');
    expect(rootRule).toContain(
      '--style-dialog-title-overhang: calc(61px * 390 / 1080);',
    );
    expect(rootRule).toContain(
      '--style-dialog-paper-inset-top: calc(85px * 390 / 1080);',
    );
    expect(rootRule).toContain(
      '--style-dialog-paper-inset-bottom: calc(57px * 390 / 1080);',
    );
    expect(rootRule).toContain(
      '--style-dialog-title-text-size: calc(64px * 390 / 1080);',
    );
    expect(rootRule).toContain(
      '--style-dialog-title-text-stroke: calc(8px * 390 / 1080);',
    );
    expect(rootRule).toContain(
      '--style-dialog-close-image: url("../../assets/game/source/ui/root-run-dialog/expedition-dialog-close.png");',
    );
    expect(rootRule).toContain('--style-dialog-content-width: 304px;');
    expect(rootRule).toContain('--style-dialog-min-content-height: 53px;');
    expect(dialogRule).toContain(
      'width: var(--style-dialog-content-width);',
    );
    expect(dialogRule).toContain(
      'min-height: var(--style-dialog-min-content-height);',
    );
    expect(dialogRule).toContain('color: var(--style-dialog-ink);');
    expect(dialogRule).toContain('background: transparent;');
    expect(backRule).toContain('border-image-source: var(--style-dialog-frame);');
    expect(backRule).toContain('background: transparent;');
    expect(paperRule).toContain('var(--style-dialog-paper-inset-top)');
    expect(paperRule).toContain('var(--style-dialog-paper-inset-x)');
    expect(paperRule).toContain('var(--style-dialog-paper-inset-bottom)');
    expect(paperRule).toContain(
      'border-image-source: var(--style-dialog-paper-frame);',
    );
    expect(paperRule).toContain('background: transparent;');
    expect(titleRule).toContain(
      'border-image-source: var(--style-dialog-title-frame);',
    );
    expect(titleRule).toContain('color: #fff;');
    expect(titleRule).toContain(
      'var(--style-dialog-title-overhang)',
    );
    expect(titleRule).toContain(
      'font-size: var(--style-dialog-title-text-size);',
    );
    expect(titleRule).toContain(
      'line-height: var(--style-dialog-title-text-height);',
    );
    expect(titleRule).toContain(
      '-webkit-text-stroke: var(--style-dialog-title-text-stroke) #0a0a0a;',
    );
    expect(titleRule).toContain('font-weight: 400;');
    expect(titleRule).toContain('place-items: start center;');
    expect(titleRule).toContain('background: transparent;');
    expect(closeRule).toMatch(
      /background:\s*transparent\s+var\(--style-dialog-close-image\)\s+center\s*\/\s*contain\s+no-repeat;/,
    );
    expect(closeRule).toMatch(
      /top:\s*calc\(\s*100%\s*\+\s*var\(--style-dialog-frame-outset\)\s*\+\s*var\(--style-dialog-close-gap\)\s*\);/,
    );
    expect(closeRule).toContain('left: 50%;');
    expect(closeRule).toContain('transform: translateX(-50%);');
    expect([back.width, back.height]).toEqual([247, 223]);
    expect([paper.width, paper.height]).toEqual([138, 172]);
    expect([title.width, title.height]).toEqual([218, 121]);
    expect([close.width, close.height]).toEqual([122, 122]);
    expect(rootRunUiRendererSource).toMatch(
      /this\.syncPseudo\(\s*element,\s*'before'/,
    );
    expect(rootRunUiRendererSource).toMatch(
      /this\.syncPseudo\(\s*element,\s*'after'/,
    );
    expect(rootRunUiRendererSource).toContain(
      'parseBorderImageSlice(',
    );
    expect(rootRunUiRendererSource).toContain(
      'new this.runtime.NineSliceSprite({',
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
      '--style-midnight-panel-frame: url("../../assets/game/source/ui/player-card-panel-9slice.png");',
    );
    expect(rootRule).toContain(
      '--style-midnight-panel-selected-frame: url("../../assets/game/source/ui/player-card-panel-selected-9slice.png");',
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

  it('uses dark and light Root Run button skins for shared tab states', () => {
    const rootRule = getRuleBody(/:root\s*\{(?<body>[^}]*)\}/);
    const deselectedTabRule = getRuleBody(
      /\.style-button\[role="tab"\]\s*\{(?<body>[^}]*)\}/,
    );
    const selectedTabRule = getRuleBody(
      /\.style-button\[role="tab"\]\[aria-selected="true"\]\s*\{(?<body>[^}]*)\}/,
    );
    const midnightDeselectedTabRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s+\.style-button\[role="tab"\]\s*\{(?<body>[^}]*)\}/,
    );
    const midnightSelectedTabRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s+\.style-button\[role="tab"\]\[aria-selected="true"\]\s*\{(?<body>[^}]*)\}/,
    );
    const assetDir = `${cwd()}/assets/game/source/ui/root-run-cost-button`;
    const source = PNG.sync.read(
      readFileSync(`${assetDir}/yellow-button-9slice.png`),
    );
    const light = PNG.sync.read(
      readFileSync(`${assetDir}/brown-button-light-9slice.png`),
    );
    const dark = PNG.sync.read(
      readFileSync(`${assetDir}/brown-button-dark-9slice.png`),
    );

    expect(rootRule).toContain(
      '--style-tab-frame: url("../../assets/game/source/ui/root-run-cost-button/brown-button-dark-9slice.png");',
    );
    expect(rootRule).toContain(
      '--style-tab-selected-frame: url("../../assets/game/source/ui/root-run-cost-button/brown-button-light-9slice.png");',
    );
    expect(rootRule).toContain(
      '--style-tab-frame-slice: var(--style-yellow-button-frame-slice);',
    );
    expect(rootRule).toContain(
      '--style-tab-frame-width: var(--style-yellow-button-frame-width);',
    );
    expect(deselectedTabRule).toContain(
      'border-image-source: var(--style-tab-frame);',
    );
    expect(deselectedTabRule).toContain(
      'border-image-slice: var(--style-tab-frame-slice);',
    );
    expect(deselectedTabRule).toContain(
      'border-image-width: var(--style-tab-frame-width);',
    );
    expect(selectedTabRule).toContain(
      'border-image-source: var(--style-tab-selected-frame);',
    );
    expect(midnightDeselectedTabRule).toContain(
      'border-image-source: var(--style-tab-frame);',
    );
    expect(midnightSelectedTabRule).toContain(
      'border-image-source: var(--style-tab-selected-frame);',
    );
    expect([dark.width, dark.height]).toEqual([source.width, source.height]);
    expect([light.width, light.height]).toEqual([source.width, source.height]);

    for (const button of [dark, light]) {
      let alphaMatches = true;
      for (let index = 3; index < source.data.length; index += 4) {
        if (button.data[index] !== source.data[index]) {
          alphaMatches = false;
          break;
        }
      }
      expect(alphaMatches).toBe(true);
    }
  });

  it('uses the yellow Root Run configuration for regular buttons', () => {
    const rootRule = getRuleBody(/:root\s*\{(?<body>[^}]*)\}/);
    const yellowButtonRule = getRuleBody(
      /:root\s+\.style-button\.style-button--yellow\s*\{(?<body>[^}]*)\}/,
    );
    const brownDarkButtonRule = getRuleBody(
      /:root\s+\.style-button\.style-button--brown-dark\s*\{(?<body>[^}]*)\}/,
    );
    const brownButtonRule = getRuleBody(
      /:root\s+\.style-button\.style-button--brown-dark,\s*:root\s+\.style-button\.style-button--brown-light\s*\{(?<body>[^}]*)\}/,
    );
    const greenButtonRule = getRuleBody(
      /:root\s+\.style-button\.style-button--green\s*\{(?<body>[^}]*)\}/,
    );
    const redButtonRule = findRuleBody(
      /:root\s+\.style-button\.style-button--red\s*\{(?<body>[^}]*)\}/g,
      (body) =>
        body.includes(
          'border-image-source: var(--style-red-button-frame);',
        ),
    );
    const disabledRoleButtonRule = getRuleBody(
      /:root\s+\.style-button:is\(\.style-button--green,\s*\.style-button--red\):is\([\s\S]*?\)\s*\{(?<body>[^}]*)\}/,
    );
    const disabledRegularButtonRule = getRuleBody(
      /:root\s+\.style-button:is\(\s*\.style-button--yellow,[\s\S]*?\):is\(\s*\[aria-disabled="true"\],[\s\S]*?\)\s*\{(?<body>[^}]*)\}/,
    );
    const assetDir = `${cwd()}/assets/game/source/ui/root-run-cost-button`;
    const green = PNG.sync.read(
      readFileSync(`${assetDir}/green-button-9slice.png`),
    );
    const yellow = PNG.sync.read(
      readFileSync(`${assetDir}/yellow-button-9slice.png`),
    );
    const red = PNG.sync.read(
      readFileSync(`${assetDir}/red-button-9slice.png`),
    );

    expect(rootRule).toContain(
      '--style-yellow-button-frame: url("../../assets/game/source/ui/root-run-cost-button/yellow-button-9slice.png");',
    );
    expect(rootRule).toContain(
      '--style-yellow-button-frame-slice: 100 43 68 115 fill;',
    );
    expect(yellowButtonRule).toContain(
      'border-image-source: var(--style-yellow-button-frame);',
    );
    expect(yellowButtonRule).toContain(
      'border-image-slice: var(--style-yellow-button-frame-slice);',
    );
    expect(yellowButtonRule).toContain(
      'border-image-width: var(--style-yellow-button-frame-width);',
    );
    expect(yellowButtonRule).toContain(
      '-webkit-text-stroke: 4px var(--style-yellow-button-text-stroke);',
    );
    expect(brownDarkButtonRule).toContain(
      'border-image-source: var(--style-tab-frame);',
    );
    expect(brownButtonRule).toContain(
      'border-image-slice: var(--style-tab-frame-slice);',
    );
    expect(greenButtonRule).toContain(
      'border-image-source: var(--style-green-button-frame);',
    );
    expect(redButtonRule).toContain(
      'border-image-source: var(--style-red-button-frame);',
    );
    expect(disabledRoleButtonRule).toContain(
      'border-image-source: var(--style-green-button-disabled-frame);',
    );
    expect(disabledRoleButtonRule).not.toContain('filter:');
    expect(disabledRegularButtonRule).toContain('filter: grayscale(1);');
    expect([yellow.width, yellow.height]).toEqual([green.width, green.height]);
    expect([red.width, red.height]).toEqual([green.width, green.height]);

    let alphaMatches = true;
    for (let index = 3; index < green.data.length; index += 4) {
      if (
        green.data[index] !== yellow.data[index] ||
        green.data[index] !== red.data[index]
      ) {
        alphaMatches = false;
        break;
      }
    }
    expect(alphaMatches).toBe(true);
    const yellowColors = new Set();
    for (let index = 0; index < yellow.data.length; index += 4) {
      yellowColors.add(
        `${yellow.data[index]},${yellow.data[index + 1]},${yellow.data[index + 2]},${yellow.data[index + 3]}`,
      );
    }
    expect(yellowColors.has('222,164,85,255')).toBe(true);
    expect(yellowColors.has('236,222,98,255')).toBe(true);
  });

  it('uses the shop tile for inner sections and the tighter flipped skin for the top panel', () => {
    const selectableThemeRule = getRuleBody(
      /:root\[data-style-theme="black"\],\s*:root\[data-style-theme="midnight"\],\s*:root\[data-style-theme="witchcraft"\]\s*\{(?<body>[^}]*)\}/,
    );
    const innerSectionRule = findRuleBody(
      /:root\[data-style-theme="black"\]\s+\.style-box:not\(\.tutorial-layer__hint\):not\(\.tutorial-layer__lesson\),[\s\S]*?:root\[data-style-theme="witchcraft"\]\s+\.style-box:not\(\.tutorial-layer__hint\):not\(\.tutorial-layer__lesson\)\s*\{(?<body>[^}]*)\}/g,
      (body) =>
        body.includes(
          'border-image-source: var(--style-inner-section-frame);',
        ),
    );
    const topPanelRule = getRuleBody(
      /:root\[data-style-theme="black"\]\s+\.style-panel\.room-top-panel,[\s\S]*?:root\[data-style-theme="witchcraft"\]\s+\.style-panel\.room-top-panel\s*\{(?<body>[^}]*)\}/,
    );
    const topPanelBackgroundRule = getRuleBody(
      /:root\[data-style-theme="black"\]\s+\.style-panel\.room-top-panel::before,[\s\S]*?:root\[data-style-theme="witchcraft"\]\s+\.style-panel\.room-top-panel::before\s*\{(?<body>[^}]*)\}/,
    );
    const themeAssets = ['black', 'midnight', 'witchcraft'].map((theme) =>
      PNG.sync.read(
        readFileSync(
          `${cwd()}/assets/game/source/ui/inner-section-panel-${theme}-9slice.png`,
        ),
      ),
    );

    expect(baseCss).toContain(
      '--style-inner-section-frame: url("../../assets/game/source/ui/inner-section-panel-black-9slice.png");',
    );
    expect(baseCss).toContain('--style-inner-section-fill: #4b4b4b;');
    expect(baseCss).toContain(
      '--style-inner-section-frame: url("../../assets/game/source/ui/inner-section-panel-midnight-9slice.png");',
    );
    expect(baseCss).toContain('--style-inner-section-fill: #242938;');
    expect(baseCss).toContain(
      '--style-inner-section-frame: url("../../assets/game/source/ui/inner-section-panel-witchcraft-9slice.png");',
    );
    expect(baseCss).toContain('--style-inner-section-fill: #4c335a;');
    expect(baseCss).toContain('--style-top-panel-content-gap: 16px;');
    expect(baseCss).toContain(
      '--style-top-panel-background-frame: url("../../assets/game/source/ui/midnight-top-panel-background-9slice.png");',
    );
    expect(selectableThemeRule).toContain(
      '--style-inner-section-frame-slice: 91 73 90 83 fill;',
    );
    expect(selectableThemeRule).toMatch(
      /--style-inner-section-frame-width:\s*calc\(91px \* 390 \/ 1080\)\s+calc\(73px \* 390 \/ 1080\)\s+calc\(90px \* 390 \/ 1080\)\s+calc\(83px \* 390 \/ 1080\);/,
    );
    expect(innerSectionRule).toContain(
      'background: var(--style-inner-section-fill);',
    );
    expect(innerSectionRule).toContain(
      'border-image-source: var(--style-inner-section-frame);',
    );
    expect(innerSectionRule).toContain(
      'border-image-slice: var(--style-inner-section-frame-slice);',
    );
    expect(innerSectionRule).toContain(
      'border-image-width: var(--style-inner-section-frame-width);',
    );
    expect(innerSectionRule).toContain('border-radius: 16px;');
    expect(topPanelRule).toContain('background: transparent;');
    expect(topPanelRule).toContain('border: 0;');
    expect(topPanelRule).toContain('border-image: none;');
    expect(topPanelRule).toContain('border-radius: 0;');
    expect(topPanelBackgroundRule).toContain(
      'border-image-source: var(--style-top-panel-background-frame);',
    );
    expect(topPanelBackgroundRule).toContain(
      'border-image-slice: var(--style-room-tab-frame-slice);',
    );
    expect(topPanelBackgroundRule).toContain(
      'border-image-width: var(--style-room-tab-frame-width);',
    );
    expect(topPanelBackgroundRule).toContain('transform: scaleY(-1);');

    const alphaMasks = themeAssets.map((png) => {
      expect(png.width).toBe(157);
      expect(png.height).toBe(182);
      expect(png.data[3]).toBe(0);
      expect(png.data[((91 * png.width + 83) * 4) + 3]).toBe(255);

      return Array.from(png.data).filter((_, index) => index % 4 === 3);
    });

    expect(alphaMasks[1]).toEqual(alphaMasks[0]);
    expect(alphaMasks[2]).toEqual(alphaMasks[0]);

    const midnightCenterOffset = ((91 * themeAssets[1].width + 83) * 4);
    expect(
      Array.from(
        themeAssets[1].data.subarray(
          midnightCenterOffset,
          midnightCenterOffset + 4,
        ),
      ),
    ).toEqual([36, 41, 56, 255]);
    const midnightFillPixelCount = Array.from(
      { length: themeAssets[1].data.length / 4 },
      (_, pixelIndex) => pixelIndex * 4,
    ).filter(
      (offset) =>
        themeAssets[1].data[offset] === 36 &&
        themeAssets[1].data[offset + 1] === 41 &&
        themeAssets[1].data[offset + 2] === 56 &&
        themeAssets[1].data[offset + 3] === 255,
    ).length;
    expect(midnightFillPixelCount).toBe(18_262);

    const witchcraftCenterOffset = ((91 * themeAssets[2].width + 83) * 4);
    expect(
      Array.from(
        themeAssets[2].data.subarray(
          witchcraftCenterOffset,
          witchcraftCenterOffset + 4,
        ),
      ),
    ).toEqual([76, 51, 90, 255]);
  });

  it('keeps midnight 9-slice transparent corners clear of rectangular backing fills', () => {
    const sharedFrameRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*:where\(\s*\.style-panel,[\s\S]*?\)\s*\{(?<body>[^}]*)\}/,
    );
    const controlFrameRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*:where\(\s*\.style-button,[\s\S]*?\)\s*\{(?<body>[^}]*)\}/,
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
    expect(activeControlRule).toContain('background: transparent;');
    expect(dialogBackingRule).toContain('background: transparent;');
  });

  it('uses the shared purple Root Rush capsule for progress rails', () => {
    const rootRule = getRuleBody(/:root\s*\{(?<body>[^}]*)\}/);
    const progressRule = getRuleBody(/\.style-progress\s*\{(?<body>[^}]*)\}/);
    const fillRule = getRuleBody(/\.style-progress__fill\s*\{(?<body>[^}]*)\}/);

    expect(rootRule).toContain('--style-progress-rail-border-width: 1px;');
    expect(rootRule).toContain('--style-progress-height: 8px;');
    expect(rootRule).toContain('--style-progress-top-panel-height: 12px;');
    expect(rootRule).toContain('--style-slider-progress-total-height: 14px;');
    expect(rootRule).toContain('--style-progress-knob-size: 14px;');
    expect(rootRule).toContain('--style-progress-knob-fill: #fee5c3;');
    expect(rootRule).toContain('--style-progress-knob-border: #ceac82;');
    expect(rootRule).toContain('--style-progress-knob-ring: #241b14;');
    expect(rootRule).toContain('--style-progress-root-fill: #8740df;');
    expect(rootRule).toContain('--style-progress-root-edge: #bd72f3;');
    expect(rootRule).toContain('--style-progress-blue-fill: #2d8fe6;');
    expect(rootRule).toContain('--style-progress-blue-edge: #72c8ff;');
    expect(rootRule).toContain('--style-progress-green-fill: #4aa83f;');
    expect(rootRule).toContain('--style-progress-green-edge: #8bdc69;');
    expect(rootRule).toContain('--style-progress-yellow-fill: #d8ad32;');
    expect(rootRule).toContain('--style-progress-yellow-edge: #f6d86a;');
    expect(progressRule).toContain('background: var(--style-progress-rail-background);');
    expect(progressRule).toContain('border: var(--style-progress-rail-border);');
    expect(progressRule).toContain('border-radius: 999px;');
    expect(progressRule).toContain('border-image: none;');
    expect(fillRule).toContain('top: 1px;');
    expect(fillRule).toContain('bottom: 1px;');
    expect(fillRule).toContain('left: 1px;');
    expect(fillRule).toContain('max-width: calc(100% - 2px);');
    expect(fillRule).toContain('border-radius: 999px;');
    expect(fillRule).not.toContain('scaleX');
  });

  it('colors progress by room while preserving purple shared chrome', () => {
    const brewingRule = findRuleBody(
      /\.brewing-page,\s*\.brewing-page__popup-layer\s*\{(?<body>[^}]*)\}/g,
      (body) => body.includes('--style-progress-root-fill'),
    );
    const gardenRule = findRuleBody(
      /\.garden-page,\s*\.garden-page__popup-layer\s*\{(?<body>[^}]*)\}/g,
      (body) => body.includes('--style-progress-root-fill'),
    );
    const yellowRoomRule = getRuleBody(
      /\.research-page,\s*\.research-page__popup-layer,\s*\.shop-page,\s*\.shop-page__popup-layer\s*\{(?<body>[^}]*)\}/,
    );

    expect(brewingRule).toContain(
      '--style-progress-root-fill: var(--style-progress-blue-fill);',
    );
    expect(brewingRule).toContain(
      '--style-progress-root-edge: var(--style-progress-blue-edge);',
    );
    expect(gardenRule).toContain(
      '--style-progress-root-fill: var(--style-progress-green-fill);',
    );
    expect(gardenRule).toContain(
      '--style-progress-root-edge: var(--style-progress-green-edge);',
    );
    expect(yellowRoomRule).toContain(
      '--style-progress-root-fill: var(--style-progress-yellow-fill);',
    );
    expect(yellowRoomRule).toContain(
      '--style-progress-root-edge: var(--style-progress-yellow-edge);',
    );
    expect(baseCss).toMatch(
      /:root\[data-style-progress="regular"\][\s\S]*?:is\([\s\S]*?\.brewing-page__popup-layer,[\s\S]*?\.shop-page__popup-layer[\s\S]*?\)\s*\{[\s\S]*?--style-progress-fill-background:\s*var\(--style-progress-root-fill\);[\s\S]*?--style-progress-fill-edge:\s*var\(--style-progress-root-edge\);/,
    );
  });

  it('keeps every room background solid', () => {
    const roomBackgroundRule = getRuleBody(
      /\.workshop-page,\s*\.brewing-page,\s*\.garden-page,\s*\.research-page,\s*\.shop-page,\s*\.guild-page,\s*\.prestige-page\s*\{(?<body>[^}]*)\}/,
    );

    expect(roomBackgroundRule).toContain(
      '--style-page-background: var(--style-surface);',
    );
    expect(roomBackgroundRule).not.toContain('gradient(');
    expect(baseCss).not.toContain('--style-page-tint-bottom');
    expect(baseCss).not.toContain('--style-page-tint-top');
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
      /\.style-box\.first-run-intro__panel\s*\{(?<body>[^}]*)\}/,
    );
    const titleRule = getRuleBody(
      /\.style-box\.first-run-intro__panel > \.style-box__title\s*\{(?<body>[^}]*)\}/,
    );
    const advanceRule = findRuleBody(
      /\.style-button\.first-run-intro__advance\s*\{(?<body>[^}]*)\}/g,
      (body) => body.includes('box-sizing: border-box;'),
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
    expect(panelRule).toContain(
      '--first-run-intro-panel-frame: url("../../assets/game/source/ui/root-run-research/research-card-dark-1000x304.png");',
    );
    expect(panelRule).toContain('padding: 38px 20px 20px;');
    expect(panelRule).toContain('color: #fff;');
    expect(titleRule).toContain('top: 12px;');
    expect(titleRule).toContain('left: 20px;');
    expect(titleRule).toContain('color: #fff;');
    expect(advanceRule).toContain('width: max-content;');
    expect(advanceRule).toContain('min-width: 84px;');
    expect(advanceRule).toContain('margin-left: auto;');
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
    expect(baseCss).toMatch(
      /\.first-run-intro--step-enter\[data-scene="peace"\]\s+\.first-run-intro__backdrop-layer/,
    );
    expect(baseCss).toMatch(
      /\.first-run-intro--step-enter\[data-scene="workshop"\]\s+\.first-run-intro__backdrop-layer/,
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

  it('keeps tutorial lessons on their dedicated skin without overriding the first-run box', () => {
    const introSkinRule = findRuleBody(
      /\.style-box\.tutorial-layer__lesson\.is-intro-dialog\s*\{(?<body>[^}]*)\}/g,
      (body) => body.includes('--intro-dialog-panel-frame:'),
    );
    const introTitleRule = getRuleBody(
      /\.style-box\.tutorial-layer__lesson\.is-intro-dialog > \.style-box__title\s*\{(?<body>[^}]*)\}/,
    );
    const introLessonRule = findRuleBody(
      /\.style-box\.tutorial-layer__lesson\.is-intro-dialog\s*\{(?<body>[^}]*)\}/g,
      (body) => body.includes('box-shadow: none;'),
    );
    const introLessonShadowRule = getRuleBody(
      /\.style-box\.tutorial-layer__lesson\.is-intro-dialog::after\s*\{(?<body>[^}]*)\}/,
    );

    expect(introSkinRule).toContain(
      '--intro-dialog-panel-frame: url("../../assets/game/source/ui/intro-dialog-panel-9slice.png");',
    );
    expect(introSkinRule).toContain(
      '--intro-dialog-panel-slice: 31 29 31 29 fill;',
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
    expect(introTitleRule).toContain('background: transparent;');
    expect(introTitleRule).toContain('border: 0;');
    expect(introTitleRule).toContain('border-image: none;');
    expect(introTitleRule).toContain('top: -16px;');
    expect(introTitleRule).toContain('padding: 2px 18px 3px;');
    expect(introTitleRule).toContain('line-height: 16px;');
    expect(introTitleRule).not.toContain('linear-gradient(');
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
      /\.first-run-intro \.style-box\.first-run-intro__panel(?:::before|::after)\s*\{/,
    );
    expect(baseCss).not.toContain('--intro-dialog-button-frame:');
    expect(baseCss).not.toContain('--intro-dialog-button-slice:');
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
    const assetDir = `${cwd()}/assets/game/source/ui/guild-quest`;
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

  it('layers the trader allocation input over a progress rail and uses midnight panel frames', () => {
    const controlRule = getRuleBody(
      /\.shop-page__sell-allocation-control\s*\{(?<body>[^}]*)\}/,
    );
    const progressRule = getRuleBody(
      /\.style-progress\.shop-page__sell-allocation-progress\s*\{(?<body>[^}]*)\}/,
    );
    const webkitThumbRule = getRuleBody(
      /\.shop-page__sell-allocation-range::\s*-webkit-slider-thumb\s*\{(?<body>[^}]*)\}/,
    );
    const mozThumbRule = getRuleBody(
      /\.shop-page__sell-allocation-range::\s*-moz-range-thumb\s*\{(?<body>[^}]*)\}/,
    );
    const midnightRowFrameRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*\.shop-page__sell-current,[\s\S]*?\.shop-page__sell-item-button\s*\{(?<body>[^}]*)\}/,
    );
    const midnightSelectedRowRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*\.shop-page__sell-current\[data-has-selection="true"\],[\s\S]*?\.shop-page__sell-item-button\[aria-pressed="true"\]\s*\{(?<body>[^}]*)\}/,
    );

    expect(controlRule).toContain('position: relative;');
    expect(progressRule).toContain('position: absolute;');
    expect(progressRule).toContain('pointer-events: none;');
    expect(progressRule).toContain(
      '--style-progress-fill-background: #8740df;',
    );
    expect(progressRule).toContain('--style-progress-fill-edge: #bd72f3;');
    expect(progressRule).toContain(
      'height: var(--style-slider-progress-total-height);',
    );
    expect(progressRule).toContain(
      'right: calc(var(--style-progress-knob-size) / 2);',
    );
    expect(baseCss).toMatch(
      /\.shop-page__sell-allocation-range::\s*-webkit-slider-runnable-track\s*\{[^}]*height:\s*var\(--style-slider-progress-total-height\);/,
    );
    expect(baseCss).toMatch(
      /\.shop-page__sell-allocation-range::\s*-moz-range-track\s*\{[^}]*height:\s*var\(--style-slider-progress-total-height\);/,
    );
    for (const thumbRule of [webkitThumbRule, mozThumbRule]) {
      expect(thumbRule).toContain('width: var(--style-progress-knob-size);');
      expect(thumbRule).toContain('height: var(--style-progress-knob-size);');
      expect(thumbRule).toContain(
        'background: var(--style-progress-knob-fill);',
      );
      expect(thumbRule).toContain(
        'border: 1px solid var(--style-progress-knob-border);',
      );
      expect(thumbRule).toContain('border-radius: 50%;');
      expect(thumbRule).toContain(
        'box-shadow: 0 0 0 1px var(--style-progress-knob-ring);',
      );
    }
    expect(midnightRowFrameRule).toContain('background: transparent;');
    expect(midnightRowFrameRule).toContain(
      'border-image-source: var(--style-midnight-panel-frame);',
    );
    expect(midnightSelectedRowRule).toContain(
      'border-image-source: var(--style-midnight-panel-selected-frame);',
    );
  });

  it('plays room entry motion only for the first cached page activation', () => {
    const cachedPageRule = getRuleBody(
      /\[data-page-cache-activation="reused"\]\s*\{(?<body>[^}]*)\}/,
    );

    expect(cachedPageRule).toContain('--room-page-entry-animation-name: none;');
    expect(cachedPageRule).toContain('--room-section-entry-animation-name: none;');
    expect(baseCss.match(/--room-page-entry-animation-name, room-page-enter/g)).toHaveLength(6);
    expect(baseCss).toContain(
      '--room-section-entry-animation-name, room-section-enter',
    );
  });
});

function readSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return readSourceFiles(path);
    }
    return entry.isFile() && entry.name.endsWith('.js')
      ? [readFileSync(path, 'utf8')]
      : [];
  });
}

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
