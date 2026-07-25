#!/usr/bin/env node
/* global console, process */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pngjs from 'pngjs';

import {
  DEFAULT_MANIFEST_PATH,
  REPO_ROOT,
  readVisualBaselineManifest,
  resolveSurfaceState,
} from './manifest.mjs';

const { PNG } = pngjs;

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    printHelp();
    return;
  }

  for (const flag of ['reference', 'actual', 'surface', 'state']) {
    if (!options[flag]) {
      throw new Error(`--${toKebabCase(flag)} is required.`);
    }
  }

  const loaded = readVisualBaselineManifest(options.manifest ?? DEFAULT_MANIFEST_PATH);
  const { surface, state } = resolveSurfaceState(
    loaded.manifest,
    options.surface,
    options.state,
  );
  const referencePath = requireFile(options.reference, '--reference');
  const actualPath = requireFile(options.actual, '--actual');
  const referencePng = PNG.sync.read(fs.readFileSync(referencePath));
  const actualPng = PNG.sync.read(fs.readFileSync(actualPath));

  if (
    referencePng.width !== actualPng.width ||
    referencePng.height !== actualPng.height
  ) {
    throw new Error(
      `Image dimensions differ: reference=${referencePng.width}x${referencePng.height}, ` +
      `actual=${actualPng.width}x${actualPng.height}. Crop equivalent semantic surfaces first.`,
    );
  }

  const referenceMetadata = readOptionalMetadata(
    options.referenceMetadata ?? inferMetadataPath(referencePath),
  );
  const actualMetadata = readOptionalMetadata(
    options.actualMetadata ?? inferMetadataPath(actualPath),
  );
  const maskRects = resolveMaskRects({
    surface,
    state,
    referenceMetadata,
    actualMetadata,
  });
  const defaults = loaded.manifest.comparisonDefaults;
  const comparison = comparePngs(referencePng, actualPng, {
    maxChannelDelta:
      options.maxChannelDelta ?? defaults.maxChannelDelta,
    maxDifferentPixels:
      options.maxDifferentPixels ?? defaults.maxDifferentPixels,
    glyphEdgeMaxChannelDelta:
      options.glyphEdgeMaxChannelDelta ?? defaults.glyphEdgeMaxChannelDelta,
    maskRects,
  });
  const anchorComparison = compareAnchorMetadata({
    definitions: [
      ...(surface.anchors ?? []),
      ...(state.anchors ?? []),
    ],
    referenceMetadata,
    actualMetadata,
    defaultTolerancePx: defaults.anchorTolerancePx,
    requireMetadata:
      !options.allowMissingAnchorMetadata && defaults.requireAnchorMetadata,
  });
  const passed =
    comparison.summary.differentPixels <= comparison.summary.maxDifferentPixels &&
    anchorComparison.mismatches.length === 0;
  const outDir = path.resolve(options.outDir ?? 'tmp/visual-baseline-diff');

  fs.mkdirSync(outDir, { recursive: true });
  const diffPath = path.join(outDir, 'difference.png');
  const overlayPath = path.join(outDir, 'overlay.png');
  const summaryPath = path.join(outDir, 'summary.json');
  fs.writeFileSync(diffPath, PNG.sync.write(comparison.diff));
  fs.writeFileSync(overlayPath, PNG.sync.write(comparison.overlay));
  const summary = {
    schemaVersion: 1,
    verdict: passed ? 'match' : 'mismatch',
    surfaceId: surface.id,
    stateId: state.id,
    reference: path.resolve(referencePath),
    actual: path.resolve(actualPath),
    dimensions: {
      width: referencePng.width,
      height: referencePng.height,
    },
    pixels: comparison.summary,
    anchors: anchorComparison,
    maskRects,
    artifacts: {
      difference: diffPath,
      overlay: overlayPath,
    },
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(
    `${passed ? 'MATCH' : 'MISMATCH'}: ` +
    `${comparison.summary.differentPixels} differing pixel(s), ` +
    `${comparison.summary.toleratedGlyphEdgePixels} tolerated glyph-edge pixel(s), ` +
    `${anchorComparison.mismatches.length} anchor mismatch(es).`,
  );
  console.log(`wrote ${path.relative(REPO_ROOT, diffPath)}`);
  console.log(`wrote ${path.relative(REPO_ROOT, overlayPath)}`);
  console.log(`wrote ${path.relative(REPO_ROOT, summaryPath)}`);

  if (!passed) {
    process.exitCode = 2;
  }
  return summary;
}

