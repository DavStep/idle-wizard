export class UiEditorUsageManager {
  constructor({ panel }) {
    this.panel = panel;
    this.refs = null;
    this.selectedComponent = null;

    this.handleInput = (event) => this.onInput(event);
  }

  mount() {
    if (this.refs) {
      return this.refs;
    }

    const header = this.panel.querySelector('.ui-editor-panel__header');
    const body = this.panel.querySelector('.ui-editor-panel__body');
    const root = document.createElement('section');
    const emptyState = document.createElement('p');
    const summary = document.createElement('div');
    const title = document.createElement('h2');
    const count = document.createElement('span');
    const editor = document.createElement('div');
    const properties = document.createElement('dl');
    const list = document.createElement('ul');

    header.textContent = 'Inspector';
    root.className = 'ui-editor-usages';
    root.dataset.empty = 'true';
    emptyState.className = 'ui-editor-usages__empty';
    emptyState.textContent = 'Select a widget or asset to inspect it.';
    summary.className = 'ui-editor-usages__summary';
    summary.hidden = true;
    title.className = 'ui-editor-usages__title';
    count.className = 'ui-editor-usages__count';
    editor.className = 'ui-editor-usages__editor';
    editor.hidden = true;
    properties.className = 'ui-editor-usages__properties';
    properties.hidden = true;
    list.className = 'ui-editor-usages__list';
    summary.append(title, count);
    root.append(summary, editor, properties, emptyState, list);
    body.replaceChildren(root);
    editor.addEventListener('input', this.handleInput);

    this.refs = {
      body,
      count,
      editor,
      emptyState,
      header,
      list,
      properties,
      root,
      summary,
      title,
    };
    return this.refs;
  }

  showEntry(entry) {
    if (
      !this.refs ||
      !['asset', 'widget'].includes(entry?.kind)
    ) {
      this.clear();
      return false;
    }

    const usages = normalizeUsages(entry.usages);
    const properties = normalizeProperties(entry.properties);
    this.selectedComponent = null;
    this.refs.editor.hidden = true;
    this.refs.editor.removeAttribute('aria-label');
    this.refs.editor.replaceChildren();
    this.refs.root.dataset.empty = String(usages.length === 0);
    this.refs.emptyState.hidden = usages.length > 0;
    this.refs.emptyState.textContent = usages.length
      ? ''
      : `No usages registered for this ${entry.kind}.`;
    this.refs.summary.hidden = false;
    this.refs.title.textContent = entry.label;
    this.refs.count.textContent = `${usages.length} ${
      usages.length === 1 ? 'usage' : 'usages'
    }`;
    this.refs.properties.hidden = properties.length === 0;
    this.refs.properties.setAttribute(
      'aria-label',
      `${entry.label} properties`,
    );
    this.refs.properties.replaceChildren(...properties.map(createPropertyItem));
    this.refs.list.setAttribute('aria-label', `${entry.label} usages`);
    this.refs.list.replaceChildren(...usages.map(createUsageItem));
    return true;
  }

  showAtlasFrame(entry, frame) {
    if (!this.refs || entry?.kind !== 'asset' || !frame?.name) {
      this.clear();
      return false;
    }

    const properties = createAtlasFrameProperties(entry, frame);
    this.selectedComponent = null;
    this.refs.root.dataset.empty = 'false';
    this.refs.editor.hidden = true;
    this.refs.editor.removeAttribute('aria-label');
    this.refs.editor.replaceChildren();
    this.refs.summary.hidden = false;
    this.refs.title.textContent = frame.name;
    this.refs.count.textContent = 'Atlas frame';
    this.refs.properties.hidden = false;
    this.refs.properties.setAttribute(
      'aria-label',
      `${frame.name} atlas frame properties`,
    );
    this.refs.properties.replaceChildren(
      ...properties.map(createPropertyItem),
    );
    this.refs.emptyState.hidden = true;
    this.refs.emptyState.textContent = '';
    this.refs.list.removeAttribute('aria-label');
    this.refs.list.replaceChildren();
    return true;
  }

  showComponent(component) {
    if (
      !this.refs
      || typeof component?.getFields !== 'function'
      || typeof component?.update !== 'function'
    ) {
      this.clear();
      return false;
    }

    const fields = normalizeFields(component.getFields());
    this.selectedComponent = component;
    this.refs.root.dataset.empty = String(fields.length === 0);
    this.refs.summary.hidden = false;
    this.refs.title.textContent = component.label;
    this.refs.count.textContent = 'Atomic component';
    this.refs.editor.hidden = fields.length === 0;
    this.refs.editor.setAttribute(
      'aria-label',
      `${component.label} editor`,
    );
    this.refs.editor.replaceChildren(...fields.map(createEditorField));
    this.refs.properties.hidden = true;
    this.refs.properties.removeAttribute('aria-label');
    this.refs.properties.replaceChildren();
    this.refs.list.removeAttribute('aria-label');
    this.refs.list.replaceChildren();
    this.refs.emptyState.hidden = fields.length > 0;
    this.refs.emptyState.textContent = fields.length
      ? ''
      : 'No editable properties for this component.';
    return true;
  }

  onInput(event) {
    const input = event.target.closest('[data-editor-component-field]');

    if (!input || !this.refs.editor.contains(input)) {
      return;
    }

    const fieldId = input.dataset.editorComponentField;
    const value = input.type === 'number'
      ? Number(input.value)
      : input.value;

    if (input.type === 'number' && !Number.isFinite(value)) {
      input.setAttribute('aria-invalid', 'true');
      return;
    }

    input.removeAttribute('aria-invalid');
    this.selectedComponent?.update(fieldId, value);
  }

  clear() {
    if (!this.refs) {
      return;
    }

    this.refs.root.dataset.empty = 'true';
    this.selectedComponent = null;
    this.refs.editor.hidden = true;
    this.refs.editor.removeAttribute('aria-label');
    this.refs.editor.replaceChildren();
    this.refs.emptyState.hidden = false;
    this.refs.emptyState.textContent =
      'Select a widget or asset to inspect it.';
    this.refs.summary.hidden = true;
    this.refs.title.textContent = '';
    this.refs.count.textContent = '';
    this.refs.properties.hidden = true;
    this.refs.properties.removeAttribute('aria-label');
    this.refs.properties.replaceChildren();
    this.refs.list.removeAttribute('aria-label');
    this.refs.list.replaceChildren();
  }

  unmount() {
    if (!this.refs) {
      return;
    }

    this.refs.header.textContent = 'Right panel';
    this.refs.editor.removeEventListener('input', this.handleInput);
    this.refs.body.replaceChildren();
    this.selectedComponent = null;
    this.refs = null;
  }
}

