// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { defineUiEditorIntegration } from './defineUiEditorIntegration.js';
import { createUiEditorIntegrationPreview } from './UiEditorIntegrationPreview.js';

describe('UiEditorIntegrationPreview', () => {
  it('mounts scenarios and connects controls, actions, events, and cleanup', async () => {
    const dispose = vi.fn();
    const selectAtomicComponent = vi.fn();
    const state = { value: 2 };
    const integration = defineUiEditorIntegration({
      apiVersion: 1,
      childWidgetIds: ['sample.child'],
      id: 'sample.integration',
      kind: 'dialog',
      label: 'Sample Integration',
      sectionId: 'dialogs',
      scenarios: [
        {
          id: 'first',
          label: 'First',
          mount(context) {
            const preview = document.createElement('div');
            preview.dataset.uiEditorComponent = 'SampleDialog';
            preview.uiEditorSelectAtomicComponent = selectAtomicComponent;
            return {
              actions: [
                {
                  id: 'increment',
                  label: 'Increment',
                  run() {
                    state.value += 1;
                    context.invalidate();
                    return state.value;
                  },
                },
              ],
              controls: [
                {
                  getValue: () => state.value,
                  id: 'value',
                  label: 'Value',
                  max: 10,
                  min: 0,
                  setValue: (value) => {
                    state.value = value;
                  },
                  step: 1,
                  type: 'range',
                },
              ],
              dispose,
              getAtomicComponents: () => [
                {
                  getFields: () => [],
                  id: 'sample-dialog:title',
                  isVisible: () => true,
                  label: 'Title',
                  setVisible() {},
                  type: 'text',
                  update() {},
                },
              ],
              preview,
            };
          },
        },
        {
          id: 'second',
          label: 'Second',
          mount() {
            return { preview: document.createElement('div') };
          },
        },
      ],
    });
    const preview = createUiEditorIntegrationPreview(integration);
    document.body.append(preview);
    await flushAsyncMount();
    const inspector = preview.uiEditorCreateInspector();
    document.body.append(inspector);

    expect(preview.dataset.uiEditorComponent).toBe('SampleDialog');
    expect(preview.dataset.uiEditorType).toBe('div');
    expect(preview.uiEditorGetAtomicComponents()).toHaveLength(1);
    const atomicComponent = preview.uiEditorGetAtomicComponents()[0];
    preview.uiEditorSelectAtomicComponent(atomicComponent);
    expect(selectAtomicComponent).toHaveBeenCalledWith(atomicComponent);

    const range = inspector.querySelector('[data-lab-control="value"]');
    range.value = '6';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(state.value).toBe(6);

    inspector.querySelector('[data-lab-action="increment"]').click();
    await Promise.resolve();
    expect(state.value).toBe(7);
    expect(inspector.textContent).toContain('actionInvoked');

    const scenario = inspector.querySelector('[data-lab-scenario]');
    scenario.value = 'second';
    scenario.dispatchEvent(new window.Event('change', { bubbles: true }));
    await flushAsyncMount();
    expect(dispose).toHaveBeenCalledTimes(1);

    preview.uiEditorDispose();
  });
});

async function flushAsyncMount() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}
