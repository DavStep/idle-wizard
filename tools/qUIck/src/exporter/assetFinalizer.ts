import type { FigmaPixiAsset, FigmaPixiDocument, FigmaPixiNode } from "../schema.js";
import {
  type AssetNameCandidate,
  type AssetNameSource,
  assetBaseNameFromPath,
  chooseBestAssetName,
  fallbackAssetBaseName,
  isGenericAssetBaseName,
  sanitizeAssetBaseName,
  shortHash
} from "./assetNaming.js";
import { hashBytes } from "./nineSlice.js";

export interface FinalizableAssetPayload {
  assetId: string;
  fileName?: string;
  bytes: Uint8Array;
  name?: string;
  nameSource?: AssetNameSource;
  explicitName?: boolean;
}

export interface FinalizedAssetPayload extends FinalizableAssetPayload {
  assetId: string;
  fileName: string;
  src: string;
}

export interface FinalizeDocumentInput {
  document: FigmaPixiDocument;
  assets: FinalizableAssetPayload[];
}

export interface FinalizeExportedAssetsOptions {
  documents: FinalizeDocumentInput[];
  assetBasePath?: string;
  sharedMode?: "reused-only" | "all-shared" | "none";
}

export interface FinalizedAssetManifestEntry extends FigmaPixiAsset {
  name: string;
  shared: boolean;
  usedBy: string[];
  aliases?: string[];
}

export interface FinalizedAssetManifest {
  version: 1;
  assetBasePath: string;
  assets: FinalizedAssetManifestEntry[];
}

export interface FinalizedExportedAssets {
  assets: FinalizedAssetPayload[];
  manifest: FinalizedAssetManifest;
}

type ExtendedFigmaPixiAsset = FigmaPixiAsset & {
  name?: string;
  nameSource?: AssetNameSource;
  aliases?: string[];
  shared?: boolean;
  usedBy?: string[];
};

interface AssetRef {
  documentIndex: number;
  rootName: string;
  rootFolder: string;
  previousAssetId: string;
  asset: ExtendedFigmaPixiAsset;
  payload: FinalizableAssetPayload;
  bytes: Uint8Array;
  order: number;
}

interface CanonicalAsset {
  signature: string;
  hash: string;
  id: string;
  bytes: Uint8Array;
  refs: AssetRef[];
  candidates: AssetNameCandidate[];
  baseName: string;
  fileName: string;
  src: string;
  shared: boolean;
  usedBy: string[];
  manifestAsset: FinalizedAssetManifestEntry;
}

