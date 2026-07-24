import type {
  BaseUINode,
  UIAssetRef,
  UIAlign,
  UIColor,
  UIExport,
  UIImageNode,
  UINineSliceNode,
  UINode,
  UIOverlayNode,
  UIRect,
  UIRasterNode,
  UITextNode
} from "@figma-pixi/shared";
import {
  Assets,
  Color,
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
  Texture,
  type TextStyleOptions
} from "pixi.js";
import { UIButton } from "./uiButton.js";
import { UIDialog, UIScreen } from "./uiScreen.js";

function applyBase(node: BaseUINode, display: Container): void {
  display.position.set(node.x, node.y);
  display.rotation = ((node.rotation ?? 0) * Math.PI) / 180;
  display.scale.set(node.scaleX ?? 1, node.scaleY ?? 1);
  display.alpha = node.alpha ?? 1;
  display.visible = node.visible ?? true;

  if ("anchor" in display && node.anchor) {
    (display as unknown as { anchor: { set(x: number, y: number): void } }).anchor.set(
      node.anchor.x,
      node.anchor.y
    );
  }

  if (node.pivot) {
    display.pivot.set(node.pivot.x, node.pivot.y);
  }

  if (node.offsetX !== undefined || node.offsetY !== undefined) {
    display.position.x += node.offsetX ?? 0;
    display.position.y += node.offsetY ?? 0;
  }

  if (node.type === "text" && display instanceof Text) {
    applyTextBoxAlignment(node as UITextNode, display);
  }
}

type FontFaceSetLike = {
  ready?: Promise<unknown>;
  check?: (font: string) => boolean;
};

function getDocumentFonts(): FontFaceSetLike | undefined {
  const maybeDocument = (globalThis as { document?: { fonts?: FontFaceSetLike } }).document;
  return maybeDocument?.fonts;
}

