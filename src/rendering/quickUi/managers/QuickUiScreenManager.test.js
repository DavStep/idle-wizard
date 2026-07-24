import { describe, expect, it, vi } from 'vitest';

import {
  getQuickUiNameFromSearch,
  makeQuickUiExportPath,
  QuickUiScreenManager,
  resolveQuickUiSourceViewportTransform,
  scopeQuickUiExportAssetAliases,
} from './QuickUiScreenManager.js';

describe('QuickUiScreenManager helpers', () => {
  it('reads Root Run qUIck preview query parameters', () => {
    expect(getQuickUiNameFromSearch('?quick_ui=RewardDialog')).toBe(
      'RewardDialog',
    );
    expect(getQuickUiNameFromSearch('?ui=StartDialog.json')).toBe(
      'StartDialog',
    );
    expect(getQuickUiNameFromSearch('?page=workshop')).toBeNull();
  });

  it('rejects export names that could escape the generated UI folder', () => {
    expect(() => getQuickUiNameFromSearch('?quick_ui=../secret')).toThrow(
      /letters, numbers, underscores, or dashes/,
    );
  });

  it('builds base-aware generated UI paths', () => {
    expect(makeQuickUiExportPath('RewardDialog')).toBe(
      '/assets/quick-ui/exports/RewardDialog.json',
    );
    expect(makeQuickUiExportPath('RewardDialog', '/idle-wizard/')).toBe(
      '/idle-wizard/assets/quick-ui/exports/RewardDialog.json',
    );
  });

  it('scopes asset aliases through nested qUIck nodes without mutating the export', () => {
    const original = {
      assets: [{ id: 'panel', src: 'assets/ui/Dialog/panel.png' }],
      children: [
        {
          assetId: 'panel',
          children: [{ assetId: 'panel' }],
        },
      ],
    };

    const scoped = scopeQuickUiExportAssetAliases(original, 'RewardDialog');

    expect(scoped.assets[0].id).toBe('RewardDialog:panel');
    expect(scoped.children[0].assetId).toBe('RewardDialog:panel');
    expect(scoped.children[0].children[0].assetId).toBe(
      'RewardDialog:panel',
    );
    expect(original.assets[0].id).toBe('panel');
    expect(original.children[0].assetId).toBe('panel');
  });

  it('counter-scales qUIck into the centered 390x844 source viewport', () => {
    const transform = resolveQuickUiSourceViewportTransform({
      canvasWidth: 780,
      canvasHeight: 1000,
      viewportWidth: 390,
      viewportHeight: 844,
    });

    expect(transform.x).toBeCloseTo(79.479, 3);
    expect(transform.y).toBe(0);
    expect(transform.scaleX).toBeCloseTo(0.5924, 3);
    expect(transform.scaleY).toBe(1);
  });

  it('leaves an authored-size qUIck canvas unchanged', () => {
    expect(
      resolveQuickUiSourceViewportTransform({
        canvasWidth: 390,
        canvasHeight: 844,
        viewportWidth: 390,
        viewportHeight: 844,
      }),
    ).toEqual({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
  });

  it('keeps a mounted screen fitted when the presentation canvas resizes', () => {
    let rect = { width: 390, height: 844 };
    let resizePresentation = null;
    const observer = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    const canvas = {
      getBoundingClientRect: () => rect,
    };
    const screen = {
      parent: null,
    };
    const presentation = {
      position: { set: vi.fn() },
      scale: { set: vi.fn() },
      addChild: vi.fn((child) => {
        child.parent = presentation;
      }),
      removeChild: vi.fn((child) => {
        child.parent = null;
      }),
      destroy: vi.fn(),
      parent: null,
    };
    const layer = {
      addChild: vi.fn((child) => {
        child.parent = layer;
      }),
      removeChild: vi.fn((child) => {
        child.parent = null;
      }),
    };
    const manager = new QuickUiScreenManager({
      getCanvas: () => canvas,
      viewport: { width: 390, height: 844 },
      presentationContainerFactory: () => presentation,
      resizeObserverFactory: (callback) => {
        resizePresentation = callback;
        return observer;
      },
    });

    manager.mountScreen(screen, layer);
    expect(presentation.position.set).toHaveBeenLastCalledWith(0, 0);
    expect(presentation.scale.set).toHaveBeenLastCalledWith(1, 1);

    rect = { width: 780, height: 1000 };
    resizePresentation();
    expect(presentation.position.set).toHaveBeenLastCalledWith(
      expect.closeTo(79.479, 3),
      0,
    );
    expect(presentation.scale.set).toHaveBeenLastCalledWith(
      expect.closeTo(0.5924, 3),
      1,
    );

    manager.unmountScreen(screen);
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(layer.removeChild).toHaveBeenCalledWith(presentation);
    expect(presentation.destroy).toHaveBeenCalledWith({ children: true });
  });
});
