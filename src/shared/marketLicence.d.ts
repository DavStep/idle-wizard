export type MarketLicence = Readonly<{
  id: string;
  name: string;
  requiredStars: number;
  rank: number;
}>;

export const marketLicences: readonly MarketLicence[];
export const defaultMarketLicence: MarketLicence;
export const defaultMarketId: string;
export function normalizeCompletedPrestigeStars(stars?: number): number;
export function resolveMarketLicence(completedPrestigeStars?: number): MarketLicence;
export function isMarketId(marketId: unknown): boolean;
export function getMarketLicenceById(marketId: unknown): MarketLicence;
export function getMarketRank(marketId: unknown): number;
export function getMarketGradeForCatalogIndex(index: number, catalogLength: number): number;
export function getRequiredMarketLicence(itemGrade?: number): MarketLicence;
export function isItemGradeTradedInMarket(itemGrade: number, marketId: unknown): boolean;
