/// <reference types="@figma/plugin-typings" />

import {
  FIGMA_PIXI_UI_SCHEMA_VERSION,
  type FigmaPixiAlign,
  type FigmaPixiAsset,
  type FigmaPixiDocument,
  type FigmaPixiNode,
  type PaddingInsets,
  type Rect2D,
  type TextStyle
} from "../schema.js";
import {
  resolveNineSliceMinimumSize,
} from "../nineSliceCompatibility.js";
import type { AssetExportRequest, ExportedFigmaPixiUI, ExportOptions } from "./types.js";
import { buildAssetBaseName } from "./assetNaming.js";
import {
  NINE_SLICE_PLUGIN_KEY,
  parseNineSliceMetadataString,
  readNineSliceMetadataFromLayerName,
  resolveNineSliceMetadata
} from "./nineSlice.js";
import { parseLayerTags } from "./tagParser.js";
import type { ParsedTags } from "./tagParser.js";

type ExportableSceneNode = SceneNode & LayoutMixin;

const DEFAULT_ASSET_BASE_PATH = "assets/ui";
const DEFAULT_ASSET_SCALE = 1;
const CONTENT_LAYER_NAME = "@content";

interface RootContentMetadata {
  contentBounds: Rect2D;
  padding: PaddingInsets;
}

interface ConvertContext {
  parentNode: ExportableSceneNode;
  rootNode: ExportableSceneNode;
  rootName: string;
  parentOffset?: { x: number; y: number };
  assetBasePath: string;
  assetScale: number;
  includeHidden: boolean;
  assets: Map<string, FigmaPixiAsset>;
  assetRequests: AssetExportRequest[];
  warnings: string[];
  errors: string[];
}

function normalizeRootName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim() || "ExportedUI";
}

function stableId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function buildInstanceKey(cleanName: string, nodeId: string | undefined, fallbackPath: string): string {
  const baseName = stableId(cleanName.trim() || "node");
  const suffix = nodeId?.trim() ? stableId(nodeId) : fallbackPath;
  return `${baseName}__${suffix || "node"}`;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "ui-asset";
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function readBounds(node: LayoutMixin): Rect {
  const bounds = node.absoluteBoundingBox;
  if (!bounds) {
    throw new Error(`Node "${"name" in node ? node.name : "unknown"}" has no absolute bounds.`);
  }
  return bounds;
}

function readNineSliceRenderBounds(node: SceneNode & LayoutMixin): Rect {
  const bounds = node.absoluteRenderBounds;
  if (
    !bounds ||
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    throw new Error(`@nine node "${node.name}" has no visible rendered pixels.`);
  }
  return bounds;
}

function readRotation(node: SceneNode): number {
  return "rotation" in node && typeof node.rotation === "number" ? round(node.rotation) : 0;
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
    x: round(nodeAbs.x - parentAbs.x),
    y: round(nodeAbs.y - parentAbs.y)
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

function isApproximately(value: number, expected: number, epsilon = 0.001): boolean {
  return Math.abs(value - expected) <= epsilon;
}

function hexFromSolidFill(node: TextNode | SceneNode): { color?: string; alpha?: number } {
  if (!("fills" in node)) {
    return {};
  }
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) {
    return {};
  }
  const solid = fills.find((fill) => fill.visible !== false && fill.type === "SOLID");
  if (!solid || solid.type !== "SOLID") {
    return {};
  }
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, "0");
  return {
    color: `#${toHex(solid.color.r)}${toHex(solid.color.g)}${toHex(solid.color.b)}`,
    alpha: typeof solid.opacity === "number" ? solid.opacity : 1
  };
}

function readNineSliceMetadataFromPluginData(
  node: SceneNode,
  width: number,
  height: number
): ReturnType<typeof parseNineSliceMetadataString> {
  const raw = node.getPluginData(NINE_SLICE_PLUGIN_KEY);
  if (!raw) {
    return undefined;
  }
  return parseNineSliceMetadataString(raw, width, height);
}

