import { UiEditorLabClock } from './UiEditorLabClock.js';

const EVENT_LIMIT = 40;

export function createUiEditorIntegrationPreview(integration) {
  const host = document.createElement('section');
  const surface = document.createElement('div');
  const status = document.createElement('p');
  const inspector = document.createElement('section');
  let disposed = false;
  let mountGeneration = 0;
  let instance = null;
  let clock = null;
  let scenarioId = integration.scenarios[0].id;
  let events = [];
  let cleanupCallbacks = [];

  host.className = 'ui-editor-lab-preview';
  host.dataset.uiEditorComponent = 'UiLabIntegration';
  host.dataset.uiEditorIntegration = integration.id;
  host.setAttribute('aria-label', `${integration.label} UI Lab preview`);
  surface.className = 'ui-editor-lab-preview__surface';
  status.className = 'ui-editor-lab-preview__status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading integration…';
  inspector.className = 'ui-editor-lab-inspector';
  inspector.setAttribute('aria-label', `${integration.label} UI Lab controls`);
  host.append(surface, status);

  const dispatchHierarchyChange = () => {
    host.dispatchEvent(
      new globalThis.CustomEvent('ui-editor-hierarchy-change', {
        bubbles: true,
      }),
    );
  };

  const reportEvent = (type, detail = null) => {
    events = [
      ...events,
      {
        detail,
        id: `${Date.now()}:${events.length}`,
        timeMs: clock?.now() ?? 0,
        type: String(type ?? 'event'),
      },
    ].slice(-EVENT_LIMIT);
    syncInspector();
    return events.at(-1);
  };

  const registerCleanup = (cleanup) => {
    if (typeof cleanup === 'function') {
      cleanupCallbacks.push(cleanup);
    }
    return cleanup;
  };

  const disposeInstance = () => {
    for (const cleanup of cleanupCallbacks.splice(0).reverse()) {
      try {
        cleanup();
      } catch (error) {
        globalThis.console?.error(error);
      }
    }
    try {
      instance?.dispose?.();
    } catch (error) {
      globalThis.console?.error(error);
    }
    instance = null;
    clock?.destroy();
    clock = null;
  };

  const mountScenario = async (nextScenarioId = scenarioId) => {
    const scenario = integration.scenarios.find(
      ({ id }) => id === nextScenarioId,
    );
    if (!scenario || disposed) {
      return false;
    }

    const generation = ++mountGeneration;
    disposeInstance();
    scenarioId = scenario.id;
    events = [];
    surface.replaceChildren();
    status.hidden = false;
    delete status.dataset.error;
    status.textContent = 'Loading integration…';
    renderInspector();

    clock = new UiEditorLabClock();
    const context = Object.freeze({
      clock,
      emit: reportEvent,
      integration,
      invalidate: () => syncInspector(),
      registerCleanup,
      scenario,
    });

    try {
      const mounted = await scenario.mount(context, scenario.fixture);
      if (disposed || generation !== mountGeneration) {
        mounted?.dispose?.();
        return false;
      }
      if (!mounted?.preview || mounted.preview.nodeType !== 1) {
        throw new Error(
          `UI Lab integration ${integration.id} did not return a preview element.`,
        );
      }
      instance = normalizeInstance(mounted);
      surface.replaceChildren(instance.preview);
      syncPreviewIdentity(host, integration, instance.preview);
      status.hidden = true;
      reportEvent('scenarioMounted', { scenarioId });
      renderInspector();
      dispatchHierarchyChange();
      return true;
    } catch (error) {
      if (!disposed && generation === mountGeneration) {
        status.hidden = false;
        status.dataset.error = 'true';
        status.textContent = 'Integration failed to load.';
        reportEvent('integrationError', String(error?.message ?? error));
        globalThis.console?.error(error);
        renderInspector();
      }
      return false;
    }
  };

  const renderInspector = () => {
    const fragment = document.createDocumentFragment();
    fragment.append(createScenarioSection());
    if (instance?.controls.length) {
      fragment.append(createControlsSection(instance.controls));
    }
    if (instance?.actions.length) {
      fragment.append(createActionsSection(instance.actions));
    }
    fragment.append(createEventsSection());
    inspector.replaceChildren(fragment);
    syncInspector();
  };

  const createScenarioSection = () => {
    const section = createInspectorSection('Scenario');
    const field = document.createElement('label');
    const label = document.createElement('span');
    const select = document.createElement('select');
    const reset = createActionButton('Reset scenario');

    field.className = 'ui-editor-lab-inspector__field';
    label.className = 'ui-editor-lab-inspector__label';
    label.textContent = 'State';
    select.className = 'ui-editor-lab-inspector__control';
    select.dataset.labScenario = 'true';
    select.disabled = integration.scenarios.length < 2;
    for (const scenario of integration.scenarios) {
      const option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = scenario.label;
      option.selected = scenario.id === scenarioId;
      select.append(option);
    }
    select.addEventListener('change', () => void mountScenario(select.value));
    field.append(label, select);
    reset.dataset.labReset = 'true';
    reset.addEventListener('click', () => void mountScenario(scenarioId));
    section.body.append(field, reset);
    return section.root;
  };

  const createControlsSection = (controls) => {
    const section = createInspectorSection('Controls');
    for (const control of controls) {
      section.body.append(createControlField(control));
    }
    return section.root;
  };

  const createActionsSection = (actions) => {
    const section = createInspectorSection('Actions');
    const row = document.createElement('div');
    row.className = 'ui-editor-lab-inspector__actions';
    for (const action of actions) {
      const button = createActionButton(action.label);
      button.dataset.labAction = action.id;
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await action.run();
          reportEvent(action.event ?? 'actionInvoked', {
            actionId: action.id,
            result,
          });
        } catch (error) {
          reportEvent('actionError', {
            actionId: action.id,
            message: String(error?.message ?? error),
          });
          globalThis.console?.error(error);
        } finally {
          syncInspector();
        }
      });
      row.append(button);
    }
    section.body.append(row);
    return section.root;
  };

  const createEventsSection = () => {
    const section = createInspectorSection('Events');
    const empty = document.createElement('p');
    const list = document.createElement('ol');
    empty.className = 'ui-editor-lab-inspector__events-empty';
    empty.dataset.labEventsEmpty = 'true';
    empty.textContent = 'No events yet.';
    list.className = 'ui-editor-lab-inspector__events';
    list.dataset.labEvents = 'true';
    list.setAttribute('aria-live', 'polite');
    section.body.append(empty, list);
    return section.root;
  };

  const createControlField = (control) => {
    const field = document.createElement('label');
    const heading = document.createElement('span');
    const value = document.createElement('output');
    const input = createControlInput(control);

    field.className = 'ui-editor-lab-inspector__field';
    field.dataset.controlType = control.type;
    heading.className = 'ui-editor-lab-inspector__label';
    heading.textContent = control.label;
    value.className = 'ui-editor-lab-inspector__value';
    value.dataset.labControlValue = control.id;
    input.classList.add('ui-editor-lab-inspector__control');
    input.dataset.labControl = control.id;

    const update = () => {
      const nextValue = readInputValue(input, control.type);
      control.setValue(nextValue);
      reportEvent(control.event ?? 'controlChanged', {
        controlId: control.id,
        value: control.getValue(),
      });
      syncInspector();
    };
    input.addEventListener(
      control.type === 'select' || control.type === 'checkbox'
        ? 'change'
        : 'input',
      update,
    );
    field.append(heading, value, input);
    return field;
  };

  const syncInspector = () => {
    if (!inspector.isConnected && !inspector.childElementCount) {
      return;
    }
    for (const control of instance?.controls ?? []) {
      const input = inspector.querySelector(
        `[data-lab-control="${escapeSelector(control.id)}"]`,
      );
      const output = inspector.querySelector(
        `[data-lab-control-value="${escapeSelector(control.id)}"]`,
      );
      if (!input) {
        continue;
      }
      const value = control.getValue();
      if (document.activeElement !== input || control.type === 'checkbox') {
        writeInputValue(input, control.type, value);
      }
      input.disabled = control.enabled ? !control.enabled() : false;
      if (output) {
        output.textContent = control.formatValue
          ? control.formatValue(value)
          : String(value ?? '');
      }
    }
    for (const action of instance?.actions ?? []) {
      const button = inspector.querySelector(
        `[data-lab-action="${escapeSelector(action.id)}"]`,
      );
      if (button) {
        button.disabled = action.enabled ? !action.enabled() : false;
      }
    }
    const list = inspector.querySelector('[data-lab-events]');
    const empty = inspector.querySelector('[data-lab-events-empty]');
    if (list && empty) {
      empty.hidden = events.length > 0;
      list.replaceChildren(...events.slice(-12).reverse().map(createEventItem));
    }
  };

  host.uiEditorCreateInspector = () => inspector;
  host.uiEditorGetAtomicComponents = () =>
    instance?.getAtomicComponents?.() ?? [];
  host.uiEditorSelectAtomicComponent = (component) =>
    instance?.preview?.uiEditorSelectAtomicComponent?.(component);
  host.uiEditorDispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    mountGeneration += 1;
    disposeInstance();
    surface.replaceChildren();
    inspector.replaceChildren();
  };

  renderInspector();
  globalThis.queueMicrotask(() => void mountScenario(scenarioId));
  return host;
}

