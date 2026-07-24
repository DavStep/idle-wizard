/// <reference types="@figma/plugin-typings" />

import {
  exportFigmaSelectionToPixiUI,
  finalizeExportedAssetsForDocuments,
  parseLayerTags,
  type FinalizableAssetPayload
} from "../src/exporter/index";
import {
  AUTO_NINE_SLICE_ALGORITHM_VERSION,
  NINE_SLICE_PLUGIN_KEY,
  createSafeDefaultNineSlice,
  hashBytes,
  parseNineSliceMetadataString,
  readNineSliceMetadataFromLayerName,
  resolveNineSliceMetadata,
  sanitizeNineSliceInsets,
  serializeNineSliceMetadata,
  validateNineSliceInsets
} from "../src/exporter/nineSlice";
import type { FigmaPixiDocument, FigmaPixiNode, NineSliceInsets, NineSliceMetadata } from "../src/schema";

const MAX_PREVIEW_EXPORT_SIZE = 512;
const PREVIEW_CACHE_LIMIT = 12;
const previewCache = new Map<string, { bytes: Uint8Array; assetHash: string }>();
let selectionPostToken = 0;
let documentChangeTimer: number | undefined;
let autoPrepareRequestSequence = 0;

type NineSliceAnalysisRequest = {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  assetHash: string;
  bytes: Uint8Array;
};

type NineSliceAnalysisResponse = {
  nodeId: string;
  metadata?: NineSliceMetadata;
};

const pendingAutoPrepareRequests = new Map<
  string,
  {
    resolve: (value: NineSliceAnalysisResponse[]) => void;
    reject: (reason?: unknown) => void;
    timer: number;
  }
>();

type ExportedAssetPayload = {
  assetId: string;
  fileName: string;
  name?: string;
  nameSource?: FinalizableAssetPayload["nameSource"];
  explicitName?: boolean;
  bytes: Uint8Array;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isNineTagged(name: string): boolean {
  return /@nine(?:\(|\b)/i.test(name);
}

function cleanLayerName(name: string): string {
  return name.replace(/@\w+(?:\([^)]*\))?/g, "").replace(/\s+/g, " ").trim();
}

type NineSliceRenderSize = {
  width: number;
  height: number;
};

function readNineSliceRenderSize(node: SceneNode): NineSliceRenderSize | undefined {
  if (!("absoluteRenderBounds" in node)) {
    return undefined;
  }
  const bounds = node.absoluteRenderBounds;
  if (
    !bounds ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return undefined;
  }
  return { width: bounds.width, height: bounds.height };
}

function requireNineSliceRenderSize(node: SceneNode): NineSliceRenderSize {
  const size = readNineSliceRenderSize(node);
  if (!size) {
    throw new Error(`@nine node "${cleanLayerName(node.name) || node.name}" has no visible rendered pixels.`);
  }
  return size;
}

function readStoredNineSliceMetadata(
  node: SceneNode,
  width: number,
  height: number
): NineSliceMetadata | undefined {
  return parseNineSliceMetadataString(node.getPluginData(NINE_SLICE_PLUGIN_KEY), width, height);
}

function writeNineSliceMetadata(node: SceneNode, metadata: NineSliceMetadata): void {
  node.setPluginData(NINE_SLICE_PLUGIN_KEY, serializeNineSliceMetadata(metadata));
}

function resolveNodeNineSliceMetadata(node: SceneNode, width: number, height: number): {
  storedMetadata?: NineSliceMetadata;
  layerNameMetadata?: NineSliceMetadata;
  resolvedMetadata: NineSliceMetadata;
} {
  const storedMetadata = readStoredNineSliceMetadata(node, width, height);
  const layerNameMetadata = readNineSliceMetadataFromLayerName(node.name, width, height);
  return {
    storedMetadata,
    layerNameMetadata,
    resolvedMetadata: resolveNineSliceMetadata(storedMetadata, layerNameMetadata, width, height)
  };
}

function shouldSkipAutoDetection(node: SceneNode, storedMetadata?: NineSliceMetadata, layerNameMetadata?: NineSliceMetadata): boolean {
  return storedMetadata?.source === "manual" || Boolean(layerNameMetadata);
}

function isFreshCachedNineSlice(metadata: NineSliceMetadata | undefined, assetHash: string): boolean {
  if (!metadata || metadata.source === "manual") {
    return false;
  }

  return (
    (metadata.source === "auto" || metadata.source === "default") &&
    metadata.assetHash === assetHash &&
    metadata.algorithmVersion === AUTO_NINE_SLICE_ALGORITHM_VERSION
  );
}

function pushNineSliceMetadataWarnings(warnings: string[], nodeName: string, metadata: NineSliceMetadata | undefined): void {
  if (!metadata?.warnings?.length) {
    return;
  }

  for (const warning of metadata.warnings) {
    warnings.push(`@nine "${nodeName}": ${warning}`);
  }
}

function dedupeExportedAssets(
  document: FigmaPixiDocument,
  assets: ExportedAssetPayload[],
  assetBasePath: string
): ExportedAssetPayload[] {
  return finalizeExportedAssetsForDocuments({
    documents: [{ document, assets }],
    assetBasePath,
    sharedMode: "reused-only"
  }).assets;
}


function getSelectionInfo() {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    return {
      hasSelection: false,
      message: "Select one layer.",
      isNine: false
    };
  }

  const node = selection[0];
  const isNine = isNineTagged(node.name);
  const size = isNine ? readNineSliceRenderSize(node) : { width: node.width, height: node.height };
  if (!size) {
    return {
      hasSelection: true,
      nodeId: node.id,
      name: node.name,
      cleanName: cleanLayerName(node.name),
      width: 0,
      height: 0,
      isNine,
      renderBoundsError: true,
      hasManualOverride: false,
      message: "This @nine layer has no visible rendered pixels."
    };
  }
  const { storedMetadata, layerNameMetadata, resolvedMetadata } = resolveNodeNineSliceMetadata(
    node,
    size.width,
    size.height
  );
  const hasManualOverride = storedMetadata?.source === "manual" || Boolean(layerNameMetadata);

  return {
    hasSelection: true,
    nodeId: node.id,
    name: node.name,
    cleanName: cleanLayerName(node.name),
    width: size.width,
    height: size.height,
    isNine,
    storedMetadata,
    layerNameMetadata,
    resolvedMetadata,
    slice: resolvedMetadata.insets,
    hasManualOverride,
    message: isNine
      ? resolvedMetadata.source === "manual"
        ? "Manual nine-slice override loaded."
        : resolvedMetadata.source === "auto"
          ? "Auto-detected nine-slice loaded."
          : "Safe default nine-slice loaded."
      : "Selected node is not tagged with @nine."
  };
}

