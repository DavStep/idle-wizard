const IGNORED_CLASSES = new Set([
  'is-active',
  'is-current',
  'is-disabled',
  'is-empty',
  'is-expanded',
  'is-hidden',
  'is-locked',
  'is-pressing',
  'is-selected',
]);

export class UiEditorNodeCatalogManager {
  constructor({ stage, sourceIndexManager = null } = {}) {
    this.stage = stage;
    this.sourceIndexManager = sourceIndexManager;
  }

  list({ query = '' } = {}) {
    if (!this.stage) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    return [this.stage, ...this.stage.querySelectorAll('*')]
      .map((element) => this.describe(element))
      .filter((entry) => {
        if (!normalizedQuery) {
          return true;
        }

        return [entry.label, entry.selector, entry.widget, entry.source]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }

  describe(element) {
    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const stageRect = this.stage.getBoundingClientRect();
    const coordinateScale = this.getCoordinateScale(element);
    const source = this.sourceIndexManager?.findForElement(element);
    const computedStyle = this.getComputedStyle(element);

    return {
      element,
      selector: this.createSelector(element),
      depth: this.getDepth(element),
      label: this.getLabel(element),
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute('role') ?? '',
      classes: [...element.classList],
      hidden: this.isHidden(element),
      asset: this.getAsset(element, computedStyle),
      widget: source?.widget ?? this.inferWidget(element),
      source: source?.path ?? '',
      layout: {
        x: this.round((rect.left - stageRect.left) / coordinateScale),
        y: this.round((rect.top - stageRect.top) / coordinateScale),
        width: this.round(rect.width / coordinateScale),
        height: this.round(rect.height / coordinateScale),
        screenX: this.round(rect.left),
        screenY: this.round(rect.top),
        position: computedStyle?.position ?? '',
        display: computedStyle?.display ?? '',
        zIndex: computedStyle?.zIndex ?? '',
        scale: this.round(coordinateScale),
      },
    };
  }

  find(selector) {
    if (!selector || !this.stage) {
      return null;
    }

    if (selector === ':scope') {
      return this.stage;
    }

    try {
      return this.stage.querySelector(selector);
    } catch {
      return null;
    }
  }

  createSelector(element) {
    if (!element || element === this.stage) {
      return ':scope';
    }

    const editorId = element.dataset?.uiEditorId;

    if (editorId) {
      return `[data-ui-editor-id="${this.escapeAttribute(editorId)}"]`;
    }

    if (element.id) {
      return `#${this.escapeIdentifier(element.id)}`;
    }

    const segments = [];
    let current = element;

    while (current && current !== this.stage) {
      segments.unshift(this.createSelectorSegment(current));
      current = current.parentElement;
    }

    return `:scope > ${segments.join(' > ')}`;
  }

  createSelectorSegment(element) {
    const stableClasses = [...element.classList].filter(
      (className) => !IGNORED_CLASSES.has(className) && !className.startsWith('is-'),
    );
    const primaryClass = stableClasses.find((className) => className.includes('__'))
      ?? stableClasses[0];
    let segment = element.tagName.toLowerCase();

    if (primaryClass) {
      segment += `.${this.escapeIdentifier(primaryClass)}`;
    }

    const siblings = [...(element.parentElement?.children ?? [])].filter((sibling) => {
      if (sibling.tagName !== element.tagName) {
        return false;
      }

      return !primaryClass || sibling.classList.contains(primaryClass);
    });

    if (siblings.length > 1) {
      segment += `:nth-of-type(${[...(element.parentElement?.children ?? [])]
        .filter((sibling) => sibling.tagName === element.tagName)
        .indexOf(element) + 1})`;
    }

    return segment;
  }

  getLabel(element) {
    if (element === this.stage) {
      return 'game stage';
    }

    const ariaLabel = element.getAttribute('aria-label')?.trim();

    if (ariaLabel) {
      return ariaLabel;
    }

    const controlText = element.matches(
      'button, [role="button"], input, select, textarea, a',
    )
      ? element.textContent?.replace(/\s+/g, ' ').trim()
      : '';

    if (controlText) {
      return controlText.slice(0, 42);
    }

    const primaryClass = [...element.classList].find(
      (className) => !className.startsWith('is-'),
    );

    if (primaryClass) {
      return primaryClass;
    }

    const text = element.childElementCount === 0
      ? element.textContent?.replace(/\s+/g, ' ').trim()
      : '';

    if (text) {
      return text.slice(0, 42);
    }

    return element.tagName.toLowerCase();
  }

  getDepth(element) {
    let depth = 0;
    let current = element;

    while (current && current !== this.stage) {
      depth += 1;
      current = current.parentElement;
    }

    return depth;
  }

  isHidden(element) {
    if (element.hidden || element.closest('[hidden]')) {
      return true;
    }

    const style = this.getComputedStyle(element);
    return style?.display === 'none' || style?.visibility === 'hidden';
  }

  getAsset(element, computedStyle = this.getComputedStyle(element)) {
    if (element instanceof globalThis.HTMLImageElement) {
      return element.getAttribute('src') ?? '';
    }

    const backgroundImage = computedStyle?.backgroundImage ?? '';
    const match = backgroundImage.match(/^url\(["']?(.*?)["']?\)$/);
    return match?.[1] ?? '';
  }

  inferWidget(element) {
    const blockClass = [...element.classList].find((className) => className.includes('__'));

    if (blockClass) {
      return blockClass.split('__')[0];
    }

    return [...element.classList][0] ?? element.tagName.toLowerCase();
  }

  getCoordinateScale(element) {
    if (!element || element === this.stage) {
      return 1;
    }

    let current = element.parentElement;
    let scale = 1;

    while (current && current !== this.stage) {
      const transform = this.getComputedStyle(current)?.transform;
      const transformScale = this.readTransformScale(transform);

      if (transformScale > 0) {
        scale *= transformScale;
      }

      current = current.parentElement;
    }

    return scale || 1;
  }

  readTransformScale(transform) {
    if (!transform || transform === 'none') {
      return 1;
    }

    const matrix = transform.match(/^matrix\(([^)]+)\)$/);

    if (!matrix) {
      return 1;
    }

    const values = matrix[1].split(',').map(Number);
    return Math.hypot(values[0] ?? 1, values[1] ?? 0) || 1;
  }

  getComputedStyle(element) {
    return element?.ownerDocument?.defaultView?.getComputedStyle?.(element) ?? null;
  }

  round(value) {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  }

  escapeIdentifier(value) {
    if (globalThis.CSS?.escape) {
      return globalThis.CSS.escape(value);
    }

    return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
  }

  escapeAttribute(value) {
    return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  }
}
