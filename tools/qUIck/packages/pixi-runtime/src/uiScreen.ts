import type { UIAlign, UIPadding, UIRect, UIScaleMode } from "@figma-pixi/shared";
import { Container, Text, type ContainerChild } from "pixi.js";
import { applyAlignment, type LayoutMeta } from "./layout/applyAlignment.js";
import { resolveSafeArea } from "./layout/safeArea.js";
import { resolveScaleMode } from "./layout/scaleModes.js";
import { UIButton } from "./uiButton.js";

export class UIScreen extends Container {
  private readonly nodeById = new Map<string, Container>();
  private readonly nodesByName = new Map<string, Container[]>();
  private readonly layoutMetaMap = new WeakMap<Container, LayoutMeta>();
  private readonly content: Container;
  private readonly layoutRoot: Container;
  private readonly designWidth: number;
  private readonly designHeight: number;
  private readonly scaleMode: UIScaleMode;
  private readonly rootSafeArea?: UIRect;
  private readonly rootContentBounds?: UIRect;
  private readonly rootPadding?: UIPadding;
  private readonly rootAlign?: UIAlign;
  private readonly usesExplicitAlignment: boolean;
  private readonly debugLayout: boolean;

  constructor(
    content: Container,
    layoutRoot: Container,
    designWidth: number,
    designHeight: number,
    scaleMode: UIScaleMode,
    rootSafeArea?: UIRect,
    rootContentBounds?: UIRect,
    rootPadding?: UIPadding,
    rootAlign?: UIAlign,
    usesExplicitAlignment = false,
    debugLayout = false
  ) {
    super();
    this.content = content;
    this.layoutRoot = layoutRoot;
    this.designWidth = designWidth;
    this.designHeight = designHeight;
    this.scaleMode = scaleMode;
    this.rootSafeArea = rootSafeArea;
    this.rootContentBounds = rootContentBounds;
    this.rootPadding = rootPadding;
    this.rootAlign = rootAlign;
    this.usesExplicitAlignment = usesExplicitAlignment;
    this.debugLayout = debugLayout;
    this.addChild(this.content);
  }

  registerNode(id: string, name: string, node: Container): void {
    if (id) {
      this.nodeById.set(id, node);
    }
    if (name) {
      const existing = this.nodesByName.get(name) ?? [];
      existing.push(node);
      this.nodesByName.set(name, existing);
    }
  }

  registerLayoutMeta(node: Container, meta: LayoutMeta): void {
    this.layoutMetaMap.set(node, meta);
  }

  get(nameOrId: string): Container | undefined {
    return this.nodeById.get(nameOrId) ?? this.nodesByName.get(nameOrId)?.[0];
  }

  getAll(name: string): Container[] {
    return [...(this.nodesByName.get(name) ?? [])];
  }

  getText(nameOrId: string): Text | undefined {
    const node = this.get(nameOrId);
    return node instanceof Text ? node : undefined;
  }

