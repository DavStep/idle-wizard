import { describe, expect, it, vi } from 'vitest';

import { TextEntryService } from './TextEntryService.js';

describe('TextEntryService', () => {
  it('normalizes session state and forwards updates through one adapter', async () => {
    const adapter = new FakeTextEntryAdapter();
    const service = createService({ adapter });
    const onValue = vi.fn();
    const onSelection = vi.fn();
    const session = await service.open({
      value: 'wizard',
      selectionStart: 2,
      selectionEnd: 4,
      maxLength: 8,
      inputKind: 'username',
      onValue,
      onSelection,
    });

    expect(adapter.openConfig).toMatchObject({
      value: 'wizard',
      selectionStart: 2,
      selectionEnd: 4,
      maxLength: 8,
      inputKind: 'username',
      multiline: false,
      submitOnEnter: true,
    });

    await session.setValue('spellcaster', {
      selectionStart: 5,
      selectionEnd: 50,
    });

    expect(session.getSnapshot()).toMatchObject({
      value: 'spellcas',
      selectionStart: 5,
      selectionEnd: 8,
    });
    expect(adapter.updatedSnapshots).toHaveLength(1);
    expect(onValue).toHaveBeenCalledTimes(1);
    expect(onSelection).toHaveBeenCalledTimes(1);
  });

  it('publishes native value, selection, inset, submit, and close events', async () => {
    const adapter = new FakeTextEntryAdapter();
    const service = createService({ adapter });
    const eventTypes = [];
    const keyboardInsets = [];
    service.subscribeKeyboardInset(
      (keyboardInset) => keyboardInsets.push(keyboardInset),
      { emitCurrent: true },
    );
    const session = await service.open({ value: 'mana' });
    session.subscribe((event) => eventTypes.push(event.type));

    adapter.handlers.onValue({
      value: 'mana 2',
      selectionStart: 6,
      selectionEnd: 6,
    });
    adapter.handlers.onSelection({ selectionStart: 0, selectionEnd: 4 });
    adapter.handlers.onKeyboardInset(318);
    adapter.handlers.onSubmit();

    expect(session.getSnapshot()).toMatchObject({
      value: 'mana 2',
      selectionStart: 0,
      selectionEnd: 4,
      keyboardInset: 318,
      status: 'submit',
      active: false,
    });
    expect(eventTypes).toEqual([
      'value',
      'selection',
      'selection',
      'keyboardInset',
      'submit',
      'close',
    ]);
    expect(keyboardInsets).toEqual([0, 318, 0]);
    expect(service.getActiveSession()).toBeNull();
  });

  it('keeps retained-submit sessions active after the keyboard submits', async () => {
    const adapter = new FakeTextEntryAdapter();
    const service = createService({ adapter });
    const eventTypes = [];
    const session = await service.open({
      value: 'hello',
      retainOnSubmit: true,
    });
    session.subscribe((event) => eventTypes.push(event.type));

    adapter.handlers.onSubmit();

    expect(session.getSnapshot()).toMatchObject({
      value: 'hello',
      retainOnSubmit: true,
      status: 'active',
      active: true,
    });
    expect(eventTypes).toEqual(['submit']);
    expect(service.getActiveSession()).toBe(session);
  });

  it('publishes active text-entry state before the keyboard adapter opens', async () => {
    const adapter = new FakeTextEntryAdapter();
    const service = createService({ adapter });
    const activeStates = [];
    service.subscribeActiveState(
      (active) => activeStates.push(active),
      { emitCurrent: true },
    );

    const session = await service.open({ value: 'mana' });
    await service.close(session);

    expect(activeStates).toEqual([false, true, false]);
  });

  it('closes the previous session before opening the next one', async () => {
    const adapters = [];
    const service = new TextEntryService({
      canvas: {},
      isNativePlatform: () => false,
      platformProvider: () => 'web',
      canvasAdapterFactory: () => {
        const adapter = new FakeTextEntryAdapter();
        adapters.push(adapter);
        return adapter;
      },
    });
    const first = await service.open({ value: 'first' });
    const second = await service.open({ value: 'second' });

    expect(adapters[0].closeCalls).toBe(1);
    expect(first.getSnapshot()).toMatchObject({
      status: 'closed',
      active: false,
    });
    expect(service.getActiveSession()).toBe(second);
  });

  it('selects the Android plugin and fails fast when the native bridge is missing', async () => {
    const nativeAdapter = new FakeTextEntryAdapter();
    const nativeFactory = vi.fn(() => nativeAdapter);
    const plugin = {};
    const service = new TextEntryService({
      nativePlugin: plugin,
      isNativePlatform: () => true,
      platformProvider: () => 'android',
      isNativePluginAvailable: () => true,
      nativeAdapterFactory: nativeFactory,
    });

    await service.open({ value: 'native' });

    expect(nativeFactory).toHaveBeenCalledWith(plugin);

    const unavailableService = new TextEntryService({
      isNativePlatform: () => true,
      platformProvider: () => 'android',
      isNativePluginAvailable: () => false,
    });

    await expect(unavailableService.open()).rejects.toThrow(
      'IdleWizardTextEntry Android plugin is unavailable.',
    );
  });

  it('selects the editable DOM adapter only for touch-capable web', async () => {
    const mobileWebAdapter = new FakeTextEntryAdapter();
    const canvasAdapter = new FakeTextEntryAdapter();
    const mobileWebAdapterFactory = vi.fn(() => mobileWebAdapter);
    const canvasAdapterFactory = vi.fn(() => canvasAdapter);
    const service = new TextEntryService({
      canvas: {},
      isNativePlatform: () => false,
      platformProvider: () => 'web',
      shouldUseMobileWebAdapter: () => true,
      mobileWebAdapterFactory,
      canvasAdapterFactory,
    });

    await service.open({ value: 'mobile web' });

    expect(mobileWebAdapterFactory).toHaveBeenCalledWith({});
    expect(canvasAdapterFactory).not.toHaveBeenCalled();
  });

  it('rejects unsupported input kinds and native platforms', async () => {
    const service = createService({ adapter: new FakeTextEntryAdapter() });
    await expect(service.open({ inputKind: 'mystery' })).rejects.toThrow(
      'Unsupported text-entry input kind',
    );

    const nativeIosService = new TextEntryService({
      isNativePlatform: () => true,
      platformProvider: () => 'ios',
    });
    await expect(nativeIosService.open()).rejects.toThrow(
      'Native text entry is unsupported on platform "ios".',
    );
  });
});

class FakeTextEntryAdapter {
  constructor() {
    this.handlers = null;
    this.openConfig = null;
    this.updatedSnapshots = [];
    this.selectionSnapshots = [];
    this.closeCalls = 0;
  }

  async open(config, handlers) {
    this.openConfig = config;
    this.handlers = handlers;
  }

  async update(snapshot) {
    this.updatedSnapshots.push(snapshot);
  }

  async setSelection(snapshot) {
    this.selectionSnapshots.push(snapshot);
  }

  async submit() {
    this.handlers.onSubmit();
  }

  async cancel() {
    this.handlers.onCancel();
  }

  async close() {
    this.closeCalls += 1;
    this.handlers.onClose();
  }
}

function createService({ adapter }) {
  return new TextEntryService({
    canvas: {},
    isNativePlatform: () => false,
    platformProvider: () => 'web',
    canvasAdapterFactory: () => adapter,
  });
}
