import type { FigmaPixiDocument } from "../schema.js";
import type { AssetNameSource } from "./assetNaming.js";

export interface ExportOptions {
  assetBasePath?: string;
  assetScale?: number;
  includeHidden?: boolean;
  useParentFrameAsCanvas?: boolean;
}

export interface AssetExportRequest {
  assetId: string;
  nodeId: string;
  fileName: string;
  name: string;
  nameSource: AssetNameSource;
  explicitName: boolean;
  scale: number;
}

export interface ExportedFigmaPixiUI {
  document: FigmaPixiDocument;
  assetRequests: AssetExportRequest[];
  warnings: string[];
  errors: string[];
}
