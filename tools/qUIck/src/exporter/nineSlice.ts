import type { NineSliceInsets } from "../schema.js";

export const NINE_SLICE_PLUGIN_KEY = "nineSlice";
export const AUTO_NINE_SLICE_ALGORITHM_VERSION = "first-safe-zone-v5";

export type NineSliceSource = "manual" | "auto" | "default";
export type NineSliceAutoMode = "nineSlice" | "horizontalThreeSlice" | "verticalThreeSliceCandidate" | "fallback";

export interface NineSliceMetadata {
  source: NineSliceSource;
  approved: boolean;
  confidence?: number;
  insets: NineSliceInsets;
  assetHash?: string;
  algorithmVersion?: string;
  mode?: NineSliceAutoMode;
  warnings?: string[];
  debug?: Record<string, unknown>;
  generatedAt?: number;
}

type RawNineSliceMetadata = Partial<NineSliceMetadata> &
  Partial<NineSliceInsets> & {
    insets?: Partial<NineSliceInsets>;
  };

const NINE_SLICE_AUTO_MODES = new Set<NineSliceAutoMode>([
  "nineSlice",
  "horizontalThreeSlice",
  "verticalThreeSliceCandidate",
  "fallback"
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readInsetValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined;
}

export function parseNineSliceInsets(value: unknown): NineSliceInsets | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<NineSliceInsets>;
  const left = readInsetValue(candidate.left);
  const top = readInsetValue(candidate.top);
  const right = readInsetValue(candidate.right);
  const bottom = readInsetValue(candidate.bottom);

  if (
    typeof left !== "number" ||
    typeof top !== "number" ||
    typeof right !== "number" ||
    typeof bottom !== "number"
  ) {
    return undefined;
  }

  return { left, top, right, bottom };
}

export function createSafeDefaultNineSlice(width: number, height: number): NineSliceInsets {
  const widthBase = clamp(Math.round(width * 0.08), 24, 96);
  const heightBase = clamp(Math.round(height * 0.08), 24, 96);
  const sideMax = width < 200 ? width * 0.25 : 96;
  const verticalMax = height < 100 ? height * 0.25 : 96;

  let left = Math.floor(clamp(widthBase, 0, sideMax));
  let right = Math.floor(clamp(widthBase, 0, sideMax));
  let top = Math.floor(clamp(heightBase, 0, verticalMax));
  let bottom = Math.floor(clamp(heightBase, 0, verticalMax));

  const maxHorizontal = Math.max(0, Math.floor(width - 1));
  const maxVertical = Math.max(0, Math.floor(height - 1));

  if (left + right > maxHorizontal) {
    const half = Math.floor(maxHorizontal / 2);
    left = half;
    right = maxHorizontal - half;
  }

  if (top + bottom > maxVertical) {
    const half = Math.floor(maxVertical / 2);
    top = half;
    bottom = maxVertical - half;
  }

  return { left, top, right, bottom };
}

export function validateNineSliceInsets(
  insets: NineSliceInsets,
  width?: number,
  height?: number
): string | null {
  const values = [insets.left, insets.top, insets.right, insets.bottom];

  if (!values.every((value) => Number.isFinite(value))) {
    return "Slice values must be valid numbers.";
  }

  if (values.some((value) => value < 0)) {
    return "Slice values must be >= 0.";
  }

  if (typeof width === "number" && insets.left + insets.right >= width) {
    return "left + right must be less than node width.";
  }

  if (typeof height === "number" && insets.top + insets.bottom >= height) {
    return "top + bottom must be less than node height.";
  }

  return null;
}

export function sanitizeNineSliceInsets(insets: NineSliceInsets, width: number, height: number): NineSliceInsets {
  let left = Math.max(0, Math.round(insets.left));
  let top = Math.max(0, Math.round(insets.top));
  let right = Math.max(0, Math.round(insets.right));
  let bottom = Math.max(0, Math.round(insets.bottom));

  const maxHorizontal = Math.max(0, Math.floor(width - 1));
  const maxVertical = Math.max(0, Math.floor(height - 1));

  if (left + right > maxHorizontal) {
    const scale = maxHorizontal / Math.max(1, left + right);
    left = Math.floor(left * scale);
    right = Math.floor(right * scale);
    if (left + right > maxHorizontal) {
      right = Math.max(0, maxHorizontal - left);
    }
  }

  if (top + bottom > maxVertical) {
    const scale = maxVertical / Math.max(1, top + bottom);
    top = Math.floor(top * scale);
    bottom = Math.floor(bottom * scale);
    if (top + bottom > maxVertical) {
      bottom = Math.max(0, maxVertical - top);
    }
  }

  return { left, top, right, bottom };
}

