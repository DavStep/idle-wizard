export type AssetNameSource = "explicit" | "component" | "layer" | "context" | "fallback";

export interface AssetNameCandidate {
  name: string;
  source: AssetNameSource;
  originalName?: string;
  order?: number;
}

export interface ResolvedAssetName extends AssetNameCandidate {
  score: number;
  generic: boolean;
}

export interface BuildAssetBaseNameOptions {
  rawName?: string;
  cleanName?: string;
  assetName?: string;
  componentName?: string;
  parentName?: string;
  rootName?: string;
  fallbackHash?: string;
}

const GENERIC_LAYER_NAMES = new Set([
  "rectangle",
  "group",
  "frame",
  "vector",
  "instance",
  "layer",
  "image",
  "ellipse",
  "star",
  "polygon",
  "union",
  "booleanoperation",
  "boolean_operation"
]);

const QUICK_TAG_REGEX = /@[a-zA-Z]+(?:\([^)]*\))?/g;

export function stripQuickTags(value: string): string {
  return value.replace(QUICK_TAG_REGEX, " ").replace(/\s+/g, " ").trim();
}

export function extractAssetNameOverride(value: string): string | undefined {
  const match = value.match(/@asset\(([^)]*)\)/i);
  if (!match) {
    return undefined;
  }

  const sanitized = sanitizeAssetBaseName(match[1]);
  return sanitized || undefined;
}

export function sanitizeAssetBaseName(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(QUICK_TAG_REGEX, " ")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "");
}

export function isGenericAssetBaseName(value: string | undefined): boolean {
  const sanitized = sanitizeAssetBaseName(value);
  if (!sanitized) {
    return true;
  }

  if (/^asset[-_]?[a-f0-9]{6,}(?:[-_]\d+)?$/i.test(sanitized) || /^ui[-_]?asset$/i.test(sanitized)) {
    return true;
  }

  const compact = sanitized.replace(/[_.-]+/g, "");
  if (!compact) {
    return true;
  }

  const withoutTrailingDigits = compact.replace(/\d+$/g, "");
  return GENERIC_LAYER_NAMES.has(compact) || GENERIC_LAYER_NAMES.has(withoutTrailingDigits);
}

export function shortHash(value: string | undefined, length = 6): string {
  return sanitizeAssetBaseName(value).replace(/[^a-z0-9]/g, "").slice(0, length) || "000000";
}

export function fallbackAssetBaseName(hashOrId: string | undefined): string {
  return `asset_${shortHash(hashOrId, 8)}`;
}

export function scoreAssetNameCandidate(candidate: AssetNameCandidate): number {
  const generic = isGenericAssetBaseName(candidate.name);
  const sourceScore =
    candidate.source === "explicit"
      ? 10000
      : candidate.source === "component"
        ? 8000
        : candidate.source === "context"
          ? 6000
          : candidate.source === "layer"
            ? 5000
            : 1000;
  const qualityScore = generic ? 0 : 1000;
  const lengthScore = Math.max(0, 240 - candidate.name.length);
  const orderPenalty = Math.max(0, candidate.order ?? 0);
  return sourceScore + qualityScore + lengthScore - orderPenalty;
}

export function resolveAssetNameCandidate(candidate: AssetNameCandidate): ResolvedAssetName {
  return {
    ...candidate,
    generic: isGenericAssetBaseName(candidate.name),
    score: scoreAssetNameCandidate(candidate)
  };
}

export function chooseBestAssetName(candidates: AssetNameCandidate[], fallbackHash?: string): ResolvedAssetName {
  const resolved = candidates
    .map((candidate) => ({
      ...candidate,
      name: sanitizeAssetBaseName(candidate.name)
    }))
    .filter((candidate) => candidate.name.length > 0)
    .map(resolveAssetNameCandidate);

  if (resolved.length === 0) {
    return resolveAssetNameCandidate({
      name: fallbackAssetBaseName(fallbackHash),
      source: "fallback",
      order: Number.MAX_SAFE_INTEGER
    });
  }

  resolved.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const best = resolved[0];
  if (!best.generic || best.source === "explicit") {
    return best;
  }

  return resolveAssetNameCandidate({
    name: `${best.name}_${shortHash(fallbackHash, 6)}`,
    source: best.source,
    originalName: best.originalName,
    order: best.order
  });
}

export function buildAssetBaseName(options: BuildAssetBaseNameOptions): ResolvedAssetName {
  const candidates: AssetNameCandidate[] = [];
  const explicitName = sanitizeAssetBaseName(options.assetName ?? extractAssetNameOverride(options.rawName ?? ""));
  const cleanLayerName = sanitizeAssetBaseName(options.cleanName ?? stripQuickTags(options.rawName ?? ""));
  const componentName = sanitizeAssetBaseName(stripQuickTags(options.componentName ?? ""));
  const parentName = sanitizeAssetBaseName(stripQuickTags(options.parentName ?? ""));
  const rootName = sanitizeAssetBaseName(stripQuickTags(options.rootName ?? ""));

  if (explicitName) {
    candidates.push({ name: explicitName, source: "explicit", originalName: options.assetName, order: 0 });
  }
  if (componentName && !isGenericAssetBaseName(componentName)) {
    candidates.push({ name: componentName, source: "component", originalName: options.componentName, order: 1 });
  }
  if (cleanLayerName) {
    candidates.push({ name: cleanLayerName, source: "layer", originalName: options.cleanName, order: 2 });
  }

  const needsContext = !cleanLayerName || isGenericAssetBaseName(cleanLayerName);
  if (needsContext) {
    const contextPrefix = !isGenericAssetBaseName(parentName) ? parentName : !isGenericAssetBaseName(rootName) ? rootName : "";
    if (contextPrefix && cleanLayerName) {
      candidates.push({
        name: `${contextPrefix}_${cleanLayerName}`,
        source: "context",
        originalName: `${options.parentName ?? options.rootName ?? ""} ${options.cleanName ?? ""}`.trim(),
        order: 3
      });
    }
  }

  return chooseBestAssetName(candidates, options.fallbackHash);
}

export function assetBaseNameFromPath(path: string | undefined): string {
  if (!path) {
    return "";
  }

  const clean = path.split(/[?#]/, 1)[0] ?? "";
  const slashIndex = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  const fileName = slashIndex >= 0 ? clean.slice(slashIndex + 1) : clean;
  const dotIndex = fileName.lastIndexOf(".");
  return sanitizeAssetBaseName(dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName);
}
