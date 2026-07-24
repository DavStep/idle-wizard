import type { UIAlignment } from "./schema.js";

export interface ParsedLayerTags {
  screen?: boolean;
  dialog?: boolean;
  hud?: boolean;
  component?: boolean;
  raster?: boolean;
  image?: boolean;
  text?: boolean;
  button?: boolean;
  container?: boolean;
  ignore?: boolean;
  modal?: boolean;
  overlay?: boolean;
  nine?: boolean;
  assetName?: string;
  align?: UIAlignment;
}

export interface ParsedNineSlice {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

export interface ParsedLayerName {
  cleanName: string;
  tags: ParsedLayerTags;
  nineSlice?: ParsedNineSlice;
}

const KNOWN_ALIGNMENTS = new Set<UIAlignment>([
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "left-center",
  "right-center",
  "stretch-width",
  "stretch-height",
  "stretch-full"
]);

const SIMPLE_TAGS = new Set([
  "screen",
  "dialog",
  "hud",
  "component",
  "raster",
  "image",
  "text",
  "button",
  "container",
  "ignore",
  "modal",
  "overlay"
]);

export function parseLayerName(input: string): ParsedLayerName {
  const source = input.trim();
  const tags: ParsedLayerTags = {};
  let nineSlice: ParsedNineSlice | undefined;
  const consumedRanges: Array<{ start: number; end: number }> = [];

  const tokenRegex = /@([a-zA-Z]+)(?:\(([^)]*)\))?/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(source)) !== null) {
    const full = match[0];
    const name = match[1].toLowerCase();
    const args = match[2]?.trim();
    consumedRanges.push({ start: match.index, end: match.index + full.length });

    if (SIMPLE_TAGS.has(name)) {
      (tags as Record<string, boolean>)[name] = true;
      continue;
    }

    if (name === "align" && args) {
      const candidate = args as UIAlignment;
      if (KNOWN_ALIGNMENTS.has(candidate)) {
        tags.align = candidate;
      }
      continue;
    }

    if (name === "asset" && args) {
      tags.assetName = args;
      continue;
    }

    if (name === "nine") {
      tags.nine = true;
      if (args) {
        const parts = args
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
          .map((p) => Number(p));
        if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
          nineSlice = {
            left: parts[0],
            top: parts[1],
            right: parts[2],
            bottom: parts[3]
          };
        }
      }
    }
  }

  const cleanName = buildCleanName(source, consumedRanges);
  return { cleanName, tags, nineSlice };
}

function buildCleanName(source: string, ranges: Array<{ start: number; end: number }>): string {
  if (ranges.length === 0) {
    return source.trim();
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let cursor = 0;
  const chunks: string[] = [];
  for (const range of sorted) {
    if (range.start > cursor) {
      chunks.push(source.slice(cursor, range.start));
    }
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < source.length) {
    chunks.push(source.slice(cursor));
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim();
}
