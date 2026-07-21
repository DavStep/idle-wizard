import { describe, expect, it, vi } from 'vitest';

import { UiEditorSaveManager } from './UiEditorSaveManager.js';

describe('UiEditorSaveManager', () => {
  it('posts the layout to the fixed local save endpoint', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, message: 'saved' }),
    }));
    const manager = new UiEditorSaveManager({ fetchImpl });
    const layout = { version: 1, elements: {} };

    await expect(manager.save(layout)).resolves.toEqual({ ok: true, message: 'saved' });
    expect(fetchImpl).toHaveBeenCalledWith(
      '/__idle-wizard-ui-editor/save',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(layout),
      }),
    );
  });

  it('surfaces an endpoint validation error', async () => {
    const manager = new UiEditorSaveManager({
      fetchImpl: vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid layout' }),
      })),
    });

    await expect(manager.save({})).rejects.toThrow('invalid layout');
  });
});
