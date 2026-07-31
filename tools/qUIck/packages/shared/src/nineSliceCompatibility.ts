import type { UINineSliceData, UISize } from "./schema.js";

export function resolveNineSliceMinimumSize(slice: UINineSliceData): UISize {
  return {
    width: Math.max(0, Number(slice.left) || 0) +
      Math.max(0, Number(slice.right) || 0) + 1,
    height: Math.max(0, Number(slice.top) || 0) +
      Math.max(0, Number(slice.bottom) || 0) + 1
  };
}

export function assertNineSliceFits(
  name: string,
  size: UISize,
  minimumSize: UISize
): void {
  if (size.width >= minimumSize.width && size.height >= minimumSize.height) {
    return;
  }

  throw new RangeError(
    `Nine-slice "${name}" requires at least ` +
    `${minimumSize.width}x${minimumSize.height}, but received ` +
    `${size.width}x${size.height}.`
  );
}
