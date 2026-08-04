import { describe, expect, it, vi } from 'vitest';

const bar = {
  setProgress: vi.fn(),
  setTone: vi.fn(),
};

vi.mock('../../../uiEditor/widgets/createUiEditorPixiSurface.js', () => ({
  createUiEditorPixiSurface: vi.fn(async () => ({
    control: { bar },
  })),
}));

import integration from './PixiProgressBar.ui-editor.js';

describe('PixiProgressBar UI editor integration', () => {
  it('presents the internal root tone as purple', async () => {
    const manual = integration.scenarios.find(({ id }) => id === 'manual');
    const mounted = await manual.mount();
    const tone = mounted.controls.find(({ id }) => id === 'tone');

    expect(tone.options).toEqual(['purple', 'blue', 'green', 'yellow', 'red']);
    expect(tone.getValue()).toBe('purple');

    tone.setValue('purple');

    expect(bar.setTone).toHaveBeenLastCalledWith('root');
  });
});