export function comparePngs(
  reference,
  actual,
  {
    maxChannelDelta = 0,
    maxDifferentPixels = 0,
    glyphEdgeMaxChannelDelta = 40,
    maskRects = [],
  } = {},
) {
  if (reference.width !== actual.width || reference.height !== actual.height) {
    throw new Error('comparePngs requires equal image dimensions.');
  }

  const diff = new PNG({ width: reference.width, height: reference.height });
  const overlay = new PNG({ width: reference.width, height: reference.height });
  let differentPixels = 0;
  let toleratedGlyphEdgePixels = 0;
  let exactPixels = 0;
  let maxObservedChannelDelta = 0;
  let totalChannelDelta = 0;

  for (let y = 0; y < reference.height; y += 1) {
    for (let x = 0; x < reference.width; x += 1) {
      const index = (y * reference.width + x) * 4;
      const channelDeltas = [0, 1, 2, 3].map((offset) =>
        Math.abs(reference.data[index + offset] - actual.data[index + offset]),
      );
      const pixelDelta = Math.max(...channelDeltas);
      maxObservedChannelDelta = Math.max(maxObservedChannelDelta, pixelDelta);
      totalChannelDelta += channelDeltas.reduce((total, delta) => total + delta, 0);
      const insideGlyphMask = maskRects.some((mask) => pointInRect(x, y, mask.rect));
      const glyphThreshold = insideGlyphMask
        ? (maskRects.find((mask) => pointInRect(x, y, mask.rect))?.maxChannelDelta ??
          glyphEdgeMaxChannelDelta)
        : maxChannelDelta;
      const isGlyphEdge =
        insideGlyphMask &&
        isLikelyEdge(reference, x, y) &&
        isLikelyEdge(actual, x, y);
      const exact = pixelDelta <= maxChannelDelta;
      const tolerated = !exact && isGlyphEdge && pixelDelta <= glyphThreshold;

      if (exact) {
        exactPixels += 1;
        writeDiffContext(diff.data, index, reference.data, index);
      } else if (tolerated) {
        toleratedGlyphEdgePixels += 1;
        writePixel(diff.data, index, 255, 181, 0, 220);
      } else {
        differentPixels += 1;
        writePixel(diff.data, index, 255, 0, 122, 255);
      }

      writePixel(
        overlay.data,
        index,
        Math.round((reference.data[index] + actual.data[index]) / 2),
        Math.round((reference.data[index + 1] + actual.data[index + 1]) / 2),
        Math.round((reference.data[index + 2] + actual.data[index + 2]) / 2),
        Math.max(reference.data[index + 3], actual.data[index + 3]),
      );
    }
  }

  const pixelCount = reference.width * reference.height;
  return {
    diff,
    overlay,
    summary: {
      pixelCount,
      exactPixels,
      toleratedGlyphEdgePixels,
      differentPixels,
      maxDifferentPixels,
      maxChannelDelta,
      glyphEdgeMaxChannelDelta,
      maxObservedChannelDelta,
      meanChannelDelta: totalChannelDelta / (pixelCount * 4),
      differenceRatio: differentPixels / pixelCount,
    },
  };
}

