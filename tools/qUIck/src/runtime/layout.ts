import type { FigmaPixiAsset, FigmaPixiNode } from "../schema.js";

export interface RuntimeNodePlan {
  id: string;
  name: string;
  type: FigmaPixiNode["type"];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  visible: boolean;
  asset?: FigmaPixiAsset;
  children: RuntimeNodePlan[];
}

export function createRuntimePlan(
  node: FigmaPixiNode,
  assetsById: Map<string, FigmaPixiAsset>
): RuntimeNodePlan {
  const assetId = "assetId" in node ? node.assetId : undefined;
  const asset = assetId ? assetsById.get(assetId) : undefined;

  if (assetId && !asset) {
    throw new Error(`Missing asset "${assetId}" for UI node "${node.name}".`);
  }

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation ?? 0,
    scaleX: node.scaleX ?? 1,
    scaleY: node.scaleY ?? 1,
    alpha: node.alpha ?? 1,
    visible: node.visible ?? true,
    asset,
    children: (node.children ?? []).map((child) => createRuntimePlan(child, assetsById))
  };
}

export function hexToNumber(hex: string): number {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  return Number.parseInt(normalized, 16);
}
