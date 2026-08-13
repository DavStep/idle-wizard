export class UiEditorUsageManager {
  constructor({ panel }) {
    this.panel = panel;
    this.refs = null;
    this.selectedComponent = null;

    this.handleInput = (event) => this.onInput(event);
    this.handleEditorClick = (event) => this.onEditorClick(event);
    this.handleEditorKeyDown = (event) => this.onEditorKeyDown(event);
    this.handleTabClick = (event) => this.onTabClick(event);
    this.handleTabKeyDown = (event) => this.onTabKeyDown(event);
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
    const tabs = document.createElement('div');
    const detailsTab = document.createElement('button');
    const usageTab = document.createElement('button');
    const detailsPanel = document.createElement('section');
    const usagePanel = document.createElement('section');
    const editor = document.createElement('div');
    const properties = document.createElement('dl');
    const detailsEmpty = document.createElement('p');
    const usageEmpty = document.createElement('p');
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
    tabs.className = 'ui-editor-usages__tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Inspector sections');
    tabs.hidden = true;
    configureTab(detailsTab, 'details', 'Properties');
    configureTab(usageTab, 'usage', 'Usage');
    detailsTab.id = 'ui-editor-inspector-details-tab';
    detailsTab.setAttribute('aria-controls', 'ui-editor-inspector-details-panel');
    usageTab.id = 'ui-editor-inspector-usage-tab';
    usageTab.setAttribute('aria-controls', 'ui-editor-inspector-usage-panel');
    detailsPanel.className = 'ui-editor-usages__panel';
    detailsPanel.id = 'ui-editor-inspector-details-panel';
    detailsPanel.dataset.inspectorPanel = 'details';
    detailsPanel.setAttribute('role', 'tabpanel');
    detailsPanel.setAttribute('aria-labelledby', detailsTab.id);
    detailsPanel.hidden = true;
    usagePanel.className = 'ui-editor-usages__panel';
    usagePanel.id = 'ui-editor-inspector-usage-panel';
    usagePanel.dataset.inspectorPanel = 'usage';
    usagePanel.setAttribute('role', 'tabpanel');
    usagePanel.setAttribute('aria-labelledby', usageTab.id);
    usagePanel.hidden = true;
    editor.className = 'ui-editor-usages__editor';
    editor.hidden = true;
    properties.className = 'ui-editor-usages__properties';
    properties.hidden = true;
    detailsEmpty.className = 'ui-editor-usages__section-empty';
    detailsEmpty.textContent = 'No editable properties for this selection.';
    detailsEmpty.hidden = true;
    usageEmpty.className = 'ui-editor-usages__section-empty';
    usageEmpty.hidden = true;
    list.className = 'ui-editor-usages__list';
    summary.append(title, count);
    tabs.append(detailsTab, usageTab);
    detailsPanel.append(editor, properties, detailsEmpty);
    usagePanel.append(usageEmpty, list);
    root.append(summary, tabs, detailsPanel, usagePanel, emptyState);
    body.replaceChildren(root);
    editor.addEventListener('input', this.handleInput);
    editor.addEventListener('click', this.handleEditorClick);
    editor.addEventListener('keydown', this.handleEditorKeyDown);
    tabs.addEventListener('click', this.handleTabClick);
    tabs.addEventListener('keydown', this.handleTabKeyDown);

    this.refs = {
      body,
      count,
      detailsEmpty,
      detailsPanel,
      detailsTab,
      editor,
      emptyState,
      header,
      list,
      properties,
      root,
      summary,
      tabs,
      title,
      usageEmpty,
      usagePanel,
      usageTab,
    };
    return this.refs;
  }

  showEntry(entry, preview = null) {
    const customInspector = preview?.uiEditorCreateInspector?.() ?? null;
    if (
      !this.refs ||
      (!['asset', 'widget'].includes(entry?.kind) && !customInspector)
    ) {
      this.clear();
      return false;
    }

    const usages = normalizeUsages(entry.usages);
    const properties = preview?.uiEditorSuppressStaticProperties
      ? []
      : normalizeProperties(entry.properties);
    this.selectedComponent = null;
    this.refs.editor.hidden = !customInspector;
    if (customInspector) {
      this.refs.editor.setAttribute(
        'aria-label',
        `${entry.label} integration controls`,
      );
      this.refs.editor.replaceChildren(customInspector);
    } else {
      this.refs.editor.removeAttribute('aria-label');
      this.refs.editor.replaceChildren();
    }
    this.refs.root.dataset.empty = String(
      usages.length === 0 && !customInspector,
    );
    this.refs.emptyState.hidden = true;
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
    this.refs.detailsEmpty.hidden = properties.length > 0 || Boolean(customInspector);
    this.refs.usageEmpty.hidden = usages.length > 0;
    this.refs.usageEmpty.textContent = usages.length
      ? ''
      : `No usages registered for this ${entry.kind}.`;
    this.configureTabs({
      detailsLabel: customInspector ? 'Controls' : 'Properties',
      showUsage: ['asset', 'widget'].includes(entry.kind),
    });
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
    this.refs.list.removeAttribute('aria-label');
    this.refs.list.replaceChildren();
    this.refs.detailsEmpty.hidden = true;
    this.refs.usageEmpty.hidden = true;
    this.refs.usageEmpty.textContent = '';
    this.configureTabs({ detailsLabel: 'Details', showUsage: false });
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
    this.refs.count.textContent = component.type === 'text'
      ? 'Text · Preview override'
      : component.type === 'widget'
        ? 'Widget component'
        : 'Atomic component';
    this.refs.editor.hidden = fields.length === 0;
    this.refs.editor.setAttribute(
      'aria-label',
      `${component.label} editor`,
    );
    this.refs.editor.replaceChildren(...createGroupedEditorFields(fields));
    this.refs.properties.hidden = true;
    this.refs.properties.removeAttribute('aria-label');
    this.refs.properties.replaceChildren();
    this.refs.list.removeAttribute('aria-label');
    this.refs.list.replaceChildren();
    this.refs.emptyState.hidden = true;
    this.refs.detailsEmpty.hidden = fields.length > 0;
    this.refs.detailsEmpty.textContent = 'No editable properties for this component.';
    this.refs.usageEmpty.hidden = true;
    this.refs.usageEmpty.textContent = '';
    this.configureTabs({ detailsLabel: 'Properties', showUsage: false });
    return true;
  }

  onTabClick(event) {
    const tab = event.target.closest('[data-inspector-tab]');
    if (!tab || !this.refs.tabs.contains(tab) || tab.hidden) {
      return;
    }
    this.setActiveTab(tab.dataset.inspectorTab);
  }

  onTabKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return;
    }

    const tab = event.target.closest('[data-inspector-tab]');
    if (!tab || !this.refs.tabs.contains(tab) || this.refs.usageTab.hidden) {
      return;
    }

    event.preventDefault();
    const nextTab = tab === this.refs.detailsTab
      ? this.refs.usageTab
      : this.refs.detailsTab;
    this.setActiveTab(nextTab.dataset.inspectorTab);
    nextTab.focus();
  }

  configureTabs({ detailsLabel, showUsage }) {
    this.refs.detailsTab.textContent = detailsLabel;
    this.refs.usageTab.hidden = !showUsage;
    this.refs.tabs.hidden = false;
    this.setActiveTab('details');
  }

  setActiveTab(tabId) {
    const showUsage = tabId === 'usage' && !this.refs.usageTab.hidden;
    this.refs.detailsTab.setAttribute('aria-selected', String(!showUsage));
    this.refs.usageTab.setAttribute('aria-selected', String(showUsage));
    this.refs.detailsTab.tabIndex = showUsage ? -1 : 0;
    this.refs.usageTab.tabIndex = showUsage ? 0 : -1;
    this.refs.detailsPanel.hidden = showUsage;
    this.refs.usagePanel.hidden = !showUsage;
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
    const shouldRefresh = this.selectedComponent?.update(fieldId, value);
    if (shouldRefresh === true) {
      this.showComponent(this.selectedComponent);
    }
  }

  onEditorClick(event) {
    const option = event.target.closest('[data-editor-component-option]');
    if (!option || !this.refs.editor.contains(option) || option.disabled) {
      return;
    }
    const fieldId = option.dataset.editorComponentField;
    const value = option.dataset.editorComponentOption;
    const shouldRefresh = this.selectedComponent?.update(fieldId, value);
    if (shouldRefresh === true) {
      this.showComponent(this.selectedComponent);
      return;
    }
    const group = option.closest('[role="radiogroup"]');
    for (const sibling of group?.querySelectorAll(
      '[data-editor-component-option]',
    ) ?? []) {
      sibling.setAttribute('aria-checked', String(sibling === option));
      sibling.tabIndex = sibling === option ? 0 : -1;
    }
  }

  onEditorKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
      .includes(event.key)) {
      return;
    }
    const option = event.target.closest('[data-editor-component-option]');
    const group = option?.closest('[role="radiogroup"]');
    if (!option || !group || !this.refs.editor.contains(group)) {
      return;
    }
    const options = [...group.querySelectorAll(
      '[data-editor-component-option]:not(:disabled)',
    )];
    const currentIndex = options.indexOf(option);
    if (currentIndex < 0 || options.length === 0) {
      return;
    }
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : (currentIndex + (
            event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
          ) + options.length) % options.length;
    options[nextIndex].click();
    const refreshedOption = this.refs.editor.querySelector(
      `[data-editor-component-field="${option.dataset.editorComponentField}"]`
      + `[data-editor-component-option="${options[nextIndex].dataset.editorComponentOption}"]`,
    );
    refreshedOption?.focus();
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
    this.refs.tabs.hidden = true;
    this.refs.detailsPanel.hidden = true;
    this.refs.usagePanel.hidden = true;
    this.refs.title.textContent = '';
    this.refs.count.textContent = '';
    this.refs.properties.hidden = true;
    this.refs.properties.removeAttribute('aria-label');
    this.refs.properties.replaceChildren();
    this.refs.list.removeAttribute('aria-label');
    this.refs.list.replaceChildren();
    this.refs.detailsEmpty.hidden = true;
    this.refs.usageEmpty.hidden = true;
    this.refs.usageEmpty.textContent = '';
  }

  unmount() {
    if (!this.refs) {
      return;
    }

    this.refs.header.textContent = 'Right panel';
    this.refs.editor.removeEventListener('input', this.handleInput);
    this.refs.editor.removeEventListener('click', this.handleEditorClick);
    this.refs.editor.removeEventListener('keydown', this.handleEditorKeyDown);
    this.refs.tabs.removeEventListener('click', this.handleTabClick);
    this.refs.tabs.removeEventListener('keydown', this.handleTabKeyDown);
    this.refs.body.replaceChildren();
    this.selectedComponent = null;
    this.refs = null;
  }
}

