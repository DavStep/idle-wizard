import { Buffer } from "node:buffer";
import console from "node:console";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { extname, relative, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { writeFileIfChanged } from "./write-file-if-changed.mjs";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const DEFAULT_OPTIONS = {
  exportsDir: "assets/quick-ui/exports",
  atlasDir: "assets/quick-ui/atlas",
  sourceAssetsDir: "assets/quick-ui/source",
  atlasImage: "atlas.png",
  atlasJson: "atlas.json",
  atlas: {
    padding: 2,
    maxWidth: 4096,
    maxHeight: 4096,
  },
};

const CRC_TABLE = makeCrcTable();

export async function buildQuickUiAssets(options = {}) {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const exportsDir = resolve(
    rootDir,
    options.exportsDir ?? DEFAULT_OPTIONS.exportsDir,
  );
  const atlasDir = resolve(
    rootDir,
    options.atlasDir ?? DEFAULT_OPTIONS.atlasDir,
  );
  const sourceAssetsDir = resolve(
    rootDir,
    options.sourceAssetsDir ?? DEFAULT_OPTIONS.sourceAssetsDir,
  );
  const manifestPath = resolve(atlasDir, "manifest.json");
  const atlasImageName = options.atlasImage ?? DEFAULT_OPTIONS.atlasImage;
  const atlasJsonName = options.atlasJson ?? DEFAULT_OPTIONS.atlasJson;
  const atlasImagePath = resolve(atlasDir, atlasImageName);
  const atlasJsonPath = resolve(atlasDir, atlasJsonName);
  const atlasOptions = {
    ...DEFAULT_OPTIONS.atlas,
    ...(options.atlas ?? {}),
  };

  mkdirSync(exportsDir, { recursive: true });
  mkdirSync(atlasDir, { recursive: true });
  mkdirSync(sourceAssetsDir, { recursive: true });

  const assets = collectSourceAssets(atlasDir, sourceAssetsDir);
  const atlasAssets = collectReferencedAtlasAssets({
    exportsDir,
    sourceAssetsDir,
  });
  const packed = packAssets(atlasAssets, atlasOptions);
  const atlas = composeAtlas(packed, atlasOptions.padding);
  const packedFrameNames = new Set(packed.assets.map((asset) => asset.frameName));
  const pages = packed.assets.length > 0
    ? [{
      assets: packed.assets.map((asset) => asset.frameName).sort(),
      height: atlas.height,
      image: atlasImageName,
      index: 0,
      json: atlasJsonName,
      width: atlas.width,
    }]
    : [];
  const manifestAssets = {};
  const seenKeys = new Set();

  assets.forEach((asset) => {
    if (seenKeys.has(asset.key)) {
      throw new Error(`Duplicate ui-editor asset key detected: ${asset.key}`);
    }

    seenKeys.add(asset.key);

    const decoded = decodePng(readFileSync(asset.fullPath), asset.relativeImagePath);
    const metadata = createAssetMetadata(decoded, asset.relativeImagePath);
    const frameName = toGeneratedUiAtlasFrameName(asset.key);

    manifestAssets[asset.key] = {
      page: packedFrameNames.has(frameName) ? 0 : null,
      source: asset.relativeImagePath,
      ...metadata,
    };
  });

  const manifest = {
    assets: manifestAssets,
    atlas: {
      maxSize: atlasOptions.maxWidth,
      padding: atlasOptions.padding,
      pages,
    },
    outputRoot: ".",
    sourceRoot: "../source",
    version: 2,
  };

  writeFileIfChanged(atlasImagePath, encodePng(atlas));
  writeFileIfChanged(
    atlasJsonPath,
    `${JSON.stringify(createSpritesheetData(packed, atlasImageName, atlas), null, 2)}\n`,
    "utf8",
  );
  writeFileIfChanged(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    assets: assets.length,
    atlasAssets: atlasAssets.length,
    atlasImagePath,
    atlasJsonPath,
    atlasHeight: atlas.height,
    atlasWidth: atlas.width,
    manifestPath,
  };
}

function collectReferencedAtlasAssets({ exportsDir, sourceAssetsDir }) {
  if (!existsSync(exportsDir)) {
    return [];
  }

  const assetsByFrame = new Map();

  for (const entry of readdirSync(exportsDir, { withFileTypes: true })) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".json") {
      continue;
    }

    const exportPath = resolve(exportsDir, entry.name);
    const exportData = JSON.parse(readFileSync(exportPath, "utf8"));

    if (!exportData || !Array.isArray(exportData.assets)) {
      continue;
    }

    for (const asset of exportData.assets) {
      if (!asset || typeof asset.src !== "string" || !asset.src.trim()) {
        throw new Error(`${entry.name} has an asset with a missing src.`);
      }

      const frameName = normalizeAtlasFrameName(asset.src);

      if (assetsByFrame.has(frameName)) {
        continue;
      }

      const fullPath = resolveExportAssetPath({
        sourceAssetsDir,
        src: asset.src,
      });

      if (!existsSync(fullPath)) {
        throw new Error(`${entry.name} references a missing qUIck asset: ${asset.src}`);
      }

      const decoded = decodePng(readFileSync(fullPath), fullPath);
      assetsByFrame.set(frameName, {
        data: decoded.data,
        filePath: fullPath,
        frameName,
        height: decoded.height,
        width: decoded.width,
      });
    }
  }

  return [...assetsByFrame.values()].sort((left, right) => (
    left.frameName.localeCompare(right.frameName)
  ));
}