async function waitForDocumentFonts(): Promise<void> {
  const fonts = getDocumentFonts();
  if (!fonts?.ready) {
    return;
  }

  try {
    await Promise.race([
      fonts.ready,
      new Promise<void>((resolve) => {
        setTimeout(resolve, 1500);
      })
    ]);
  } catch (error) {
    console.warn(`[UIFactory] document.fonts.ready failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function warnIfFontUnavailable(fontFamily: TextStyleOptions["fontFamily"], nodeName: string): void {
  const fonts = getDocumentFonts();
  if (!fonts?.check || !fontFamily) {
    return;
  }

  const primaryFont = String(Array.isArray(fontFamily) ? fontFamily[0] : fontFamily)
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!primaryFont) {
    console.warn(`[UIFactory] Text node "${nodeName}" is missing fontFamily; using fallback font.`);
    return;
  }

  try {
    if (!fonts.check(`12px "${primaryFont}"`)) {
      console.warn(`[UIFactory] Font "${primaryFont}" is not available for text node "${nodeName}"; using fallback font.`);
    }
  } catch (error) {
    console.warn(`[UIFactory] Could not check font "${primaryFont}" for "${nodeName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

function toPixiColor(color?: UIColor): Color | undefined {
  if (!color) {
    return undefined;
  }
  return new Color({ r: color.r / 255, g: color.g / 255, b: color.b / 255 });
}

function toHexColorNumber(color: UIColor): number {
  return ((color.r & 0xff) << 16) | ((color.g & 0xff) << 8) | (color.b & 0xff);
}

function normalizeTextFill(fill: string | number | UIColor): TextStyleOptions["fill"] {
  if (typeof fill === "number") {
    return fill;
  }

  if (typeof fill === "object") {
    return toHexColorNumber(fill);
  }

  const match = fill.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (match) {
    return Number.parseInt(match[1], 16);
  }

  return fill;
}

function normalizeStrokeColor(fill: string | number | UIColor): string | number {
  if (typeof fill === "number") {
    return fill;
  }

  if (typeof fill === "object") {
    return toHexColorNumber(fill);
  }

  const match = fill.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (match) {
    return Number.parseInt(match[1], 16);
  }

  return fill;
}

function textStyleHasFixedWidth(node: UITextNode): boolean {
  const legacyWrap = Boolean((node.style as { wrap?: boolean }).wrap);
  const autoResize = node.style.autoResize as string | undefined;
  let autoResizeHasFixedWidth = false;
  if (autoResize !== undefined) {
    switch (autoResize) {
      case "none":
      case "height":
      case "truncate":
        autoResizeHasFixedWidth = true;
        break;
      case "widthAndHeight":
        autoResizeHasFixedWidth = false;
        break;
      default:
        throw new Error(`Unsupported text auto-resize mode "${autoResize}" on "${node.name}".`);
    }
  }

  return (
    autoResizeHasFixedWidth ||
    node.style.wordWrap === true ||
    node.style.wordWrapWidth !== undefined ||
    legacyWrap
  );
}

function textHorizontalAlignmentFactor(node: UITextNode): number {
  const align = node.style.align as string | undefined;
  switch (align) {
    case undefined:
    case "left":
    case "justify":
      return 0;
    case "center":
      return 0.5;
    case "right":
      return 1;
    default:
      throw new Error(`Unsupported text horizontal align "${align}" on "${node.name}".`);
  }
}

function textVerticalAlignmentFactor(node: UITextNode): number {
  const verticalAlign = node.style.verticalAlign as string | undefined;
  if (!verticalAlign) {
    return 0;
  }

  switch (verticalAlign) {
    case "top":
      return 0;
    case "center":
      return 0.5;
    case "bottom":
      return 1;
    default:
      throw new Error(`Unsupported text vertical align "${verticalAlign}" on "${node.name}".`);
  }
}

function applyTextBoxAlignment(node: UITextNode, display: Text): void {
  if (!textStyleHasFixedWidth(node)) {
    return;
  }

  const boxWidth = node.width * (node.scaleX ?? 1);
  const renderedWidth = display.width;
  const horizontalOffset = Math.max(0, boxWidth - renderedWidth) * textHorizontalAlignmentFactor(node);
  const boxHeight = node.height * (node.scaleY ?? 1);
  const renderedHeight = display.height;
  const verticalOffset = Math.max(0, boxHeight - renderedHeight) * textVerticalAlignmentFactor(node);

  display.position.x += horizontalOffset;
  display.position.y += verticalOffset;
}

function createText(node: UITextNode): Text {
  if (!node.text) {
    console.warn(`[UIFactory] Text node "${node.name}" has empty text.`);
  }
  if (node.width <= 0 || node.height <= 0) {
    console.warn(`[UIFactory] Text node "${node.name}" has zero width or height (${node.width}x${node.height}).`);
  }

  const normalizedFontWeight = normalizeFontWeight(node.style.fontWeight);
  const shouldUseTextBox = textStyleHasFixedWidth(node);
  const style: TextStyleOptions = {
    fontFamily: resolveFontFamily(node.style.fontFamily),
    fontSize: node.style.fontSize ?? 24,
    align: node.style.align ?? "left",
    wordWrap: shouldUseTextBox || Boolean((node.style as { wrap?: boolean }).wrap),
    wordWrapWidth:
      shouldUseTextBox || node.style.wordWrapWidth !== undefined ? node.style.wordWrapWidth ?? node.width : undefined
  };
  if (normalizedFontWeight !== undefined) {
    style.fontWeight = normalizedFontWeight;
  }
  if (node.style.fontStyle !== undefined) {
    style.fontStyle = node.style.fontStyle;
  }
  if (node.style.lineHeight !== undefined) {
    style.lineHeight = node.style.lineHeight;
  }
  if (node.style.letterSpacing !== undefined) {
    style.letterSpacing = node.style.letterSpacing;
  }

  if (node.style.fill !== undefined) {
    style.fill = normalizeTextFill(node.style.fill);
  } else {
    if (node.style.color) {
      style.fill = normalizeTextFill(node.style.color);
    }
  }
  if (style.fill === undefined) {
    style.fill = "#ffffff";
  }
  if (node.style.stroke !== undefined) {
    style.stroke = {
      color: normalizeStrokeColor(node.style.stroke),
      width: node.style.strokeWidth ?? 1
    };
  }

  warnIfFontUnavailable(style.fontFamily, node.name);
  if ((node.scaleX !== undefined || node.scaleY !== undefined) && node.scaleX !== node.scaleY) {
    console.warn(
      `[UIFactory] Text node "${node.name}" has non-uniform scale (${String(node.scaleX ?? 1)}, ${String(node.scaleY ?? 1)}).`
    );
  }

  let textNode: Text;
  try {
    textNode = new Text({
      text: node.text ?? "",
      style: new TextStyle(style)
    });
  } catch (error) {
    console.warn(`[UIFactory] PIXI.Text creation failed for "${node.name}": ${error instanceof Error ? error.message : String(error)}`);
    textNode = new Text({ text: node.text ?? "", style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 24 } });
  }

  if (shouldUseTextBox && node.width > 0) {
    textNode.style.wordWrap = true;
    textNode.style.wordWrapWidth = node.style.wordWrapWidth ?? node.width;
  }

  console.info(
    `[UIFactory][text] node="${node.name}" text="${node.text}" fontFamily="${String(style.fontFamily)}" fontSize=${String(style.fontSize)} fill=${String(style.fill)}`
  );

  return textNode;
}

function resolveFontFamily(fontFamily?: string): TextStyleOptions["fontFamily"] {
  const fallbacks = ["Arial", "Helvetica", "sans-serif"];
  const primary = fontFamily?.trim();

  if (!primary) {
    return fallbacks.join(", ");
  }

  const parts = primary
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^['"]|['"]$/g, ""));

  if (!parts.length) {
    return fallbacks.join(", ");
  }

  const seen = new Set(parts.map((part) => part.toLowerCase()));
  for (const fallback of fallbacks) {
    if (!seen.has(fallback.toLowerCase())) {
      parts.push(fallback);
    }
  }

  return parts;
}

function normalizeFontWeight(weight: UITextNode["style"]["fontWeight"]): TextStyleOptions["fontWeight"] | undefined {
  if (weight === undefined || weight === null) {
    return undefined;
  }

  if (typeof weight === "number") {
    return String(weight) as TextStyleOptions["fontWeight"];
  }

  const normalized = String(weight).trim();
  if (!normalized) {
    return undefined;
  }

  const key = normalized.toLowerCase().replace(/[\s_-]+/g, "");
  const weightByName: Record<string, TextStyleOptions["fontWeight"]> = {
    thin: "100",
    extralight: "200",
    ultralight: "200",
    light: "300",
    regular: "normal",
    normal: "normal",
    medium: "500",
    semibold: "600",
    demibold: "600",
    bold: "bold",
    extrabold: "800",
    ultrabold: "800",
    black: "900",
    heavy: "900"
  };

  if (weightByName[key]) {
    return weightByName[key];
  }

  if (/^\d{3}$/.test(normalized)) {
    return normalized as TextStyleOptions["fontWeight"];
  }

  return normalized as TextStyleOptions["fontWeight"];
}

function createOverlay(node: UIOverlayNode): Graphics {
  const graphics = new Graphics();
  const color = toPixiColor(node.overlay.color);
  graphics.rect(0, 0, node.width, node.height);
  graphics.fill({
    color: color ?? new Color(0x000000),
    alpha: node.overlay.opacity
  });
  return graphics;
}

function createMissingAssetPlaceholder(width: number, height: number): Graphics {
  const w = Math.max(2, width);
  const h = Math.max(2, height);
  const g = new Graphics();
  g.rect(0, 0, w, h);
  g.fill({ color: 0xff00ff, alpha: 0.3 });
  g.rect(0, 0, w, h);
  g.stroke({ color: 0xff00ff, width: 2, alpha: 1 });
  g.moveTo(0, 0);
  g.lineTo(w, h);
  g.moveTo(w, 0);
  g.lineTo(0, h);
  g.stroke({ color: 0xff00ff, width: 2, alpha: 1 });
  return g;
}

function warnIfSpriteAspectMismatch(node: AssetBackedNode, texture: Texture): void {
  if (node.type === "nineSlice" || node.width <= 0 || node.height <= 0) {
    return;
  }

  const textureWidth = texture.orig.width;
  const textureHeight = texture.orig.height;
  if (textureWidth <= 0 || textureHeight <= 0) {
    return;
  }

  const textureAspect = textureWidth / textureHeight;
  const nodeAspect = node.width / node.height;
  if (Math.abs(textureAspect - nodeAspect) > 0.01) {
    console.warn(
      `[UIFactory] Aspect ratio mismatch for "${node.name}": texture=${textureWidth}x${textureHeight}, node=${node.width}x${node.height}.`
    );
  }
}

function isTrimmedTexture(texture: Texture): boolean {
  return Boolean(
    texture.trim &&
      (texture.trim.x !== 0 ||
        texture.trim.y !== 0 ||
        texture.trim.width !== texture.orig.width ||
        texture.trim.height !== texture.orig.height)
  );
}

function createTextureSlice(texture: Texture, x: number, y: number, width: number, height: number): Texture {
  return new Texture({
    source: texture.source,
    frame: new Rectangle(texture.frame.x + x, texture.frame.y + y, width, height),
    orig: new Rectangle(0, 0, width, height),
    rotate: texture.rotate
  });
}

class HorizontalThreeSliceSprite extends Container {
  private readonly leftSourceWidth: number;
  private readonly rightSourceWidth: number;
  private readonly leftSprite?: Sprite;
  private readonly centerSprite?: Sprite;
  private readonly rightSprite?: Sprite;
  private _layoutWidth: number;
  private _layoutHeight: number;

  constructor(texture: Texture, leftWidth: number, rightWidth: number) {
    super();

    const sourceWidth = texture.width;
    const sourceHeight = texture.height;
    const clampedLeft = Math.max(0, Math.min(leftWidth, sourceWidth));
    const clampedRight = Math.max(0, Math.min(rightWidth, Math.max(0, sourceWidth - clampedLeft)));
    const centerSourceWidth = Math.max(0, sourceWidth - clampedLeft - clampedRight);

    this.leftSourceWidth = clampedLeft;
    this.rightSourceWidth = clampedRight;
    this._layoutWidth = sourceWidth;
    this._layoutHeight = sourceHeight;

    if (clampedLeft > 0 && sourceHeight > 0) {
      this.leftSprite = new Sprite(createTextureSlice(texture, 0, 0, clampedLeft, sourceHeight));
      this.addChild(this.leftSprite);
    }

    if (centerSourceWidth > 0 && sourceHeight > 0) {
      this.centerSprite = new Sprite(createTextureSlice(texture, clampedLeft, 0, centerSourceWidth, sourceHeight));
      this.addChild(this.centerSprite);
    }

    if (clampedRight > 0 && sourceHeight > 0) {
      this.rightSprite = new Sprite(createTextureSlice(texture, sourceWidth - clampedRight, 0, clampedRight, sourceHeight));
      this.addChild(this.rightSprite);
    }

    this.relayout();
  }

  override get width(): number {
    return this._layoutWidth;
  }

  override set width(value: number) {
    this._layoutWidth = Number.isFinite(value) ? Math.max(0, value) : 0;
    this.relayout();
  }

  override get height(): number {
    return this._layoutHeight;
  }

  override set height(value: number) {
    this._layoutHeight = Number.isFinite(value) ? Math.max(0, value) : 0;
    this.relayout();
  }

  private relayout(): void {
    const nextHeight = this._layoutHeight;
    const nextCenterWidth = Math.max(0, this._layoutWidth - this.leftSourceWidth - this.rightSourceWidth);
    const nextRightX = Math.max(0, this._layoutWidth - this.rightSourceWidth);

    if (this.leftSprite) {
      const isVisible = this.leftSourceWidth > 0 && nextHeight > 0;
      this.leftSprite.visible = isVisible;
      if (isVisible) {
        this.leftSprite.position.set(0, 0);
        this.leftSprite.width = this.leftSourceWidth;
        this.leftSprite.height = nextHeight;
      }
    }

    if (this.centerSprite) {
      const isVisible = nextCenterWidth > 0 && nextHeight > 0;
      this.centerSprite.visible = isVisible;
      if (isVisible) {
        this.centerSprite.position.set(this.leftSourceWidth, 0);
        this.centerSprite.width = nextCenterWidth;
        this.centerSprite.height = nextHeight;
      }
    }

    if (this.rightSprite) {
      const isVisible = this.rightSourceWidth > 0 && nextHeight > 0;
      this.rightSprite.visible = isVisible;
      if (isVisible) {
        this.rightSprite.position.set(nextRightX, 0);
        this.rightSprite.width = this.rightSourceWidth;
        this.rightSprite.height = nextHeight;
      }
    }
  }
}

type AssetBackedNode = UIRasterNode | UIImageNode | UINineSliceNode;

function isAssetNode(node: UINode): node is AssetBackedNode {
  return node.type === "raster" || node.type === "image" || node.type === "nineSlice";
}

function isLayoutSizedNode(node: UINode): node is AssetBackedNode | UIOverlayNode {
  return isAssetNode(node) || node.type === "overlay";
}

function applyLayoutSize(node: UINode, display: Container): void {
  if (!isLayoutSizedNode(node)) {
    return;
  }

  // Sprite sizing is stored as scale in Pixi, so applyBase() can reset it.
  display.width = node.width;
  display.height = node.height;
}

function collectNodeAssetIds(nodes: UINode[], out: Set<string>): void {
  for (const node of nodes) {
    if (isAssetNode(node)) {
      out.add(node.assetId);
    }
    if (node.children?.length) {
      collectNodeAssetIds(node.children, out);
    }
  }
}

function isAbsoluteAssetPath(path: string): boolean {
  return /^([a-z]+:)?\/\//i.test(path) || path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(path);
}

function joinAssetPath(base: string, src: string): string {
  if (!base) {
    return src;
  }
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const s = src.startsWith("./") ? src.slice(2) : src;
  return `${b}/${s}`;
}

function createAssetPathCandidates(path: string): string[] {
  const candidates: string[] = [path];
  const [pathWithoutHash, hashSuffix = ""] = path.split("#", 2);
  const [pathWithoutQuery, querySuffix = ""] = pathWithoutHash.split("?", 2);
  const suffix = `${querySuffix ? `?${querySuffix}` : ""}${hashSuffix ? `#${hashSuffix}` : ""}`;
  const hasLeadingSlash = pathWithoutQuery.startsWith("/");
  const parts = pathWithoutQuery.split("/").filter(Boolean);

  if (parts.length <= 2) {
    return candidates;
  }

  // Common export mismatch: JSON uses an extra folder (e.g. assets/ui/StartDialog/foo.png).
  for (let i = parts.length - 2; i >= 2; i--) {
    const trimmed = parts.filter((_, idx) => idx !== i).join("/");
    const rebuilt = `${hasLeadingSlash ? "/" : ""}${trimmed}${suffix}`;
    if (!candidates.includes(rebuilt)) {
      candidates.push(rebuilt);
    }
  }

  return candidates;
}

export interface UIFactoryOptions {
  assetBasePath?: string;
  debug?: boolean;
  debugDrawBounds?: boolean;
  debugShowNames?: boolean;
}

type LegacyRoot = {
  schemaVersion: number;
  name: string;
  width: number;
  height: number;
  align?: UIAlign;
  assets?: Array<{ id: string; src: string; width?: number; height?: number; scale?: number }>;
  nodes: LegacyNode[];
};

type LegacyNode = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  alpha?: number;
  visible?: boolean;
  assetId?: string;
  insets?: { left: number; top: number; right: number; bottom: number };
  slice?: { left: number; top: number; right: number; bottom: number };
  text?: {
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    lineHeight?: number;
    letterSpacing?: number;
    color?: string;
    align?: "left" | "center" | "right" | "justify";
    wrap?: boolean;
  };
  fill?: { color?: string; alpha?: number };
  children?: LegacyNode[];
};

function parseHexColor(value?: string): UIColor | undefined {
  if (!value || !/^#?[0-9a-fA-F]{6}$/.test(value)) {
    return undefined;
  }
  const hex = value.startsWith("#") ? value.slice(1) : value;
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: 1
  };
}

function cleanTaggedName(name: string): string {
  return name.replace(/@\w+(?:\([^)]*\))?/g, "").replace(/\s+/g, " ").trim();
}

