// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

describe('WorkshopTradeAllianceManager styles', () => {
  it('keeps the tabbed popup height fixed while tab content changes', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const dialogRule = baseCss.match(
      /\.style-dialog\.workshop-page__trade-alliance-dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const contentRule = baseCss.match(
      /\.workshop-page__trade-alliance-content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const tabRuleBodies = [
      ...baseCss.matchAll(
        /\.workshop-page__trade-alliance-panel\[data-active-tab="[^"]+"\][^{]*\{(?<body>[^}]*)\}/g,
      ),
    ]
      .map((match) => match.groups?.body ?? '')
      .join('\n');

    expect(dialogRule).toMatch(/\bdisplay:\s*flex;/);
    expect(dialogRule).toMatch(/\bflex-direction:\s*column;/);
    expect(dialogRule).toMatch(/\bheight:\s*var\(--style-tabbed-dialog-content-height\);/);
    expect(contentRule).toMatch(/\bflex:\s*1 1 auto;/);
    expect(contentRule).toMatch(/\bmin-height:\s*0;/);
    expect(contentRule).not.toMatch(/\bheight:\s*auto;/);
    expect(tabRuleBodies).not.toMatch(/\bheight:\s*auto;/);
    expect(tabRuleBodies).not.toMatch(/\bmax-height:/);
  });
});
