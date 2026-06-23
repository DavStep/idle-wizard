// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

describe('WorkshopWorldChatManager styles', () => {
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
});