function computePreviewScale(width: number, height: number): number {
  const longestSide = Math.max(1, width, height);
  return Math.min(1, MAX_PREVIEW_EXPORT_SIZE / longestSide);
}

function rememberPreview(cacheKey: string, bytes: Uint8Array, assetHash: string): void {
  if (previewCache.has(cacheKey)) {
    previewCache.delete(cacheKey);
  }
  previewCache.set(cacheKey, { bytes, assetHash });
  while (previewCache.size > PREVIEW_CACHE_LIMIT) {
    const [oldestKey] = previewCache.keys();
    previewCache.delete(oldestKey);
  }
}

async function postNineSlicePreview(selectionInfo: ReturnType<typeof getSelectionInfo>, token: number): Promise<void> {
  if (!selectionInfo.hasSelection || !selectionInfo.isNine || !selectionInfo.nodeId) {
    figma.ui.postMessage({ type: "nine-slice-preview-cleared" });
    return;
  }

  if (selectionInfo.renderBoundsError) {
    figma.ui.postMessage({
      type: "nine-slice-preview-error",
      payload: {
        nodeId: selectionInfo.nodeId,
        message: selectionInfo.message
      }
    });
    return;
  }

  const node = figma.getNodeById(selectionInfo.nodeId);
  if (!node || !("exportAsync" in node)) {
    figma.ui.postMessage({
      type: "nine-slice-preview-error",
      payload: {
        nodeId: selectionInfo.nodeId,
        message: "Selected node cannot be exported for preview."
      }
    });
    return;
  }

  const previewScale = computePreviewScale(selectionInfo.width, selectionInfo.height);
  const cacheKey = [
    selectionInfo.nodeId,
    Math.round(selectionInfo.width * 1000) / 1000,
    Math.round(selectionInfo.height * 1000) / 1000,
    Math.round(previewScale * 10000) / 10000
  ].join(":");

  const cached = previewCache.get(cacheKey);
  if (cached) {
    figma.ui.postMessage({
      type: "nine-slice-preview",
      payload: {
        nodeId: selectionInfo.nodeId,
        width: selectionInfo.width,
        height: selectionInfo.height,
        previewScale,
        cacheKey,
        assetHash: cached.assetHash,
        bytes: cached.bytes
      }
    });
    return;
  }

  try {
    const bytes = await node.exportAsync({
      format: "PNG",
      useAbsoluteBounds: false,
      constraint: {
        type: "SCALE",
        value: previewScale
      }
    });

    if (token !== selectionPostToken) {
      return;
    }

    const assetHash = hashBytes(bytes);
    rememberPreview(cacheKey, bytes, assetHash);
    figma.ui.postMessage({
      type: "nine-slice-preview",
      payload: {
        nodeId: selectionInfo.nodeId,
        width: selectionInfo.width,
        height: selectionInfo.height,
        previewScale,
        cacheKey,
        assetHash,
        bytes
      }
    });
  } catch (error) {
    if (token !== selectionPostToken) {
      return;
    }
    figma.ui.postMessage({
      type: "nine-slice-preview-error",
      payload: {
        nodeId: selectionInfo.nodeId,
        message: `Could not export selected node preview: ${error instanceof Error ? error.message : String(error)}`
      }
    });
  }
}