function mapHorizontalAlign(value: TextNode["textAlignHorizontal"]): TextStyle["align"] {
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

function mapVerticalAlign(value: TextNode["textAlignVertical"]): TextStyle["verticalAlign"] {
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

function mapTextAutoResize(value: TextNode["textAutoResize"]): TextStyle["autoResize"] {
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

function textStyleHasFixedWidth(style: TextStyle): boolean {
  return style.autoResize === "none" || style.autoResize === "height" || style.autoResize === "truncate";
}

function readStrokeStyle(node: TextNode): Pick<TextStyle, "stroke" | "strokeWidth"> {
  if (!Array.isArray(node.strokes)) {
    return {};
  }

  const solid = node.strokes.find((stroke) => stroke.visible !== false && stroke.type === "SOLID");
  if (!solid || solid.type !== "SOLID") {
    return {};
  }

  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, "0");
  return {
    stroke: `#${toHex(solid.color.r)}${toHex(solid.color.g)}${toHex(solid.color.b)}`,
    strokeWidth: typeof node.strokeWeight === "number" ? round(node.strokeWeight) : 1
  };
}

function readTextStyle(node: TextNode): TextStyle {
  const fill = hexFromSolidFill(node);
  const stroke = readStrokeStyle(node);
  const fontName = node.fontName !== figma.mixed ? node.fontName : undefined;
  const fontSize = node.fontSize !== figma.mixed ? node.fontSize : 16;
  const lineHeight =
    node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS" ? node.lineHeight.value : undefined;
  const letterSpacing =
    node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS"
      ? node.letterSpacing.value
      : undefined;
  const autoResize = mapTextAutoResize(node.textAutoResize);

  return {
    fontFamily: fontName && "family" in fontName ? fontName.family : undefined,
    fontSize: round(Number(fontSize)),
    fontWeight: fontName && "style" in fontName ? fontName.style : undefined,
    lineHeight: lineHeight ? round(lineHeight) : undefined,
    letterSpacing: letterSpacing ? round(letterSpacing) : undefined,
    color: fill.color,
    fill: fill.color,
    stroke: stroke.stroke,
    strokeWidth: stroke.strokeWidth,
    alpha: fill.alpha,
    align: mapHorizontalAlign(node.textAlignHorizontal),
    verticalAlign: mapVerticalAlign(node.textAlignVertical),
    autoResize,
    wrap: autoResize === "none" || autoResize === "height" || autoResize === "truncate"
  };
}

function hasImageFill(paints: ReadonlyArray<Paint> | PluginAPI["mixed"]): boolean {
  return paints !== figma.mixed && paints.some((paint) => paint.visible !== false && paint.type === "IMAGE");
}

function hasNonSolidPaint(paints: ReadonlyArray<Paint> | PluginAPI["mixed"]): boolean {
  return paints !== figma.mixed && paints.some((paint) => paint.visible !== false && paint.type !== "SOLID");
}

function hasEffects(node: SceneNode): boolean {
  return "effects" in node && node.effects.some((effect) => effect.visible !== false);
}

function requiresRasterAsset(node: SceneNode): boolean {
  if ("fills" in node && hasImageFill(node.fills)) return true;
  if ("fills" in node && hasNonSolidPaint(node.fills)) return true;
  if ("strokes" in node && hasNonSolidPaint(node.strokes)) return true;
  return hasEffects(node);
}

function hasRenderableChildren(node: SceneNode): node is SceneNode & ChildrenMixin {
  return "children" in node && Array.isArray(node.children) && node.children.length > 0;
}

function collectVisibleTextDescendants(node: SceneNode, result: TextNode[] = []): TextNode[] {
  if ("visible" in node && !node.visible) {
    return result;
  }

  const tags = parseLayerTags(node.name);
  if (tags.ignore) {
    return result;
  }

  if (node.type === "TEXT") {
    result.push(node);
    return result;
  }

  if (hasRenderableChildren(node)) {
    for (const child of getChildrenInPaintOrder(node)) {
      collectVisibleTextDescendants(child, result);
    }
  }

  return result;
}

function isContentMetadataNode(node: SceneNode): boolean {
  return node.name === CONTENT_LAYER_NAME;
}

function getChildrenInPaintOrder(node: SceneNode & ChildrenMixin): SceneNode[] {
  const children = [...node.children];
  if ("itemReverseZIndex" in node && node.itemReverseZIndex) {
    children.reverse();
  }
  return children;
}

function readComponentName(node: SceneNode): string | undefined {
  if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
    return node.name;
  }

  const mainComponent = (node as { mainComponent?: { name?: string } | null }).mainComponent;
  return typeof mainComponent?.name === "string" && mainComponent.name.trim() ? mainComponent.name : undefined;
}

function readContextName(node: SceneNode): string {
  return parseLayerTags(node.name).cleanName || node.name;
}

function registerAsset(
  node: SceneNode,
  cleanName: string,
  bounds: Rect,
  context: ConvertContext,
  tags: ParsedTags
): FigmaPixiAsset {
  const assetId = `asset-${stableId(node.id)}`;
  const assetName = buildAssetBaseName({
    rawName: node.name,
    cleanName,
    assetName: tags.assetName,
    componentName: readComponentName(node),
    parentName: context.parentNode && context.parentNode !== node ? readContextName(context.parentNode) : undefined,
    rootName: context.rootName,
    fallbackHash: stableId(node.id)
  });
  const fileName = `${assetName.name}.png`;
  const src = `${context.assetBasePath}/${normalizeRootName(context.rootName)}/${fileName}`;

  if (!context.assets.has(assetId)) {
    context.assets.set(assetId, {
      id: assetId,
      name: assetName.name,
      src,
      width: round(bounds.width * context.assetScale),
      height: round(bounds.height * context.assetScale),
      scale: context.assetScale,
      mimeType: "image/png",
      nameSource: assetName.source
    });
    context.assetRequests.push({
      assetId,
      nodeId: node.id,
      fileName,
      name: assetName.name,
      nameSource: assetName.source,
      explicitName: assetName.source === "explicit",
      scale: context.assetScale
    });
  }

  return context.assets.get(assetId)!;
}

function readAlign(tagAlign: FigmaPixiAlign | undefined): FigmaPixiAlign | undefined {
  return tagAlign;
}

function validateName(cleanName: string, rawName: string, context: ConvertContext): void {
  if (cleanName.length === 0) {
    context.warnings.push(`Unnamed layer found ("${rawName}")`);
    return;
  }
  if (cleanName.includes("@")) {
    context.errors.push(`Raw tags leaked into exported name "${cleanName}"`);
  }
}

function readRootContentMetadata(root: ExportableSceneNode, warnings: string[]): RootContentMetadata | undefined {
  if (!hasRenderableChildren(root)) {
    return undefined;
  }

  const contentLayers = getChildrenInPaintOrder(root).filter((child) => isContentMetadataNode(child));
  if (contentLayers.length === 0) {
    return undefined;
  }

  if (contentLayers.length > 1) {
    warnings.push(`Multiple ${CONTENT_LAYER_NAME} layers found in "${root.name}". Using the first one.`);
  }

  const contentLayer = contentLayers[0] as ExportableSceneNode;
  const rootBounds = readBounds(root);
  const contentBounds = readBounds(contentLayer);
  const relative = readRelativePosition(contentLayer, root);
  const normalizedBounds: Rect2D = {
    x: relative.x,
    y: relative.y,
    width: round(contentBounds.width),
    height: round(contentBounds.height)
  };

  return {
    contentBounds: normalizedBounds,
    padding: {
      left: normalizedBounds.x,
      top: normalizedBounds.y,
      right: round(rootBounds.width - normalizedBounds.x - normalizedBounds.width),
      bottom: round(rootBounds.height - normalizedBounds.y - normalizedBounds.height)
    }
  };
}

function convertNode(node: ExportableSceneNode, context: ConvertContext, nodePath: string): FigmaPixiNode | null {
  if (isContentMetadataNode(node)) {
    return null;
  }

  if (!context.includeHidden && "visible" in node && !node.visible) {
    context.warnings.push(`Hidden layer skipped: "${node.name}"`);
    return null;
  }

  const tags = parseLayerTags(node.name);
  if (tags.ignore) {
    return null;
  }

  if (tags.unsupportedAlign) {
    context.errors.push(`Unsupported @align value "${tags.unsupportedAlign}" on "${node.name}"`);
  }

  const cleanName = tags.cleanName || node.name;
  validateName(cleanName, node.name, context);

  const layoutBounds = readBounds(node);
  const bounds = tags.nine ? readNineSliceRenderBounds(node) : layoutBounds;
  const parentAbsolute = readAbsolutePosition(context.parentNode);
  const relative = tags.nine
    ? {
        x: round(bounds.x - parentAbsolute.x),
        y: round(bounds.y - parentAbsolute.y)
      }
    : readRelativePosition(node, context.parentNode);
  const parentOffsetX = context.parentOffset?.x ?? 0;
  const parentOffsetY = context.parentOffset?.y ?? 0;
  const scale = readRelativeScale(node);
  const hasExplicitScale =
    !tags.nine && (!isApproximately(scale.scaleX, 1) || !isApproximately(scale.scaleY, 1));
  const width = round(
    tags.nine ? bounds.width : node.type === "TEXT" && scale.scaleX > 0 ? node.width / scale.scaleX : node.width
  );
  const height = round(
    tags.nine ? bounds.height : node.type === "TEXT" && scale.scaleY > 0 ? node.height / scale.scaleY : node.height
  );

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    context.errors.push(`Node "${cleanName}" has invalid width/height (${width}x${height})`);
    return null;
  }

  const instanceId = buildInstanceKey(cleanName, node.id, nodePath);

  const base = {
    id: instanceId,
    name: cleanName,
    x: round(relative.x - parentOffsetX),
    y: round(relative.y - parentOffsetY),
    width,
    height,
    // A rendered-bounds PNG is already a flattened, axis-aligned image. Reapplying
    // the Figma transform would rotate/scale the exported pixels a second time.
    rotation: tags.nine ? 0 : readRotation(node),
    scaleX: hasExplicitScale ? round(scale.scaleX) : undefined,
    scaleY: hasExplicitScale ? round(scale.scaleY) : undefined,
    alpha: "opacity" in node ? round(node.opacity) : 1,
    visible: "visible" in node ? node.visible : true,
    align: readAlign(tags.align),
    debug: {
      figmaAbsolute: tags.nine
        ? { x: round(bounds.x), y: round(bounds.y) }
        : { x: round(readAbsolutePosition(node).x), y: round(readAbsolutePosition(node).y) },
      figmaRelative: { x: relative.x, y: relative.y },
      figmaSize: { width: round(node.width), height: round(node.height) },
      exportedSize: { width, height },
      transform: hasExplicitScale ? { scaleX: round(scale.scaleX), scaleY: round(scale.scaleY) } : undefined
    }
  } as const;

  if (tags.dialog) {
    const children: FigmaPixiNode[] = [];
    if (hasRenderableChildren(node)) {
      for (const [childIndex, child] of getChildrenInPaintOrder(node).entries()) {
        const converted = convertNode(child as ExportableSceneNode, {
          ...context,
          parentNode: node,
          parentOffset: undefined
        }, `${nodePath}_${childIndex}`);
        if (converted) {
          children.push(converted);
        }
      }
    }
    return {
      ...base,
      type: "dialog",
      children
    };
  }

  if (tags.raster) {
    const asset = registerAsset(node, cleanName, bounds, context, tags);
    const minimumSize = resolveNineSliceMinimumSize(sliceMetadata.insets);
    if (width < minimumSize.width || height < minimumSize.height) {
      context.errors.push(
        `@nine "${cleanName}" requires at least ` +
        `${minimumSize.width}x${minimumSize.height}, but its rendered size is ` +
        `${width}x${height}.`
      );
    }
    return {
      ...base,
      type: "raster",
      assetId: asset.id,
      asset: asset.src
    };
  }

  if (tags.text && node.type !== "TEXT") {
    const textDescendants = collectVisibleTextDescendants(node);
    if (textDescendants.length !== 1) {
      context.errors.push(
        `@text wrapper "${cleanName}" must contain exactly one visible text layer; found ${textDescendants.length}.`
      );
      return null;
    }

    const textNode = textDescendants[0];
    const style = readTextStyle(textNode);
    if (width > 0 && textStyleHasFixedWidth(style)) {
      style.wrap = true;
      style.wordWrapWidth = width;
    }
    const textScale = readRelativeScale(textNode);
    return {
      ...base,
      type: "text",
      text: textNode.characters,
      style,
      debug: {
        ...base.debug,
        text: {
          figmaWidth: round(textNode.width),
          figmaHeight: round(textNode.height),
          exportedWidth: width,
          exportedHeight: height,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          scaleX: round(textScale.scaleX),
          scaleY: round(textScale.scaleY),
          align: style.align,
          verticalAlign: style.verticalAlign,
          autoResize: style.autoResize
        }
      }
    };
  }

  if ((tags.text || node.type === "TEXT") && node.type === "TEXT") {
    const style = readTextStyle(node);
    if (width > 0 && textStyleHasFixedWidth(style)) {
      style.wrap = true;
      style.wordWrapWidth = width;
    }
    return {
      ...base,
      type: "text",
      text: node.characters,
      style,
      debug: {
        ...base.debug,
        text: {
          figmaWidth: round(node.width),
          figmaHeight: round(node.height),
          exportedWidth: width,
          exportedHeight: height,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          scaleX: round(scale.scaleX),
          scaleY: round(scale.scaleY),
          align: style.align,
          verticalAlign: style.verticalAlign,
          autoResize: style.autoResize
        }
      }
    };
  }

  if (tags.overlay) {
    const fill = hexFromSolidFill(node);
    return {
      ...base,
      type: "overlay",
      overlay: {
        color: fill.color
          ? hexToRgb(fill.color)
          : {
              r: 0,
              g: 0,
              b: 0,
              a: 1
            },
        opacity: typeof fill.alpha === "number" ? fill.alpha : 1
      }
    };
  }

  if (tags.nine) {
    const storedMetadata = readNineSliceMetadataFromPluginData(node, width, height);
    const legacyNameMetadata = readNineSliceMetadataFromLayerName(node.name, width, height);
    const sliceMetadata = resolveNineSliceMetadata(storedMetadata, legacyNameMetadata, width, height);

    if (sliceMetadata.source === "auto") {
      context.warnings.push(`@nine auto-detected slice used for "${cleanName}"`);
    } else if (sliceMetadata.source === "default") {
      context.warnings.push(`@nine safe default slice used for "${cleanName}"`);
    } else if (!storedMetadata && legacyNameMetadata) {
      context.warnings.push(`@nine manual slice read from layer name for "${cleanName}"`);
    }
    if (sliceMetadata.warnings?.length) {
      for (const warning of sliceMetadata.warnings) {
        context.warnings.push(`@nine "${cleanName}": ${warning}`);
      }
    }

    const asset = registerAsset(node, cleanName, bounds, context, tags);
    return {
      ...base,
      type: "nineSlice",
      assetId: asset.id,
      asset: asset.src,
      slice: sliceMetadata.insets,
      minimumSize
    };
  }

  if (tags.button) {
    const children: FigmaPixiNode[] = [];
    if (hasRenderableChildren(node)) {
      for (const [childIndex, child] of getChildrenInPaintOrder(node).entries()) {
        const converted = convertNode(child as ExportableSceneNode, {
          ...context,
          parentNode: node,
          parentOffset: undefined
        }, `${nodePath}_${childIndex}`);
        if (converted) {
          children.push(converted);
        }
      }
    }
    return {
      ...base,
      type: "button",
      hitArea: { x: 0, y: 0, width, height },
      children
    };
  }

  if (tags.container) {
    const children: FigmaPixiNode[] = [];
    if (hasRenderableChildren(node)) {
      for (const [childIndex, child] of getChildrenInPaintOrder(node).entries()) {
        const converted = convertNode(child as ExportableSceneNode, {
          ...context,
          parentNode: node,
          parentOffset: undefined
        }, `${nodePath}_${childIndex}`);
        if (converted) {
          children.push(converted);
        }
      }
    }
    return {
      ...base,
      type: "container",
      children
    };
  }

  if (tags.image) {
    const asset = registerAsset(node, cleanName, bounds, context, tags);
    return {
      ...base,
      type: "image",
      assetId: asset.id,
      asset: asset.src
    };
  }

  if (hasRenderableChildren(node) && !requiresRasterAsset(node) && !tags.raster) {
    const children: FigmaPixiNode[] = [];
    for (const [childIndex, child] of getChildrenInPaintOrder(node).entries()) {
      const converted = convertNode(child as ExportableSceneNode, {
        ...context,
        parentNode: node,
        parentOffset: undefined
      }, `${nodePath}_${childIndex}`);
      if (converted) {
        children.push(converted);
      }
    }
    return {
      ...base,
      type: "container",
      children
    };
  }

  const asset = registerAsset(node, cleanName, bounds, context, tags);
  if (!tags.raster && !tags.image && !tags.text && !tags.button && !tags.container && !tags.overlay) {
    context.warnings.push(`Unsupported node rasterized: "${cleanName}" (${node.type})`);
  }
  return {
    ...base,
    type: "raster",
    assetId: asset.id,
    asset: asset.src
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
    a: 1
  };
}