export function compareAnchorMetadata({
  definitions,
  referenceMetadata,
  actualMetadata,
  defaultTolerancePx = 1,
  requireMetadata = true,
}) {
  const mismatches = [];
  const matches = [];
  const skipped = [];

  if (definitions.length === 0) {
    return {
      required: false,
      matches,
      mismatches,
      skipped,
    };
  }

  if (!referenceMetadata || !actualMetadata) {
    if (requireMetadata) {
      mismatches.push({
        id: 'metadata',
        reason: 'anchor_metadata_missing',
        referenceMetadata: Boolean(referenceMetadata),
        actualMetadata: Boolean(actualMetadata),
      });
    } else {
      skipped.push({
        id: 'metadata',
        reason: 'anchor_metadata_missing_allowed',
      });
    }
    return {
      required: requireMetadata,
      matches,
      mismatches,
      skipped,
    };
  }

  const referenceAnchors = new Map(
    (referenceMetadata.anchors ?? []).map((anchor) => [anchor.id, anchor]),
  );
  const actualAnchors = new Map(
    (actualMetadata.anchors ?? []).map((anchor) => [anchor.id, anchor]),
  );

  for (const definition of definitions) {
    const reference = referenceAnchors.get(definition.id);
    const actual = actualAnchors.get(definition.id);
    if ((!reference?.found || !actual?.found) && definition.optional) {
      skipped.push({ id: definition.id, reason: 'optional_anchor_missing' });
      continue;
    }
    if (!reference?.found || !actual?.found || !reference.rect || !actual.rect) {
      mismatches.push({
        id: definition.id,
        reason: 'required_anchor_missing',
        referenceFound: Boolean(reference?.found),
        actualFound: Boolean(actual?.found),
      });
      continue;
    }

    const tolerancePx = definition.tolerancePx ?? defaultTolerancePx;
    const rectDeltas = Object.fromEntries(
      ['x', 'y', 'width', 'height'].map((key) => [
        key,
        Math.abs(reference.rect[key] - actual.rect[key]),
      ]),
    );
    const typographyMismatches = compareTypography(
      reference.typography,
      actual.typography,
    );
    const textMatches = reference.text === actual.text;
    const rectMatches = Object.values(rectDeltas).every(
      (delta) => delta <= tolerancePx,
    );

    if (rectMatches && typographyMismatches.length === 0 && textMatches) {
      matches.push({
        id: definition.id,
        tolerancePx,
        rectDeltas,
      });
    } else {
      mismatches.push({
        id: definition.id,
        reason: 'anchor_drift',
        tolerancePx,
        rectDeltas,
        textMatches,
        typographyMismatches,
        reference: {
          rect: reference.rect,
          text: reference.text,
          typography: reference.typography,
        },
        actual: {
          rect: actual.rect,
          text: actual.text,
          typography: actual.typography,
        },
      });
    }
  }

  return {
    required: requireMetadata,
    matches,
    mismatches,
    skipped,
  };
}

export function resolveMaskRects({
  surface,
  state,
  referenceMetadata,
  actualMetadata,
}) {
  const definitions = [
    ...(surface.glyphEdgeMasks ?? []),
    ...(state.glyphEdgeMasks ?? []),
  ];
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const resolved = [];

  for (const metadata of [referenceMetadata, actualMetadata]) {
    for (const measured of metadata?.glyphEdgeMasks ?? []) {
      const definition = byId.get(measured.id);
      for (const rect of measured.rects ?? []) {
        resolved.push({
          id: measured.id,
          rect: normalizeRect(rect),
          maxChannelDelta:
            measured.maxChannelDelta ??
            definition?.maxChannelDelta,
        });
      }
    }
  }

  for (const definition of definitions) {
    if (definition.rect) {
      resolved.push({
        id: definition.id,
        rect: normalizeRect(definition.rect),
        maxChannelDelta: definition.maxChannelDelta,
      });
    }
  }

  return dedupeMaskRects(resolved);
}

