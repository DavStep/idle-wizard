import { RewardFlyoutManager } from '../../shared/RewardFlyoutManager.js';

export class WorkshopFlyoutManager extends RewardFlyoutManager {
  constructor() {
    super({
      rootClassName: 'room-reward-flyouts workshop-page__flyouts',
      flyoutClassName: 'room-reward-flyout workshop-page__flyout',
    });
  }
}