export function exportFigmaSelectionToPixiUI(
  root: ExportableSceneNode,
  options: ExportOptions = {}
): ExportedFigmaPixiUI {
  const canvasRoot =
    options.useParentFrameAsCanvas !== false &&
    root.parent &&
    root.parent.type === "FRAME"
      ? (root.parent as ExportableSceneNode)
      : root;
  const warnings: string[] = [];
  const errors: string[] = [];
  const canvasBounds = readBounds(canvasRoot);
  const rootContentMetadata = readRootContentMetadata(canvasRoot, warnings);
  const rootTags = parseLayerTags(root.name);
  const canvasTags = parseLayerTags(canvasRoot.name);
  if (!rootTags.kind) {
    errors.push("Root must be tagged with @screen, @dialog, @hud, or @component.");
  }
  if (rootTags.cleanName.length === 0) {
    errors.push("Root clean name is empty after parsing tags.");
  }
  if (rootTags.unsupportedAlign) {
    errors.push(`Unsupported root @align value "${rootTags.unsupportedAlign}"`);
  }

  const assetBasePath =
    options.assetBasePath !== undefined && options.assetBasePath !== null
      ? options.assetBasePath
      : DEFAULT_ASSET_BASE_PATH;
  const assetScale =
    options.assetScale !== undefined && options.assetScale !== null
      ? options.assetScale
      : DEFAULT_ASSET_SCALE;

  const context: ConvertContext = {
    parentNode: canvasRoot === root ? root : canvasRoot,
    rootNode: canvasRoot,
    rootName: canvasTags.cleanName || canvasRoot.name,
    parentOffset: rootContentMetadata
      ? {
          x: rootContentMetadata.contentBounds.x,
          y: rootContentMetadata.contentBounds.y
        }
      : undefined,
    assetBasePath,
    assetScale,
    includeHidden:
      options.includeHidden !== undefined && options.includeHidden !== null
        ? options.includeHidden
        : false,
    assets: new Map<string, FigmaPixiAsset>(),
    assetRequests: [],
    warnings,
    errors
  };

  const children: FigmaPixiNode[] = [];
  if (canvasRoot === root) {
    if ("children" in root && Array.isArray(root.children)) {
      for (const [childIndex, child] of getChildrenInPaintOrder(root as SceneNode & ChildrenMixin).entries()) {
        const converted = convertNode(child as ExportableSceneNode, {
          ...context,
          parentNode: root,
          parentOffset: context.parentOffset
        }, String(childIndex));
        if (converted) {
          children.push(converted);
        }
      }
    }
  } else {
    const converted = convertNode(root, {
      ...context,
      parentNode: canvasRoot,
      parentOffset: context.parentOffset
    }, "0");
    if (converted) {
      children.push(converted);
    }
  }

  const rootName = canvasTags.cleanName || canvasRoot.name;
  if (rootName.includes("@")) {
    errors.push(`Raw tags leaked into exported root name "${rootName}"`);
  }

  const kind = canvasRoot === root ? rootTags.kind || "screen" : canvasTags.kind || "screen";
  const scaleMode = kind === "screen" || kind === "hud" ? "fitWidth" : "fit";

  const document: FigmaPixiDocument = {
    version: FIGMA_PIXI_UI_SCHEMA_VERSION,
    name: rootName,
    kind,
    designSize: {
      width: round(canvasBounds.width),
      height: round(canvasBounds.height)
    },
    scaleMode,
    safeArea: {
      x: 0,
      y: 0,
      width: round(canvasBounds.width),
      height: round(canvasBounds.height)
    },
    contentBounds: rootContentMetadata?.contentBounds,
    padding: rootContentMetadata?.padding,
    modal: Boolean(canvasRoot === root ? rootTags.modal : canvasTags.modal),
    align: canvasRoot === root ? rootTags.align : canvasTags.align,
    children,
    assets: Array.from(context.assets.values()),
    meta: {
      source: "figma",
      exportedRootId: canvasRoot.id,
      validation: {
        warnings,
        errors
      }
    }
  };

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return {
    document,
    assetRequests: context.assetRequests,
    warnings,
    errors
  };
}