function parseAlignTag(name: string): BaseUINode["align"] {
  const m = name.match(/@align\(([^)]+)\)/i);
  const align = m?.[1]?.trim() as BaseUINode["align"] | undefined;
  return align;
}

function hasTag(name: string, tag: string): boolean {
  return new RegExp(`@${tag}(?:\\(|\\b)`, "i").test(name);
}

function rootKindFromLegacyName(name: string): UIExport["kind"] {
  if (hasTag(name, "dialog")) return "dialog";
  if (hasTag(name, "hud")) return "hud";
  if (hasTag(name, "component")) return "component";
  return "screen";
}

function convertLegacyNode(node: LegacyNode): UINode {
  const base: Omit<BaseUINode, "type"> = {
    id: node.id,
    name: cleanTaggedName(node.name) || node.name,
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 0,
    height: node.height ?? 0,
    rotation: node.rotation ?? 0,
    alpha: node.alpha ?? 1,
    visible: node.visible ?? true,
    align: parseAlignTag(node.name)
  };

  if (node.type === "text") {
    const fill = parseHexColor(node.text?.color);
    return {
      ...base,
      type: "text",
      text: node.text?.text ?? "",
      style: {
        fontFamily: node.text?.fontFamily,
        fontSize: node.text?.fontSize,
        fontWeight: node.text?.fontWeight,
        lineHeight: node.text?.lineHeight,
        letterSpacing: node.text?.letterSpacing,
        align: node.text?.align,
        wordWrap: node.text?.wrap,
        fill: fill ?? node.text?.color
      }
    };
  }

  if (node.type === "nineSlice") {
    const slice = node.slice ?? node.insets ?? { left: 16, top: 16, right: 16, bottom: 16 };
    return {
      ...base,
      type: "nineSlice",
      assetId: node.assetId ?? `missing_${node.id}`,
      slice
    };
  }

  if (node.type === "sprite") {
    return {
      ...base,
      type: "image",
      assetId: node.assetId ?? `missing_${node.id}`
    };
  }

  if (node.type === "rectangle") {
    const color = parseHexColor(node.fill?.color) ?? { r: 0, g: 0, b: 0, a: 1 };
    return {
      ...base,
      type: "overlay",
      overlay: {
        color,
        opacity: typeof node.fill?.alpha === "number" ? node.fill.alpha : base.alpha ?? 1
      }
    };
  }

  const children = (node.children ?? []).map(convertLegacyNode);
  if (node.type === "container" && hasTag(node.name, "button")) {
    return {
      ...base,
      type: "button",
      hitArea: { x: 0, y: 0, width: base.width, height: base.height },
      children
    };
  }

  return {
    ...base,
    type: "container",
    children
  };
}