function configureTab(button, id, label) {
  button.className = 'ui-editor-usages__tab';
  button.type = 'button';
  button.dataset.inspectorTab = id;
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-selected', 'false');
  button.textContent = label;
}

function normalizeFields(fields) {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((field) => ({
      id: String(field?.id ?? ''),
      label: String(field?.label ?? ''),
      disabled: field?.disabled === true,
      group: String(field?.group ?? ''),
      hint: String(field?.hint ?? ''),
      max: Number.isFinite(Number(field?.max)) ? Number(field.max) : null,
      min: Number.isFinite(Number(field?.min)) ? Number(field.min) : null,
      options: Array.isArray(field?.options)
        ? field.options
            .map((option) => ({
              disabled: option?.disabled === true,
              color: String(option?.color ?? ''),
              label: String(option?.label ?? option?.value ?? ''),
              reason: String(option?.reason ?? ''),
              shortLabel: String(option?.shortLabel ?? ''),
              value: String(option?.value ?? ''),
            }))
            .filter(({ label }) => label)
        : [],
      step: Number.isFinite(Number(field?.step))
        ? Number(field.step)
        : 1,
      presentation: String(field?.presentation ?? ''),
      row: String(field?.row ?? ''),
      type: ['number', 'segmented', 'select', 'text'].includes(field?.type)
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
  disabled,
  hint,
  id,
  label,
  max,
  min,
  options,
  presentation,
  step,
  type,
  value,
}) {
  if (type === 'segmented') {
    const wrapper = document.createElement('fieldset');
    const fieldLabel = document.createElement('legend');
    const group = document.createElement('div');

    wrapper.className = 'ui-editor-usages__field ui-editor-usages__field--segmented';
    wrapper.dataset.fieldType = type;
    fieldLabel.className = 'ui-editor-usages__field-label';
    fieldLabel.textContent = label;
    group.className = 'ui-editor-usages__options';
    group.dataset.presentation = presentation;
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', label);

    for (const option of options) {
      const button = document.createElement('button');
      button.className = 'ui-editor-usages__option';
      button.type = 'button';
      button.dataset.editorComponentField = id;
      button.dataset.editorComponentOption = option.value;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(option.value === String(value)));
      button.setAttribute('aria-label', option.label);
      button.disabled = disabled || option.disabled;
      button.tabIndex = option.value === String(value) ? 0 : -1;
      button.textContent = option.shortLabel || option.label;
      button.title = option.reason || option.label;
      if (presentation === 'color-swatches') {
        const swatch = document.createElement('span');
        const optionLabel = document.createElement('span');
        swatch.className = 'ui-editor-button-inspector__swatch';
        swatch.dataset.buttonColor = option.color || option.value;
        swatch.setAttribute('aria-hidden', 'true');
        optionLabel.className = 'ui-editor-button-inspector__option-label';
        optionLabel.textContent = option.shortLabel || option.label;
        button.replaceChildren(swatch, optionLabel);
      }
      group.append(button);
    }
    wrapper.append(fieldLabel, group);
    if (hint) {
      wrapper.append(createFieldHint(hint));
    }
    return wrapper;
  }

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
  input.disabled = disabled;

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
      if (min !== null) {
        input.min = String(min);
      }
      if (max !== null) {
        input.max = String(max);
      }
    }
  }

  wrapper.append(fieldLabel, input);
  if (hint) {
    wrapper.append(createFieldHint(hint));
  }
  return wrapper;
}

