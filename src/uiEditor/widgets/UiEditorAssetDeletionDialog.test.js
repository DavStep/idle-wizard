// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createUiEditorAssetDeletionDialog,
  deleteUiEditorAsset,
  findCompatibleReplacementEntries,
  inspectUiEditorAsset,
} from './UiEditorAssetDeletionDialog.js';

describe('UiEditorAssetDeletionDialog', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('shows visual usages and requires a replacement for source references', async () => {
    const onDeleted = vi.fn();
    const fetchImpl = vi.fn(async (_url, options) => {
      if (options.method === 'POST') {
        return response({
          assetId: 'source:assets/ui/green.png',
          references: [
            {
              column: 12,
              excerpt: 'const background = "green.png";',
              line: 24,
              occurrences: 1,
              path: 'src/button.js',
            },
          ],
        });
      }

      return response({
        assetId: 'source:assets/ui/green.png',
        deletedPaths: ['assets/game/source/ui/green.png'],
        referencesUpdated: 1,
        replacementAssetId: 'source:assets/ui/yellow.png',
      });
    });
    const current = assetEntry('green', {
      usages: [
        {
          createThumbnail: () => {
            const thumbnail = document.createElement('span');
            thumbnail.dataset.editorLibraryThumbnail = 'green-button';
            thumbnail.textContent = 'Button preview';
            return thumbnail;
          },
          label: 'Green Button',
          locations: [
            {
              label: 'Garden Harvest All',
              source: 'src/pages/garden.js',
            },
          ],
          source: 'Background',
        },
      ],
    });
    const replacement = assetEntry('yellow');
    const controller = createUiEditorAssetDeletionDialog({
      assetEntries: [current, replacement],
      entry: current,
      fetchImpl,
      onDeleted,
    });

    controller.open();
    await vi.waitFor(() => {
      expect(
        document.querySelector(
          '.ui-editor-asset-delete__reference-location',
        )?.textContent,
      ).toBe('src/button.js:24:12');
    });

    expect(
      document.querySelector('.ui-editor-asset-delete__usage-copy strong')
        .textContent,
    ).toBe('Green Button');
    expect(
      document.querySelector('.ui-editor-asset-delete__confirm').disabled,
    ).toBe(true);

    const radio = document.querySelector(
      '.ui-editor-asset-delete__replacement-input',
    );
    radio.checked = true;
    radio.dispatchEvent(new window.Event('change', { bubbles: true }));

    const confirm = document.querySelector(
      '.ui-editor-asset-delete__confirm',
    );
    expect(confirm.disabled).toBe(false);
    expect(confirm.textContent).toBe('Replace references and delete');
    confirm.click();

    await vi.waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith(
        expect.objectContaining({
          entry: current,
          replacementEntry: replacement,
        }),
      );
    });
    expect(fetchImpl).toHaveBeenLastCalledWith(
      '/__idle-wizard-ui-editor/asset',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          assetId: 'source:assets/ui/green.png',
          replacementAssetId: 'source:assets/ui/yellow.png',
        }),
      }),
    );
    expect(document.querySelector('.ui-editor-asset-delete')).toBeNull();
  });

  it('allows an unused source asset to be deleted without a replacement', async () => {
    const fetchImpl = vi.fn(async (_url, options) =>
      response(
        options.method === 'POST'
          ? { references: [] }
          : { deletedPaths: [], referencesUpdated: 0 },
      ),
    );
    const controller = createUiEditorAssetDeletionDialog({
      assetEntries: [],
      entry: assetEntry('unused'),
      fetchImpl,
    });

    controller.open();
    await vi.waitFor(() => {
      expect(
        document.querySelector('.ui-editor-asset-delete__confirm').disabled,
      ).toBe(false);
    });

    expect(
      document.querySelector('.ui-editor-asset-delete__confirm').textContent,
    ).toBe('Delete asset');
  });

  it('keeps replacement choices type-compatible and prioritizes siblings', () => {
    const current = assetEntry('current', {
      folderPath: ['ui', 'buttons'],
      nineSlice: true,
    });
    const sibling = assetEntry('sibling', {
      folderPath: ['ui', 'buttons'],
      nineSlice: true,
    });
    const other = assetEntry('other', {
      folderPath: ['ui', 'panels'],
      nineSlice: true,
    });
    const ordinary = assetEntry('ordinary', {
      folderPath: ['ui', 'buttons'],
      nineSlice: false,
    });
    const runtime = {
      ...assetEntry('runtime', { nineSlice: true }),
      assetId: 'public:ui/runtime.png',
    };

    expect(
      findCompatibleReplacementEntries(
        current,
        [other, ordinary, runtime, sibling, current],
      ),
    ).toEqual([sibling, other]);
  });

  it('reports local server errors for inspect and delete requests', async () => {
    const fetchImpl = async () => response(
      { error: 'Source asset no longer exists.' },
      false,
    );

    await expect(
      inspectUiEditorAsset('source:assets/ui/missing.png', { fetchImpl }),
    ).rejects.toThrow('Source asset no longer exists.');
    await expect(
      deleteUiEditorAsset(
        'source:assets/ui/missing.png',
        null,
        { fetchImpl },
      ),
    ).rejects.toThrow('Source asset no longer exists.');
  });
});

function assetEntry(name, overrides = {}) {
  return {
    assetId: `source:assets/ui/${name}.png`,
    assetUrl: `/${name}.png`,
    folderPath: ['ui'],
    id: `asset:${name}`,
    kind: 'asset',
    label: `${name}.png`,
    nineSlice: false,
    usages: [],
    ...overrides,
  };
}

function response(body, ok = true) {
  return {
    json: async () => body,
    ok,
  };
}