function syncPreviewIdentity(host, integration, preview) {
  const component =
    preview.dataset.uiEditorComponent?.trim()
    || preview.dataset.uiEditorLabel?.trim()
    || integration.label;
  host.dataset.uiEditorComponent = component;
  host.dataset.uiEditorType = preview.querySelector('canvas')
    ? 'canvas'
    : preview.tagName.toLowerCase();
  host.setAttribute('aria-label', `${component} UI Lab preview`);
}

function normalizeInstance(instance) {
  return {
    actions: normalizeActions(instance.actions),
    controls: normalizeControls(instance.controls),
    dispose: typeof instance.dispose === 'function' ? instance.dispose : null,
    getAtomicComponents:
      typeof instance.getAtomicComponents === 'function'
        ? instance.getAtomicComponents
        : null,
    preview: instance.preview,
  };
}

function normalizeControls(controls) {
  return (Array.isArray(controls) ? controls : [])
    .filter(
      (control) =>
        control?.id &&
        control?.label &&
        typeof control.getValue === 'function' &&
        typeof control.setValue === 'function',
    )
    .map((control) => ({
      ...control,
      id: String(control.id),
      label: String(control.label),
      type: ['checkbox', 'number', 'range', 'select', 'text'].includes(
        control.type,
      )
        ? control.type
        : 'text',
    }));
}

