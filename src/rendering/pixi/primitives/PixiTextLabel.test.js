// @vitest-environment jsdom

import { readFileSync, readdirSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import { PIXI_TEXT_STROKE_WIDTH } from '../theme/PixiThemeTokens.js';
import { PixiTextLabel } from './PixiTextLabel.js';

installPixiPageTestCanvas();

describe('PixiTextLabel stroked text', () => {
  it.each([1, 2, 2.25, 8 / 3, 3, 4, 6])(
    'normalizes caller width %s to the shared thick outline',
    (width) => {
      const label = new PixiTextLabel({
        stroke: { color: '#123456', width },
      });

      expect(label.textObject.style.stroke).toMatchObject({
        color: '#123456',
        width: PIXI_TEXT_STROKE_WIDTH,
        join: 'round',
      });

      label.destroy({ children: true });
    },
  );

  it('scales the shared outline only for a scaled authoring layer', () => {
    const label = new PixiTextLabel({
      stroke: { color: '#123456', scale: 3 },
    });

    expect(label.textObject.style.stroke.width).toBe(
      PIXI_TEXT_STROKE_WIDTH * 3,
    );

    label.destroy({ children: true });
  });

  it('keeps regular text unstroked', () => {
    const label = new PixiTextLabel();

    expect(label.textObject.style.stroke).toBeNull();

    label.destroy({ children: true });
  });

  it('routes late retained-text stroke assignments through the shared normalizer', () => {
    const assignments = readSourceFiles(
      `${cwd()}/src/rendering/pixi`,
    ).flatMap((source) =>
      [...source.matchAll(/\.style\.stroke\s*=\s*(?<value>[^;]+);/g)]
        .map((match) => match.groups.value.trim())
        .filter((value) => value !== 'null'),
    );

    expect(assignments.length).toBeGreaterThan(0);
    expect(assignments.every((value) =>
      value.includes('normalizePixiTextStroke(') ||
      value === 'this.stroke',
    )).toBe(true);
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