function normalizeExportData(input: UIExport | LegacyRoot): UIExport {
  if ("designSize" in input && "children" in input) {
    return input;
  }

  const legacy = input as LegacyRoot;
  return {
    version: legacy.schemaVersion ?? 1,
    name: cleanTaggedName(legacy.name) || legacy.name,
    kind: rootKindFromLegacyName(legacy.name),
    designSize: { width: legacy.width, height: legacy.height },
    scaleMode: "fit",
    safeArea: { x: 0, y: 0, width: legacy.width, height: legacy.height },
    modal: hasTag(legacy.name, "modal"),
    align: legacy.align ?? parseAlignTag(legacy.name),
    assets: (legacy.assets ?? []).map((a) => ({
      id: a.id,
      type: "image",
      src: a.src,
      width: a.width,
      height: a.height,
      scale: a.scale
    })),
    children: (legacy.nodes ?? []).map(convertLegacyNode)
  };
}

function resolveDesignContentBounds(exportData: UIExport): UIRect {
  if (exportData.contentBounds) {
    return exportData.contentBounds;
  }

  if (exportData.padding) {
    return {
      x: exportData.padding.left,
      y: exportData.padding.top,
      width: Math.max(0, exportData.designSize.width - exportData.padding.left - exportData.padding.right),
      height: Math.max(0, exportData.designSize.height - exportData.padding.top - exportData.padding.bottom)
    };
  }

  return {
    x: 0,
    y: 0,
    width: exportData.designSize.width,
    height: exportData.designSize.height
  };
}

