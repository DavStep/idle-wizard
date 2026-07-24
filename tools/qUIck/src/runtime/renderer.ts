import {
  Assets,
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
  Texture,
  type ContainerChild,
  type TextStyleFontWeight,
  type TextStyleOptions
} from "pixi.js";
import {
  assertFigmaPixiDocument,
  type FigmaPixiAsset,
  type FigmaPixiDocument,
  type FigmaPixiNode,
  type NineSliceNode,
  type TextNode
} from "../schema.js";
import { createRuntimePlan, hexToNumber, type RuntimeNodePlan } from "./layout.js";

export interface RenderedUINode {
  schema: FigmaPixiNode;
  display: ContainerChild;
  plan: RuntimeNodePlan;
}

export interface RenderedUIView {
  root: Container;
  nodesById: Map<string, RenderedUINode>;
  nodesByName: Map<string, RenderedUINode[]>;
  bind(nameOrId: string, callback: (node: RenderedUINode) => void): void;
  get(nameOrId: string): RenderedUINode | undefined;
}

export interface FigmaPixiRendererOptions {
  textureResolver?: (asset: FigmaPixiAsset) => Texture;
}

export class FigmaPixiRenderer {
  private readonly textureResolver?: (asset: FigmaPixiAsset) => Texture;

  constructor(options: FigmaPixiRendererOptions = {}) {
    this.textureResolver = options.textureResolver;
  }

  async render(document: unknown): Promise<RenderedUIView> {
    await waitForDocumentFonts();
    assertFigmaPixiDocument(document);

    const assetsById = new Map(document.assets.map((asset) => [asset.id, asset]));
    const nodesById = new Map<string, RenderedUINode>();
    const nodesByName = new Map<string, RenderedUINode[]>();
    const root = new Container();
    const layoutRoot = new Container();
    const rootContentBounds = resolveDocumentContentBounds(document);
    root.label = document.name;
    root.sortableChildren = true;
    layoutRoot.label =
      document.contentBounds || document.padding ? `${document.name}__content` : document.name;
    layoutRoot.sortableChildren = true;
    layoutRoot.position.set(rootContentBounds.x, rootContentBounds.y);
    root.addChild(layoutRoot);

    document.children.forEach((node, index) => {
      const display = this.renderNode(node, assetsById, nodesById, nodesByName);
      display.zIndex = index;
      layoutRoot.addChild(display);
    });

    return {
      root,
      nodesById,
      nodesByName,
      bind(nameOrId, callback) {
        const node = getRenderedNode(nameOrId, nodesById, nodesByName);
        if (!node) {
          throw new Error(`No rendered UI node found for "${nameOrId}".`);
        }
        callback(node);
      },
      get(nameOrId) {
        return getRenderedNode(nameOrId, nodesById, nodesByName);
      }
    };
  }

  private renderNode(
    node: FigmaPixiNode,
    assetsById: Map<string, FigmaPixiAsset>,
    nodesById: Map<string, RenderedUINode>,
    nodesByName: Map<string, RenderedUINode[]>
  ): ContainerChild {
    const plan = createRuntimePlan(node, assetsById);
    const display = this.createDisplayObject(node, plan);

    applyBaseTransform(node, display, plan);

    const renderedNode: RenderedUINode = { schema: node, display, plan };
    nodesById.set(node.id, renderedNode);
    const namedNodes = nodesByName.get(node.name) ?? [];
    namedNodes.push(renderedNode);
    nodesByName.set(node.name, namedNodes);

    if ("children" in node && node.children && display instanceof Container) {
      display.sortableChildren = true;
      node.children.forEach((child, index) => {
        const childDisplay = this.renderNode(child, assetsById, nodesById, nodesByName);
        childDisplay.zIndex = index;
        display.addChild(childDisplay);
      });
    }

    return display;
  }

