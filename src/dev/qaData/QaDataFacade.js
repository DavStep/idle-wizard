import { QaDataTemplateManager } from './managers/QaDataTemplateManager.js';

export class QaDataFacade {
  static explain =
    'Loads copied QA progress templates into local development sessions so UI can be checked at known player states.';

  constructor({
    gameplayFacade,
    templateManager = new QaDataTemplateManager({ gameplayFacade }),
  } = {}) {
    this.templateManager = templateManager;
  }

  listTemplates() {
    return this.templateManager.listTemplates();
  }

  loadTemplate(templateIdOrAlias, options) {
    return this.templateManager.loadTemplate(templateIdOrAlias, options);
  }
}