function normalizePathSegment(value: string, fallback: string): string {
  const cleaned = String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function joinPath(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter((part) => part.length > 0)
    .join("/");
}

function inferAssetBasePath(documents: FinalizeDocumentInput[], fallback = "assets/ui"): string {
  for (const entry of documents) {
    for (const asset of entry.document.assets) {
      if (!asset.src) {
        continue;
      }
      const clean = asset.src.split(/[?#]/, 1)[0] ?? "";
      const parts = clean.split("/").filter(Boolean);
      if (parts.length >= 3) {
        return parts.slice(0, -2).join("/") || fallback;
      }
    }
  }
  return fallback;
}

function buildRootFolders(documents: FinalizeDocumentInput[]): string[] {
  const seen = new Map<string, number>();
  return documents.map((entry, index) => {
    const base = normalizePathSegment(entry.document.name, `Export${index + 1}`);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}__${count + 1}`;
  });
}

function ensureValidation(doc: FigmaPixiDocument): { warnings: string[]; errors: string[] } {
  if (!doc.meta) {
    doc.meta = {
      source: "figma",
      exportedRootId: "",
      validation: { warnings: [], errors: [] }
    };
  }
  if (!doc.meta.validation) {
    doc.meta.validation = { warnings: [], errors: [] };
  }
  if (!Array.isArray(doc.meta.validation.warnings)) {
    doc.meta.validation.warnings = [];
  }
  if (!Array.isArray(doc.meta.validation.errors)) {
    doc.meta.validation.errors = [];
  }
  return doc.meta.validation;
}

function appendWarning(doc: FigmaPixiDocument, message: string): void {
  const validation = ensureValidation(doc);
  if (!validation.warnings.includes(message)) {
    validation.warnings.push(message);
  }
}

function collectAssetRefs(documents: FinalizeDocumentInput[], rootFolders: string[]): AssetRef[] {
  const refs: AssetRef[] = [];
  let order = 0;

  documents.forEach((entry, documentIndex) => {
    const manifestAssetById = new Map(entry.document.assets.map((asset) => [asset.id, asset as ExtendedFigmaPixiAsset]));
    for (const payload of entry.assets) {
      const manifestAsset = manifestAssetById.get(payload.assetId);
      if (!manifestAsset) {
        continue;
      }
      refs.push({
        documentIndex,
        rootName: entry.document.name,
        rootFolder: rootFolders[documentIndex],
        previousAssetId: payload.assetId,
        asset: manifestAsset,
        payload,
        bytes: payload.bytes,
        order: order++
      });
    }
  });

  return refs;
}

function sourceFromExplicitFlag(source: AssetNameSource | undefined, explicitName: boolean | undefined): AssetNameSource {
  if (explicitName) {
    return "explicit";
  }
  return source ?? "layer";
}

function pushCandidate(candidates: AssetNameCandidate[], name: string | undefined, source: AssetNameSource, order: number): void {
  const sanitized = sanitizeAssetBaseName(name);
  if (!sanitized) {
    return;
  }
  candidates.push({ name: sanitized, source, order });
}

function collectNameCandidates(ref: AssetRef): AssetNameCandidate[] {
  const candidates: AssetNameCandidate[] = [];
  pushCandidate(
    candidates,
    ref.asset.name,
    sourceFromExplicitFlag(ref.asset.nameSource, ref.asset.nameSource === "explicit"),
    ref.order * 10
  );
  pushCandidate(
    candidates,
    ref.payload.name,
    sourceFromExplicitFlag(ref.payload.nameSource, ref.payload.explicitName),
    ref.order * 10 + 1
  );
  pushCandidate(candidates, assetBaseNameFromPath(ref.payload.fileName), "layer", ref.order * 10 + 2);
  pushCandidate(candidates, assetBaseNameFromPath(ref.asset.src), "layer", ref.order * 10 + 3);
  return candidates;
}

function makeCanonicalAsset(ref: AssetRef, hash: string): CanonicalAsset {
  const id = `asset-${hash}-${ref.bytes.length}`;
  return {
    signature: `png:${hash}:${ref.bytes.length}`,
    hash,
    id,
    bytes: ref.bytes,
    refs: [],
    candidates: [],
    baseName: fallbackAssetBaseName(hash),
    fileName: `${fallbackAssetBaseName(hash)}.png`,
    src: "",
    shared: false,
    usedBy: [],
    manifestAsset: {
      ...ref.asset,
      id,
      name: fallbackAssetBaseName(hash),
      src: "",
      shared: false,
      usedBy: [ref.rootName]
    }
  };
}

function collectCanonicalAssets(refs: AssetRef[]): CanonicalAsset[] {
  const canonicalBySignature = new Map<string, CanonicalAsset>();

  for (const ref of refs) {
    const hash = hashBytes(ref.bytes);
    const signature = `png:${hash}:${ref.bytes.length}`;
    let canonical = canonicalBySignature.get(signature);
    if (!canonical) {
      canonical = makeCanonicalAsset(ref, hash);
      canonicalBySignature.set(signature, canonical);
    }

    canonical.refs.push(ref);
    canonical.candidates.push(...collectNameCandidates(ref));
  }

  return Array.from(canonicalBySignature.values()).sort((a, b) => a.refs[0].order - b.refs[0].order);
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function canonicalUsedBy(canonical: CanonicalAsset): string[] {
  return uniqueSorted(canonical.refs.map((ref) => ref.rootName));
}

function appendWarningsForCanonicalAliases(documents: FinalizeDocumentInput[], canonical: CanonicalAsset): void {
  const candidateNames = uniqueSorted(
    canonical.candidates
      .map((candidate) => sanitizeAssetBaseName(candidate.name))
      .filter((name) => name && name !== canonical.baseName && !isGenericAssetBaseName(name))
  );
  if (candidateNames.length === 0) {
    return;
  }

  const message = `Identical PNG bytes were referenced by multiple names: "${candidateNames.join(
    '", "'
  )}"; using "${canonical.fileName}"`;
  for (const documentIndex of new Set(canonical.refs.map((ref) => ref.documentIndex))) {
    appendWarning(documents[documentIndex].document, message);
  }
  canonical.manifestAsset.aliases = candidateNames;
}

function chooseCanonicalNames(canonicalAssets: CanonicalAsset[]): void {
  for (const canonical of canonicalAssets) {
    const chosen = chooseBestAssetName(canonical.candidates, canonical.hash);
    canonical.baseName = chosen.name || fallbackAssetBaseName(canonical.hash);
  }
}

function assignCanonicalPaths(
  documents: FinalizeDocumentInput[],
  canonicalAssets: CanonicalAsset[],
  assetBasePath: string,
  sharedMode: "reused-only" | "all-shared" | "none"
): void {
  const byBaseName = new Map<string, CanonicalAsset[]>();
  for (const canonical of canonicalAssets) {
    const group = byBaseName.get(canonical.baseName) ?? [];
    group.push(canonical);
    byBaseName.set(canonical.baseName, group);
  }

  const usedPaths = new Set<string>();
  for (const group of byBaseName.values()) {
    group.sort((a, b) => {
      const aBest = chooseBestAssetName(a.candidates, a.hash);
      const bBest = chooseBestAssetName(b.candidates, b.hash);
      if (bBest.score !== aBest.score) return bBest.score - aBest.score;
      return a.hash.localeCompare(b.hash);
    });

    if (group.length > 1) {
      const fileNames = group.map((canonical, index) =>
        index === 0 ? `${canonical.baseName}.png` : `${canonical.baseName}__${shortHash(canonical.hash, 6)}.png`
      );
      const message = `Duplicate asset name "${group[0].baseName}" produced multiple different PNGs: ${fileNames.join(", ")}`;
      for (const canonical of group) {
        for (const documentIndex of new Set(canonical.refs.map((ref) => ref.documentIndex))) {
          appendWarning(documents[documentIndex].document, message);
        }
      }
    }

    for (const [index, canonical] of group.entries()) {
      const usedByRootFolders = uniqueSorted(canonical.refs.map((ref) => ref.rootFolder));
      canonical.usedBy = canonicalUsedBy(canonical);
      canonical.shared =
        sharedMode === "all-shared"
          ? true
          : sharedMode === "none"
            ? false
            : usedByRootFolders.length > 1;
      const folder = canonical.shared ? "shared" : usedByRootFolders[0];
      const suffix = index === 0 ? "" : `__${shortHash(canonical.hash, 6)}`;
      let fileName = `${canonical.baseName}${suffix}.png`;
      let src = joinPath(assetBasePath, folder, fileName);
      let conflictIndex = 2;
      while (usedPaths.has(src)) {
        fileName = `${canonical.baseName}${suffix}__${conflictIndex}.png`;
        src = joinPath(assetBasePath, folder, fileName);
        conflictIndex += 1;
      }
      usedPaths.add(src);
      canonical.fileName = fileName;
      canonical.src = src;
      canonical.manifestAsset = {
        ...canonical.refs[0].asset,
        id: canonical.id,
        name: canonical.baseName,
        src,
        width: canonical.refs[0].asset.width,
        height: canonical.refs[0].asset.height,
        scale: canonical.refs[0].asset.scale,
        mimeType: canonical.refs[0].asset.mimeType ?? "image/png",
        shared: canonical.shared,
        usedBy: canonical.usedBy
      };
      appendWarningsForCanonicalAliases(documents, canonical);
    }
  }
}

function remapDocumentNodeAssets(
  nodes: FigmaPixiNode[],
  nextAssetByPreviousId: Map<string, FinalizedAssetManifestEntry>
): void {
  for (const node of nodes) {
    if ("assetId" in node) {
      const nextAsset = nextAssetByPreviousId.get(node.assetId);
      if (nextAsset) {
        node.assetId = nextAsset.id;
        if ("asset" in node) {
          node.asset = nextAsset.src;
        }
      }
    }
    if (node.children?.length) {
      remapDocumentNodeAssets(node.children, nextAssetByPreviousId);
    }
  }
}

function rewriteDocuments(documents: FinalizeDocumentInput[], canonicalAssets: CanonicalAsset[]): void {
  documents.forEach((entry, documentIndex) => {
    const canonicalForDocument = canonicalAssets.filter((canonical) =>
      canonical.refs.some((ref) => ref.documentIndex === documentIndex)
    );
    const nextAssetByPreviousId = new Map<string, FinalizedAssetManifestEntry>();
    for (const canonical of canonicalForDocument) {
      for (const ref of canonical.refs) {
        if (ref.documentIndex === documentIndex) {
          nextAssetByPreviousId.set(ref.previousAssetId, canonical.manifestAsset);
        }
      }
    }

    entry.document.assets = canonicalForDocument.map((canonical) => canonical.manifestAsset);
    remapDocumentNodeAssets(entry.document.children, nextAssetByPreviousId);
    const sharedAssets = canonicalForDocument.filter((canonical) => canonical.shared).length;
    const localAssets = canonicalForDocument.length - sharedAssets;
    ensureValidation(entry.document);
    (entry.document.meta as FigmaPixiDocument["meta"] & {
      assetStats?: {
        totalReferencedAssets: number;
        uniqueAssets: number;
        sharedAssets: number;
        localAssets: number;
      };
    }).assetStats = {
      totalReferencedAssets: entry.assets.length,
      uniqueAssets: canonicalForDocument.length,
      sharedAssets,
      localAssets
    };
  });
}

export function finalizeExportedAssetsForDocuments(
  options: FinalizeExportedAssetsOptions
): FinalizedExportedAssets {
  const assetBasePath = options.assetBasePath ?? inferAssetBasePath(options.documents);
  const sharedMode = options.sharedMode ?? "reused-only";
  const rootFolders = buildRootFolders(options.documents);
  const refs = collectAssetRefs(options.documents, rootFolders);
  const canonicalAssets = collectCanonicalAssets(refs);

  chooseCanonicalNames(canonicalAssets);
  assignCanonicalPaths(options.documents, canonicalAssets, assetBasePath, sharedMode);
  rewriteDocuments(options.documents, canonicalAssets);

  return {
    assets: canonicalAssets.map((canonical) => ({
      assetId: canonical.id,
      fileName: canonical.fileName,
      src: canonical.src,
      bytes: canonical.bytes,
      name: canonical.baseName,
      nameSource: canonical.refs[0].payload.nameSource,
      explicitName: canonical.refs[0].payload.explicitName
    })),
    manifest: {
      version: 1,
      assetBasePath,
      assets: canonicalAssets.map((canonical) => canonical.manifestAsset)
    }
  };
}

export function finalizeExportedAssetsForDocument(
  document: FigmaPixiDocument,
  assets: FinalizableAssetPayload[],
  assetBasePath?: string
): FinalizedExportedAssets {
  return finalizeExportedAssetsForDocuments({
    documents: [{ document, assets }],
    assetBasePath,
    sharedMode: "reused-only"
  });
}