function resolveExportAssetPath({ sourceAssetsDir, src }) {
  let normalized = normalizePath(src.trim()).replace(/^\/+/, "");

  if (normalized.startsWith("generated-ui/")) {
    normalized = normalized.slice("generated-ui/".length);
  }

  if (!normalized.startsWith("assets/ui/")) {
    throw new Error(`Unsupported qUIck asset path: ${src}`);
  }

  return resolve(sourceAssetsDir, normalized.slice("assets/ui/".length));
}

function normalizeAtlasFrameName(src) {
  const normalized = normalizePath(src.trim());

  if (normalized.startsWith("/generated-ui/")) {
    return normalized.slice("/generated-ui/".length);
  }

  if (normalized.startsWith("generated-ui/")) {
    return normalized.slice("generated-ui/".length);
  }

  if (normalized.startsWith("/")) {
    return normalized.slice(1);
  }

  return normalized;
}

function toGeneratedUiAtlasFrameName(assetKey) {
  return `assets/ui/${normalizePath(assetKey)}`;
}

function collectSourceAssets(atlasDir, sourceAssetsDir) {
  if (!existsSync(sourceAssetsDir)) {
    return [];
  }

  return collectPngFiles(sourceAssetsDir, (fullPath) => {
    const sourceRelativePath = normalizePath(relative(sourceAssetsDir, fullPath));

    return {
      fullPath,
      key: toGeneratedUiAssetPath(sourceRelativePath),
      relativeImagePath: normalizePath(relative(atlasDir, fullPath)),
    };
  });
}

function collectPngFiles(rootDir, mapFile) {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files = [];

  function visit(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = resolve(currentDir, entry.name);

      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }

      if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".png") {
        continue;
      }

      const mapped = mapFile(fullPath);

      if (mapped) {
        files.push(mapped);
      }
    }
  }

  visit(rootDir);
  return files.sort((left, right) => left.key.localeCompare(right.key));
}

