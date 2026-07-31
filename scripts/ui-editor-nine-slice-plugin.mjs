import { Buffer } from 'node:buffer';
import {
  access,
  constants,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import {
  resolveNineSliceMinimumSize,
} from '../src/rendering/pixi/nineSlice/NineSliceCompatibility.js';

export const UI_EDITOR_NINE_SLICE_ROUTE =
  '/__idle-wizard-ui-editor/nine-slice';
export const UI_EDITOR_ASSET_ROUTE =
  '/__idle-wizard-ui-editor/asset';

const SOURCE_ASSET_ID_PREFIX = 'source:assets/';
const MAX_REQUEST_BYTES = 32 * 1024;
const ASSET_REFERENCE_ROOTS = Object.freeze([
  'docs',
  'scripts',
  'src',
]);
const ASSET_REFERENCE_ROOT_FILES = Object.freeze([
  'DESIGN.md',
  'README.md',
  'index.html',
  'package.json',
  'ui-editor.html',
  'vite.config.js',
]);
const ASSET_REFERENCE_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
]);
const ASSET_REFERENCE_EXCLUDED_SEGMENTS = new Set([
  '.git',
  'dist',
  'module_bindings',
  'node_modules',
  'screenshots',
  'tmp',
]);
const PNG_SIGNATURE = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
]);

export function createUiEditorNineSlicePlugin({
  rootDir = fileURLToPath(new URL('../', import.meta.url)),
} = {}) {
  return {
    name: 'idle-wizard-ui-editor-nine-slice',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const route = request.url?.split('?')[0];

        if (
          route !== UI_EDITOR_NINE_SLICE_ROUTE
          && route !== UI_EDITOR_ASSET_ROUTE
        ) {
          next();
          return;
        }

        if (
          route === UI_EDITOR_NINE_SLICE_ROUTE
          && request.method !== 'POST'
        ) {
          sendJson(response, 405, {
            error: 'Use POST to save nine-slice metadata.',
          });
          return;
        }
        if (
          route === UI_EDITOR_ASSET_ROUTE
          && !['POST', 'DELETE'].includes(request.method)
        ) {
          sendJson(response, 405, {
            error: 'Use POST to inspect or DELETE to remove a source asset.',
          });
          return;
        }

        try {
          const requestBody = await readJsonRequest(request);
          let result;

          if (route === UI_EDITOR_NINE_SLICE_ROUTE) {
            result = await saveUiEditorNineSlice(requestBody, { rootDir });
          } else if (request.method === 'POST') {
            result = await inspectUiEditorAsset(requestBody, { rootDir });
          } else if (request.method === 'DELETE') {
            result = await deleteUiEditorAsset(requestBody, { rootDir });
          }
          sendJson(response, 200, result);
        } catch (error) {
          const status = Number(error?.status) || 400;
          sendJson(response, status, {
            error: error instanceof Error
              ? error.message
              : 'Could not save nine-slice metadata.',
          });
        }
      });
    },
  };
}

export async function inspectUiEditorAsset(
  { assetId } = {},
  { rootDir = fileURLToPath(new URL('../', import.meta.url)) } = {},
) {
  const sourceRoot = path.resolve(rootDir, 'assets/game/source');
  const relativeAssetPath = resolveRelativeAssetPath(assetId);
  const assetPath = path.resolve(sourceRoot, relativeAssetPath);

  assertInsideSourceRoot(assetPath, sourceRoot);
  await assertReadableFile(assetPath, 'The selected source asset no longer exists.');

  const references = await findAssetReferences({
    assetId,
    relativeAssetPath,
    rootDir,
  });

  return {
    assetId,
    assetPath: toRootRelativePath(assetPath, rootDir),
    references,
    sidecarPath: await resolveExistingSidecarPath(assetPath, rootDir),
  };
}