  private createDisplayObject(node: FigmaPixiNode, plan: RuntimeNodePlan): ContainerChild {
    if (node.type === "container" || node.type === "dialog") {
      const container = new Container();
      container.label = node.name;
      container.sortableChildren = true;
      return container;
    }

    if (node.type === "text") {
      return createText(node);
    }

    if (node.type === "nineSlice") {
      return createNineSlice(node, resolveTexture(plan.asset!, this.textureResolver));
    }

    if (node.type === "raster" || node.type === "image") {
      const texture = resolveTexture(plan.asset!, this.textureResolver);
      const sprite = new Sprite(texture);
      sprite.width = plan.width;
      sprite.height = plan.height;
      sprite.label = node.name;
      return sprite;
    }

    console.warn(`[FigmaPixiRenderer] Unknown node type "${(node as { type?: string }).type ?? "unknown"}" on "${node.name}".`);
    const container = new Container();
    container.label = node.name;
    return container;
  }
}

function createText(node: TextNode): Text {
  if (!node.text) {
    console.warn(`[FigmaPixiRenderer] Text node "${node.name}" has empty text.`);
  }
  if (node.width <= 0 || node.height <= 0) {
    console.warn(`[FigmaPixiRenderer] Text node "${node.name}" has zero width or height (${node.width}x${node.height}).`);
  }

  const shouldUseTextBox = textStyleHasFixedWidth(node);
  const styleOptions: TextStyleOptions = {
    fontFamily: node.style?.fontFamily ?? "Arial",
    fontSize: node.style?.fontSize ?? 24,
    fill: node.style?.fill ?? node.style?.color ?? "#ffffff",
    align: node.style?.align ?? "left",
    wordWrap: shouldUseTextBox,
    wordWrapWidth: shouldUseTextBox ? node.style?.wordWrapWidth ?? node.width : undefined
  };
  const fontWeight = normalizeFontWeight(node.style?.fontWeight);
  if (fontWeight !== undefined) {
    styleOptions.fontWeight = fontWeight;
  }
  if (node.style?.lineHeight !== undefined) {
    styleOptions.lineHeight = node.style.lineHeight;
  }
  if (node.style?.letterSpacing !== undefined) {
    styleOptions.letterSpacing = node.style.letterSpacing;
  }
  if (node.style?.stroke) {
    styleOptions.stroke = {
      color: node.style.stroke,
      width: node.style.strokeWidth ?? 1
    };
  }
  const style = new TextStyle(styleOptions);

  warnIfFontUnavailable(style.fontFamily, node.name);
  if ((node.scaleX !== undefined || node.scaleY !== undefined) && node.scaleX !== node.scaleY) {
    console.warn(
      `[FigmaPixiRenderer] Text node "${node.name}" has non-uniform scale (${String(node.scaleX ?? 1)}, ${String(node.scaleY ?? 1)}).`
    );
  }

  let pixiText: Text;
  try {
    pixiText = new Text({
      text: node.text ?? "",
      style
    });
  } catch (error) {
    console.warn(`[FigmaPixiRenderer] PIXI.Text creation failed for "${node.name}": ${error instanceof Error ? error.message : String(error)}`);
    pixiText = new Text({
      text: node.text ?? "",
      style: new TextStyle({
        fontFamily: "Arial",
        fontSize: 24,
        fill: "#ffffff",
        align: "left",
        wordWrap: Boolean(node.width),
        wordWrapWidth: node.width
      })
    });
  }

  pixiText.label = node.name;
  pixiText.alpha = node.style?.alpha ?? 1;
  pixiText.x = 0;
  pixiText.y = 0;
  if (shouldUseTextBox && node.width > 0) {
    pixiText.style.wordWrap = true;
    pixiText.style.wordWrapWidth = node.style?.wordWrapWidth ?? node.width;
  }
  return pixiText;
}

function textStyleHasFixedWidth(node: TextNode): boolean {
  const autoResize = node.style?.autoResize as string | undefined;
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
    node.style?.wrap === true ||
    node.style?.wordWrapWidth !== undefined
  );
}