function hasExplicitAlignment(nodes: UINode[]): boolean {
  for (const node of nodes) {
    if (node.align) {
      return true;
    }
    if (node.children?.length && hasExplicitAlignment(node.children)) {
      return true;
    }
  }
  return false;
}

export class UIFactory {
  private readonly options: UIFactoryOptions;
  private readonly assetPathById = new Map<string, string>();

  constructor(options: UIFactoryOptions = {}) {
    this.options = options;
  }

  async loadAssets(exportData: UIExport | LegacyRoot): Promise<void> {
    await this.loadNormalizedAssetSet([normalizeExportData(exportData)]);
  }

  async loadAssetsBundle(exports: Array<UIExport | LegacyRoot>): Promise<void> {
    await this.loadNormalizedAssetSet(exports.map((exportData) => normalizeExportData(exportData)));
  }

  private async loadNormalizedAssetSet(exports: UIExport[]): Promise<void> {
    this.assetPathById.clear();

    const manifestById = new Map<string, UIAssetRef>();
    const nodeAssetIds = new Set<string>();
    const requested = new Map<string, string>();

    for (const exportData of exports) {
      for (const asset of exportData.assets) {
        if (!manifestById.has(asset.id)) {
          manifestById.set(asset.id, asset);
        }
        if (!requested.has(asset.id)) {
          requested.set(asset.id, this.resolveAssetPath(asset.src));
        }
      }
      collectNodeAssetIds(exportData.children, nodeAssetIds);
    }

    for (const assetId of nodeAssetIds) {
      if (!requested.has(assetId)) {
        requested.set(assetId, this.resolveAssetPath(assetId));
      }
    }

    const loadedByPath = new Map<string, unknown>();
    for (const [assetId, assetPath] of requested) {
      if (Assets.cache.has(assetId)) {
        this.assetPathById.set(assetId, assetPath);
        continue;
      }

      const assetCandidates = createAssetPathCandidates(assetPath);
      let loadedPath: string | undefined;
      let loaded: unknown;

      for (const candidate of assetCandidates) {
        if (loadedByPath.has(candidate)) {
          loaded = loadedByPath.get(candidate);
          loadedPath = candidate;
          if (loaded) {
            break;
          }
          continue;
        }

        try {
          loaded = await Assets.load(candidate);
          loadedByPath.set(candidate, loaded);
          loadedPath = candidate;
          break;
        } catch {
          loadedByPath.set(candidate, undefined);
        }
      }

      this.assetPathById.set(assetId, loadedPath ?? assetPath);
      if (loaded) {
        Assets.cache.set(assetId, loaded);
        if (loadedPath && loadedPath !== assetPath) {
          console.warn(`[UIFactory] Resolved asset "${assetId}" from fallback path "${loadedPath}"`);
        }
      } else if (!manifestById.has(assetId)) {
        console.warn(`[UIFactory] Missing asset in manifest and failed preload: id="${assetId}" path="${assetPath}"`);
      } else {
        console.warn(`[UIFactory] Failed to load asset path "${assetPath}"`);
      }
    }
  }

