import { PageAnnouncementManager } from './managers/PageAnnouncementManager.js';

const FEATURE_UNLOCK_PREVIEW_VALUES = Object.freeze([
  'garden',
  'research',
  'brewing',
  'prestige',
  'leaderboard',
  'discoveries',
  'alliance',
  'inbox',
]);

const FEATURE_UNLOCK_PREVIEW_PAGE_IDS = Object.freeze({
  brewing: 'brewing',
  garden: 'garden',
  prestige: 'prestige',
  research: 'research',
});

export class PageAnnouncementFacade {
  static explain =
    'Shows short full-screen reward, unlock, and research notices after major progress moments.';

  constructor({ gameplayFacade, playerFacade } = {}) {
    this.manager = new PageAnnouncementManager({
      gameplayFacade,
      playerFacade,
    });
  }

  mount(stage) {
    this.manager.mount(stage);
  }

  unmount() {
    this.manager.unmount();
  }

  showFeatureUnlockPreview(options = {}) {
    return this.manager.showFeatureUnlockPreview({
      values: options.values ?? FEATURE_UNLOCK_PREVIEW_VALUES,
      pageIds: options.pageIds ?? FEATURE_UNLOCK_PREVIEW_PAGE_IDS,
      notices: options.notices ?? {},
    });
  }
}