function createGroupedEditorFields(fields) {
  const output = [];
  let currentGroup = null;
  let sectionBody = null;
  let currentRow = '';
  let row = null;

  for (const field of fields) {
    if (!field.group) {
      output.push(createEditorField(field));
      currentGroup = null;
      sectionBody = null;
      currentRow = '';
      row = null;
      continue;
    }
    if (field.group !== currentGroup) {
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      sectionBody = document.createElement('div');
      section.className = 'ui-editor-usages__group';
      heading.className = 'ui-editor-usages__group-heading';
      heading.textContent = field.group;
      sectionBody.className = 'ui-editor-usages__group-body';
      section.append(heading, sectionBody);
      output.push(section);
      currentGroup = field.group;
      currentRow = '';
      row = null;
    }
    if (field.row) {
      if (field.row !== currentRow) {
        row = document.createElement('div');
        row.className = 'ui-editor-usages__field-row';
        row.dataset.editorFieldRow = field.row;
        sectionBody.append(row);
        currentRow = field.row;
      }
      row.append(createEditorField(field));
    } else {
      sectionBody.append(createEditorField(field));
      currentRow = '';
      row = null;
    }
  }
  return output;
}

function createFieldHint(text) {
  const hint = document.createElement('small');
  hint.className = 'ui-editor-usages__field-hint';
  hint.textContent = text;
  return hint;
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