  private resolveAssetPath(src: string): string {
    if (!this.options.assetBasePath || isAbsoluteAssetPath(src)) {
      return src;
    }
    return joinAssetPath(this.options.assetBasePath, src);
  }

  async createScreen(exportData: UIExport | LegacyRoot): Promise<UIScreen> {
    await waitForDocumentFonts();

    const normalized = normalizeExportData(exportData);
    const designContentBounds = resolveDesignContentBounds(normalized);
    const usesExplicitAlignment = Boolean(normalized.align) || hasExplicitAlignment(normalized.children);
    const root = new Container();
    const layoutRoot = new Container();
    root.label = normalized.name;
    root.sortableChildren = true;
    root.width = normalized.designSize.width;
    root.height = normalized.designSize.height;
    layoutRoot.label =
      normalized.contentBounds || normalized.padding ? `${normalized.name}__content` : normalized.name;
    layoutRoot.sortableChildren = true;
    root.addChild(layoutRoot);

    const screen =
      normalized.kind === "dialog"
        ? new UIDialog(
            root,
            layoutRoot,
            normalized.designSize.width,
            normalized.designSize.height,
            normalized.scaleMode,
            normalized.safeArea,
            normalized.contentBounds,
            normalized.padding,
            normalized.align,
            usesExplicitAlignment,
            this.options.debug
          )
        : new UIScreen(
            root,
            layoutRoot,
            normalized.designSize.width,
            normalized.designSize.height,
            normalized.scaleMode,
            normalized.safeArea,
            normalized.contentBounds,
            normalized.padding,
            normalized.align,
            usesExplicitAlignment,
            this.options.debug
          );

    if (this.options.debug) {
      this.attachRootDebugOverlay(root, normalized);
      console.log(
        `[UIFactory][debug] root="${normalized.name}" kind=${normalized.kind} design=${normalized.designSize.width}x${normalized.designSize.height} align=${normalized.align ?? "none"}`
      );
    }

    normalized.children.forEach((child: UINode, index: number) => {
      const built = this.createNode(child, screen, "__root__", designContentBounds.width, designContentBounds.height);
      built.zIndex = index;
      layoutRoot.addChild(built);
    });

    return screen;
  }