function postSelectionInfo(): void {
  const token = ++selectionPostToken;
  const payload = getSelectionInfo();
  figma.ui.postMessage({
    type: "selection-info",
    payload
  });
  void postNineSlicePreview(payload, token);
}

function scheduleSelectionInfoPost(): void {
  if (documentChangeTimer !== undefined) {
    clearTimeout(documentChangeTimer);
  }
  documentChangeTimer = setTimeout(() => {
    postSelectionInfo();
  }, 150);
}

function parseIncomingInsets(payload: Partial<NineSliceInsets>): NineSliceInsets {
  return {
    left: Number(payload.left),
    top: Number(payload.top),
    right: Number(payload.right),
    bottom: Number(payload.bottom)
  };
}

function exportPreviewCacheKey(node: SceneNode): string {
  const size = requireNineSliceRenderSize(node);
  const previewScale = computePreviewScale(size.width, size.height);
  return [
    node.id,
    Math.round(size.width * 1000) / 1000,
    Math.round(size.height * 1000) / 1000,
    Math.round(previewScale * 10000) / 10000
  ].join(":");
}

async function exportPreviewForNode(node: SceneNode & ExportMixin): Promise<{
  bytes: Uint8Array;
  assetHash: string;
}> {
  const cacheKey = exportPreviewCacheKey(node);
  const cached = previewCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const size = requireNineSliceRenderSize(node);
  const bytes = await node.exportAsync({
    format: "PNG",
    useAbsoluteBounds: false,
    constraint: {
      type: "SCALE",
      value: computePreviewScale(size.width, size.height)
    }
  });
  const assetHash = hashBytes(bytes);
  rememberPreview(cacheKey, bytes, assetHash);
  return { bytes, assetHash };
}

function collectNineSliceNodes(root: SceneNode): SceneNode[] {
  const result: SceneNode[] = [];
  const visit = (node: SceneNode): void => {
    if (!node.visible) {
      return;
    }
    if (isNineTagged(node.name)) {
      result.push(node);
    }
    if ("children" in node) {
      for (const child of node.children) {
        visit(child);
      }
    }
  };
  visit(root);
  return result;
}

function requestAutoNineSliceAnalysis(items: NineSliceAnalysisRequest[]): Promise<NineSliceAnalysisResponse[]> {
  if (items.length === 0) {
    return Promise.resolve([]);
  }

  const requestId = `auto-nine-${++autoPrepareRequestSequence}`;
  return new Promise<NineSliceAnalysisResponse[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingAutoPrepareRequests.delete(requestId);
      reject(new Error("Nine-slice auto-detection timed out."));
    }, 10000);

    pendingAutoPrepareRequests.set(requestId, { resolve, reject, timer });
    figma.ui.postMessage({
      type: "prepare-auto-nine-slice",
      payload: {
        requestId,
        items
      }
    });
  });
}

