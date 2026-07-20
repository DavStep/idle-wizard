export const marketLicences = Object.freeze([
  Object.freeze({ id: 'smallTown', name: 'Small Town Market', requiredStars: 0, rank: 1 }),
  Object.freeze({ id: 'crossroads', name: 'Crossroads Market', requiredStars: 1, rank: 2 }),
  Object.freeze({ id: 'cityBazaar', name: 'City Bazaar', requiredStars: 3, rank: 3 }),
  Object.freeze({ id: 'grandExchange', name: 'Grand Exchange', requiredStars: 6, rank: 4 }),
  Object.freeze({ id: 'arcaneExchange', name: 'Arcane Exchange', requiredStars: 10, rank: 5 }),
]);

export const defaultMarketLicence = marketLicences[0];
export const defaultMarketId = defaultMarketLicence.id;

export function normalizeCompletedPrestigeStars(stars = 0) {
  const normalized = Math.floor(Number(stars));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

export function resolveMarketLicence(completedPrestigeStars = 0) {
  const stars = normalizeCompletedPrestigeStars(completedPrestigeStars);

  return marketLicences.reduce(
    (active, licence) => (stars >= licence.requiredStars ? licence : active),
    defaultMarketLicence,
  );
}

export function isMarketId(marketId) {
  return marketLicences.some((licence) => licence.id === marketId);
}

export function getMarketLicenceById(marketId) {
  return marketLicences.find((licence) => licence.id === marketId) ?? defaultMarketLicence;
}

export function getMarketRank(marketId) {
  return getMarketLicenceById(marketId).rank;
}

export function getMarketGradeForCatalogIndex(index, catalogLength) {
  const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
  const safeLength = Math.max(1, Math.floor(Number(catalogLength) || 1));

  return Math.min(marketLicences.length, Math.floor((safeIndex * marketLicences.length) / safeLength) + 1);
}

export function getRequiredMarketLicence(itemGrade = 1) {
  const safeGrade = Math.max(
    1,
    Math.min(marketLicences.length, Math.floor(Number(itemGrade) || 1)),
  );

  return marketLicences[safeGrade - 1] ?? defaultMarketLicence;
}

export function isItemGradeTradedInMarket(itemGrade, marketId) {
  return getMarketRank(marketId) >= getRequiredMarketLicence(itemGrade).rank;
}