  private createNode(
    node: UINode,
    screen: UIScreen,
    parentName: string,
    parentBaseWidth: number,
    parentBaseHeight: number
  ): Container {
    let display: Container;
    const rawNode = node as { type?: string; name?: string };

    switch (node.type) {
      case "container":
      case "dialog":
        display = new Container();
        break;
      case "raster":
      case "image": {
        display = this.createSpriteOrPlaceholder(node);
        break;
      }
      case "text":
        display = createText(node);
        break;
      case "button": {
        const btn = new UIButton();
        btn.sortableChildren = true;
        if (node.hitArea) {
          btn.setHitArea(node.hitArea.x, node.hitArea.y, node.hitArea.width, node.hitArea.height);
        } else {
          btn.setHitArea(0, 0, node.width, node.height);
        }
        display = btn;
        break;
      }
      case "overlay":
        display = createOverlay(node);
        break;
      case "nineSlice": {
        display = this.createNineSliceOrPlaceholder(node);
        break;
      }
      default:
        console.warn(`[UIFactory] Unknown node type "${rawNode.type ?? "unknown"}" on "${rawNode.name ?? "unnamed"}".`);
        display = new Container();
        break;
    }

    display.label = node.name;
    display.sortableChildren = true;
    applyBase(node, display);
    applyLayoutSize(node, display);
    screen.registerNode(node.id, node.name, display);
    screen.registerLayoutMeta(display, {
      align: node.align,
      baseX: display.position.x,
      baseY: display.position.y,
      baseWidth: node.width,
      baseHeight: node.height,
      parentBaseWidth,
      parentBaseHeight,
      allowResizeX:
        node.type === "raster" ||
        node.type === "image" ||
        node.type === "nineSlice" ||
        node.type === "overlay",
      allowResizeY:
        node.type === "raster" ||
        node.type === "image" ||
        node.type === "nineSlice" ||
        node.type === "overlay"
    });

    if (this.options.debug) {
      const assetPath =
        "assetId" in node && typeof node.assetId === "string"
          ? this.assetPathById.get(node.assetId) ?? node.assetId
          : undefined;
      console.log(
        `[UIFactory][debug] node="${node.name}" type=${node.type} x=${node.x} y=${node.y} w=${node.width} h=${node.height} parent="${parentName}"${assetPath ? ` asset="${assetPath}"` : ""}`
      );
    }

    (node.children ?? []).forEach((child: UINode, index: number) => {
      const built = this.createNode(child, screen, node.name, node.width, node.height);
      built.zIndex = index;
      display.addChild(built);
    });

    if (this.options.debug) {
      this.attachDebugOverlay(display, node);
    }

    return display;
  }

