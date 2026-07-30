// @vitest-environment jsdom

import { readFileSync, readdirSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_TEXT_STROKE_COLOR,
  PIXI_TEXT_STROKE_RATIO,
  PIXI_TEXT_STROKE_WIDTH,
  resolvePixiTextStrokeWidth,
} from '../theme/PixiThemeTokens.js';
import { PixiTextLabel } from './PixiTextLabel.js';

installPixiPageTestCanvas();

describe('PixiTextLabel stroked text', () => {
  it('anchors the proportional outline at 3px for 13px text', () => {
    expect(PIXI_TEXT_STROKE_WIDTH).toBe(3);
    expect(PIXI_TEXT_STROKE_RATIO).toBeCloseTo(3 / 13);
    expect(resolvePixiTextStrokeWidth(13)).toBe(3);
  });

  it.each([
    ['#123456', 1],
    ['#ffffff', 2],
    [0x654321, 2.25],
    ['#17100c', 8 / 3],
    ['#2b160e', 3],
    ['#3f465c', 4],
    ['#6c5008', 6],
  ])(
    'normalizes caller color %s and width %s to the shared outline',
    (color, width) => {
      const label = new PixiTextLabel({
        stroke: { color, width },
      });

      expect(label.textObject.style.stroke).toMatchObject({
        color: PIXI_TEXT_STROKE_COLOR,
        width: PIXI_TEXT_STROKE_WIDTH,
        join: 'round',
      });

      label.destroy({ children: true });
    },
  );

  it.each([1, 2, 2.25, 8 / 3, 3, 4, 6])(
    'normalizes primitive caller color %s to the shared color and outline',
    (color) => {
      const label = new PixiTextLabel({
        stroke: color,
      });

      expect(label.textObject.style.stroke).toMatchObject({
        color: PIXI_TEXT_STROKE_COLOR,
        width: PIXI_TEXT_STROKE_WIDTH,
        join: 'round',
      });

      label.destroy({ children: true });
    },
  );

  it.each([8, 10, 13, 18, 23.1, 33])(
    'scales the shared outline with a %spx font size',
    (fontSize) => {
      const label = new PixiTextLabel({
        fontSize,
        stroke: { color: '#123456', width: 99, scale: 3 },
      });

      expect(label.textObject.style.stroke.width).toBeCloseTo(
        resolvePixiTextStrokeWidth(fontSize),
      );

      label.destroy({ children: true });
    },
  );

  it('recomputes the outline when the font size changes', () => {
    const label = new PixiTextLabel({
      fontSize: 13,
      stroke: { color: '#123456' },
    });

    label.setFontSize(26);

    expect(label.textObject.style.stroke.width).toBeCloseTo(
      resolvePixiTextStrokeWidth(26),
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