function storeResolvedAutoMetadata(node: SceneNode, metadata: NineSliceMetadata): void {
  const size = requireNineSliceRenderSize(node);
  const sanitized = sanitizeNineSliceInsets(metadata.insets, size.width, size.height);
  const validation = validateNineSliceInsets(sanitized, size.width, size.height);
  if (validation) {
    return;
  }

  writeNineSliceMetadata(node, {
    ...metadata,
    approved: false,
    insets: sanitized,
    generatedAt: metadata.generatedAt ?? Date.now()
  });
}

async function prepareAutoNineSliceNodes(root: SceneNode): Promise<string[]> {
  const warnings: string[] = [];
  const analysisQueue: NineSliceAnalysisRequest[] = [];
  const defaultsToStore: Array<{ node: SceneNode; metadata: NineSliceMetadata }> = [];

  for (const node of collectNineSliceNodes(root)) {
    const nodeName = cleanLayerName(node.name) || node.name;
    const size = requireNineSliceRenderSize(node);
    const { storedMetadata, layerNameMetadata } = resolveNodeNineSliceMetadata(node, size.width, size.height);
    if (shouldSkipAutoDetection(node, storedMetadata, layerNameMetadata)) {
      continue;
    }

    if (!("exportAsync" in node)) {
      defaultsToStore.push({
        node,
        metadata: {
          source: "default",
          approved: false,
          insets: createSafeDefaultNineSlice(size.width, size.height),
          algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
          mode: "fallback",
          warnings: ["Preview export is unavailable; using safe default slices."],
          generatedAt: Date.now()
        }
      });
      warnings.push(`Used safe default nine-slice for "${nodeName}" because preview export is unavailable.`);
      continue;
    }

    try {
      const preview = await exportPreviewForNode(node);
      if (isFreshCachedNineSlice(storedMetadata, preview.assetHash)) {
        pushNineSliceMetadataWarnings(warnings, nodeName, storedMetadata);
        continue;
      }

      analysisQueue.push({
        nodeId: node.id,
        name: nodeName,
        width: size.width,
        height: size.height,
        assetHash: preview.assetHash,
        bytes: preview.bytes
      });
    } catch (error) {
      defaultsToStore.push({
        node,
        metadata: {
          source: "default",
          approved: false,
          insets: createSafeDefaultNineSlice(size.width, size.height),
          algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
          mode: "fallback",
          warnings: [
            `Preview export failed before auto-detection: ${error instanceof Error ? error.message : String(error)}`
          ],
          generatedAt: Date.now()
        }
      });
      warnings.push(
        `Used safe default nine-slice for "${nodeName}" because preview export failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  for (const entry of defaultsToStore) {
    storeResolvedAutoMetadata(entry.node, entry.metadata);
  }

  if (analysisQueue.length === 0) {
    return warnings;
  }

  let responses: NineSliceAnalysisResponse[];
  try {
    responses = await requestAutoNineSliceAnalysis(analysisQueue);
  } catch (error) {
    for (const item of analysisQueue) {
      const node = figma.getNodeById(item.nodeId);
      if (!node || node.type === "DOCUMENT" || node.type === "PAGE") {
        continue;
      }
      const size = requireNineSliceRenderSize(node);
      storeResolvedAutoMetadata(node, {
        source: "default",
        approved: false,
        insets: createSafeDefaultNineSlice(size.width, size.height),
        assetHash: item.assetHash,
        algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
        mode: "fallback",
        warnings: [
          `Auto-detection failed before analysis completed: ${error instanceof Error ? error.message : String(error)}`
        ],
        generatedAt: Date.now()
      });
      warnings.push(
        `Used safe default nine-slice for "${item.name}" because auto-detection failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return warnings;
  }

  const responseByNodeId = new Map(responses.map((response) => [response.nodeId, response]));
  for (const item of analysisQueue) {
    const node = figma.getNodeById(item.nodeId);
    if (!node || node.type === "DOCUMENT" || node.type === "PAGE") {
      continue;
    }

    const response = responseByNodeId.get(item.nodeId);
    const size = requireNineSliceRenderSize(node);
    const metadata =
      response?.metadata && validateNineSliceInsets(response.metadata.insets, size.width, size.height) === null
        ? response.metadata
        : {
            source: "default" as const,
            approved: false,
            insets: createSafeDefaultNineSlice(size.width, size.height),
            assetHash: item.assetHash,
            algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
            mode: "fallback" as const,
            warnings: ["Auto-detection response was invalid; using safe default slices."],
            generatedAt: Date.now()
          };

    storeResolvedAutoMetadata(node, {
      ...metadata,
      source: metadata.source === "manual" ? "auto" : metadata.source,
      approved: false,
      assetHash: metadata.assetHash ?? item.assetHash
    });

    if (metadata.source === "default") {
      warnings.push(`Used safe default nine-slice for "${item.name}".`);
    }
    pushNineSliceMetadataWarnings(warnings, item.name, metadata);
  }

  return warnings;
}

function handleSaveNineSlice(payload: Partial<NineSliceInsets> & { assetHash?: string; confidence?: number }): void {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    figma.ui.postMessage({ type: "nine-slice-error", message: "Select one @nine layer first." });
    return;
  }
  const node = selection[0];
  if (!isNineTagged(node.name)) {
    figma.ui.postMessage({ type: "nine-slice-error", message: "Selected layer is not tagged @nine." });
    return;
  }

  const size = readNineSliceRenderSize(node);
  if (!size) {
    figma.ui.postMessage({ type: "nine-slice-error", message: "This @nine layer has no visible rendered pixels." });
    return;
  }
  const data = sanitizeNineSliceInsets(parseIncomingInsets(payload), size.width, size.height);
  const error = validateNineSliceInsets(data, size.width, size.height);
  if (error) {
    figma.ui.postMessage({ type: "nine-slice-error", message: error });
    return;
  }

  writeNineSliceMetadata(node, {
    source: "manual",
    approved: true,
    confidence: typeof payload.confidence === "number" ? payload.confidence : 1,
    insets: data,
    assetHash: typeof payload.assetHash === "string" && payload.assetHash.trim() ? payload.assetHash : undefined,
    generatedAt: Date.now()
  });
  figma.ui.postMessage({ type: "nine-slice-saved", message: "Manual nine-slice override saved." });
  postSelectionInfo();
}

function handleApplyAutoNineSlice(payload: { metadata?: NineSliceMetadata }): void {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    figma.ui.postMessage({ type: "nine-slice-error", message: "Select one @nine layer first." });
    return;
  }
  const node = selection[0];
  if (!isNineTagged(node.name)) {
    figma.ui.postMessage({ type: "nine-slice-error", message: "Selected layer is not tagged @nine." });
    return;
  }

  const candidate = payload.metadata;
  if (!candidate) {
    figma.ui.postMessage({ type: "nine-slice-error", message: "Missing auto-detected nine-slice payload." });
    return;
  }

  const size = readNineSliceRenderSize(node);
  if (!size) {
    figma.ui.postMessage({ type: "nine-slice-error", message: "This @nine layer has no visible rendered pixels." });
    return;
  }
  const sanitized = sanitizeNineSliceInsets(candidate.insets, size.width, size.height);
  const validation = validateNineSliceInsets(sanitized, size.width, size.height);
  if (validation) {
    figma.ui.postMessage({ type: "nine-slice-error", message: validation });
    return;
  }

  writeNineSliceMetadata(node, {
    ...candidate,
    source: candidate.source === "default" ? "default" : "auto",
    approved: false,
    insets: sanitized,
    generatedAt: candidate.generatedAt ?? Date.now()
  });
  figma.ui.postMessage({ type: "nine-slice-auto-applied", message: "Auto-detected nine-slice applied." });
  postSelectionInfo();
}

