const INTEGRATION_API_VERSION = 1;
const VALID_KINDS = new Set(['dialog', 'scene', 'widget']);
const VALID_SECTIONS = new Set([
  'buttons',
  'composite-widgets',
  'dialogs',
  'progress-bars',
  'scenes',
  'sliders',
]);

/**
 * Declares one development-only UI Lab integration.
 *
 * Integrations live beside production widgets and use their public APIs. The
 * production runtime never imports these manifests.
 */
export function defineUiEditorIntegration(definition) {
  const normalized = normalizeIntegration(definition);
  return Object.freeze(normalized);
}

export function normalizeUiEditorIntegrationModules(modules) {
  const integrations = [];

  for (const [source, module] of Object.entries(modules ?? {})) {
    const exported = module?.default ?? module;
    const definitions = Array.isArray(exported) ? exported : [exported];

    for (const definition of definitions) {
      try {
        integrations.push(defineUiEditorIntegration(definition));
      } catch (error) {
        throw new Error(
          `Invalid UI Lab integration in ${source}: ${error.message}`,
          { cause: error },
        );
      }
    }
  }

  const ids = new Set();
  for (const integration of integrations) {
    if (ids.has(integration.id)) {
      throw new Error(`Duplicate UI Lab integration: ${integration.id}`);
    }
    ids.add(integration.id);
  }

  return Object.freeze(
    integrations.sort((left, right) => left.label.localeCompare(right.label)),
  );
}

function normalizeIntegration(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new Error('Integration definition must be an object.');
  }

  const apiVersion = Number(definition.apiVersion);
  if (apiVersion !== INTEGRATION_API_VERSION) {
    throw new Error(
      `Integration apiVersion must be ${INTEGRATION_API_VERSION}.`,
    );
  }

  const id = requiredText(definition.id, 'id');
  const label = requiredText(definition.label, 'label');
  const kind = requiredText(definition.kind ?? 'widget', 'kind');
  const sectionId = requiredText(definition.sectionId, 'sectionId');

  if (!VALID_KINDS.has(kind)) {
    throw new Error(`Unknown integration kind: ${kind}`);
  }
  if (!VALID_SECTIONS.has(sectionId)) {
    throw new Error(`Unknown integration section: ${sectionId}`);
  }

  const scenarios = normalizeScenarios(definition.scenarios, definition.mount);
  const childWidgetIds = normalizeChildWidgetIds(definition.childWidgetIds);

  if (isLargePreview({ id, kind }) && childWidgetIds.length === 0) {
    throw new Error(
      `Large UI Lab integration ${id} must declare childWidgetIds.`,
    );
  }

  return {
    apiVersion,
    childWidgetIds,
    createThumbnail: optionalFunction(
      definition.createThumbnail,
      'createThumbnail',
    ),
    folderPath: normalizeFolderPath(definition.folderPath),
    id,
    kind,
    label,
    properties: normalizeProperties(definition.properties),
    scenarios,
    sectionId,
    usages: normalizeUsages(definition.usages),
  };
}

function isLargePreview({ id, kind }) {
  return kind === 'scene' || kind === 'dialog' || id.startsWith('feature.');
}

function normalizeChildWidgetIds(childWidgetIds) {
  const ids = new Set();

  return Object.freeze(
    (Array.isArray(childWidgetIds) ? childWidgetIds : []).map((value) => {
      const id = requiredText(value, 'child widget id');
      if (ids.has(id)) {
        throw new Error(`Duplicate child widget id: ${id}`);
      }
      ids.add(id);
      return id;
    }),
  );
}

function optionalFunction(value, label) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'function') {
    throw new Error(`Integration ${label} must be a function.`);
  }
  return value;
}

function normalizeScenarios(scenarios, fallbackMount) {
  const source = Array.isArray(scenarios) && scenarios.length > 0
    ? scenarios
    : [{ id: 'default', label: 'Default', mount: fallbackMount }];
  const ids = new Set();

  return Object.freeze(source.map((scenario) => {
    const id = requiredText(scenario?.id, 'scenario id');
    const label = requiredText(scenario?.label ?? id, 'scenario label');
    const mount = scenario?.mount ?? fallbackMount;

    if (ids.has(id)) {
      throw new Error(`Duplicate integration scenario: ${id}`);
    }
    if (typeof mount !== 'function') {
      throw new Error(`Scenario ${id} requires a mount function.`);
    }
    ids.add(id);
    return Object.freeze({
      fixture: scenario?.fixture,
      id,
      label,
      mount,
    });
  }));
}

function normalizeFolderPath(folderPath) {
  return Object.freeze(
    (Array.isArray(folderPath) ? folderPath : [])
      .map((segment) => String(segment ?? '').trim())
      .filter(Boolean),
  );
}

function normalizeProperties(properties) {
  return Object.freeze(
    (Array.isArray(properties) ? properties : []).map((property) =>
      Object.freeze({ ...property }),
    ),
  );
}

function normalizeUsages(usages) {
  return Object.freeze(
    (Array.isArray(usages) ? usages : []).map((usage) =>
      Object.freeze(
        typeof usage === 'string' ? { label: usage, source: '' } : { ...usage },
      ),
    ),
  );
}

function requiredText(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`Integration ${label} is required.`);
  }
  return normalized;
}