function textHorizontalAlignmentFactor(node: TextNode): number {
  const align = node.style?.align as string | undefined;
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

function textVerticalAlignmentFactor(node: TextNode): number {
  const verticalAlign = node.style?.verticalAlign as string | undefined;
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

function applyTextBoxAlignment(node: TextNode, display: Text): void {
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

function createNineSlice(node: NineSliceNode, texture: Texture): Container {
  const slice = node.textureSlice ?? node.slice ?? ("insets" in node ? node.insets : undefined);
  if (!slice) {
    throw new Error(`Nine-slice node "${node.name}" is missing slice data.`);
  }

  if (slice.top === 0 && slice.bottom === 0) {
    if (isTrimmedTexture(texture)) {
      console.warn(
        `[FigmaPixiRenderer] Nine-slice "${node.name}" is using a trimmed texture. Horizontal-only slicing expects untrimmed source pixels.`
      );
    }

    const sprite = new HorizontalThreeSliceSprite(texture, slice.left, slice.right);
    sprite.width = node.width;
    sprite.height = node.height;
    sprite.label = node.name;
    return sprite;
  }

  const sprite = new NineSliceSprite({
    texture,
    leftWidth: slice.left,
    topHeight: slice.top,
    rightWidth: slice.right,
    bottomHeight: slice.bottom
  });
  sprite.width = node.width;
  sprite.height = node.height;
  sprite.label = node.name;
  return sprite;
}

function applyBaseTransform(node: FigmaPixiNode, display: ContainerChild, plan: RuntimeNodePlan): void {
  display.x = plan.x;
  display.y = plan.y;
  display.rotation = (plan.rotation * Math.PI) / 180;
  if ("scale" in display) {
    display.scale.set(plan.scaleX, plan.scaleY);
  }
  display.alpha *= plan.alpha;
  display.visible = plan.visible;
  if (node.type === "text" && display instanceof Text) {
    applyTextBoxAlignment(node, display);
  }
}

function resolveDocumentContentBounds(document: FigmaPixiDocument): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (document.contentBounds) {
    return document.contentBounds;
  }

  if (document.padding) {
    return {
      x: document.padding.left,
      y: document.padding.top,
      width: Math.max(0, document.designSize.width - document.padding.left - document.padding.right),
      height: Math.max(0, document.designSize.height - document.padding.top - document.padding.bottom)
    };
  }

  return {
    x: 0,
    y: 0,
    width: document.designSize.width,
    height: document.designSize.height
  };
}

function resolveTexture(
  asset: FigmaPixiAsset,
  textureResolver?: (asset: FigmaPixiAsset) => Texture
): Texture {
  if (textureResolver) {
    return textureResolver(asset);
  }

  const cached = Assets.get<Texture>(asset.src);
  if (cached) {
    return cached;
  }

  throw new Error(`Texture "${asset.src}" is not loaded. Load document assets before rendering.`);
}

function getRenderedNode(
  nameOrId: string,
  nodesById: Map<string, RenderedUINode>,
  nodesByName: Map<string, RenderedUINode[]>
): RenderedUINode | undefined {
  return nodesById.get(nameOrId) ?? nodesByName.get(nameOrId)?.[0];
}

function normalizeFontWeight(value: string | number | undefined): TextStyleFontWeight | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return clampFontWeight(value);
  }

  const lower = value.toLowerCase();
  if (lower === "bold" || lower === "bolder" || lower === "lighter" || lower === "normal") {
    return lower;
  }

  const numeric = Number.parseInt(lower, 10);
  return Number.isFinite(numeric) ? clampFontWeight(numeric) : undefined;
}

function clampFontWeight(value: number): TextStyleFontWeight {
  const rounded = Math.min(900, Math.max(100, Math.round(value / 100) * 100));
  return String(rounded) as TextStyleFontWeight;
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
    console.warn(`[FigmaPixiRenderer] document.fonts.ready failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function warnIfFontUnavailable(fontFamily: unknown, nodeName: string): void {
  const fonts = getDocumentFonts();
  if (!fonts?.check) {
    return;
  }

  const primaryFont = String(Array.isArray(fontFamily) ? fontFamily[0] : fontFamily || "")
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!primaryFont) {
    console.warn(`[FigmaPixiRenderer] Text node "${nodeName}" is missing fontFamily; using fallback font.`);
    return;
  }

  try {
    if (!fonts.check(`12px "${primaryFont}"`)) {
      console.warn(`[FigmaPixiRenderer] Font "${primaryFont}" is not available for text node "${nodeName}"; using fallback font.`);
    }
  } catch (error) {
    console.warn(`[FigmaPixiRenderer] Could not check font "${primaryFont}" for "${nodeName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}
