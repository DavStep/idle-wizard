const DEFAULT_BLOCKED_EVENT_TYPES = [
  'contextmenu',
  'copy',
  'cut',
  'dragstart',
  'drop',
  'paste',
  'selectstart',
];

const CLIPBOARD_SHORTCUT_KEYS = new Set(['a', 'c', 'v', 'x']);
const BLOCKED_INPUT_TYPES = new Set([
  'deleteByCut',
  'insertFromDrop',
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromYank',
]);

export class AppTextClipboardGuardManager {
  constructor({ blockedEventTypes = DEFAULT_BLOCKED_EVENT_TYPES } = {}) {
    this.blockedEventTypes = blockedEventTypes;
    this.stage = null;
    this.eventOptions = { capture: true };
    this.blockEvent = (event) => this.preventTextClipboardAction(event);
    this.handleBeforeInput = (event) => this.preventBlockedBeforeInput(event);
    this.handleKeyDown = (event) => this.preventClipboardShortcut(event);
  }

  mount(stage) {
    if (!stage) {
      throw new Error('AppTextClipboardGuardManager requires a stage element.');
    }

    if (this.stage === stage) {
      return stage;
    }

    this.unmount();
    this.stage = stage;

    for (const eventType of this.blockedEventTypes) {
      stage.addEventListener(eventType, this.blockEvent, this.eventOptions);
    }

    stage.addEventListener('beforeinput', this.handleBeforeInput, this.eventOptions);
    stage.addEventListener('keydown', this.handleKeyDown, this.eventOptions);

    return stage;
  }

  unmount() {
    if (!this.stage) {
      return;
    }

    for (const eventType of this.blockedEventTypes) {
      this.stage.removeEventListener(eventType, this.blockEvent, this.eventOptions);
    }

    this.stage.removeEventListener(
      'beforeinput',
      this.handleBeforeInput,
      this.eventOptions,
    );
    this.stage.removeEventListener('keydown', this.handleKeyDown, this.eventOptions);
    this.stage = null;
  }

  preventTextClipboardAction(event) {
    this.stopEvent(event);
  }

  preventBlockedBeforeInput(event) {
    if (!BLOCKED_INPUT_TYPES.has(event.inputType)) {
      return;
    }

    this.stopEvent(event);
  }

  preventClipboardShortcut(event) {
    if (!this.isClipboardShortcut(event)) {
      return;
    }

    this.stopEvent(event);
  }

  isClipboardShortcut(event) {
    if (!event.metaKey && !event.ctrlKey) {
      return false;
    }

    return CLIPBOARD_SHORTCUT_KEYS.has(String(event.key ?? '').toLowerCase());
  }

  stopEvent(event) {
    if (event.cancelable) {
      event.preventDefault();
    }

    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
  }
}