  private attachRootDebugOverlay(root: Container, exportData: UIExport): void {
    if (!this.options.debugDrawBounds) {
      return;
    }
    const g = new Graphics();
    g.rect(0, 0, exportData.designSize.width, exportData.designSize.height);
    g.stroke({ color: 0x33ff66, width: 2, alpha: 0.9 });
    const contentBounds = resolveDesignContentBounds(exportData);
    g.rect(contentBounds.x, contentBounds.y, contentBounds.width, contentBounds.height);
    g.stroke({ color: 0xffb000, width: 2, alpha: 0.9 });
    g.eventMode = "none";
    root.addChild(g);
  }

  private attachDebugOverlay(display: Container, node: UINode): void {
    if (!this.options.debugDrawBounds && !this.options.debugShowNames) {
      return;
    }
    if (this.options.debugDrawBounds) {
      const g = new Graphics();
      g.rect(0, 0, node.width, node.height);
      g.stroke({ color: debugBoundsColor(node), width: node.type === "button" ? 2 : 1, alpha: 0.85 });
      g.eventMode = "none";
      display.addChild(g);
    }
    if (this.options.debugShowNames) {
      const label = new Text({
        text: node.name,
        style: {
          fill: 0x00ffff,
          fontSize: 11
        }
      });
      label.position.set(2, 2);
      label.eventMode = "none";
      display.addChild(label);
    }
  }

  private createSpriteOrPlaceholder(node: AssetBackedNode): Container {
    const texture = Assets.cache.get(node.assetId);
    if (texture instanceof Texture) {
      warnIfSpriteAspectMismatch(node, texture);
      const sprite = new Sprite(texture);
      sprite.width = node.width;
      sprite.height = node.height;
      return sprite;
    }

    const assetPath = this.assetPathById.get(node.assetId) ?? node.assetId;
    console.warn(`[UIFactory] Missing texture for node "${node.name}" (assetId="${node.assetId}", path="${assetPath}")`);
    return createMissingAssetPlaceholder(node.width, node.height);
  }

  private createNineSliceOrPlaceholder(node: UINineSliceNode): Container {
    const texture = Assets.cache.get(node.assetId);
    if (texture instanceof Texture) {
      const slice = node.textureSlice ?? node.slice;
      if (slice.top === 0 && slice.bottom === 0) {
        if (isTrimmedTexture(texture)) {
          console.warn(
            `[UIFactory] Nine-slice "${node.name}" is using a trimmed texture. Horizontal-only slicing expects untrimmed source pixels.`
          );
        }

        const panel = new HorizontalThreeSliceSprite(texture, slice.left, slice.right);
        panel.width = node.width;
        panel.height = node.height;
        return panel;
      }

      const panel = new NineSliceSprite({
        texture,
        leftWidth: slice.left,
        topHeight: slice.top,
        rightWidth: slice.right,
        bottomHeight: slice.bottom
      });
      panel.width = node.width;
      panel.height = node.height;
      return panel;
    }

    const assetPath = this.assetPathById.get(node.assetId) ?? node.assetId;
    console.warn(
      `[UIFactory] Missing texture for nineSlice node "${node.name}" (assetId="${node.assetId}", path="${assetPath}")`
    );
    return createMissingAssetPlaceholder(node.width, node.height);
  }
}

function debugBoundsColor(node: UINode): number {
  if (node.name === "dialog_bg") {
    return 0xff44ff;
  }
  if (node.name === "content_panel") {
    return 0xffb000;
  }
  if (node.type === "button") {
    return 0xffff00;
  }
  return 0x00ffff;
}
