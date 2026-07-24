export const FIGMA_PIXI_UI_SCHEMA_VERSION = "1.0.0" as const;

export type FigmaPixiRootKind = "screen" | "dialog" | "hud" | "component";

export type FigmaPixiNodeType =
  | "container"
  | "dialog"
  | "raster"
  | "image"
  | "text"
  | "button"
  | "nineSlice"
  | "overlay";

export type FigmaPixiAlign =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "left-center"
  | "right-center"
  | "stretch-width"
  | "stretch-height"
  | "stretch-full";

export type FigmaPixiScaleMode = "fit" | "fitWidth" | "fitHeight" | "cover" | "none";

export type TextAutoResize = "none" | "height" | "widthAndHeight" | "truncate";

export type TextVerticalAlign = "top" | "center" | "bottom";

export interface Size2D {
  width: number;
  height: number;
}

export interface Rect2D extends Size2D {
  x: number;
  y: number;
}

export interface PaddingInsets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface UIColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaPixiAsset {
  id: string;
  name?: string;
  src: string;
  width: number;
  height: number;
  scale: number;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  nameSource?: "explicit" | "component" | "layer" | "context" | "fallback";
  aliases?: string[];
  shared?: boolean;
  usedBy?: string[];
}

export interface NineSliceInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

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

export interface NineSliceAssetOptimization {
  type: "nineSliceCompact";
  enabled: boolean;
  sourceWidth: number;
  sourceHeight: number;
  textureWidth: number;
  textureHeight: number;
  compactCenterWidth: number;
  compactCenterHeight: number;
  assetScale: number;
}

export interface TextStyle {
  fontFamily?: string;
  fontSize: number;
  fontWeight?: string | number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  alpha?: number;
  align?: "left" | "center" | "right" | "justify";
  verticalAlign?: TextVerticalAlign;
  autoResize?: TextAutoResize;
  wrap?: boolean;
  wordWrapWidth?: number;
}

export interface NodeDebugMeta {
  figmaAbsolute: Point2D;
  figmaRelative: Point2D;
  figmaSize: Size2D;
  exportedSize?: Size2D;
  transform?: {
    scaleX?: number;
    scaleY?: number;
  };
  text?: {
    figmaWidth?: number;
    figmaHeight?: number;
    exportedWidth?: number;
    exportedHeight?: number;
    fontSize?: number;
    lineHeight?: number;
    scaleX?: number;
    scaleY?: number;
    align?: TextStyle["align"];
    verticalAlign?: TextVerticalAlign;
    autoResize?: TextAutoResize;
  };
}

interface BaseNode {
  id: string;
  name: string;
  type: FigmaPixiNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  visible?: boolean;
  align?: FigmaPixiAlign;
  debug?: NodeDebugMeta;
  children?: FigmaPixiNode[];
}

export interface ContainerNode extends BaseNode {
  type: "container";
  children: FigmaPixiNode[];
}

export interface DialogNode extends BaseNode {
  type: "dialog";
  children: FigmaPixiNode[];
}

export interface RasterNode extends BaseNode {
  type: "raster";
  assetId: string;
  asset: string;
}

export interface ImageNode extends BaseNode {
  type: "image";
  assetId: string;
  asset: string;
}

export interface NineSliceNode extends BaseNode {
  type: "nineSlice";
  assetId: string;
  asset: string;
  slice: NineSliceInsets;
  textureSlice?: NineSliceInsets;
  assetOptimization?: NineSliceAssetOptimization;
}

export interface OverlayNode extends BaseNode {
  type: "overlay";
  overlay: {
    color: UIColor;
    opacity: number;
  };
}

export interface ButtonNode extends BaseNode {
  type: "button";
  hitArea?: Rect2D;
  children: FigmaPixiNode[];
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  style: TextStyle;
}

export type FigmaPixiNode =
  | ContainerNode
  | DialogNode
  | RasterNode
  | ImageNode
  | NineSliceNode
  | OverlayNode
  | ButtonNode
  | TextNode;

export interface ValidationSummary {
  warnings: string[];
  errors: string[];
}

export interface FigmaPixiDocument {
  version: typeof FIGMA_PIXI_UI_SCHEMA_VERSION;
  name: string;
  kind: FigmaPixiRootKind;
  designSize: Size2D;
  scaleMode: FigmaPixiScaleMode;
  safeArea: Rect2D;
  contentBounds?: Rect2D;
  padding?: PaddingInsets;
  modal?: boolean;
  align?: FigmaPixiAlign;
  children: FigmaPixiNode[];
  assets: FigmaPixiAsset[];
  meta?: {
    source: "figma";
    exportedRootId: string;
    validation: ValidationSummary;
    assetStats?: {
      totalReferencedAssets: number;
      uniqueAssets: number;
      sharedAssets: number;
      localAssets: number;
    };
  };
}

export function assertFigmaPixiDocument(value: unknown): asserts value is FigmaPixiDocument {
  if (!value || typeof value !== "object") {
    throw new Error("UI document must be an object.");
  }

  const doc = value as Partial<FigmaPixiDocument>;
  if (doc.version !== FIGMA_PIXI_UI_SCHEMA_VERSION) {
    throw new Error(`Unsupported UI schema version: ${String(doc.version)}.`);
  }

  if (typeof doc.name !== "string" || doc.name.length === 0) {
    throw new Error("UI document requires a name.");
  }

  if (!doc.designSize || !Number.isFinite(doc.designSize.width) || !Number.isFinite(doc.designSize.height)) {
    throw new Error("UI document requires designSize.");
  }

  if (!Array.isArray(doc.assets) || !Array.isArray(doc.children)) {
    throw new Error("UI document requires assets and children arrays.");
  }
}
