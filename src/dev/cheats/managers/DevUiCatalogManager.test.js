import { describe, expect, it, vi } from 'vitest';

import { DevUiCatalogManager } from './DevUiCatalogManager.js';

describe('DevUiCatalogManager', () => {
  it('lists registered dialogs with copyable preview commands', () => {
    const manager = new DevUiCatalogManager();
    const runtime = {
      getDialogIds: () => ['global.settings', 'shop.ledger'],
    };

    expect(manager.listDialogs(runtime)).toEqual({
      ok: true,
      dialogs: [
        {
          id: 'global.settings',
          owner: 'global',
          command: 'cheats.openDialog("global.settings")',
        },
        {
          id: 'shop.ledger',
          owner: 'shop',
          command: 'cheats.openDialog("shop.ledger")',
        },
      ],
    });
  });

  it('opens one registered dialog in isolation with a useful preview model', () => {
    const manager = new DevUiCatalogManager();
    const runtime = {
      initialized: true,
      getDialogIds: () => ['global.confirmation'],
      closeAllDialogs: vi.fn(),
      openDialog: vi.fn(),
    };

    expect(
      manager.openRegisteredDialog(runtime, 'global-confirmation', {
        message: 'custom preview',
      }),
    ).toEqual({
      ok: true,
      dialogId: 'global.confirmation',
      isolated: true,
    });
    expect(runtime.closeAllDialogs).toHaveBeenCalledOnce();
    expect(runtime.openDialog).toHaveBeenCalledWith('global.confirmation', {
      title: 'confirmation',
      message: 'custom preview',
      cancelLabel: 'cancel',
      confirmLabel: 'confirm',
    });
  });

  it('catalogs widgets and button variants with real preview surfaces', () => {
    const manager = new DevUiCatalogManager();

    expect(manager.listWidgets().widgets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'PixiProgressBar',
          previewSurface: 'topPanelQuestProgress',
          command: 'cheats.openWidget("PixiProgressBar")',
        }),
      ]),
    );
    expect(manager.listButtons().buttons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'yellow',
          widget: 'PixiButton',
          command: 'cheats.openWidget("button.yellow")',
        }),
        expect.objectContaining({
          id: 'cost',
          widget: 'PixiCostButton',
        }),
      ]),
    );
    expect(manager.resolveWidget('button-yellow')).toMatchObject({
      id: 'yellow',
      previewSurface: 'firstRunIntro',
    });
  });
});
