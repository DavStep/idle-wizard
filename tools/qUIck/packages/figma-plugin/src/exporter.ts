import type {
  UIAlign,
  UIAssetRef,
  UIExport,
  UINodeDebugMeta,
  UINineSliceData,
  UINode,
  UIRootKind,
  UITextStyle
} from "@figma-pixi/shared";
import { parseLayerName } from "@figma-pixi/shared";
import { resolveNineSliceMinimumSize } from "@figma-pixi/shared";

export interface ExportedAssetFile {
  id: string;
  src: string;
  bytes: Uint8Array;
}

export interface ExportResult {
  json: UIExport;
  assets: ExportedAssetFile[];
  report: ExportReport;
}

export interface ExportSummary {
  nodeCount: number;
  rasterAssetCount: number;
  textNodeCount: number;
  buttonCount: number;
  nineSliceCount: number;
}

export interface ExportReport {
  warnings: string[];
  errors: string[];
  summary: ExportSummary;
}

export interface ExportUIOptions {
  useParentFrameAsCanvas?: boolean;
}

interface BuildContext {
  rootName: string;
  assets: ExportedAssetFile[];
  manifest: UIAssetRef[];
  assetBySignature: Map<string, UIAssetRef>;
  report: ExportReport;
}

const NINE_PLUGIN_DATA_KEY = "nineSlice";

type SupportedRoot = FrameNode | ComponentNode;

function isSupportedRoot(node: SceneNode): node is SupportedRoot {
  return node.type === "FRAME" || node.type === "COMPONENT";
}

function isSupportedCanvasNode(node: BaseNode | null): node is SupportedRoot {
  return Boolean(node && (node.type === "FRAME" || node.type === "COMPONENT"));
}

function hasChildren(node: SceneNode): node is SceneNode & ChildrenMixin {
  return "children" in node;
}

function isTextNode(node: SceneNode): node is TextNode {
  return node.type === "TEXT";
}

function collectVisibleTextDescendants(node: SceneNode, result: TextNode[] = []): TextNode[] {
  if (!node.visible) {
    return result;
  }

  const parsed = parseLayerName(node.name);
  if (parsed.tags.ignore) {
    return result;
  }

  if (isTextNode(node)) {
    result.push(node);
    return result;
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      collectVisibleTextDescendants(child, result);
    }
  }

  return result;
}

function isExportableNode(node: SceneNode): node is SceneNode & ExportMixin {
  return "exportAsync" in node;
}

function isVisible(node: SceneNode): boolean {
  return node.visible;
}

function readAbsolutePosition(node: SceneNode): { x: number; y: number } {
  return {
    x: node.absoluteTransform[0][2],
    y: node.absoluteTransform[1][2]
  };
}

function readRelativePosition(node: SceneNode, parent: SceneNode): { x: number; y: number } {
  const nodeAbs = readAbsolutePosition(node);
  const parentAbs = readAbsolutePosition(parent);

  return {
    x: nodeAbs.x - parentAbs.x,
    y: nodeAbs.y - parentAbs.y
  };
}

