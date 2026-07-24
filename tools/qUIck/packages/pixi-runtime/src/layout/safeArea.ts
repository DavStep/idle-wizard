import type { UIRect } from "@figma-pixi/shared";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function coerceFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveSafeArea(
  designWidth: number,
  designHeight: number,
  fallbackSafeArea: UIRect | undefined,
  inputSafeArea: UIRect | undefined,
  rootOffsetX: number,
  rootOffsetY: number,
  rootScale: number
): UIRect {
  if (inputSafeArea && rootScale > 0) {
    const x = coerceFinite((inputSafeArea.x - rootOffsetX) / rootScale, 0);
    const y = coerceFinite((inputSafeArea.y - rootOffsetY) / rootScale, 0);
    const width = Math.max(0, coerceFinite(inputSafeArea.width / rootScale, designWidth));
    const height = Math.max(0, coerceFinite(inputSafeArea.height / rootScale, designHeight));

    return {
      x,
      y,
      width,
      height
    };
  }

  if (fallbackSafeArea) {
    return {
      x: clamp(fallbackSafeArea.x, 0, designWidth),
      y: clamp(fallbackSafeArea.y, 0, designHeight),
      width: clamp(fallbackSafeArea.width, 0, designWidth),
      height: clamp(fallbackSafeArea.height, 0, designHeight)
    };
  }

  return { x: 0, y: 0, width: designWidth, height: designHeight };
}
