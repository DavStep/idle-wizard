import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

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
    const dialogBackingRule = getRuleBody(
      /:root\[data-style-theme="midnight"\]\s*\.style-dialog::before\s*\{(?<body>[^}]*)\}/,
    );

    expect(sharedFrameRule).toContain('background-clip: padding-box;');
    expect(dialogBackingRule).toContain('background: transparent;');
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
  });

});