function createAssetMetadata(decoded, relativeImagePath) {
  if (!relativeImagePath.toLowerCase().endsWith(".9.png")) {
    return {
      frame: {
        height: decoded.height,
        width: decoded.width,
        x: 0,
        y: 0,
      },
      height: decoded.height,
      width: decoded.width,
    };
  }

  if (decoded.width < 3 || decoded.height < 3) {
    throw new Error(`${relativeImagePath} is too small to be a 9-patch PNG.`);
  }

  const innerWidth = decoded.width - 2;
  const innerHeight = decoded.height - 2;
  const stretchX = findMarkerSpan(decoded, "x", 0, 1, decoded.width - 1);
  const stretchY = findMarkerSpan(decoded, "y", 0, 1, decoded.height - 1);

  if (!stretchX || !stretchY) {
    throw new Error(`${relativeImagePath} is missing 9-patch stretch markers.`);
  }

  const paddingX = findMarkerSpan(decoded, "x", decoded.height - 1, 1, decoded.width - 1);
  const paddingY = findMarkerSpan(decoded, "y", decoded.width - 1, 1, decoded.height - 1);
  const nineSlice = {
    bottom: innerHeight - (stretchY.end - 1),
    left: stretchX.start - 1,
    right: innerWidth - (stretchX.end - 1),
    top: stretchY.start - 1,
  };
  const padding = {
    bottom: paddingY ? innerHeight - (paddingY.end - 1) : 0,
    left: paddingX ? paddingX.start - 1 : 0,
    right: paddingX ? innerWidth - (paddingX.end - 1) : 0,
    top: paddingY ? paddingY.start - 1 : 0,
  };

  return {
    frame: {
      height: innerHeight,
      width: innerWidth,
      x: 1,
      y: 1,
    },
    height: innerHeight,
    ninePatch: true,
    nineSlice,
    padding,
    width: innerWidth,
  };
}

function findMarkerSpan(image, axis, fixed, start, end) {
  let first = -1;
  let last = -1;

  for (let value = start; value < end; value += 1) {
    const x = axis === "x" ? value : fixed;
    const y = axis === "x" ? fixed : value;

    if (isMarkerPixel(image, x, y)) {
      first = first === -1 ? value : first;
      last = value;
    }
  }

  return first === -1 ? null : { end: last + 1, start: first };
}

function isMarkerPixel(image, x, y) {
  const index = (y * image.width + x) * 4;

  return image.data[index + 3] >= 128
    && image.data[index] <= 16
    && image.data[index + 1] <= 16
    && image.data[index + 2] <= 16;
}

