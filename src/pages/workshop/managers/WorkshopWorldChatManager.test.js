// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

describe('WorkshopWorldChatManager styles', () => {
  it('pins the app shell against keyboard document pan', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const appShellRule = baseCss.match(/\.app-shell\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;

    expect(appShellRule).toContain('position: fixed;');
    expect(appShellRule).toContain('inset: 0;');
    expect(appShellRule).toContain('overflow: hidden;');
  });

  it('keeps the chat dialog on a stable upper anchor while text input focuses', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const panelRule = baseCss.match(
      /\.workshop-page__world-chat-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const keyboardFocusDeclaration =
      '--app-dialog-y-shift: var(--app-keyboard-dialog-shift);';
    const keyboardFocusDeclarationIndex = baseCss.indexOf(keyboardFocusDeclaration);
    expect(keyboardFocusDeclarationIndex).toBeGreaterThan(-1);
    const keyboardFocusRuleStart = baseCss.lastIndexOf(
      ':where(',
      keyboardFocusDeclarationIndex,
    );
    expect(keyboardFocusRuleStart).toBeGreaterThan(-1);
    const keyboardFocusRuleEnd = baseCss.indexOf('}', keyboardFocusDeclarationIndex);
    const keyboardFocusRule = baseCss.slice(
      keyboardFocusRuleStart,
      keyboardFocusRuleEnd,
    );

    expect(rootRule).toContain(
      '--style-world-chat-dialog-top: calc(var(--style-room-content-top) + 154px);',
    );
    expect(panelRule).toMatch(/\btop:\s*var\(--style-world-chat-dialog-top\);/);
    expect(keyboardFocusRule).not.toContain('.room-world-chat-layer [role="dialog"]');
    expect(baseCss).not.toContain(
      '.workshop-page__world-chat-popup:focus-within .workshop-page__world-chat-panel',
    );
  });

  it('dims the full web-wide stage behind room dialogs', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const gutterRule = baseCss.match(
      /\.game-stage\[data-viewport-mode="web-wide"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const nestedBackdropRule = baseCss.match(
      /\.game-stage\[data-viewport-mode="web-wide"\]\s*:where\(\s*\.workshop-page__bag-popup,[\s\S]*?\.room-top-panel__level-popup\s*\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stageBackdropRule = baseCss.match(
      /\.game-stage\[data-viewport-mode="web-wide"\]\s*:where\(\s*\.room-announcement-layer,[\s\S]*?\.room-alliance-info-popup\s*\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(gutterRule).toContain(
      '--style-web-wide-source-gutter: max(\n    0px,\n    calc(\n      (var(--app-stage-width) - var(--app-source-ui-screen-width)) /\n        var(--style-ui-scale) / 2\n    )\n  );',
    );
    expect(nestedBackdropRule).toContain(
      'right: calc(var(--style-web-wide-source-gutter) * -1);',
    );
    expect(nestedBackdropRule).toContain(
      'left: calc(var(--style-web-wide-source-gutter) * -1);',
    );
    expect(stageBackdropRule).toContain('left: 0;');
    expect(stageBackdropRule).toContain('width: calc(100% / var(--style-ui-scale));');
  });
});