function normalizeFields(fields) {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((field) => ({
      id: String(field?.id ?? ''),
      label: String(field?.label ?? ''),
      options: Array.isArray(field?.options)
        ? field.options
            .map((option) => ({
              disabled: option?.disabled === true,
              label: String(option?.label ?? option?.value ?? ''),
              reason: String(option?.reason ?? ''),
              value: String(option?.value ?? ''),
            }))
            .filter(({ label }) => label)
        : [],
      step: Number.isFinite(Number(field?.step))
        ? Number(field.step)
        : 1,
      type: ['number', 'select', 'text'].includes(field?.type)
        ? field.type
        : 'text',
      value: field?.value ?? '',
    }))
    .filter(({ id, label }) => id && label);
}

function normalizeProperties(properties) {
  if (!Array.isArray(properties)) {
    return [];
  }

  return properties
    .map((property) => ({
      label: String(property?.label ?? ''),
      monospace: property?.monospace === true,
      value: String(property?.value ?? ''),
    }))
    .filter(({ label, value }) => label && value);
}

function normalizeUsages(usages) {
  if (!Array.isArray(usages)) {
    return [];
  }

  return usages
    .map((usage) =>
      typeof usage === 'string'
        ? { label: usage, source: '' }
        : {
            label: String(usage?.label ?? ''),
            source: String(usage?.source ?? ''),
          },
    )
    .filter(({ label }) => label);
}

function createAtlasFrameProperties(entry, frame) {
  const packedArea = Number(frame.width) * Number(frame.height);
  const sourceArea = Number(frame.originalWidth) * Number(frame.originalHeight);
  const footprint = sourceArea > 0
    ? `${Math.round(packedArea / sourceArea * 1000) / 10}% of source`
    : 'Unavailable';

  return [
    {
      label: 'Frame ID',
      monospace: true,
      value: frame.name,
    },
    {
      label: 'Source path',
      monospace: true,
      value: frame.source,
    },
    {
      label: 'Packed size',
      monospace: true,
      value: formatPixelSize(frame.width, frame.height),
    },
    {
      label: 'Source canvas',
      monospace: true,
      value: formatPixelSize(frame.originalWidth, frame.originalHeight),
    },
    {
      label: 'Atlas position',
      monospace: true,
      value: `X ${frame.x} · Y ${frame.y}`,
    },
    {
      label: 'Atlas footprint',
      value: footprint,
    },
    {
      label: 'Atlas',
      monospace: true,
      value: entry.assetId,
    },
  ];
}

function formatPixelSize(width, height) {
  return `${Number(width) || 0} × ${Number(height) || 0}px`;
}

function createPropertyItem({ label, monospace, value }) {
  const item = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');

  item.className = 'ui-editor-usages__property';
  term.className = 'ui-editor-usages__property-label';
  term.textContent = label;
  description.className = 'ui-editor-usages__property-value';
  description.textContent = value;
  description.title = value;
  if (monospace) {
    description.classList.add('ui-editor-usages__property-value--monospace');
  }
  item.append(term, description);
  return item;
}

function createEditorField({
  id,
  label,
  options,
  step,
  type,
  value,
}) {
  const wrapper = document.createElement('label');
  const fieldLabel = document.createElement('span');
  const input = type === 'select'
    ? document.createElement('select')
    : document.createElement('input');

  wrapper.className = 'ui-editor-usages__field';
  wrapper.dataset.fieldType = type;
  fieldLabel.className = 'ui-editor-usages__field-label';
  fieldLabel.textContent = label;
  input.className = 'ui-editor-usages__field-control';
  input.dataset.editorComponentField = id;

  if (type === 'select') {
    for (const option of options) {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.disabled = option.disabled;
      if (option.reason) {
        optionElement.title = option.reason;
      }
      optionElement.selected = option.value === String(value);
      input.append(optionElement);
    }
  } else {
    input.type = type;
    input.value = String(value);
    if (type === 'number') {
      input.step = String(step);
      input.inputMode = 'decimal';
    }
  }

  wrapper.append(fieldLabel, input);
  return wrapper;
}

function createUsageItem({ label, source }) {
  const item = document.createElement('li');
  const name = document.createElement('span');

  item.className = 'ui-editor-usages__item';
  name.className = 'ui-editor-usages__label';
  name.textContent = label;
  item.append(name);

  if (source) {
    const location = document.createElement('code');
    location.className = 'ui-editor-usages__source';
    location.textContent = source;
    location.title = source;
    item.append(location);
  }

  return item;
}
