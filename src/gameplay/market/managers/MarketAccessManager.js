import {
  getRequiredMarketLicence,
  isItemGradeTradedInMarket,
} from '../../../shared/marketLicence.js';

export class MarketAccessManager {
  getStallCount(licence) {
    return Math.max(1, Math.min(5, Math.floor(Number(licence?.rank) || 1)));
  }

  getItemAccess(item, licence) {
    const grade = Math.max(1, Math.min(5, Math.floor(Number(item?.marketGrade) || 1)));
    const requiredMarket = getRequiredMarketLicence(grade);

    return {
      grade,
      tradedHere: isItemGradeTradedInMarket(grade, licence?.id),
      requiredMarket,
    };
  }
}
