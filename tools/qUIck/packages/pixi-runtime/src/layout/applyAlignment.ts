import type { UIAlign, UIRect } from "@figma-pixi/shared";
import { Text, type Container } from "pixi.js";

export interface LayoutMeta {
  align?: UIAlign;
  baseX: number;
  baseY: number;
  baseWidth: number;
  baseHeight: number;
  parentBaseWidth: number;
  parentBaseHeight: number;
  allowResizeX?: boolean;
  allowResizeY?: boolean;
}

function centerX(bounds: UIRect, width: number): number {
  return bounds.x + (bounds.width - width) * 0.5;
}

function centerY(bounds: UIRect, height: number): number {
  return bounds.y + (bounds.height - height) * 0.5;
}

function rightX(bounds: UIRect, width: number): number {
  return bounds.x + bounds.width - width;
}

function bottomY(bounds: UIRect, height: number): number {
  return bounds.y + bounds.height - height;
}

function centeredX(bounds: UIRect, meta: LayoutMeta): number {
  const baseCenterOffset = meta.baseX + meta.baseWidth * 0.5 - meta.parentBaseWidth * 0.5;
  return centerX(bounds, meta.baseWidth) + baseCenterOffset;
}

function centeredY(bounds: UIRect, meta: LayoutMeta): number {
  const baseCenterOffset = meta.baseY + meta.baseHeight * 0.5 - meta.parentBaseHeight * 0.5;
  return centerY(bounds, meta.baseHeight) + baseCenterOffset;
}

function leftAlignedX(bounds: UIRect, meta: LayoutMeta): number {
  return bounds.x + meta.baseX;
}

function topAlignedY(bounds: UIRect, meta: LayoutMeta): number {
  return bounds.y + meta.baseY;
}

function rightAlignedX(bounds: UIRect, meta: LayoutMeta): number {
  const rightMargin = meta.parentBaseWidth - (meta.baseX + meta.baseWidth);
  return rightX(bounds, meta.baseWidth) - rightMargin;
}

function bottomAlignedY(bounds: UIRect, meta: LayoutMeta): number {
  const bottomMargin = meta.parentBaseHeight - (meta.baseY + meta.baseHeight);
  return bottomY(bounds, meta.baseHeight) - bottomMargin;
}

function stretchedWidth(bounds: UIRect, meta: LayoutMeta): number {
  const rightMargin = meta.parentBaseWidth - (meta.baseX + meta.baseWidth);
  return Math.max(0, bounds.width - meta.baseX - rightMargin);
}

function stretchedHeight(bounds: UIRect, meta: LayoutMeta): number {
  const bottomMargin = meta.parentBaseHeight - (meta.baseY + meta.baseHeight);
  return Math.max(0, bounds.height - meta.baseY - bottomMargin);
}

export function applyAlignment(display: Container, meta: LayoutMeta, bounds: UIRect): void {
  if (!meta.align) {
    return;
  }

  let nextX = meta.baseX;
  let nextY = meta.baseY;
  let nextWidth = meta.baseWidth;
  let nextHeight = meta.baseHeight;

  switch (meta.align) {
    case "center":
      nextX = centeredX(bounds, meta);
      nextY = centeredY(bounds, meta);
      break;
    case "top":
      nextY = topAlignedY(bounds, meta);
      break;
    case "bottom":
      nextY = bottomAlignedY(bounds, meta);
      break;
    case "left":
      nextX = leftAlignedX(bounds, meta);
      break;
    case "right":
      nextX = rightAlignedX(bounds, meta);
      break;
    case "top-left":
      nextX = leftAlignedX(bounds, meta);
      nextY = topAlignedY(bounds, meta);
      break;
    case "top-center":
      nextX = centeredX(bounds, meta);
      nextY = topAlignedY(bounds, meta);
      break;
    case "top-right":
      nextX = rightAlignedX(bounds, meta);
      nextY = topAlignedY(bounds, meta);
      break;
    case "bottom-left":
      nextX = leftAlignedX(bounds, meta);
      nextY = bottomAlignedY(bounds, meta);
      break;
    case "bottom-center":
      nextX = centeredX(bounds, meta);
      nextY = bottomAlignedY(bounds, meta);
      break;
    case "bottom-right":
      nextX = rightAlignedX(bounds, meta);
      nextY = bottomAlignedY(bounds, meta);
      break;
    case "left-center":
      nextX = leftAlignedX(bounds, meta);
      nextY = centeredY(bounds, meta);
      break;
    case "right-center":
      nextX = rightAlignedX(bounds, meta);
      nextY = centeredY(bounds, meta);
      break;
    case "stretch-width":
      nextX = leftAlignedX(bounds, meta);
      nextWidth = stretchedWidth(bounds, meta);
      break;
    case "stretch-height":
      nextY = topAlignedY(bounds, meta);
      nextHeight = stretchedHeight(bounds, meta);
      break;
    case "stretch-full":
      nextX = leftAlignedX(bounds, meta);
      nextY = topAlignedY(bounds, meta);
      nextWidth = stretchedWidth(bounds, meta);
      nextHeight = stretchedHeight(bounds, meta);
      break;
    default:
      break;
  }

  display.position.set(nextX, nextY);
  if (meta.allowResizeX && nextWidth > 0) {
    if (display instanceof Text) {
      console.warn(`[UILayout] Refused to resize text node "${display.label || display.name || "(unnamed)"}" via width.`);
    } else {
      display.width = nextWidth;
    }
  }
  if (meta.allowResizeY && nextHeight > 0) {
    if (display instanceof Text) {
      console.warn(`[UILayout] Refused to resize text node "${display.label || display.name || "(unnamed)"}" via height.`);
    } else {
      display.height = nextHeight;
    }
  }
}
