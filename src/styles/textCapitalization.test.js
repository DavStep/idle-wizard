import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

describe('player-facing text capitalization', () => {
  const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

  it('uses title case by default without forcing labels to lowercase', () => {
    expect(css).toMatch(
      /\.game-stage[\s\S]*?:where\([\s\S]*?\.style-button[\s\S]*?\)\s*\{[^}]*text-transform:\s*capitalize;/,
    );
    expect(css).not.toMatch(/\btext-transform:\s*lowercase;/);
  });

  it('starts descriptive copy with a capital letter', () => {
    expect(css).toMatch(
      /\.game-stage[\s\S]*?:where\([\s\S]*?\[class\*="__description"\][\s\S]*?\)::first-letter\s*\{[^}]*text-transform:\s*uppercase;/,
    );
  });
});