export function parseNineSliceMetadata(raw: unknown, width?: number, height?: number): NineSliceMetadata | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const candidate = raw as RawNineSliceMetadata;
  const source =
    candidate.source === "manual" || candidate.source === "auto" || candidate.source === "default"
      ? candidate.source
      : undefined;
  const insets = parseNineSliceInsets(candidate.insets) ?? parseNineSliceInsets(candidate);

  if (!insets) {
    return undefined;
  }

  const sanitized =
    typeof width === "number" && typeof height === "number"
      ? sanitizeNineSliceInsets(insets, width, height)
      : insets;

  if (validateNineSliceInsets(sanitized, width, height)) {
    return undefined;
  }

  if (!source) {
    return {
      source: "manual",
      approved: true,
      insets: sanitized
    };
  }

  const mode = typeof candidate.mode === "string" && NINE_SLICE_AUTO_MODES.has(candidate.mode as NineSliceAutoMode)
    ? (candidate.mode as NineSliceAutoMode)
    : undefined;
  const warnings = Array.isArray(candidate.warnings)
    ? candidate.warnings.filter((warning): warning is string => typeof warning === "string" && warning.trim().length > 0)
    : undefined;
  const debug =
    candidate.debug && typeof candidate.debug === "object" && !Array.isArray(candidate.debug)
      ? (candidate.debug as Record<string, unknown>)
      : undefined;

  return {
    source,
    approved: source === "manual" ? true : Boolean(candidate.approved),
    confidence: typeof candidate.confidence === "number" ? candidate.confidence : undefined,
    insets: sanitized,
    assetHash: typeof candidate.assetHash === "string" && candidate.assetHash.trim() ? candidate.assetHash : undefined,
    algorithmVersion:
      typeof candidate.algorithmVersion === "string" && candidate.algorithmVersion.trim()
        ? candidate.algorithmVersion
        : undefined,
    mode,
    warnings: warnings?.length ? warnings : undefined,
    debug,
    generatedAt: typeof candidate.generatedAt === "number" ? candidate.generatedAt : undefined
  };
}

export function parseNineSliceMetadataString(
  raw: string,
  width?: number,
  height?: number
): NineSliceMetadata | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    return parseNineSliceMetadata(JSON.parse(raw), width, height);
  } catch {
    return undefined;
  }
}

export function serializeNineSliceMetadata(metadata: NineSliceMetadata): string {
  return JSON.stringify(metadata);
}

export function readNineSliceMetadataFromLayerName(
  name: string,
  width?: number,
  height?: number
): NineSliceMetadata | undefined {
  const match = name.match(/@nine\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/i);
  if (!match) {
    return undefined;
  }

  const parsed = parseNineSliceInsets({
    left: Number(match[1]),
    top: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4])
  });

  if (!parsed) {
    return undefined;
  }

  const sanitized =
    typeof width === "number" && typeof height === "number"
      ? sanitizeNineSliceInsets(parsed, width, height)
      : parsed;

  if (validateNineSliceInsets(sanitized, width, height)) {
    return undefined;
  }

  return {
    source: "manual",
    approved: true,
    insets: sanitized
  };
}

export function resolveNineSliceMetadata(
  stored: NineSliceMetadata | undefined,
  layerNameFallback: NineSliceMetadata | undefined,
  width: number,
  height: number
): NineSliceMetadata {
  if (stored?.source === "manual") {
    return stored;
  }

  if (layerNameFallback) {
    return layerNameFallback;
  }

  if (stored?.source === "auto" && stored.algorithmVersion === AUTO_NINE_SLICE_ALGORITHM_VERSION) {
    return stored;
  }

  if (stored?.source === "default") {
    return stored;
  }

  return {
    source: "default",
    approved: false,
    insets: createSafeDefaultNineSlice(width, height),
    algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
    mode: "fallback",
    generatedAt: Date.now()
  };
}

export function hashBytes(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