function readRelativeScale(node: SceneNode): { scaleX: number; scaleY: number } {
  const transform = "relativeTransform" in node ? node.relativeTransform : undefined;
  if (!transform) {
    return { scaleX: 1, scaleY: 1 };
  }

  return {
    scaleX: Math.hypot(transform[0][0], transform[1][0]),
    scaleY: Math.hypot(transform[0][1], transform[1][1])
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function isApproximately(value: number, expected: number, epsilon = 0.001): boolean {
  return Math.abs(value - expected) <= epsilon;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createSafeDefaultNineSlice(width: number, height: number): UINineSliceData {
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

function cleanId(id: string): string {
  return id.replace(/[:;]/g, "_");
}

function cleanFileName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.replace(/[^\w.-]/g, "_") : "node";
}

function buildInstanceKey(cleanName: string, nodeId: string | undefined, fallbackPath: string): string {
  const baseName = cleanFileName(cleanName || "node");
  const suffix = nodeId?.trim() ? cleanId(nodeId) : fallbackPath;
  return `${baseName}__${suffix || "node"}`;
}

function hashBytes(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function rootKindFromTags(tags: ReturnType<typeof parseLayerName>["tags"]): UIRootKind {
  if (tags.dialog) return "dialog";
  if (tags.hud) return "hud";
  if (tags.component) return "component";
  return "screen";
}

const ALIGN_VALUES = new Set<string>([
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "left-center",
  "right-center",
  "stretch-width",
  "stretch-height",
  "stretch-full"
]);

function pickNodeType(node: SceneNode, parsed: ReturnType<typeof parseLayerName>): UINode["type"] | null {
  const t = parsed.tags;
  if (t.ignore) return null;
  if (t.dialog) return "dialog";
  if (t.container) return "container";
  if (t.button) return "button";
  if (t.overlay) return "overlay";
  if (t.text) return "text";
  if (t.nine) return "nineSlice";
  if (t.image) return "image";
  if (t.raster) return "raster";

  if (node.type === "TEXT") return "text";
  if (node.type === "GROUP" || node.type === "COMPONENT" || node.type === "INSTANCE") return "raster";
  if (node.type === "FRAME") return "raster";
  return "raster";
}

function alignFromParsed(parsed: ReturnType<typeof parseLayerName>): UIAlign | undefined {
  return parsed.tags.align;
}

function readRawAlignTag(name: string): string | undefined {
  const match = name.match(/@align\(([^)]+)\)/i);
  return match?.[1]?.trim();
}

function readFontWeight(style: string): number | undefined {
  const key = style.toLowerCase().replace(/[\s_-]+/g, "");
  const weightByName: Record<string, number> = {
    thin: 100,
    extralight: 200,
    ultralight: 200,
    light: 300,
    regular: 400,
    normal: 400,
    medium: 500,
    semibold: 600,
    demibold: 600,
    bold: 700,
    extrabold: 800,
    ultrabold: 800,
    black: 900,
    heavy: 900
  };

  return weightByName[key];
}

function mapTextHorizontalAlign(value: TextNode["textAlignHorizontal"]): UITextStyle["align"] {
  switch (value) {
    case "LEFT":
      return "left";
    case "CENTER":
      return "center";
    case "RIGHT":
      return "right";
    case "JUSTIFIED":
      return "justify";
    default:
      throw new Error(`Unsupported Figma text horizontal align: ${String(value)}.`);
  }
}

function mapTextVerticalAlign(value: TextNode["textAlignVertical"]): UITextStyle["verticalAlign"] {
  switch (value) {
    case "TOP":
      return "top";
    case "CENTER":
      return "center";
    case "BOTTOM":
      return "bottom";
    default:
      throw new Error(`Unsupported Figma text vertical align: ${String(value)}.`);
  }
}

function mapTextAutoResize(value: TextNode["textAutoResize"]): UITextStyle["autoResize"] {
  switch (value) {
    case "NONE":
      return "none";
    case "HEIGHT":
      return "height";
    case "WIDTH_AND_HEIGHT":
      return "widthAndHeight";
    case "TRUNCATE":
      return "truncate";
    default:
      throw new Error(`Unsupported Figma text auto-resize mode: ${String(value)}.`);
  }
}

function textStyleHasFixedWidth(style: UITextStyle): boolean {
  return style.autoResize === "none" || style.autoResize === "height" || style.autoResize === "truncate";
}

function extractTextStyle(node: TextNode): UITextStyle {
  const lineHeight =
    node.lineHeight !== figma.mixed && node.lineHeight.unit !== "AUTO" ? node.lineHeight.value : undefined;
  const letterSpacing = node.letterSpacing !== figma.mixed ? node.letterSpacing.value : undefined;
  const autoResize = mapTextAutoResize(node.textAutoResize);

  const style: UITextStyle = {
    fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
    lineHeight,
    letterSpacing,
    align: mapTextHorizontalAlign(node.textAlignHorizontal),
    verticalAlign: mapTextVerticalAlign(node.textAlignVertical),
    autoResize,
    wordWrap: autoResize === "none" || autoResize === "height" || autoResize === "truncate"
  };

  if (node.fontName !== figma.mixed) {
    style.fontFamily = node.fontName.family;
    style.fontStyle = node.fontName.style.toLowerCase().includes("italic") ? "italic" : "normal";
    style.fontWeight = readFontWeight(node.fontName.style) ?? 400;
  }

  if (Array.isArray(node.fills)) {
    const solid = node.fills.find((fill) => fill.type === "SOLID");
    if (solid && solid.type === "SOLID") {
      style.fill = {
        r: Math.round(solid.color.r * 255),
        g: Math.round(solid.color.g * 255),
        b: Math.round(solid.color.b * 255),
        a: solid.opacity ?? 1
      };
    }
  }

  if (Array.isArray(node.strokes)) {
    const solid = node.strokes.find((stroke) => stroke.type === "SOLID");
    if (solid && solid.type === "SOLID") {
      style.stroke = {
        r: Math.round(solid.color.r * 255),
        g: Math.round(solid.color.g * 255),
        b: Math.round(solid.color.b * 255),
        a: solid.opacity ?? 1
      };
      style.strokeWidth = typeof node.strokeWeight === "number" ? node.strokeWeight : 1;
    }
  }

  return style;
}

function readNodeOpacity(node: SceneNode): number {
  return "opacity" in node ? node.opacity : 1;
}

function readNodeRotation(node: SceneNode): number {
  return "rotation" in node ? node.rotation : 0;
}

function readNineSlicePluginData(node: SceneNode): Partial<UINineSliceData> | undefined {
  if (!("getPluginData" in node)) {
    return undefined;
  }
  const raw = node.getPluginData(NINE_PLUGIN_DATA_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<UINineSliceData>;
    const out: Partial<UINineSliceData> = {};
    if (typeof parsed.left === "number") out.left = parsed.left;
    if (typeof parsed.top === "number") out.top = parsed.top;
    if (typeof parsed.right === "number") out.right = parsed.right;
    if (typeof parsed.bottom === "number") out.bottom = parsed.bottom;
    return out;
  } catch {
    return undefined;
  }
}

function coversFrame(node: UINode, frameWidth: number, frameHeight: number, epsilon = 0.5): boolean {
  return (
    node.x <= epsilon &&
    node.y <= epsilon &&
    node.x + node.width >= frameWidth - epsilon &&
    node.y + node.height >= frameHeight - epsilon
  );
}

function computeSafeAreaFromChildren(children: UINode[], frameWidth: number, frameHeight: number): UIExport["safeArea"] {
  if (!children.length) {
    return {
      x: 0,
      y: 0,
      width: round(frameWidth),
      height: round(frameHeight)
    };
  }

  const nonFullscreenChildren = children.filter((child) => !coversFrame(child, frameWidth, frameHeight));
  const source = nonFullscreenChildren.length > 0 ? nonFullscreenChildren : children;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const child of source) {
    if (child.width <= 0 || child.height <= 0) {
      continue;
    }

    minX = Math.min(minX, child.x);
    minY = Math.min(minY, child.y);
    maxX = Math.max(maxX, child.x + child.width);
    maxY = Math.max(maxY, child.y + child.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return {
      x: 0,
      y: 0,
      width: round(frameWidth),
      height: round(frameHeight)
    };
  }

  const x = clamp(minX, 0, frameWidth);
  const y = clamp(minY, 0, frameHeight);
  const right = clamp(maxX, 0, frameWidth);
  const bottom = clamp(maxY, 0, frameHeight);

  return {
    x: round(x),
    y: round(y),
    width: round(Math.max(0, right - x)),
    height: round(Math.max(0, bottom - y))
  };
}

async function exportAssetForNode(
  node: SceneNode,
  nodeName: string,
  ctx: BuildContext
): Promise<{ id: string; src: string; reused: boolean } | null> {
  if (!isExportableNode(node)) {
    return null;
  }

  let bytes: Uint8Array;
  try {
    bytes = await node.exportAsync({ format: "PNG" });
  } catch {
    ctx.report.errors.push(`Failed to export asset for "${nodeName}" (${node.id}).`);
    return null;
  }

  const hash = hashBytes(bytes);
  const cacheKey = `png:${hash}:${bytes.length}`;
  const existing = ctx.assetBySignature.get(cacheKey);
  if (existing) {
    return { id: existing.id, src: existing.src, reused: true };
  }

  const assetId = `asset_${hash}_${bytes.length}`;
  const fileName = `${cleanFileName(nodeName || node.name || "node")}_${hash}.png`;
  const src = `assets/ui/${cleanFileName(ctx.rootName)}/${fileName}`;
  const manifestEntry: UIAssetRef = {
    id: assetId,
    type: "image",
    src,
    width: Math.round(node.width),
    height: Math.round(node.height),
    scale: 1
  };

  ctx.assetBySignature.set(cacheKey, manifestEntry);
  ctx.manifest.push(manifestEntry);
  ctx.assets.push({ id: assetId, src, bytes });

  return { id: assetId, src, reused: false };
}

async function buildNode(
  node: SceneNode,
  parent: SceneNode,
  ctx: BuildContext,
  nodePath: string
): Promise<UINode | null> {
  if (!isVisible(node)) {
    ctx.report.warnings.push(`Hidden layer skipped: "${node.name}"`);
    return null;
  }

  const parsed = parseLayerName(node.name);
  if (parsed.tags.ignore) {
    return null;
  }

  const nodeType = pickNodeType(node, parsed);
  if (!nodeType) {
    return null;
  }

  const cleanName = parsed.cleanName || node.name;
  if (!cleanName.trim()) {
    ctx.report.warnings.push(`Unnamed layer detected at node id ${node.id}.`);
  }

  const rawAlign = readRawAlignTag(node.name);
  if (rawAlign && !ALIGN_VALUES.has(rawAlign)) {
    ctx.report.errors.push(`Unsupported @align value "${rawAlign}" on "${node.name}"`);
  }

  const relative = readRelativePosition(node, parent);
  const transformScale = readRelativeScale(node);
  const shouldExportExplicitScale = nodeType === "text";
  const hasExplicitScale =
    shouldExportExplicitScale &&
    (!isApproximately(transformScale.scaleX, 1) || !isApproximately(transformScale.scaleY, 1));
  const exportedWidth =
    shouldExportExplicitScale && transformScale.scaleX > 0 ? node.width / transformScale.scaleX : node.width;
  const exportedHeight =
    shouldExportExplicitScale && transformScale.scaleY > 0 ? node.height / transformScale.scaleY : node.height;
  const debug: UINodeDebugMeta = {
    figmaAbsolute: {
      x: round(readAbsolutePosition(node).x),
      y: round(readAbsolutePosition(node).y)
    },
    figmaRelative: {
      x: round(relative.x),
      y: round(relative.y)
    },
    figmaSize: {
      width: round(node.width),
      height: round(node.height)
    },
    exportedSize: {
      width: round(exportedWidth),
      height: round(exportedHeight)
    },
    transform: !isApproximately(transformScale.scaleX, 1) || !isApproximately(transformScale.scaleY, 1)
      ? {
          scaleX: round(transformScale.scaleX),
          scaleY: round(transformScale.scaleY)
        }
      : undefined
  };

  const instanceId = buildInstanceKey(cleanName, node.id, nodePath);

  const base = {
    id: instanceId,
    name: cleanName,
    type: nodeType,
    x: round(relative.x),
    y: round(relative.y),
    width: round(exportedWidth),
    height: round(exportedHeight),
    rotation: readNodeRotation(node),
    scaleX: hasExplicitScale ? round(transformScale.scaleX) : undefined,
    scaleY: hasExplicitScale ? round(transformScale.scaleY) : undefined,
    alpha: readNodeOpacity(node),
    visible: node.visible,
    align: alignFromParsed(parsed),
    debug
  } as const;

  ctx.report.summary.nodeCount += 1;

  if (nodeType === "container") {
    const children: UINode[] = [];
    if (hasChildren(node)) {
      for (const [childIndex, child] of node.children.entries()) {
        const built = await buildNode(child, node, ctx, `${nodePath}_${childIndex}`);
        if (built) {
          children.push(built);
        }
      }
    }
    return { ...base, type: "container", children };
  }

  if (nodeType === "dialog") {
    const children: UINode[] = [];
    if (hasChildren(node)) {
      for (const [childIndex, child] of node.children.entries()) {
        const built = await buildNode(child, node, ctx, `${nodePath}_${childIndex}`);
        if (built) {
          children.push(built);
        }
      }
    }
    return { ...base, type: "dialog", children };
  }

  if (nodeType === "button") {
    ctx.report.summary.buttonCount += 1;
    if (node.width <= 0 || node.height <= 0) {
      ctx.report.errors.push(`@button node must have valid width/height: "${node.name}"`);
    }
    const children: UINode[] = [];
    if (hasChildren(node)) {
      for (const [childIndex, child] of node.children.entries()) {
        const built = await buildNode(child, node, ctx, `${nodePath}_${childIndex}`);
        if (built) {
          children.push(built);
        }
      }
    }
    return {
      ...base,
      type: "button",
      hitArea: { x: 0, y: 0, width: node.width, height: node.height },
      children
    };
  }

  if (nodeType === "text" && !isTextNode(node)) {
    const textDescendants = collectVisibleTextDescendants(node);
    if (textDescendants.length !== 1) {
      ctx.report.errors.push(
        `@text wrapper "${cleanName}" must contain exactly one visible text layer; found ${textDescendants.length}.`
      );
      return null;
    }

    ctx.report.summary.textNodeCount += 1;
    const textNode = textDescendants[0];
    const textStyle = extractTextStyle(textNode);
    const textScale = readRelativeScale(textNode);
    const wrapWidth = round(exportedWidth);
    if (wrapWidth > 0 && textStyleHasFixedWidth(textStyle)) {
      textStyle.wordWrapWidth = wrapWidth;
      textStyle.wordWrap = true;
    }
    if (!textNode.characters || textNode.characters.trim().length === 0) {
      ctx.report.warnings.push(`Text node is empty: "${textNode.name}"`);
    }
    if (!textStyle.fontFamily && typeof textStyle.fontSize !== "number") {
      ctx.report.warnings.push(`Text style may be unreadable on "${textNode.name}"`);
    }
    return {
      ...base,
      type: "text",
      text: textNode.characters,
      style: textStyle,
      debug: {
        ...debug,
        text: {
          figmaWidth: round(textNode.width),
          figmaHeight: round(textNode.height),
          exportedWidth: round(exportedWidth),
          exportedHeight: round(exportedHeight),
          fontSize: textStyle.fontSize,
          lineHeight: textStyle.lineHeight,
          scaleX: round(textScale.scaleX),
          scaleY: round(textScale.scaleY),
          align: textStyle.align,
          verticalAlign: textStyle.verticalAlign,
          autoResize: textStyle.autoResize
        }
      }
    };
  }

  if (nodeType === "text" && isTextNode(node)) {
    ctx.report.summary.textNodeCount += 1;
    const textStyle = extractTextStyle(node);
    const textScale = readRelativeScale(node);
    const wrapWidth = round(exportedWidth);
    if (wrapWidth > 0 && textStyleHasFixedWidth(textStyle)) {
      textStyle.wordWrapWidth = wrapWidth;
      textStyle.wordWrap = true;
    }
    if (!node.characters || node.characters.trim().length === 0) {
      ctx.report.warnings.push(`Text node is empty: "${node.name}"`);
    }
    if (!textStyle.fontFamily && typeof textStyle.fontSize !== "number") {
      ctx.report.warnings.push(`Text style may be unreadable on "${node.name}"`);
    }
    return {
      ...base,
      type: "text",
      text: node.characters,
      style: textStyle,
      debug: {
        ...debug,
        text: {
          figmaWidth: round(node.width),
          figmaHeight: round(node.height),
          exportedWidth: round(exportedWidth),
          exportedHeight: round(exportedHeight),
          fontSize: textStyle.fontSize,
          lineHeight: textStyle.lineHeight,
          scaleX: round(textScale.scaleX),
          scaleY: round(textScale.scaleY),
          align: textStyle.align,
          verticalAlign: textStyle.verticalAlign,
          autoResize: textStyle.autoResize
        }
      }
    };
  }

  if (nodeType === "overlay") {
    return {
      ...base,
      type: "overlay",
      overlay: {
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: Math.min(1, Math.max(0, readNodeOpacity(node)))
      }
    };
  }

  if (nodeType === "nineSlice") {
    ctx.report.summary.nineSliceCount += 1;
    const asset = await exportAssetForNode(node, base.name, ctx);
    if (!asset) {
      ctx.report.errors.push(`Missing asset export for nineSlice node "${node.name}"`);
    } else if (!asset.reused) {
      ctx.report.summary.rasterAssetCount += 1;
    }
    const defaultSlice = createSafeDefaultNineSlice(node.width, node.height);
    const pluginSlice = readNineSlicePluginData(node);
    const slice: UINineSliceData = {
      left: pluginSlice?.left ?? parsed.nineSlice?.left ?? defaultSlice.left,
      top: pluginSlice?.top ?? parsed.nineSlice?.top ?? defaultSlice.top,
      right: pluginSlice?.right ?? parsed.nineSlice?.right ?? defaultSlice.right,
      bottom: pluginSlice?.bottom ?? parsed.nineSlice?.bottom ?? defaultSlice.bottom
    };
    if (!pluginSlice && !parsed.nineSlice) {
      ctx.report.warnings.push(`@nine node "${node.name}" used safe default slice values.`);
    }
    const minimumSize = resolveNineSliceMinimumSize(slice);
    if (base.width < minimumSize.width || base.height < minimumSize.height) {
      ctx.report.errors.push(
        `@nine "${node.name}" requires at least ` +
        `${minimumSize.width}x${minimumSize.height}, but its rendered size is ` +
        `${base.width}x${base.height}.`
      );
    }
    return {
      ...base,
      type: "nineSlice",
      assetId: asset?.id ?? `missing_${cleanId(node.id)}`,
      slice,
      minimumSize
    };
  }

  const asset = await exportAssetForNode(node, base.name, ctx);
  if (!asset) {
    ctx.report.errors.push(`Missing asset export for node "${node.name}"`);
  } else if (!asset.reused) {
    ctx.report.summary.rasterAssetCount += 1;
  }

  if (
    !parsed.tags.raster &&
    !parsed.tags.image &&
    !parsed.tags.nine &&
    !parsed.tags.text &&
    !parsed.tags.button &&
    !parsed.tags.container &&
    !parsed.tags.overlay &&
    node.type !== "TEXT"
  ) {
    ctx.report.warnings.push(`Unsupported/untagged node rasterized: "${node.name}"`);
  }

  if (nodeType === "image") {
    return {
      ...base,
      type: "image",
      assetId: asset?.id ?? `missing_${cleanId(node.id)}`
    };
  }

  return {
    ...base,
    type: "raster",
    assetId: asset?.id ?? `missing_${cleanId(node.id)}`
  };
}

export async function exportSelectedRootAsUI(options: ExportUIOptions = {}): Promise<ExportResult> {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    throw new Error("Select exactly one root node (frame or component).");
  }

  const rootNode = selection[0];
  if (!isSupportedRoot(rootNode)) {
    throw new Error("Selected node must be a Frame or Component.");
  }

  const canvasNode =
    options.useParentFrameAsCanvas !== false && isSupportedCanvasNode(rootNode.parent)
      ? rootNode.parent
      : rootNode;

  const rootParsed = parseLayerName(rootNode.name);
  const canvasParsed = parseLayerName(canvasNode.name);
  if (rootParsed.tags.ignore) {
    throw new Error("Selected root is tagged @ignore.");
  }

  const hasRootKindTag =
    rootParsed.tags.screen || rootParsed.tags.dialog || rootParsed.tags.hud || rootParsed.tags.component;

  const ctx: BuildContext = {
    rootName: canvasParsed.cleanName || canvasNode.name,
    assets: [],
    manifest: [],
    assetBySignature: new Map(),
    report: {
      warnings: [],
      errors: [],
      summary: {
        nodeCount: 0,
        rasterAssetCount: 0,
        textNodeCount: 0,
        buttonCount: 0,
        nineSliceCount: 0
      }
    }
  };

  if (!hasRootKindTag) {
    ctx.report.errors.push("Root must include one of: @screen, @dialog, @hud, @component");
  }

  const children: UINode[] = [];
  if (canvasNode === rootNode) {
    for (const [childIndex, child] of rootNode.children.entries()) {
      const built = await buildNode(child, rootNode, ctx, String(childIndex));
      if (built) {
        children.push(built);
      }
    }
  } else {
    const built = await buildNode(rootNode, canvasNode, ctx, "0");
    if (built) {
      children.push(built);
    }
  }

  const kind = canvasNode === rootNode ? rootKindFromTags(rootParsed.tags) : rootKindFromTags(canvasParsed.tags);
  const designSize = { width: round(canvasNode.width), height: round(canvasNode.height) };
  const scaleMode = kind === "screen" || kind === "hud" ? "fitWidth" : "fit";

  const json: UIExport = {
    version: 1,
    name: canvasParsed.cleanName || canvasNode.name,
    kind: canvasNode === rootNode && !canvasParsed.tags.screen && !canvasParsed.tags.dialog && !canvasParsed.tags.hud && !canvasParsed.tags.component ? kind : kind || "screen",
    designSize,
    scaleMode,
    safeArea: computeSafeAreaFromChildren(children, designSize.width, designSize.height),
    modal: (canvasNode === rootNode ? rootParsed.tags.modal : canvasParsed.tags.modal) ?? false,
    align: canvasNode === rootNode ? rootParsed.tags.align : canvasParsed.tags.align,
    children,
    assets: ctx.manifest
  };

  return { json, assets: ctx.assets, report: ctx.report };
}
