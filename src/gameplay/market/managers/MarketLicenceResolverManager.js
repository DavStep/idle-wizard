import { resolveMarketLicence } from '../../../shared/marketLicence.js';

export class MarketLicenceResolverManager {
  resolve(completedPrestigeStars = 0) {
    return resolveMarketLicence(completedPrestigeStars);
  }
}
