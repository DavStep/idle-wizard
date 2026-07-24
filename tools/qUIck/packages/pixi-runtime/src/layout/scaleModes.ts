import type { UIScaleMode } from "@figma-pixi/shared";

export interface ScaleResult {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function resolveScaleMode(
  scaleMode: UIScaleMode,
  viewportWidth: number,
  viewportHeight: number,
  designWidth: number,
  designHeight: number
): ScaleResult {
  const sx = viewportWidth / designWidth;
  const sy = viewportHeight / designHeight;

  let scale = 1;
  switch (scaleMode) {
    case "fit":
      scale = Math.min(sx, sy);
      break;
    case "fitWidth":
      scale = sx;
      break;
    case "fitHeight":
      scale = sy;
      break;
    case "cover":
      scale = Math.max(sx, sy);
      break;
    case "none":
    default:
      scale = 1;
      break;
  }

  return {
    scale,
    offsetX: (viewportWidth - designWidth * scale) * 0.5,
    offsetY: (viewportHeight - designHeight * scale) * 0.5
  };
}
