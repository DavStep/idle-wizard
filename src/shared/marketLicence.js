export const marketLicences = Object.freeze([
  Object.freeze({ id: 'smallTown', name: 'Small Town Market', requiredStars: 0 }),
  Object.freeze({ id: 'crossroads', name: 'Crossroads Market', requiredStars: 1 }),
  Object.freeze({ id: 'cityBazaar', name: 'City Bazaar', requiredStars: 3 }),
  Object.freeze({ id: 'grandExchange', name: 'Grand Exchange', requiredStars: 6 }),
  Object.freeze({ id: 'arcaneExchange', name: 'Arcane Exchange', requiredStars: 10 }),
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
