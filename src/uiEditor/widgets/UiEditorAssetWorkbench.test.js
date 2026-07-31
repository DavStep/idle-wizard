// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  consumePendingNineSliceSelection,
  createUiEditorAssetPreview,
  createUiEditorAssetThumbnail,
  saveUiEditorNineSlice,
} from './UiEditorAssetWorkbench.js';

const uiEditorCss = readFileSync(`${cwd()}/src/uiEditor/uiEditor.css`, 'utf8');

describe('UiEditorAssetWorkbench', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a normal image preview without nine-slice controls', () => {
    const preview = createUiEditorAssetPreview({
      assetId: 'source:assets/ui/coin.png',
      assetUrl: '/coin.png',
      id: 'asset:coin',
      label: 'coin.png',
      nineSlice: false,
    });

    expect(preview.dataset.editorAssetMode).toBe('image');
    expect(preview.dataset.uiEditorHierarchy).toBe('hidden');
    expect(preview.querySelector('img').getAttribute('src')).toBe('/coin.png');
    expect(preview.querySelectorAll('input')).toHaveLength(0);
    expect(
      preview.querySelector('.ui-editor-asset-workbench__action').textContent,
    ).toBe('Convert to 9-slice');
  });

  it('converts an ordinary PNG using sibling slice suggestions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        metadataPath:
          'assets/game/source/ui/root-run-cost-button/'
          + 'green-button-short.9.9slice.json',
      }),
      ok: true,
    });
    vi.stubGlobal('fetch', fetchMock);
    const preview = createUiEditorAssetPreview({
      assetId:
        'source:assets/ui/root-run-cost-button/green-button-short.9.png',
      assetUrl: '/green-button-short.9.png',
      id: 'asset:green-short',
      label: 'green-button-short.9.png',
      nineSlice: false,
      suggestedSourceInsets: {
        top: 100,
        right: 43,
        bottom: 68,
        left: 85,
      },
    });

    preview
      .querySelector('.ui-editor-asset-workbench__action')
      .click();
    loadImage(
      preview.querySelector('.ui-editor-nine-slice__source-image'),
      { height: 169, width: 281 },
    );

    expect(preview.dataset.editorAssetMode).toBe('nine-slice-draft');
    expect(
      [...preview.querySelectorAll('[data-slice-edge]')].map(
        (input) => input.value,
      ),
    ).toEqual(['85', '100', '43', '68']);

    preview.querySelector('[data-primary="true"]').click();
    await vi.waitFor(() => {
      expect(preview.dataset.nineSliceSaved).toBe('true');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/__idle-wizard-ui-editor/nine-slice',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          assetId:
            'source:assets/ui/root-run-cost-button/green-button-short.9.png',
          outputInsets: {
            left: 85,
            top: 100,
            right: 43,
            bottom: 68,
          },
          slice: {
            left: 85,
            top: 100,
            right: 43,
            bottom: 68,
          },
        }),
      }),
    );
    expect(consumePendingNineSliceSelection()).toEqual({
      entryId: 'asset:green-short',
      metadataPath:
        'assets/game/source/ui/root-run-cost-button/'
        + 'green-button-short.9.9slice.json',
    });
  });

  it('reports save errors from the local editor endpoint', async () => {
    await expect(
      saveUiEditorNineSlice(
        'source:assets/ui/panel.png',
        { left: 8, top: 8, right: 8, bottom: 8 },
        {
          fetchImpl: async () => ({
            json: async () => ({ error: 'Source asset is read-only.' }),
            ok: false,
          }),
        },
      ),
    ).rejects.toThrow('Source asset is read-only.');
  });

  it('renders fixed stress previews plus an exact custom-size tester', () => {
    const preview = createUiEditorAssetPreview({
      assetId: 'source:assets/ui/green-button.9.png',
      assetUrl: '/green-button.9.png',
      borderInsets: { top: 17, right: 7, bottom: 12, left: 20 },
      height: 36,
      id: 'asset:green',
      label: 'green-button.9.png',
      nineSlice: true,
      sourceInsets: { top: 100, right: 43, bottom: 68, left: 85 },
      width: 100,
    });
    const ranges = preview.querySelectorAll('input[type="range"]');
    const output = preview.querySelector(
      '[data-preview-output="custom"]',
    );
    const source = preview.querySelector('.ui-editor-nine-slice__source-image');
    const tabs = preview.querySelectorAll('[role="tab"]');
    const previewCasesPanel = preview.querySelector(
      '[data-editor-tab-panel="cases"]',
    );
    const customPanel = preview.querySelector(
      '[data-editor-tab-panel="custom"]',
    );

    expect(preview.dataset.editorAssetMode).toBe('nine-slice');
    expect(preview.dataset.uiEditorHierarchy).toBe('hidden');
    expect(
      preview.querySelector(
        '[data-ui-editor-component="EditorNineSliceWorkbench"]',
      ),
    ).not.toBeNull();
    expect(
      preview.querySelectorAll('.ui-editor-nine-slice__guide'),
    ).toHaveLength(4);
    expect([...tabs].map((tab) => tab.textContent)).toEqual([
      'Preview cases',
      'Custom testing',
    ]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(previewCasesPanel.hidden).toBe(false);
    expect(customPanel.hidden).toBe(true);
    tabs[1].click();
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(previewCasesPanel.hidden).toBe(true);
    expect(customPanel.hidden).toBe(false);
    tabs[1].dispatchEvent(
      new window.KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowLeft',
      }),
    );
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(ranges).toHaveLength(2);
    expect(output.style.width).toBe('100px');
    expect(output.style.height).toBe('36px');
    expect(output.style.borderImageSlice).toBe('100 43 68 85 fill');
    expect(
      preview.querySelector('[data-primary="true"]').textContent,
    ).toBe('Save 9-slice');

    loadImage(source, { height: 200, width: 340 });
    expect(
      preview.querySelector('[data-preview-output="original"]')
        .dataset.previewSize,
    ).toBe('28x30');
    expect(
      preview.querySelector('[data-preview-output="height-stretched"]')
        .dataset.previewSize,
    ).toBe('28x190');
    expect(
      preview.querySelector('[data-preview-output="width-stretched"]')
        .dataset.previewSize,
    ).toBe('268x30');
    expect(
      preview.querySelector('[data-preview-output="both-stretched"]')
        .dataset.previewSize,
    ).toBe('268x190');

    preview.querySelector('[data-nine-slice-action="ratio"]').click();
    const width = preview.querySelector('[data-dimension="width"]');
    width.value = '200';
    width.dispatchEvent(new window.Event('input'));

    expect(output.style.width).toBe('200px');
    expect(output.style.height).toBe('72px');
  });

  it('keeps intrinsic asset minima above compressed widget usage sizes', () => {
    const preview = createUiEditorAssetPreview({
      assetUrl: '/green-button-50.9.png',
      borderInsets: { top: 13, right: 49, bottom: 14, left: 50 },
      height: 28,
      id: 'asset:green-50',
      label: 'green-button-50.9.png',
      minimumSize: { width: 141, height: 171 },
      nineSlice: true,
      sourceInsets: { top: 100, right: 52, bottom: 68, left: 86 },
      width: 100,
    });
    const source = preview.querySelector(
      '.ui-editor-nine-slice__source-image',
    );

    loadImage(source, { height: 171, width: 141 });

    expect(
      preview.querySelector('[data-preview-output="original"]')
        .dataset.previewSize,
    ).toBe('141x171');
    expect(
      preview.querySelector('[data-preview-output="both-stretched"]')
        .dataset.previewSize,
    ).toBe('381x331');
  });

  it('keeps fixed previews static and pans only the custom tester', () => {
    const preview = createUiEditorAssetPreview({
      assetUrl: '/green-button.9.png',
      borderInsets: { top: 17, right: 7, bottom: 12, left: 20 },
      height: 36,
      id: 'asset:green',
      label: 'green-button.9.png',
      nineSlice: true,
      sourceInsets: { top: 100, right: 43, bottom: 68, left: 85 },
      width: 100,
    });
    const customCase = preview.querySelector(
      '[data-preview-case="custom"]',
    );
    const viewport = customCase.querySelector(
      '.ui-editor-pan-zoom-viewport',
    );
    const content = viewport.querySelector(
      '.ui-editor-pan-zoom-viewport__content',
    );

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 120 },
      clientWidth: { configurable: true, value: 200 },
    });
    Object.defineProperties(content, {
      offsetHeight: { configurable: true, value: 80 },
      offsetWidth: { configurable: true, value: 100 },
    });

    expect(
      preview.querySelectorAll(
        '.ui-editor-nine-slice__preview-case '
          + '.ui-editor-pan-zoom-viewport',
      ),
    ).toHaveLength(0);
    expect(
      preview.querySelectorAll('.ui-editor-fixed-preview-viewport'),
    ).toHaveLength(4);
    expect(
      preview.querySelectorAll(
        '.ui-editor-nine-slice__preview-case canvas',
      ),
    ).toHaveLength(4);
    expect(
      preview.querySelector('[aria-label="Source zoom in"]'),
    ).toBeNull();

    preview.querySelector('[data-editor-tab="custom"]').click();
    preview.querySelector('[aria-label="Custom preview zoom in"]').click();
    expect(viewport.dataset.zoom).toBe('1.25');

    const pointerDown = new window.MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 30,
      clientY: 40,
    });
    Object.defineProperty(pointerDown, 'pointerId', { value: 11 });
    viewport.dispatchEvent(pointerDown);
    expect(viewport.dataset.panning).toBe('true');

    const pointerMove = new window.MouseEvent('pointermove', {
      clientX: 50,
      clientY: 55,
    });
    Object.defineProperty(pointerMove, 'pointerId', { value: 11 });
    window.dispatchEvent(pointerMove);
    expect(content.style.transform).toContain(
      'calc(-50% + 20px), calc(-50% + 15px)',
    );

    const pointerUp = new window.MouseEvent('pointerup');
    Object.defineProperty(pointerUp, 'pointerId', { value: 11 });
    window.dispatchEvent(pointerUp);
    expect(viewport.dataset.panning).toBeUndefined();

    preview
      .querySelector('[aria-label="Fit custom preview to view"]')
      .click();
    expect(viewport.dataset.zoom).toBe('1');
    expect(content.style.transform).toContain(
      'calc(-50% + 0px), calc(-50% + 0px)',
    );
  });

  it('uses proportional columns and one fit scale per preview pair', () => {
    const preview = createUiEditorAssetPreview({
      assetUrl: '/green-button.9.png',
      borderInsets: { top: 17, right: 7, bottom: 12, left: 20 },
      height: 36,
      id: 'asset:green',
      label: 'green-button.9.png',
      nineSlice: true,
      sourceInsets: { top: 100, right: 43, bottom: 68, left: 85 },
      width: 100,
    });
    const previewMatrixRule = uiEditorCss.match(
      /\.ui-editor-nine-slice__preview-matrix\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body ?? '';
    const widthStretched = preview.querySelector(
      '[data-preview-case="width-stretched"]',
    );
    const bothStretched = preview.querySelector(
      '[data-preview-case="both-stretched"]',
    );
    const widthViewport = widthStretched.querySelector(
      '.ui-editor-fixed-preview-viewport',
    );
    const bothViewport = bothStretched.querySelector(
      '.ui-editor-fixed-preview-viewport',
    );
    const widthContent = widthViewport.querySelector(
      '.ui-editor-fixed-preview-viewport__content',
    );
    const bothContent = bothViewport.querySelector(
      '.ui-editor-fixed-preview-viewport__content',
    );

    Object.defineProperties(widthViewport, {
      clientHeight: { configurable: true, value: 120 },
      clientWidth: { configurable: true, value: 320 },
    });
    Object.defineProperties(bothViewport, {
      clientHeight: { configurable: true, value: 150 },
      clientWidth: { configurable: true, value: 320 },
    });
    Object.defineProperties(widthContent, {
      offsetHeight: { configurable: true, value: 30 },
      offsetWidth: { configurable: true, value: 268 },
    });
    Object.defineProperties(bothContent, {
      offsetHeight: { configurable: true, value: 190 },
      offsetWidth: { configurable: true, value: 268 },
    });

    preview.querySelector('[data-editor-tab="custom"]').click();
    preview.querySelector('[data-editor-tab="cases"]').click();

    expect(previewMatrixRule).toContain(
      'minmax(150px, 0.65fr) minmax(240px, 1.35fr)',
    );
    expect(widthContent.style.transform).toBe(
      bothContent.style.transform,
    );
    expect(widthContent.style.transform).toContain(
      'scale(0.7052631578947368)',
    );
  });

  it('saves edits to an existing source nine-slice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        metadataPath: 'assets/game/source/ui/green-button.9.9slice.json',
      }),
      ok: true,
    });
    vi.stubGlobal('fetch', fetchMock);
    const preview = createUiEditorAssetPreview({
      assetId: 'source:assets/ui/green-button.9.png',
      assetUrl: '/green-button.9.png',
      borderInsets: { top: 17, right: 7, bottom: 12, left: 20 },
      height: 36,
      id: 'asset:green',
      label: 'green-button.9.png',
      nineSlice: true,
      sourceInsets: { top: 100, right: 43, bottom: 68, left: 85 },
      width: 100,
    });
    const source = preview.querySelector('.ui-editor-nine-slice__source-image');

    loadImage(source, { height: 200, width: 340 });
    const leftInput = preview.querySelector('[data-slice-edge="left"]');
    leftInput.value = '92';
    leftInput.dispatchEvent(new window.Event('input'));
    preview.querySelector('[data-primary="true"]').click();

    await vi.waitFor(() => {
      expect(
        preview.querySelector('.ui-editor-asset-workbench__save-status')
          .textContent,
      ).toBe('Saved assets/game/source/ui/green-button.9.9slice.json');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/__idle-wizard-ui-editor/nine-slice',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          assetId: 'source:assets/ui/green-button.9.png',
          outputInsets: {
            left: 20,
            top: 17,
            right: 7,
            bottom: 12,
          },
          slice: {
            left: 92,
            top: 100,
            right: 43,
            bottom: 68,
          },
        }),
      }),
    );
    expect(preview.dataset.nineSliceSaved).toBe('true');
    expect(preview.querySelector('[data-primary="true"]').disabled).toBe(false);
  });

  it('edits slice margins through fields and keyboard-operable guides', () => {
    const preview = createUiEditorAssetPreview({
      assetUrl: '/green-button.9.png',
      borderInsets: { top: 17, right: 7, bottom: 12, left: 20 },
      height: 36,
      id: 'asset:green',
      label: 'green-button.9.png',
      nineSlice: true,
      sourceInsets: { top: 100, right: 43, bottom: 68, left: 85 },
      width: 100,
    });
    const source = preview.querySelector('.ui-editor-nine-slice__source-image');
    const output = preview.querySelector('.ui-editor-nine-slice__output');
    const leftInput = preview.querySelector('[data-slice-edge="left"]');
    const leftGuide = preview.querySelector('[data-slice-guide="left"]');

    expect(leftInput.disabled).toBe(true);
    loadImage(source, { height: 200, width: 340 });
    expect(leftInput.disabled).toBe(false);

    leftInput.value = '90';
    leftInput.dispatchEvent(new window.Event('input'));
    expect(output.style.borderImageSlice).toBe('100 43 68 90 fill');
    expect(leftGuide.getAttribute('aria-valuenow')).toBe('90');

    leftGuide.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowRight' }),
    );
    expect(leftInput.value).toBe('91');
    expect(output.style.borderImageSlice).toBe('100 43 68 91 fill');

    source.getBoundingClientRect = () => ({
      bottom: 200,
      height: 200,
      left: 0,
      right: 340,
      top: 0,
      width: 340,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const pointerDown = new window.MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 120,
      clientY: 40,
    });
    Object.defineProperty(pointerDown, 'pointerId', { value: 7 });
    leftGuide.dispatchEvent(pointerDown);
    expect(leftInput.value).toBe('120');
    expect(leftGuide.dataset.dragging).toBe('true');
    const pointerUp = new window.MouseEvent('pointerup');
    Object.defineProperty(pointerUp, 'pointerId', { value: 7 });
    window.dispatchEvent(pointerUp);
    expect(leftGuide.dataset.dragging).toBeUndefined();

    preview.querySelector('[data-nine-slice-action="reset"]').click();
    expect(leftInput.value).toBe('85');
    expect(output.style.borderImageSlice).toBe('100 43 68 85 fill');
  });

  it('copies the current runtime CSS with a polite status', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const preview = createUiEditorAssetPreview({
      assetUrl: '/green-button.9.png',
      borderInsets: { top: 17, right: 7, bottom: 12, left: 20 },
      height: 36,
      id: 'asset:green',
      label: 'green-button.9.png',
      nineSlice: true,
      sourceInsets: { top: 100, right: 43, bottom: 68, left: 85 },
      width: 100,
    });

    preview.querySelector('[data-nine-slice-action="copy-css"]').click();
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledOnce();
      expect(
        preview.querySelector('.ui-editor-nine-slice__action-status')
          .textContent,
      ).toBe('CSS copied');
    });

    expect(writeText.mock.calls[0][0]).toContain(
      'border-image-slice: 100 43 68 85 fill;',
    );
  });

  it('marks nine-slice thumbnails without duplicating button semantics', () => {
    const thumbnail = createUiEditorAssetThumbnail({
      assetUrl: '/panel-9slice.png',
      id: 'asset:panel',
      nineSlice: true,
    });

    expect(thumbnail.dataset.editorLibraryThumbnail).toBe('asset:panel');
    expect(thumbnail.querySelector('img').alt).toBe('');
    expect(
      thumbnail.querySelector('.ui-editor-asset-thumbnail__badge').hidden,
    ).toBe(false);
  });

  it('contains asset images inside the thumbnail viewport at every source size', () => {
    const imageRule = uiEditorCss.match(
      /\.ui-editor-asset-thumbnail__image\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body ?? '';

    expect(imageRule).toContain('position: absolute;');
    expect(imageRule).toContain('inset: 0;');
    expect(imageRule).toMatch(/(?:^|\n)\s*width:\s*100%;/);
    expect(imageRule).toMatch(/(?:^|\n)\s*height:\s*100%;/);
    expect(imageRule).toContain('object-fit: contain;');
  });

  it('uses the available desktop preview height in both nine-slice modes', () => {
    const tabPanelRule = uiEditorCss.match(
      /\.ui-editor-tabs__panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body ?? '';
    const previewMatrixRule = uiEditorCss.match(
      /\.ui-editor-nine-slice__preview-matrix\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body ?? '';
    const previewCaseRule = uiEditorCss.match(
      new RegExp(
        String.raw`\.ui-editor-nine-slice__preview-case,\s*`
          + String.raw`\.ui-editor-nine-slice__custom-tester\s*`
          + String.raw`\{(?<body>[^}]*)\}`,
      ),
    )?.groups?.body ?? '';
    const fixedViewportRule = uiEditorCss.match(
      new RegExp(
        String.raw`\.ui-editor-nine-slice__preview-case\s*`
          + String.raw`\.ui-editor-fixed-preview-viewport\s*`
          + String.raw`\{(?<body>[^}]*)\}`,
      ),
    )?.groups?.body ?? '';
    const customTesterRules = [
      ...uiEditorCss.matchAll(
        /\.ui-editor-nine-slice__custom-tester\s*\{(?<body>[^}]*)\}/g,
      ),
    ].map((match) => match.groups?.body ?? '').join('\n');
    const customViewportRule = uiEditorCss.match(
      new RegExp(
        String.raw`\.ui-editor-nine-slice__custom-tester\s*`
          + String.raw`\.ui-editor-pan-zoom-viewport\s*`
          + String.raw`\{(?<body>[^}]*)\}`,
      ),
    )?.groups?.body ?? '';

    expect(tabPanelRule).toContain('height: 100%;');
    expect(previewMatrixRule).toContain('height: 100%;');
    expect(previewCaseRule).toContain('display: flex;');
    expect(previewCaseRule).toContain('flex-direction: column;');
    expect(fixedViewportRule).toContain('flex: 1 1 auto;');
    expect(customTesterRules).toContain('height: 100%;');
    expect(customViewportRule).toContain('flex: 1 1 auto;');
  });
});

function loadImage(image, { height, width }) {
  Object.defineProperties(image, {
    clientHeight: { configurable: true, value: height },
    clientWidth: { configurable: true, value: width },
    naturalHeight: { configurable: true, value: height },
    naturalWidth: { configurable: true, value: width },
  });
  image.dispatchEvent(new window.Event('load'));
}
