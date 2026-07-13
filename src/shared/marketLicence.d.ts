export type MarketLicence = Readonly<{
  id: string;
  name: string;
  requiredStars: number;
}>;

export const marketLicences: readonly MarketLicence[];
export const defaultMarketLicence: MarketLicence;
export const defaultMarketId: string;
export function normalizeCompletedPrestigeStars(stars?: number): number;
export function resolveMarketLicence(completedPrestigeStars?: number): MarketLicence;
export function isMarketId(marketId: unknown): boolean;