  getButton(nameOrId: string): UIButton | undefined {
    const node = this.get(nameOrId);
    return node instanceof UIButton ? node : undefined;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  resize(width: number, height: number, safeArea?: UIRect): void {
    const rootLayout = resolveScaleMode(this.scaleMode, width, height, this.designWidth, this.designHeight);
    this.content.scale.set(rootLayout.scale);
    this.content.position.set(
      resolveRootX(this.rootAlign, width, this.designWidth * rootLayout.scale, rootLayout.offsetX),
      resolveRootY(this.rootAlign, height, this.designHeight * rootLayout.scale, rootLayout.offsetY)
    );

    const inputSafeArea =
      safeArea ??
      (this.usesExplicitAlignment &&
      shouldUseViewportSafeArea(this.rootSafeArea, this.designWidth, this.designHeight)
        ? { x: 0, y: 0, width, height }
        : undefined);
    const resolvedSafeArea = resolveSafeArea(
      this.designWidth,
      this.designHeight,
      this.rootSafeArea,
      inputSafeArea,
      rootLayout.offsetX,
      rootLayout.offsetY,
      rootLayout.scale
    );

    const resolvedContentBounds = resolveContentBounds(
      this.designWidth,
      this.designHeight,
      resolvedSafeArea,
      this.rootContentBounds,
      this.rootPadding
    );

    this.layoutRoot.position.set(resolvedContentBounds.x, resolvedContentBounds.y);
    this.applyAlignedLayout(this.layoutRoot, {
      x: 0,
      y: 0,
      width: resolvedContentBounds.width,
      height: resolvedContentBounds.height
    });
    if (this.debugLayout) {
      this.printLayoutDebug();
    }
  }

  private applyAlignedLayout(parent: Container, bounds: UIRect): void {
    for (const child of parent.children) {
      const childContainer = child as Container;
      const meta = this.layoutMetaMap.get(childContainer);
      if (meta?.align) {
        applyAlignment(childContainer, meta, bounds);
      } else if (meta) {
        childContainer.position.set(meta.baseX, meta.baseY);
      }

      const childMeta = this.layoutMetaMap.get(childContainer);
      const childBounds: UIRect = childMeta
        ? { x: 0, y: 0, width: childMeta.baseWidth, height: childMeta.baseHeight }
        : { x: 0, y: 0, width: childContainer.width, height: childContainer.height };
      this.applyAlignedLayout(childContainer, childBounds);
    }
  }

  private printLayoutDebug(): void {
    console.log(
      `[UILayout][debug] root="${this.content.label || this.content.name || "(root)"}" world=(${round(this.content.x)}, ${round(this.content.y)}) scale=(${round(this.content.scale.x)}, ${round(this.content.scale.y)}) local=(0, 0)`
    );
    for (const child of this.content.children) {
      this.printNodeLayoutDebug(child, this.content.x, this.content.y, this.content.scale.x, this.content.scale.y);
    }
  }

  private printNodeLayoutDebug(
    node: ContainerChild,
    parentWorldX: number,
    parentWorldY: number,
    parentWorldScaleX: number,
    parentWorldScaleY: number
  ): void {
    const container = node as Container;
    const label = container.label || container.name || "(unnamed)";
    const worldX = parentWorldX + container.x * parentWorldScaleX;
    const worldY = parentWorldY + container.y * parentWorldScaleY;
    const worldScaleX = parentWorldScaleX * container.scale.x;
    const worldScaleY = parentWorldScaleY * container.scale.y;
    console.log(
      `[UILayout][debug] node="${label}" world=(${round(worldX)}, ${round(worldY)}) scale=(${round(worldScaleX)}, ${round(worldScaleY)}) local=(${round(container.x)}, ${round(container.y)})`
    );
    for (const child of container.children ?? []) {
      this.printNodeLayoutDebug(child, worldX, worldY, worldScaleX, worldScaleY);
    }
  }
}

export class UIDialog extends UIScreen {}

function shouldUseViewportSafeArea(
  safeArea: UIRect | undefined,
  designWidth: number,
  designHeight: number
): boolean {
  if (!safeArea) {
    return true;
  }

  return (
    safeArea.x === 0 &&
    safeArea.y === 0 &&
    safeArea.width === designWidth &&
    safeArea.height === designHeight
  );
}

function resolveContentBounds(
  designWidth: number,
  designHeight: number,
  safeArea: UIRect,
  contentBounds?: UIRect,
  padding?: UIPadding
): UIRect {
  if (padding) {
    return {
      x: safeArea.x + padding.left,
      y: safeArea.y + padding.top,
      width: Math.max(0, safeArea.width - padding.left - padding.right),
      height: Math.max(0, safeArea.height - padding.top - padding.bottom)
    };
  }

  if (contentBounds) {
    return {
      x: clamp(contentBounds.x, 0, designWidth),
      y: clamp(contentBounds.y, 0, designHeight),
      width: clamp(contentBounds.width, 0, designWidth),
      height: clamp(contentBounds.height, 0, designHeight)
    };
  }

  return safeArea;
}

function resolveRootX(align: UIAlign | undefined, viewportWidth: number, scaledWidth: number, fallback: number): number {
  switch (align) {
    case "left":
    case "top-left":
    case "bottom-left":
    case "left-center":
    case "stretch-width":
    case "stretch-full":
      return 0;
    case "right":
    case "top-right":
    case "bottom-right":
    case "right-center":
      return viewportWidth - scaledWidth;
    case "center":
    case "top-center":
    case "bottom-center":
      return (viewportWidth - scaledWidth) * 0.5;
    default:
      return fallback;
  }
}

function resolveRootY(align: UIAlign | undefined, viewportHeight: number, scaledHeight: number, fallback: number): number {
  switch (align) {
    case "top":
    case "top-left":
    case "top-center":
    case "top-right":
    case "stretch-height":
    case "stretch-full":
      return 0;
    case "bottom":
    case "bottom-left":
    case "bottom-center":
    case "bottom-right":
      return viewportHeight - scaledHeight;
    case "center":
    case "left-center":
    case "right-center":
      return (viewportHeight - scaledHeight) * 0.5;
    default:
      return fallback;
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