export async function deleteUiEditorAsset(
  { assetId, replacementAssetId = null } = {},
  { rootDir = fileURLToPath(new URL('../', import.meta.url)) } = {},
) {
  const inspection = await inspectUiEditorAsset({ assetId }, { rootDir });
  const sourceRoot = path.resolve(rootDir, 'assets/game/source');
  const relativeAssetPath = resolveRelativeAssetPath(assetId);
  const assetPath = path.resolve(sourceRoot, relativeAssetPath);
  let replacementRelativePath = null;
  let replacementAssetPath = null;

  if (replacementAssetId != null && replacementAssetId !== '') {
    if (replacementAssetId === assetId) {
      throw createHttpError(400, 'Choose a different replacement asset.');
    }
    replacementRelativePath = resolveRelativeAssetPath(replacementAssetId);
    replacementAssetPath = path.resolve(sourceRoot, replacementRelativePath);
    assertInsideSourceRoot(replacementAssetPath, sourceRoot);
    await assertReadableFile(
      replacementAssetPath,
      'The replacement source asset no longer exists.',
    );
    if (
      path.extname(replacementAssetPath).toLowerCase()
      !== path.extname(assetPath).toLowerCase()
    ) {
      throw createHttpError(
        400,
        'The replacement must use the same file type as the deleted asset.',
      );
    }
    const sourceIsNineSlice = await isNineSliceAssetPath(assetPath);
    const replacementIsNineSlice = await isNineSliceAssetPath(
      replacementAssetPath,
    );
    if (sourceIsNineSlice !== replacementIsNineSlice) {
      throw createHttpError(
        400,
        'The replacement must use the same image or nine-slice asset type.',
      );
    }
  }

  if (inspection.references.length > 0 && !replacementRelativePath) {
    throw createHttpError(
      409,
      'Choose a replacement before deleting an asset that is still referenced.',
    );
  }

  const changedFiles = replacementRelativePath
    ? await replaceAssetReferences({
        assetId,
        relativeAssetPath,
        replacementAssetId,
        replacementRelativePath,
        references: inspection.references,
        rootDir,
      })
    : [];
  const deletedPaths = [];

  await unlink(assetPath);
  deletedPaths.push(toRootRelativePath(assetPath, rootDir));

  const sidecarPath = resolveNineSliceSidecarPath(assetPath);
  try {
    await unlink(sidecarPath);
    deletedPaths.push(toRootRelativePath(sidecarPath, rootDir));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  return {
    assetId,
    changedFiles,
    deletedPaths,
    referencesUpdated: inspection.references.reduce(
      (count, reference) => count + reference.occurrences,
      0,
    ),
    replacementAssetId: replacementAssetId || null,
  };
}

export async function saveUiEditorNineSlice(
  { assetId, outputInsets, slice } = {},
  { rootDir = fileURLToPath(new URL('../', import.meta.url)) } = {},
) {
  const sourceRoot = path.resolve(rootDir, 'assets/game/source');
  const relativeAssetPath = resolveRelativeAssetPath(assetId);
  const assetPath = path.resolve(sourceRoot, relativeAssetPath);

  assertInsideSourceRoot(assetPath, sourceRoot);

  if (path.extname(assetPath).toLowerCase() !== '.png') {
    throw createHttpError(
      400,
      'Nine-slice conversion supports PNG source assets only.',
    );
  }

  const png = await readFile(assetPath);
  const { height, width } = readPngSize(png);
  const normalizedSlice = normalizeSlice(slice, { height, width });
  const normalizedOutputInsets = normalizeOutputInsets(
    outputInsets ?? normalizedSlice,
  );
  const nineSliceAssetPath = resolveNineSliceAssetPath(assetPath);
  const nineSliceRelativeAssetPath = path
    .relative(sourceRoot, nineSliceAssetPath)
    .split(path.sep)
    .join('/');
  const nineSliceAssetId =
    `${SOURCE_ASSET_ID_PREFIX}${nineSliceRelativeAssetPath}`;
  let changedFiles = [];

  if (nineSliceAssetPath !== assetPath) {
    if (await pathExists(nineSliceAssetPath)) {
      throw createHttpError(
        409,
        `Nine-slice asset already exists: ${nineSliceRelativeAssetPath}`,
      );
    }
    const references = await findAssetReferences({
      assetId,
      relativeAssetPath,
      rootDir,
    });
    await rename(assetPath, nineSliceAssetPath);
    changedFiles = await replaceAssetReferences({
      assetId,
      relativeAssetPath,
      replacementAssetId: nineSliceAssetId,
      replacementRelativePath: nineSliceRelativeAssetPath,
      references,
      rootDir,
    });
  }
  const relativeSourcePath = path
    .relative(rootDir, nineSliceAssetPath)
    .split(path.sep)
    .join('/');
  const metadata = createNineSliceMetadata({
    assetName: path.basename(nineSliceAssetPath),
    height,
    relativeSourcePath,
    outputInsets: normalizedOutputInsets,
    slice: normalizedSlice,
    width,
  });
  const metadataPath = resolveNineSliceSidecarPath(nineSliceAssetPath);

  await writeFile(
    metadataPath,
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  );

  const previousMetadataPath = resolveNineSliceSidecarPath(assetPath);
  if (previousMetadataPath !== metadataPath) {
    try {
      await unlink(previousMetadataPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return {
    assetId: nineSliceAssetId,
    changedFiles,
    metadata,
    metadataPath: path.relative(rootDir, metadataPath).split(path.sep).join('/'),
    renamedFromAssetId:
      nineSliceAssetId === assetId ? null : assetId,
  };
}

export function createNineSliceMetadata({
  assetName,
  height,
  outputInsets,
  relativeSourcePath,
  slice,
  width,
}) {
  return {
    version: 1,
    format: 'png',
    asset: assetName,
    source: {
      path: relativeSourcePath,
      width,
      height,
      mode: 'RGBA',
      crop: {
        x: 0,
        y: 0,
        width,
        height,
      },
    },
    sourceCropSize: {
      width,
      height,
    },
    slice,
    mode: 'source',
    distill: null,
    rendering: {
      stretch: 'edges-and-center',
      outputInsets,
      minimumCenter: {
        width: 1,
        height: 1,
      },
      minimumSize: resolveNineSliceMinimumSize({
        outputInsets,
      }),
      qaResample: 'nearest',
      browserPreviewSmoothingDefault: false,
    },
    editor: {
      tool: 'Idle Wizard UI Editor',
      sourceAssetPreserved: true,
    },
  };
}

function resolveRelativeAssetPath(assetId) {
  if (
    typeof assetId !== 'string'
    || !assetId.startsWith(SOURCE_ASSET_ID_PREFIX)
  ) {
    throw createHttpError(
      400,
      'Only source assets from assets/game/source can be converted.',
    );
  }

  const relativeAssetPath = assetId.slice(SOURCE_ASSET_ID_PREFIX.length);

  if (!relativeAssetPath || relativeAssetPath.includes('\0')) {
    throw createHttpError(400, 'The source asset path is invalid.');
  }

  return relativeAssetPath;
}

async function findAssetReferences({
  assetId,
  relativeAssetPath,
  rootDir,
}) {
  const referenceFiles = await listAssetReferenceFiles(rootDir);
  const needles = createAssetReferenceNeedles(assetId, relativeAssetPath);
  const references = [];

  for (const filePath of referenceFiles) {
    const content = await readFile(filePath, 'utf8');
    const matches = findNeedleMatches(content, needles);

    if (matches.length === 0) {
      continue;
    }

    references.push(
      ...createReferenceRows({
        content,
        filePath,
        matches,
        rootDir,
      }),
    );
  }

  return references.sort((left, right) =>
    left.path.localeCompare(right.path)
    || left.line - right.line
    || left.column - right.column,
  );
}

async function listAssetReferenceFiles(rootDir) {
  const files = [];

  for (const relativeRoot of ASSET_REFERENCE_ROOTS) {
    const absoluteRoot = path.resolve(rootDir, relativeRoot);
    if (await pathExists(absoluteRoot)) {
      await walkReferenceDirectory(absoluteRoot, files);
    }
  }

  for (const relativePath of ASSET_REFERENCE_ROOT_FILES) {
    const absolutePath = path.resolve(rootDir, relativePath);
    if (await pathExists(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return [...new Set(files)].sort();
}

async function walkReferenceDirectory(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (
      entry.name.startsWith('.')
      || ASSET_REFERENCE_EXCLUDED_SEGMENTS.has(entry.name)
    ) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await walkReferenceDirectory(entryPath, files);
    } else if (
      entry.isFile()
      && ASSET_REFERENCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(entryPath);
    }
  }
}

function createAssetReferenceNeedles(assetId, relativeAssetPath) {
  return [
    {
      kind: 'disk',
      value: `assets/game/source/${relativeAssetPath}`,
    },
    {
      kind: 'asset-id',
      value: assetId,
    },
    {
      kind: 'root-relative',
      value: `/${relativeAssetPath}`,
    },
  ].sort((left, right) => right.value.length - left.value.length);
}

function findNeedleMatches(content, needles) {
  const matches = [];
  const claimedRanges = [];

  for (const needle of needles) {
    let searchFrom = 0;

    while (searchFrom < content.length) {
      const index = content.indexOf(needle.value, searchFrom);

      if (index < 0) {
        break;
      }
      const end = index + needle.value.length;
      const overlaps = claimedRanges.some(
        ([claimedStart, claimedEnd]) =>
          index < claimedEnd && end > claimedStart,
      );

      if (!overlaps) {
        matches.push({ ...needle, index });
        claimedRanges.push([index, end]);
      }
      searchFrom = Math.max(end, index + 1);
    }
  }

  return matches.sort((left, right) => left.index - right.index);
}

function createReferenceRows({
  content,
  filePath,
  matches,
  rootDir,
}) {
  const rowsByLine = new Map();
  const lineStarts = [0];

  for (
    let index = content.indexOf('\n');
    index >= 0;
    index = content.indexOf('\n', index + 1)
  ) {
    lineStarts.push(index + 1);
  }

  for (const match of matches) {
    const lineIndex = findLineIndex(lineStarts, match.index);
    const lineStart = lineStarts[lineIndex];
    const lineEnd = content.indexOf('\n', lineStart);
    const line = lineIndex + 1;
    const existing = rowsByLine.get(line);
    const excerpt = content
      .slice(lineStart, lineEnd < 0 ? content.length : lineEnd)
      .trim()
      .slice(0, 240);

    if (existing) {
      existing.occurrences += 1;
      continue;
    }

    rowsByLine.set(line, {
      column: match.index - lineStart + 1,
      excerpt,
      line,
      occurrences: 1,
      path: toRootRelativePath(filePath, rootDir),
    });
  }

  return [...rowsByLine.values()];
}

function findLineIndex(lineStarts, index) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle] <= index) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return Math.max(0, high);
}

async function replaceAssetReferences({
  assetId,
  relativeAssetPath,
  replacementAssetId,
  replacementRelativePath,
  references,
  rootDir,
}) {
  const paths = [...new Set(references.map((reference) => reference.path))];
  const replacements = [
    [
      `assets/game/source/${relativeAssetPath}`,
      `assets/game/source/${replacementRelativePath}`,
    ],
    [assetId, replacementAssetId],
    [`/${relativeAssetPath}`, `/${replacementRelativePath}`],
  ].sort((left, right) => right[0].length - left[0].length);

  for (const relativePath of paths) {
    const filePath = path.resolve(rootDir, relativePath);
    assertInsideRoot(filePath, rootDir);
    const original = await readFile(filePath, 'utf8');
    const updated = replacements.reduce(
      (content, [from, to]) => content.split(from).join(to),
      original,
    );

    if (updated !== original) {
      await writeFile(filePath, updated, 'utf8');
    }
  }

  return paths;
}

function assertInsideSourceRoot(assetPath, sourceRoot) {
  if (
    assetPath !== sourceRoot
    && !assetPath.startsWith(`${sourceRoot}${path.sep}`)
  ) {
    throw createHttpError(400, 'The source asset path is outside the asset root.');
  }
}

function assertInsideRoot(filePath, rootDir) {
  const resolvedRoot = path.resolve(rootDir);

  if (
    filePath !== resolvedRoot
    && !filePath.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw createHttpError(400, 'The reference path is outside the project root.');
  }
}

async function assertReadableFile(filePath, message) {
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw createHttpError(404, message);
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveNineSliceSidecarPath(assetPath) {
  return assetPath.replace(/\.png$/i, '.9slice.json');
}

function resolveNineSliceAssetPath(assetPath) {
  return /\.9\.png$/i.test(assetPath)
    ? assetPath
    : assetPath.replace(/\.png$/i, '.9.png');
}

async function isNineSliceAssetPath(assetPath) {
  return (
    /\.9\.png$/i.test(assetPath)
    || await pathExists(resolveNineSliceSidecarPath(assetPath))
  );
}

async function resolveExistingSidecarPath(assetPath, rootDir) {
  const sidecarPath = resolveNineSliceSidecarPath(assetPath);

  return (await pathExists(sidecarPath))
    ? toRootRelativePath(sidecarPath, rootDir)
    : null;
}

function toRootRelativePath(filePath, rootDir) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function readPngSize(png) {
  if (
    png.length < 24
    || !png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw createHttpError(400, 'The selected source is not a valid PNG.');
  }

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

function normalizeSlice(slice, { height, width }) {
  const normalized = {};

  for (const edge of ['left', 'top', 'right', 'bottom']) {
    const value = Number(slice?.[edge]);

    if (!Number.isInteger(value) || value < 0) {
      throw createHttpError(
        400,
        `Slice ${edge} must be a non-negative whole pixel value.`,
      );
    }
    normalized[edge] = value;
  }

  if (normalized.left + normalized.right >= width) {
    throw createHttpError(
      400,
      'Left and right slices must leave at least one stretchable source pixel.',
    );
  }

  if (normalized.top + normalized.bottom >= height) {
    throw createHttpError(
      400,
      'Top and bottom slices must leave at least one stretchable source pixel.',
    );
  }

  return normalized;
}

function normalizeOutputInsets(outputInsets) {
  const normalized = {};

  for (const edge of ['left', 'top', 'right', 'bottom']) {
    const value = Number(outputInsets?.[edge]);

    if (!Number.isFinite(value) || value < 0) {
      throw createHttpError(
        400,
        `Output inset ${edge} must be a non-negative pixel value.`,
      );
    }
    normalized[edge] = value;
  }

  return normalized;
}

async function readJsonRequest(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > MAX_REQUEST_BYTES) {
      throw createHttpError(413, 'Nine-slice request is too large.');
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw createHttpError(400, 'Nine-slice request must contain valid JSON.');
  }
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(`${JSON.stringify(body)}\n`);
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