function handleCacheAutoNineSlice(payload: { nodeId?: string; metadata?: NineSliceMetadata }): void {
  if (!payload.nodeId || !payload.metadata) {
    return;
  }

  const node = figma.getNodeById(payload.nodeId);
  if (!node || node.type === "DOCUMENT" || node.type === "PAGE") {
    return;
  }

  const size = readNineSliceRenderSize(node);
  if (!size) {
    return;
  }
  const { storedMetadata, layerNameMetadata } = resolveNodeNineSliceMetadata(node, size.width, size.height);
  if (shouldSkipAutoDetection(node, storedMetadata, layerNameMetadata)) {
    return;
  }

  storeResolvedAutoMetadata(node, {
    ...payload.metadata,
    source: payload.metadata.source === "default" ? "default" : "auto",
    approved: false,
    generatedAt: payload.metadata.generatedAt ?? Date.now()
  });
}

figma.showUI(__html__, { width: 480, height: 700 });

figma.on("selectionchange", () => {
  postSelectionInfo();
});

if (typeof (figma as unknown as { on?: (event: string, callback: () => void) => void }).on === "function") {
  try {
    (figma as unknown as { on: (event: string, callback: () => void) => void }).on("documentchange", () => {
      scheduleSelectionInfoPost();
    });
  } catch {
    // Some Figma runtimes do not expose documentchange; selection updates still work.
  }
}

