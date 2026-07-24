export type UIRootKind = "screen" | "dialog" | "hud" | "component";

export type UINodeType =
  | "container"
  | "dialog"
  | "raster"
  | "image"
  | "text"
  | "button"
  | "nineSlice"
  | "overlay";

export type UIAlign =
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

export type UIAlignment = UIAlign;

export type UIScaleMode = "fit" | "fitWidth" | "fitHeight" | "cover" | "none";

export type UITextAutoResize = "none" | "height" | "widthAndHeight" | "truncate";

export type UITextVerticalAlign = "top" | "center" | "bottom";

export interface UISize {
  width: number;
  height: number;
}

export interface UIVec2 {
  x: number;
  y: number;
}

export interface UIRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UIPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface UIColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface UIAssetRef {
  id: string;
  type?: "image" | "atlas" | "bitmapFont" | "audio" | "data";
  name?: string;
  src: string;
  width?: number;
  height?: number;
  scale?: number;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  aliases?: string[];
  shared?: boolean;
  usedBy?: string[];
}

export interface UITextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: "normal" | "italic";
  lineHeight?: number;
  letterSpacing?: number;
  fill?: UIColor | string | number;
  color?: UIColor;
  stroke?: UIColor | string | number;
  strokeWidth?: number;
  align?: "left" | "center" | "right" | "justify";
  verticalAlign?: UITextVerticalAlign;
  autoResize?: UITextAutoResize;
  wordWrap?: boolean;
  wordWrapWidth?: number;
}

export interface UITransformDebugMeta {
  scaleX?: number;
  scaleY?: number;
}

export interface UITextDebugMeta {
  figmaWidth?: number;
  figmaHeight?: number;
  exportedWidth?: number;
  exportedHeight?: number;
  fontSize?: number;
  lineHeight?: number;
  scaleX?: number;
  scaleY?: number;
  align?: UITextStyle["align"];
  verticalAlign?: UITextVerticalAlign;
  autoResize?: UITextAutoResize;
}

export interface UINodeDebugMeta {
  figmaAbsolute?: UIVec2;
  figmaRelative?: UIVec2;
  figmaSize?: UISize;
  exportedSize?: UISize;
  transform?: UITransformDebugMeta;
  text?: UITextDebugMeta;
}

export interface UINineSliceData {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface UINineSliceAssetOptimization {
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

export interface UIButtonHitArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UIOverlayStyle {
  color: UIColor;
  opacity: number;
}

export interface BaseUINode {
  id: string;
  name: string;
  type: UINodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  visible?: boolean;
  anchor?: UIVec2;
  pivot?: UIVec2;
  align?: UIAlign;
  offsetX?: number;
  offsetY?: number;
  debug?: UINodeDebugMeta;
  children?: UINode[];
}

export interface UIContainerNode extends BaseUINode {
  type: "container";
}

export interface UIDialogNode extends BaseUINode {
  type: "dialog";
}

export interface UIRasterNode extends BaseUINode {
  type: "raster";
  assetId: string;
  asset?: string;
}

export interface UIImageNode extends BaseUINode {
  type: "image";
  assetId: string;
  asset?: string;
}

export interface UITextNode extends BaseUINode {
  type: "text";
  text: string;
  style: UITextStyle;
}

export interface UIButtonNode extends BaseUINode {
  type: "button";
  hitArea?: UIButtonHitArea;
}

export interface UINineSliceNode extends BaseUINode {
  type: "nineSlice";
  assetId: string;
  asset?: string;
  slice: UINineSliceData;
  textureSlice?: UINineSliceData;
  assetOptimization?: UINineSliceAssetOptimization;
}

export interface UIExportMeta {
  assetStats?: {
    totalReferencedAssets: number;
    uniqueAssets: number;
    sharedAssets: number;
    localAssets: number;
  };
  [key: string]: unknown;
}

export interface UIOverlayNode extends BaseUINode {
  type: "overlay";
  overlay: UIOverlayStyle;
}

export type UINode =
  | UIContainerNode
  | UIDialogNode
  | UIRasterNode
  | UIImageNode
  | UITextNode
  | UIButtonNode
  | UINineSliceNode
  | UIOverlayNode;

export interface UIExport {
  version: number;
  name: string;
  kind: UIRootKind;
  designSize: UISize;
  scaleMode: UIScaleMode;
  safeArea?: UIRect;
  contentBounds?: UIRect;
  padding?: UIPadding;
  modal?: boolean;
  align?: UIAlign;
  children: UINode[];
  assets: UIAssetRef[];
  meta?: UIExportMeta;
}

// Temporary compatibility types for existing package stubs.
export interface UiNodeTagMap {
  role?: string;
  slice?: string;
  [key: string]: string | undefined;
}

export interface UiNodeDraft {
  id: string;
  name: string;
  tags: UiNodeTagMap;
}

export interface UiScreenDraft {
  id: string;
  name: string;
  nodes: UiNodeDraft[];
}
