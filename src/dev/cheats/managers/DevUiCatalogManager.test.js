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
      title: 'Empty Cauldron?',
      message: 'custom preview',
      cancelLabel: 'Cancel',
      cancelColor: 'yellow',
      confirmLabel: 'Empty',
      confirmColor: 'yellow',
      actions: {
        confirm: expect.any(Function),
      },
    });
  });

  it('provides a representative World Chat preview for visual QA', () => {
    const manager = new DevUiCatalogManager();
    const runtime = {
      initialized: true,
      getDialogIds: () => ['workshop.worldChat'],
      closeAllDialogs: vi.fn(),
      openDialog: vi.fn(),
    };

    manager.openRegisteredDialog(runtime, 'worldChat');

    expect(runtime.openDialog).toHaveBeenCalledWith(
      'workshop.worldChat',
      expect.objectContaining({
        title: 'World Chat',
        composer: expect.objectContaining({
          placeholder: 'Message',
          enabled: true,
        }),
        rows: expect.arrayContaining([
          expect.objectContaining({
            type: 'player',
            allianceTag: 'MOSS',
          }),
          expect.objectContaining({
            type: 'system',
          }),
          expect.objectContaining({
            id: 'preview-prestige',
            bodyIcon: expect.objectContaining({
              assetId:
                'source:assets/icons/icon-prestige-star.png',
            }),
          }),
          expect.objectContaining({
            id: 'preview-inline-avatar',
            bodyRuns: expect.arrayContaining([
              expect.objectContaining({
                kind: 'widget',
                widget: 'playerAvatar',
              }),
            ]),
          }),
        ]),
        onSubmit: expect.any(Function),
      }),
    );
    expect(runtime.openDialog.mock.calls[0][1].rows.length).toBeGreaterThan(10);
  });

  it('provides a representative Market Ledger preview for visual QA', () => {
    const manager = new DevUiCatalogManager();
    const runtime = {
      initialized: true,
      getDialogIds: () => ['shop.ledger'],
      closeAllDialogs: vi.fn(),
      openDialog: vi.fn(),
    };

    manager.openRegisteredDialog(runtime, 'shop.ledger');

    expect(runtime.openDialog).toHaveBeenCalledWith(
      'shop.ledger',
      expect.objectContaining({
        title: 'Market Ledger',
        selectedTabId: 'seed',
        tabs: [
          expect.objectContaining({ id: 'seed', label: 'Seeds' }),
          expect.objectContaining({ id: 'herb', label: 'Herbs' }),
          expect.objectContaining({ id: 'potion', label: 'Potions' }),
        ],
        items: expect.arrayContaining([
          expect.objectContaining({
            label: 'Sage Seed',
            itemKind: 'seed',
            itemKey: 'sageSeed',
          }),
        ]),
      }),
    );
  });

  it('provides a representative Brewing recipe-book preview for visual QA', () => {
    const manager = new DevUiCatalogManager();
    const runtime = {
      initialized: true,
      getDialogIds: () => ['brewing.recipes'],
      closeAllDialogs: vi.fn(),
      openDialog: vi.fn(),
    };

    manager.openRegisteredDialog(runtime, 'brewing.recipes');

    expect(runtime.openDialog).toHaveBeenCalledWith(
      'brewing.recipes',
      expect.objectContaining({
        title: 'Recipes',
        recipes: expect.arrayContaining([
          expect.objectContaining({
            key: 'manaTonic',
            unlocked: true,
            ingredients: expect.arrayContaining([
              expect.objectContaining({ key: 'sageHerb', owned: 7 }),
            ]),
          }),
          expect.objectContaining({
            key: 'ashenMemory',
            discovered: true,
            discoveryType: 'unknown',
            canResearch: true,
          }),
          expect.objectContaining({
            key: 'unnamedPotion',
            discovered: false,
            unknown: true,
            canResearch: false,
          }),
        ]),
      }),
    );
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
          widget: 'PixiTextButton',
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
