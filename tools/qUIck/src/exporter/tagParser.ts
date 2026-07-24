import type { FigmaPixiAlign, FigmaPixiRootKind } from "../schema.js";

export interface ParsedTags {
  cleanName: string;
  kind?: FigmaPixiRootKind;
  align?: FigmaPixiAlign;
  modal?: boolean;
  dialog?: boolean;
  container?: boolean;
  button?: boolean;
  raster?: boolean;
  image?: boolean;
  text?: boolean;
  overlay?: boolean;
  nine?: boolean;
  ignore?: boolean;
  assetName?: string;
  unsupportedAlign?: string;
}

const KNOWN_ALIGNS: ReadonlySet<FigmaPixiAlign> = new Set([
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

export function parseLayerTags(name: string): ParsedTags {
  const source = name.trim();
  const tags: ParsedTags = { cleanName: source };
  const ranges: Array<{ start: number; end: number }> = [];
  const tokenRegex = /@([a-zA-Z]+)(?:\(([^)]*)\))?/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(source)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
    const tagName = match[1].toLowerCase();
    const args = match[2] ? match[2].trim() : "";

    switch (tagName) {
      case "screen":
        tags.kind = "screen";
        break;
      case "dialog":
        tags.dialog = true;
        tags.kind = "dialog";
        break;
      case "hud":
      case "component":
        tags.kind = tagName;
        break;
      case "modal":
        tags.modal = true;
        break;
      case "container":
        tags.container = true;
        break;
      case "button":
        tags.button = true;
        break;
      case "raster":
        tags.raster = true;
        break;
      case "image":
        tags.image = true;
        break;
      case "text":
        tags.text = true;
        break;
      case "overlay":
        tags.overlay = true;
        break;
      case "nine":
        tags.nine = true;
        break;
      case "ignore":
        tags.ignore = true;
        break;
      case "asset":
        if (args.length > 0) {
          tags.assetName = args;
        }
        break;
      case "align": {
        if (KNOWN_ALIGNS.has(args as FigmaPixiAlign)) {
          tags.align = args as FigmaPixiAlign;
        } else if (args.length > 0) {
          tags.unsupportedAlign = args;
        }
        break;
      }
      default:
        break;
    }
  }

  tags.cleanName = stripRanges(source, ranges);
  return tags;
}

function stripRanges(source: string, ranges: Array<{ start: number; end: number }>): string {
  if (ranges.length === 0) {
    return source;
  }
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const chunks: string[] = [];
  let cursor = 0;
  for (const range of sorted) {
    if (cursor < range.start) {
      chunks.push(source.slice(cursor, range.start));
    }
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < source.length) {
    chunks.push(source.slice(cursor));
  }
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}
