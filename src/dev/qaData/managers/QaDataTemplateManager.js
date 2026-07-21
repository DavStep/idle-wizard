const DEFAULT_MANIFEST_PATH = '/qa-data/manifest.json';

export class QaDataTemplateManager {
  constructor({
    gameplayFacade,
    fetchFn = globalThis.fetch?.bind(globalThis),
    manifestPath = DEFAULT_MANIFEST_PATH,
    now = () => Date.now(),
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.fetchFn = fetchFn;
    this.manifestPath = manifestPath;
    this.now = now;
  }

  async listTemplates() {
    const manifestResult = await this.loadManifest();

    if (!manifestResult.ok) {
      return manifestResult;
    }

    return {
      ok: true,
      generatedAt: manifestResult.manifest.generatedAt ?? null,
      templates: this.normalizeTemplateEntries(manifestResult.manifest.templates),
      aliases: this.normalizeAliases(manifestResult.manifest.aliases),
    };
  }

  async loadTemplate(templateIdOrAlias, { refreshSavedAt = true } = {}) {
    if (!this.gameplayFacade) {
      return { ok: false, reason: 'gameplay_missing' };
    }

    const manifestResult = await this.loadManifest();

    if (!manifestResult.ok) {
      return manifestResult;
    }

    const templateEntry = this.findTemplateEntry(
      manifestResult.manifest,
      templateIdOrAlias,
    );

    if (!templateEntry) {
      return {
        ok: false,
        reason: 'unknown_template',
        template: templateIdOrAlias,
        templates: this.normalizeTemplateEntries(manifestResult.manifest.templates),
      };
    }

    const templateResult = await this.loadJson(templateEntry.path);

    if (!templateResult.ok) {
      return templateResult;
    }

    const save = this.extractSave(templateResult.value);

    if (!save) {
      return {
        ok: false,
        reason: 'invalid_template_save',
        template: templateEntry.id,
      };
    }

    const loadSave = refreshSavedAt ? { ...save, savedAt: this.now() } : save;
    const currentLevel = this.readCurrentLevel();
    const progressionSaves = this.createProgressionSaves(loadSave, currentLevel);
    let saved = false;

    for (const progressionSave of progressionSaves) {
      const loaded = this.gameplayFacade.loadPersistenceSave(progressionSave);

      if (!loaded) {
        return {
          ok: false,
          reason: 'template_load_failed',
          template: templateEntry.id,
        };
      }

      saved = await Promise.resolve(
        this.gameplayFacade.savePersistenceSnapshotAndFlush?.() ??
          this.gameplayFacade.savePersistenceSnapshot?.(),
      );

      if (!saved) {
        break;
      }
    }

    return {
      ok: Boolean(saved),
      ...(saved ? {} : { reason: 'save_failed' }),
      template: templateEntry.id,
      aliases: [...(templateEntry.aliases ?? [])],
      label: templateEntry.label ?? templateEntry.id,
      level: templateEntry.level ?? null,
      username: templateEntry.username ?? null,
      snapshot: this.gameplayFacade.getSnapshot?.(),
    };
  }

  createProgressionSaves(save, currentLevel) {
    const targetLevel = this.readSaveLevel(save);

    if (
      currentLevel === null ||
      targetLevel === null ||
      targetLevel <= currentLevel + 1
    ) {
      return [save];
    }

    return Array.from(
      { length: targetLevel - currentLevel },
      (_, index) => {
        const level = currentLevel + index + 1;
        const progressionSave = this.cloneSave(save);

        return level === targetLevel
          ? progressionSave
          : {
              ...progressionSave,
              tasks: {
                ...progressionSave.tasks,
                currentLevel: level,
              },
            };
      },
    );
  }

  cloneSave(save) {
    return JSON.parse(JSON.stringify(save));
  }

  readCurrentLevel() {
    return this.readLevel(this.gameplayFacade.getSnapshot?.()?.tasks?.currentLevel);
  }

  readSaveLevel(save) {
    return this.readLevel(save?.tasks?.currentLevel);
  }

  readLevel(value) {
    const level = Number(value);
    return Number.isInteger(level) && level >= 0 ? level : null;
  }

  async loadManifest() {
    const result = await this.loadJson(this.manifestPath);

    if (!result.ok) {
      return {
        ...result,
        reason: result.reason === 'fetch_failed' ? 'manifest_missing' : result.reason,
      };
    }

    if (!result.value || typeof result.value !== 'object') {
      return { ok: false, reason: 'invalid_manifest', path: this.manifestPath };
    }

    return { ok: true, manifest: result.value };
  }

  async loadJson(path) {
    if (typeof this.fetchFn !== 'function') {
      return { ok: false, reason: 'fetch_missing', path };
    }

    let response;

    try {
      response = await this.fetchFn(path, { cache: 'no-store' });
    } catch {
      return { ok: false, reason: 'fetch_failed', path };
    }

    if (!response?.ok) {
      return {
        ok: false,
        reason: 'fetch_failed',
        path,
        status: response?.status ?? 0,
      };
    }

    try {
      return { ok: true, value: await response.json() };
    } catch {
      return { ok: false, reason: 'invalid_json', path };
    }
  }

  findTemplateEntry(manifest, templateIdOrAlias) {
    const lookup = this.normalizeTemplateId(templateIdOrAlias);
    const aliases = this.normalizeAliases(manifest.aliases);
    const resolvedId = aliases[lookup] ?? lookup;
    const templates = this.normalizeTemplateEntries(manifest.templates);

    return templates.find((template) => template.id === resolvedId) ?? null;
  }

  normalizeTemplateEntries(templates) {
    if (!Array.isArray(templates)) {
      return [];
    }

    return templates
      .map((template) => this.normalizeTemplateEntry(template))
      .filter(Boolean);
  }

  normalizeTemplateEntry(template) {
    if (!template || typeof template !== 'object') {
      return null;
    }

    const id = this.normalizeTemplateId(template.id);
    const path = this.normalizeTemplatePath(template.path);

    if (!id || !path) {
      return null;
    }

    return {
      id,
      path,
      aliases: Array.isArray(template.aliases)
        ? template.aliases.map((alias) => this.normalizeTemplateId(alias)).filter(Boolean)
        : [],
      label: String(template.label ?? id),
      username: template.username ? String(template.username) : null,
      level: Number.isInteger(template.level) ? template.level : null,
      updatedAt: template.updatedAt ? String(template.updatedAt) : null,
    };
  }

  normalizeAliases(aliases) {
    if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(aliases)
        .map(([alias, id]) => [
          this.normalizeTemplateId(alias),
          this.normalizeTemplateId(id),
        ])
        .filter(([alias, id]) => alias && id),
    );
  }

  normalizeTemplatePath(path) {
    const text = String(path ?? '').trim();

    if (!text.startsWith('/qa-data/templates/') || !text.endsWith('.json')) {
      return '';
    }

    if (text.includes('..') || text.includes('\\')) {
      return '';
    }

    return text;
  }

  normalizeTemplateId(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  extractSave(template) {
    const save = template?.save ?? template;

    if (!save || typeof save !== 'object' || Array.isArray(save)) {
      return null;
    }

    return save;
  }
}