function decodePng(buffer, filePath = "PNG") {
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${filePath} is not a PNG file.`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let compression = 0;
  let filter = 0;
  let interlace = 0;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      compression = data[10];
      filter = data[11];
      interlace = data[12];
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      transparency = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (compression !== 0 || filter !== 0 || interlace !== 0) {
    throw new Error(`${filePath} uses unsupported PNG compression/filter/interlace settings.`);
  }

  if (bitDepth === 16) {
    throw new Error(`${filePath} uses 16-bit channels, which are not supported.`);
  }

  const channels = getPngChannelCount(colorType);
  const bitsPerPixel = channels * bitDepth;
  const bytesPerLine = Math.ceil((width * bitsPerPixel) / 8);
  const bytesPerPixel = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const inflated = inflateSync(Buffer.concat(idat));
  const scanlines = unfilterScanlines(inflated, height, bytesPerLine, bytesPerPixel);

  return {
    data: convertScanlinesToRgba({
      bitDepth,
      colorType,
      filePath,
      height,
      palette,
      scanlines,
      transparency,
      width,
    }),
    height,
    width,
  };
}

function getPngChannelCount(colorType) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 3) return 1;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;

  throw new Error(`Unsupported PNG color type: ${colorType}`);
}

function unfilterScanlines(input, height, bytesPerLine, bytesPerPixel) {
  const output = Buffer.alloc(bytesPerLine * height);
  let inputOffset = 0;
  let outputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = input[inputOffset];
    inputOffset += 1;

    for (let x = 0; x < bytesPerLine; x += 1) {
      const raw = input[inputOffset + x];
      const left = x >= bytesPerPixel ? output[outputOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? output[outputOffset + x - bytesPerLine] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel
        ? output[outputOffset + x - bytesPerLine - bytesPerPixel]
        : 0;

      if (filterType === 0) {
        output[outputOffset + x] = raw;
      } else if (filterType === 1) {
        output[outputOffset + x] = (raw + left) & 0xff;
      } else if (filterType === 2) {
        output[outputOffset + x] = (raw + up) & 0xff;
      } else if (filterType === 3) {
        output[outputOffset + x] = (raw + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        output[outputOffset + x] = (raw + paeth(left, up, upLeft)) & 0xff;
      } else {
        throw new Error(`Unsupported PNG row filter: ${filterType}`);
      }
    }

    inputOffset += bytesPerLine;
    outputOffset += bytesPerLine;
  }

  return output;
}

function convertScanlinesToRgba({
  scanlines,
  width,
  height,
  bitDepth,
  colorType,
  palette,
  transparency,
  filePath,
}) {
  const output = Buffer.alloc(width * height * 4);
  const bitsPerPixel = getPngChannelCount(colorType) * bitDepth;
  const bytesPerLine = Math.ceil((width * bitsPerPixel) / 8);

  for (let y = 0; y < height; y += 1) {
    const row = scanlines.subarray(y * bytesPerLine, (y + 1) * bytesPerLine);

    for (let x = 0; x < width; x += 1) {
      const target = (y * width + x) * 4;

      if (colorType === 6 && bitDepth === 8) {
        const source = x * 4;
        output[target] = row[source];
        output[target + 1] = row[source + 1];
        output[target + 2] = row[source + 2];
        output[target + 3] = row[source + 3];
      } else if (colorType === 2 && bitDepth === 8) {
        const source = x * 3;
        output[target] = row[source];
        output[target + 1] = row[source + 1];
        output[target + 2] = row[source + 2];
        output[target + 3] = 255;
      } else if (colorType === 4 && bitDepth === 8) {
        const source = x * 2;
        output[target] = row[source];
        output[target + 1] = row[source];
        output[target + 2] = row[source];
        output[target + 3] = row[source + 1];
      } else if (colorType === 0) {
        const gray = readPackedSample(row, x, bitDepth);
        const value = scaleSampleToByte(gray, bitDepth);
        output[target] = value;
        output[target + 1] = value;
        output[target + 2] = value;
        output[target + 3] = 255;
      } else if (colorType === 3) {
        if (!palette) {
          throw new Error(`${filePath} is an indexed PNG without a palette.`);
        }

        const index = readPackedSample(row, x, bitDepth);
        const paletteIndex = index * 3;
        output[target] = palette[paletteIndex] ?? 0;
        output[target + 1] = palette[paletteIndex + 1] ?? 0;
        output[target + 2] = palette[paletteIndex + 2] ?? 0;
        output[target + 3] = transparency?.[index] ?? 255;
      } else {
        throw new Error(`${filePath} has unsupported PNG color type ${colorType} with bit depth ${bitDepth}.`);
      }
    }
  }

  return output;
}

function readPackedSample(row, x, bitDepth) {
  if (bitDepth === 8) {
    return row[x];
  }

  if (![1, 2, 4].includes(bitDepth)) {
    throw new Error(`Unsupported packed bit depth: ${bitDepth}`);
  }

  const samplesPerByte = 8 / bitDepth;
  const byte = row[Math.floor(x / samplesPerByte)];
  const shift = (samplesPerByte - 1 - (x % samplesPerByte)) * bitDepth;
  const mask = (1 << bitDepth) - 1;
  return (byte >> shift) & mask;
}

function scaleSampleToByte(value, bitDepth) {
  if (bitDepth === 8) {
    return value;
  }

  return Math.round((value / ((1 << bitDepth) - 1)) * 255);
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);

  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function packAssets(assets, atlasConfig) {
  if (assets.length === 0) {
    return { width: 1, height: 1, assets: [] };
  }

  const padding = atlasConfig.padding;
  const maxWidth = atlasConfig.maxWidth;
  const maxHeight = atlasConfig.maxHeight;
  const sorted = [...assets].sort((a, b) => {
    const areaDelta = b.width * b.height - a.width * a.height;
    return areaDelta || b.height - a.height || b.width - a.width;
  });
  const minimumWidth = nextPowerOfTwo(
    Math.max(...sorted.map((asset) => asset.width + padding * 2)),
  );
  const startWidth = Math.min(maxWidth, Math.max(64, minimumWidth));
  let bestCandidate = null;

  for (
    let width = startWidth;
    width <= maxWidth;
    width *= 2
  ) {
    const placements = packMaxRects(
      sorted.map((asset) => ({ ...asset })),
      width,
      maxHeight,
      padding,
    );

    if (!placements) {
      continue;
    }

    const height = nextPowerOfTwo(placements.height);
    const candidate = {
      width,
      height,
      assets: placements.assets,
    };

    if (
      !bestCandidate
      || candidate.height < bestCandidate.height
      || (
        candidate.height === bestCandidate.height
        && candidate.width * candidate.height < bestCandidate.width * bestCandidate.height
      )
    ) {
      bestCandidate = candidate;
    }

    if (height <= maxHeight) {
      return candidate;
    }
  }

  if (!bestCandidate || bestCandidate.height > maxHeight) {
    throw new Error(
      `Generated UI atlas height ${bestCandidate?.height ?? 0}px exceeds ${maxHeight}px. Remove unused qUIck export assets or add explicit multi-page runtime support.`,
    );
  }

  return bestCandidate;
}

function packMaxRects(assets, atlasWidth, atlasHeight, padding) {
  const freeRects = [{
    x: 0,
    y: 0,
    width: atlasWidth,
    height: atlasHeight,
  }];
  let usedHeight = 0;

  for (const asset of assets) {
    const packedWidth = asset.width + padding * 2;
    const packedHeight = asset.height + padding * 2;

    if (packedWidth > atlasWidth || packedHeight > atlasHeight) {
      throw new Error(`${asset.filePath} is larger than the generated UI atlas page.`);
    }

    const placement = findBestFreeRect(freeRects, packedWidth, packedHeight);

    if (!placement) {
      return null;
    }

    asset.x = placement.x + padding;
    asset.y = placement.y + padding;
    usedHeight = Math.max(usedHeight, placement.y + packedHeight);

    splitFreeRects(freeRects, placement);
    pruneFreeRects(freeRects);
  }

  return {
    height: usedHeight,
    assets,
  };
}

function findBestFreeRect(freeRects, width, height) {
  let best = null;

  for (const rect of freeRects) {
    if (width > rect.width || height > rect.height) {
      continue;
    }

    const leftoverX = rect.width - width;
    const leftoverY = rect.height - height;
    const shortSideFit = Math.min(leftoverX, leftoverY);
    const longSideFit = Math.max(leftoverX, leftoverY);
    const areaFit = rect.width * rect.height - width * height;

    if (
      !best
      || shortSideFit < best.shortSideFit
      || (
        shortSideFit === best.shortSideFit
        && longSideFit < best.longSideFit
      )
      || (
        shortSideFit === best.shortSideFit
        && longSideFit === best.longSideFit
        && areaFit < best.areaFit
      )
    ) {
      best = {
        x: rect.x,
        y: rect.y,
        width,
        height,
        shortSideFit,
        longSideFit,
        areaFit,
      };
    }
  }

  return best
    ? { x: best.x, y: best.y, width: best.width, height: best.height }
    : null;
}

function splitFreeRects(freeRects, usedRect) {
  for (let index = 0; index < freeRects.length; index += 1) {
    const freeRect = freeRects[index];

    if (!rectsIntersect(freeRect, usedRect)) {
      continue;
    }

    freeRects.splice(index, 1);
    index -= 1;

    if (usedRect.x > freeRect.x) {
      freeRects.push({
        x: freeRect.x,
        y: freeRect.y,
        width: usedRect.x - freeRect.x,
        height: freeRect.height,
      });
    }

    const usedRight = usedRect.x + usedRect.width;
    const freeRight = freeRect.x + freeRect.width;
    if (usedRight < freeRight) {
      freeRects.push({
        x: usedRight,
        y: freeRect.y,
        width: freeRight - usedRight,
        height: freeRect.height,
      });
    }

    if (usedRect.y > freeRect.y) {
      freeRects.push({
        x: freeRect.x,
        y: freeRect.y,
        width: freeRect.width,
        height: usedRect.y - freeRect.y,
      });
    }

    const usedBottom = usedRect.y + usedRect.height;
    const freeBottom = freeRect.y + freeRect.height;
    if (usedBottom < freeBottom) {
      freeRects.push({
        x: freeRect.x,
        y: usedBottom,
        width: freeRect.width,
        height: freeBottom - usedBottom,
      });
    }
  }
}

function pruneFreeRects(freeRects) {
  for (let i = 0; i < freeRects.length; i += 1) {
    for (let j = i + 1; j < freeRects.length; j += 1) {
      if (isContainedIn(freeRects[i], freeRects[j])) {
        freeRects.splice(i, 1);
        i -= 1;
        break;
      }

      if (isContainedIn(freeRects[j], freeRects[i])) {
        freeRects.splice(j, 1);
        j -= 1;
      }
    }
  }
}

function rectsIntersect(left, right) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function isContainedIn(inner, outer) {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height;
}

function composeAtlas(packed, padding) {
  const data = Buffer.alloc(packed.width * packed.height * 4);

  for (const asset of packed.assets) {
    copyImage(asset, data, packed.width, asset.x, asset.y);
    extrudeImage(asset, data, packed.width, packed.height, padding);
  }

  return {
    width: packed.width,
    height: packed.height,
    data,
  };
}

function copyImage(asset, atlasData, atlasWidth, targetX, targetY) {
  for (let y = 0; y < asset.height; y += 1) {
    const srcStart = y * asset.width * 4;
    const destStart = ((targetY + y) * atlasWidth + targetX) * 4;
    asset.data.copy(atlasData, destStart, srcStart, srcStart + asset.width * 4);
  }
}

function extrudeImage(asset, atlasData, atlasWidth, atlasHeight, padding) {
  if (padding <= 0 || asset.width === 0 || asset.height === 0) {
    return;
  }

  const left = asset.x;
  const right = asset.x + asset.width - 1;
  const top = asset.y;
  const bottom = asset.y + asset.height - 1;

  for (let y = top; y <= bottom; y += 1) {
    for (let offset = 1; offset <= padding; offset += 1) {
      if (left - offset >= 0) copyAtlasPixel(atlasData, atlasWidth, left, y, left - offset, y);
      if (right + offset < atlasWidth) copyAtlasPixel(atlasData, atlasWidth, right, y, right + offset, y);
    }
  }

  for (let x = left - padding; x <= right + padding; x += 1) {
    if (x < 0 || x >= atlasWidth) {
      continue;
    }

    for (let offset = 1; offset <= padding; offset += 1) {
      if (top - offset >= 0) copyAtlasPixel(atlasData, atlasWidth, x, top, x, top - offset);
      if (bottom + offset < atlasHeight) copyAtlasPixel(atlasData, atlasWidth, x, bottom, x, bottom + offset);
    }
  }
}

function copyAtlasPixel(data, width, srcX, srcY, destX, destY) {
  const src = (srcY * width + srcX) * 4;
  const dest = (destY * width + destX) * 4;
  data[dest] = data[src];
  data[dest + 1] = data[src + 1];
  data[dest + 2] = data[src + 2];
  data[dest + 3] = data[src + 3];
}

function createSpritesheetData(packed, atlasImageName, atlas) {
  const frames = {};

  for (const asset of packed.assets) {
    frames[asset.frameName] = {
      frame: { x: asset.x, y: asset.y, w: asset.width, h: asset.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: asset.width, h: asset.height },
      sourceSize: { w: asset.width, h: asset.height },
    };
  }

  return {
    frames,
    animations: {},
    meta: {
      app: "idle-wizard build-quick-ui-assets",
      image: atlasImageName,
      format: "RGBA8888",
      size: { w: atlas.width, h: atlas.height },
      scale: "1",
    },
  };
}

function encodePng(image) {
  const rowBytes = image.width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * image.height);

  for (let y = 0; y < image.height; y += 1) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0;
    image.data.copy(raw, rowStart + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", makeIhdr(image.width, image.height)),
    makeChunk("IDAT", deflateSync(raw, { level: 9 })),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIhdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makeCrcTable() {
  const table = new Uint32Array(256);

  for (let n = 0; n < table.length; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function nextPowerOfTwo(value) {
  return 2 ** Math.ceil(Math.log2(Math.max(1, value)));
}

function toGeneratedUiAssetPath(relativePath) {
  return normalizePath(relativePath).replace(/\.9\.png$/i, ".png");
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";

if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  buildQuickUiAssets()
    .then((result) => {
      const displayPath = relative(process.cwd(), result.manifestPath);
      console.log(
        `Built ${displayPath} (${result.assets} manifest assets, `
        + `${result.atlasAssets} atlas frames, ${result.atlasWidth}x${result.atlasHeight}).`,
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