figma.ui.onmessage = async (message) => {
  if (message.type === "saveNineSlice") {
    handleSaveNineSlice(message);
    return;
  }

  if (message.type === "applyAutoNineSlice") {
    handleApplyAutoNineSlice(message);
    return;
  }

  if (message.type === "cacheAutoNineSlice") {
    handleCacheAutoNineSlice(message);
    return;
  }

  if (message.type === "prepare-auto-nine-slice-result") {
    const requestId = typeof message.requestId === "string" ? message.requestId : "";
    const pending = pendingAutoPrepareRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timer);
      pendingAutoPrepareRequests.delete(requestId);
      pending.resolve(Array.isArray(message.results) ? message.results : []);
    }
    return;
  }

  if (message.type === "requestSelectionInfo") {
    postSelectionInfo();
    return;
  }

  if (message.type !== "exportSelection") {
    return;
  }

  const selectedRoots = figma.currentPage.selection.filter(
    (node): node is SceneNode & LayoutMixin => "absoluteBoundingBox" in node
  );
  if (selectedRoots.length === 0) {
    figma.notify("Select one or more @screen, @dialog, @hud, or @component roots to export.");
    return;
  }

  if (selectedRoots.length > 1) {
    const invalidRoots = selectedRoots.filter((node) => !parseLayerTags(node.name).kind);
    if (invalidRoots.length > 0) {
      figma.ui.postMessage({
        type: "export-error",
        message: `Bundle export requires every selected root to use @screen, @dialog, @hud, or @component. Missing root tag: "${invalidRoots[0].name}".`
      });
      return;
    }
  }

  try {
    const assetBasePath = message.assetBasePath || "assets/ui";
    const exportDocuments: FigmaPixiDocument[] = [];
    const documentAssets: Array<{ document: FigmaPixiDocument; assets: ExportedAssetPayload[] }> = [];
    const allWarnings: string[] = [];
    const allErrors: string[] = [];

    for (const selection of selectedRoots) {
      const autoNineSliceWarnings = await prepareAutoNineSliceNodes(selection);
      const exported = exportFigmaSelectionToPixiUI(selection, {
        assetBasePath,
        assetScale: Number(message.assetScale || 1)
      });

      const assets: ExportedAssetPayload[] = [];
      for (const request of exported.assetRequests) {
        const node = figma.getNodeById(request.nodeId);
        if (!node || !("exportAsync" in node)) {
          figma.ui.postMessage({
            type: "export-error",
            message: `Missing export node for asset request "${request.fileName}".`
          });
          return;
        }

        try {
          const bytes = await node.exportAsync({
            format: "PNG",
            useAbsoluteBounds: false,
            constraint: {
              type: "SCALE",
              value: request.scale
            }
          });

          assets.push({
            assetId: request.assetId,
            fileName: request.fileName,
            name: request.name,
            nameSource: request.nameSource,
            explicitName: request.explicitName,
            bytes
          });
        } catch (error) {
          figma.ui.postMessage({
            type: "export-error",
            message: `Failed to export PNG for "${request.fileName}": ${error instanceof Error ? error.message : String(error)}`
          });
          return;
        }
      }

      exportDocuments.push(exported.document);
      documentAssets.push({ document: exported.document, assets });
      allWarnings.push(...autoNineSliceWarnings, ...exported.warnings);
      allErrors.push(...exported.errors);
    }

    const finalized = finalizeExportedAssetsForDocuments({
      documents: documentAssets,
      assetBasePath,
      sharedMode: "reused-only"
    });

    figma.ui.postMessage({
      type: "export-complete",
      document: exportDocuments[0],
      documents: exportDocuments,
      bundle: exportDocuments.length > 1,
      assets: finalized.assets,
      manifest: finalized.manifest,
      warnings: allWarnings,
      errors: allErrors
    });
  } catch (error) {
    figma.ui.postMessage({
      type: "export-error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

postSelectionInfo();