function normalizeActions(actions) {
  return (Array.isArray(actions) ? actions : [])
    .filter(
      (action) =>
        action?.id && action?.label && typeof action.run === 'function',
    )
    .map((action) => ({ ...action, id: String(action.id) }));
}

function createInspectorSection(title) {
  const root = document.createElement('section');
  const heading = document.createElement('h3');
  const body = document.createElement('div');
  root.className = 'ui-editor-lab-inspector__section';
  heading.className = 'ui-editor-lab-inspector__heading';
  heading.textContent = title;
  body.className = 'ui-editor-lab-inspector__section-body';
  root.append(heading, body);
  return { body, root };
}

function createControlInput(control) {
  if (control.type === 'select') {
    const select = document.createElement('select');
    for (const optionDefinition of control.options ?? []) {
      const option = document.createElement('option');
      const normalized =
        typeof optionDefinition === 'object'
          ? optionDefinition
          : { label: optionDefinition, value: optionDefinition };
      option.value = String(normalized.value ?? '');
      option.textContent = String(normalized.label ?? normalized.value ?? '');
      option.disabled = normalized.disabled === true;
      select.append(option);
    }
    return select;
  }

  const input = document.createElement('input');
  input.type = control.type === 'checkbox' ? 'checkbox' : control.type;
  if (['number', 'range'].includes(control.type)) {
    if (Number.isFinite(Number(control.min))) input.min = String(control.min);
    if (Number.isFinite(Number(control.max))) input.max = String(control.max);
    if (Number.isFinite(Number(control.step))) input.step = String(control.step);
  }
  return input;
}

function readInputValue(input, type) {
  if (type === 'checkbox') return input.checked;
  if (['number', 'range'].includes(type)) return Number(input.value);
  return input.value;
}

function writeInputValue(input, type, value) {
  if (type === 'checkbox') {
    input.checked = value === true;
  } else {
    input.value = String(value ?? '');
  }
}

function createActionButton(label) {
  const button = document.createElement('button');
  button.className = 'ui-editor-lab-inspector__action';
  button.type = 'button';
  button.textContent = label;
  return button;
}

function createEventItem(event) {
  const item = document.createElement('li');
  const type = document.createElement('span');
  const detail = document.createElement('code');
  item.className = 'ui-editor-lab-inspector__event';
  type.className = 'ui-editor-lab-inspector__event-type';
  type.textContent = event.type;
  detail.className = 'ui-editor-lab-inspector__event-detail';
  detail.textContent = formatEventDetail(event.detail);
  item.append(type);
  if (detail.textContent) item.append(detail);
  return item;
}

function formatEventDetail(detail) {
  if (detail === null || detail === undefined) return '';
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function escapeSelector(value) {
  return globalThis.CSS?.escape?.(String(value)) ?? String(value).replaceAll('"', '\\"');
}