function parseArgs(args) {
  const parsed = {
    allowMissingAnchorMetadata: false,
  };
  const valueFlags = new Map([
    ['--actual', 'actual'],
    ['--actual-metadata', 'actualMetadata'],
    ['--glyph-edge-delta', 'glyphEdgeMaxChannelDelta'],
    ['--manifest', 'manifest'],
    ['--max-channel-delta', 'maxChannelDelta'],
    ['--max-different-pixels', 'maxDifferentPixels'],
    ['--out-dir', 'outDir'],
    ['--reference', 'reference'],
    ['--reference-metadata', 'referenceMetadata'],
    ['--state', 'state'],
    ['--surface', 'surface'],
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    if (token === '--allow-missing-anchor-metadata') {
      parsed.allowMissingAnchorMetadata = true;
      continue;
    }
    const key = valueFlags.get(token);
    if (!key) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const value = requireValue(args, ++index, token);
    parsed[key] = [
      'glyphEdgeMaxChannelDelta',
      'maxChannelDelta',
      'maxDifferentPixels',
    ].includes(key)
      ? Number(value)
      : value;
  }

  for (const key of [
    'glyphEdgeMaxChannelDelta',
    'maxChannelDelta',
    'maxDifferentPixels',
  ]) {
    if (
      typeof parsed[key] !== 'undefined' &&
      (!Number.isFinite(parsed[key]) || parsed[key] < 0)
    ) {
      throw new Error(`--${toKebabCase(key)} must be a non-negative number.`);
    }
  }
  return parsed;
}

function readOptionalMetadata(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function inferMetadataPath(imagePath) {
  const extension = path.extname(imagePath);
  return imagePath.slice(0, -extension.length) + '.metadata.json';
}

function compareTypography(reference, actual) {
  if (!reference && !actual) {
    return [];
  }
  if (!reference || !actual) {
    return ['typography_missing'];
  }
  return [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
  ].filter((key) => reference[key] !== actual[key]);
}

function isLikelyEdge(png, x, y) {
  const center = pixelAt(png, x, y);
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      const neighborX = x + offsetX;
      const neighborY = y + offsetY;
      if (
        neighborX < 0 ||
        neighborY < 0 ||
        neighborX >= png.width ||
        neighborY >= png.height
      ) {
        continue;
      }
      const neighbor = pixelAt(png, neighborX, neighborY);
      const contrast = Math.max(
        ...center.map((channel, index) => Math.abs(channel - neighbor[index])),
      );
      if (contrast >= 12) {
        return true;
      }
    }
  }
  return false;
}

function pixelAt(png, x, y) {
  const index = (y * png.width + x) * 4;
  return [
    png.data[index],
    png.data[index + 1],
    png.data[index + 2],
    png.data[index + 3],
  ];
}

function writeDiffContext(target, targetIndex, source, sourceIndex) {
  const luminance = Math.round(
    source[sourceIndex] * 0.2126 +
    source[sourceIndex + 1] * 0.7152 +
    source[sourceIndex + 2] * 0.0722,
  );
  writePixel(target, targetIndex, luminance, luminance, luminance, 64);
}

function writePixel(data, index, red, green, blue, alpha) {
  data[index] = red;
  data[index + 1] = green;
  data[index + 2] = blue;
  data[index + 3] = alpha;
}

function pointInRect(x, y, rect) {
  return (
    x >= rect.x &&
    y >= rect.y &&
    x < rect.x + rect.width &&
    y < rect.y + rect.height
  );
}

function normalizeRect(rect) {
  return {
    x: Math.floor(rect.x),
    y: Math.floor(rect.y),
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
  };
}

function dedupeMaskRects(masks) {
  const seen = new Set();
  return masks.filter((mask) => {
    const key = [
      mask.id,
      mask.rect.x,
      mask.rect.y,
      mask.rect.width,
      mask.rect.height,
      mask.maxChannelDelta,
    ].join(':');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function requireFile(value, flag) {
  const filePath = path.resolve(value);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${flag} does not exist: ${filePath}`);
  }
  return filePath;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function printHelp() {
  console.log(`Usage:
  npm run visual:baseline:diff -- \\
    --surface <id> --state <id> \\
    --reference <reference.png> --actual <actual.png> [options]

Options:
  --reference-metadata <json>      Reference anchor/mask metadata
  --actual-metadata <json>         Actual anchor/mask metadata
  --out-dir <directory>            Output (default: tmp/visual-baseline-diff)
  --max-channel-delta <number>     Non-glyph per-channel tolerance
  --max-different-pixels <number>  Allowed non-tolerated pixels
  --glyph-edge-delta <number>      Glyph anti-alias edge tolerance
  --allow-missing-anchor-metadata  Do not fail when anchor metadata is absent
  --manifest <path>                Alternate manifest
  --help                           Show help

The command writes difference.png, overlay.png, and summary.json. It exits with
code 2 for a visual or anchor mismatch.`);
}

function isDirectRun() {
  return (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}
