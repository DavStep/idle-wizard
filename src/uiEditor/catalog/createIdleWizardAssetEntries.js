import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
  PIXI_SOURCE_NINE_SLICE_METADATA,
} from '../../rendering/pixi/assets/PixiProductionAssetManifest.js';
import {
  createUiEditorAssetPreview,
  createUiEditorAssetThumbnail,
} from '../widgets/UiEditorAssetWorkbench.js';
import {
  resolveNineSliceMinimumSize,
} from '../../rendering/pixi/nineSlice/NineSliceCompatibility.js';
import {
  gameAssetAtlasFrames,
  gameAssetAtlasSize,
} from '../../assets/generated/game-asset-atlas.generated.js';

const ASSET_MANIFEST_BY_ID = new Map(
  PIXI_PRODUCTION_ASSET_MANIFEST.map((asset) => [asset.id, asset]),
);
const SOURCE_NINE_SLICE_BY_ASSET_ID = new Map(
  PIXI_SOURCE_NINE_SLICE_METADATA.map(({ assetId, metadata }) => [
    assetId,
    metadata,
  ]),
);
const CURRENCY_SOURCE_PATHS = new Set([
  'icons/icon-coin.png',
  'icons/icon-crystal.png',
  'icons/icon-emerald.png',
  'icons/icon-mana-drop.png',
  'icons/icon-ruby.png',
]);
const BACKGROUND_SOURCE_ASSETS = new Map([
  [
    'ui/inner-section-panel-black.9.png',
    { family: 'Inner panel', variant: 'Black' },
  ],
  [
    'ui/inner-section-panel-day.9.png',
    { family: 'Inner panel', variant: 'Day' },
  ],
  [
    'ui/inner-section-panel-midnight.9.png',
    { family: 'Inner panel', variant: 'Midnight' },
  ],
  [
    'ui/inner-section-panel-white.9.png',
    { family: 'Inner panel', variant: 'Paper' },
  ],
  [
    'ui/inner-section-panel-witchcraft.9.png',
    { family: 'Inner panel', variant: 'Witchcraft' },
  ],
  [
    'ui/root-run-dialog/expedition-dialog-front.9.png',
    { family: 'Dialog paper', variant: 'Paper' },
  ],
  [
    'ui/root-run-research/research-upgrade-bg.9.png',
    { family: 'Research card', variant: 'Compact source' },
  ],
  [
    'ui/root-run-research/research-card-1000x304.9.png',
    { family: 'Research card', variant: 'Fixed paper' },
  ],
  [
    'ui/root-run-research/research-card-dark-1000x304.9.png',
    { family: 'Research card', variant: 'Fixed dark' },
  ],
  [
    'ui/root-run-research/research-card-locked-1000x304.9.png',
    { family: 'Research card', variant: 'Fixed locked' },
  ],
]);

export function createIdleWizardAssetEntries(widgetEntries = []) {
  const assetsById = new Map();

  for (const manifestAsset of PIXI_PRODUCTION_ASSET_MANIFEST) {
    if (manifestAsset.kind !== 'texture') {
      continue;
    }

    const metadata = SOURCE_NINE_SLICE_BY_ASSET_ID.get(manifestAsset.id);
    const namedNineSlice = isNineSliceAssetId(manifestAsset.id);
    assetsById.set(manifestAsset.id, {
      borderInsets: metadata?.rendering?.outputInsets ?? null,
      id: manifestAsset.id,
      minimumSize: metadata?.rendering?.minimumSize ?? null,
      nineSlice: namedNineSlice || Boolean(metadata?.slice),
      sourceInsets: metadata?.slice ?? null,
      usages: [],
    });
  }

  for (const widget of widgetEntries) {
    for (const asset of widget.assets ?? []) {
      const registered = assetsById.get(asset.id) ?? {
        usages: [],
      };
      const intrinsicNineSlice = registered.nineSlice;
      const intrinsicSourceInsets = registered.sourceInsets;
      const intrinsicBorderInsets = registered.borderInsets;
      const intrinsicMinimumSize = registered.minimumSize;

      Object.assign(registered, asset);
      registered.nineSlice =
        intrinsicNineSlice === true || registered.nineSlice === true;
      registered.sourceInsets =
        intrinsicSourceInsets ?? registered.sourceInsets ?? null;
      registered.borderInsets =
        intrinsicBorderInsets ?? registered.borderInsets ?? null;
      registered.minimumSize =
        intrinsicMinimumSize ?? registered.minimumSize ?? null;
      if (!registered.usages.some(({ widgetId }) => widgetId === widget.id)) {
        registered.usages.push({
          createThumbnail: canRenderDeclaredAssetSize(asset)
            ? widget.createThumbnail
            : null,
          label: widget.label,
          locations: widget.usages ?? [],
          role: asset.role,
          widgetId: widget.id,
        });
      }
      assetsById.set(asset.id, registered);
    }
  }

  const assets = [...assetsById.values()];
  const suggestionsByFamily = createNineSliceSuggestions(assets);

  return assets
    .map((asset) =>
      createAssetEntry(asset, suggestionsByFamily.get(resolveAssetFamily(asset.id))),
    )
    .sort((left, right) =>
      left.label.localeCompare(right.label)
      || left.assetId.localeCompare(right.assetId),
    );
}

function createAssetEntry(asset, suggestedSourceInsets) {
  const manifestAsset = ASSET_MANIFEST_BY_ID.get(asset.id);

  if (!manifestAsset) {
    throw new Error(`Missing production asset manifest entry: ${asset.id}`);
  }

  const editorEditable = canAuthorNineSlice(asset.id);
  const semanticMetadata = resolveSemanticSourceAsset(asset.id);
  const atlasMetadata = resolveAtlasMetadata(asset.id);
  const entry = {
    assetId: asset.id,
    assetUrl: manifestAsset.src,
    atlasFrames: atlasMetadata?.frames ?? null,
    atlasSize: atlasMetadata?.size ?? null,
    borderInsets: asset.borderInsets ?? null,
    editorEditable,
    height: asset.height ?? null,
    id: `asset:${asset.id}`,
    kind: 'asset',
    label: resolveAssetLabel(asset.id),
    folderPath: resolveAssetFolderPath(asset.id),
    nineSlice: asset.nineSlice === true,
    properties: createAssetProperties(
      asset,
      editorEditable,
      semanticMetadata,
      atlasMetadata,
    ),
    sectionId: 'assets',
    sourceInsets: asset.sourceInsets ?? null,
    minimumSize:
      asset.minimumSize
      ?? (asset.nineSlice && asset.borderInsets
        ? resolveNineSliceMinimumSize({
            outputInsets: asset.borderInsets,
          })
        : null),
    suggestedSourceInsets:
      asset.nineSlice ? null : suggestedSourceInsets ?? null,
    usages: asset.usages.map(({
      createThumbnail,
      label: widgetLabel,
      locations,
      role,
      widgetId,
    }) => ({
      createThumbnail,
      label: widgetLabel,
      locations,
      source: role,
      widgetId,
    })),
    width: asset.width ?? null,
  };

  entry.createPreview = (options) =>
    createUiEditorAssetPreview(entry, options);
  entry.createThumbnail = () => createUiEditorAssetThumbnail(entry);
  return Object.freeze(entry);
}

function resolveAssetFolderPath(assetId) {
  const normalizedAssetId = String(assetId ?? '');
  let pathPrefix = [];
  let relativePath = normalizedAssetId;

  if (normalizedAssetId.startsWith('source:assets/')) {
    relativePath = normalizedAssetId.replace(/^source:assets\//, '');
    const semanticFolderPath = resolveSemanticSourceFolderPath(relativePath);
    if (semanticFolderPath) {
      return semanticFolderPath;
    }
  } else if (normalizedAssetId.startsWith('public:')) {
    pathPrefix = ['public'];
    relativePath = normalizedAssetId.replace(/^public:/, '');
  } else if (normalizedAssetId.startsWith('atlas:')) {
    return Object.freeze(['generated', 'atlases']);
  } else {
    pathPrefix = ['other'];
  }

  const segments = relativePath.split('/').filter(Boolean);

  return Object.freeze([...pathPrefix, ...segments.slice(0, -1)]);
}

function resolveSemanticSourceFolderPath(relativePath) {
  const segments = String(relativePath ?? '').split('/').filter(Boolean);
  const filename = segments.at(-1) ?? '';

  if (BACKGROUND_SOURCE_ASSETS.has(relativePath)) {
    return Object.freeze(['ui', 'backgrounds']);
  }

  if (CURRENCY_SOURCE_PATHS.has(relativePath)) {
    return Object.freeze(['ui', 'currencies']);
  }

  if (
    segments[0] === 'ui'
    && /(?:^|-)(?:title|banner|ribbon)(?:-|\.)/i.test(filename)
  ) {
    return Object.freeze(['ui', 'banners']);
  }

  return null;
}

function resolveSemanticSourceAsset(assetId) {
  const normalizedAssetId = String(assetId ?? '');

  if (!normalizedAssetId.startsWith('source:assets/')) {
    return null;
  }

  return BACKGROUND_SOURCE_ASSETS.get(
    normalizedAssetId.replace(/^source:assets\//, ''),
  ) ?? null;
}

function resolveAssetLabel(assetId) {
  const normalizedAssetId = String(assetId ?? '');

  if (normalizedAssetId.startsWith('atlas:')) {
    return `${normalizedAssetId.slice('atlas:'.length)} atlas`;
  }

  return normalizedAssetId.split('/').at(-1) ?? normalizedAssetId;
}

function canAuthorNineSlice(assetId) {
  return (
    String(assetId ?? '').startsWith('source:')
    && /\.png$/i.test(assetId)
  );
}

export function isNineSliceAssetId(assetId) {
  return /\.9\.png$/i.test(String(assetId ?? ''));
}

function canRenderDeclaredAssetSize(asset) {
  if (!asset?.borderInsets) {
    return true;
  }

  const minimumWidth =
    Number(asset.borderInsets.left) + Number(asset.borderInsets.right);
  const minimumHeight =
    Number(asset.borderInsets.top) + Number(asset.borderInsets.bottom);

  return (
    !Number.isFinite(Number(asset.width))
    || Number(asset.width) >= minimumWidth
  ) && (
    !Number.isFinite(Number(asset.height))
    || Number(asset.height) >= minimumHeight
  );
}

function createAssetProperties(
  asset,
  editorEditable,
  semanticMetadata,
  atlasMetadata,
) {
  const properties = [
    {
      label: 'Type',
      value: resolveAssetType(asset),
    },
    {
      label: 'Editor access',
      value: editorEditable
        ? 'Preview and 9-slice authoring'
        : 'Preview only',
    },
    {
      label: 'Asset ID',
      monospace: true,
      value: asset.id,
    },
  ];

  if (semanticMetadata) {
    properties.push(
      {
        label: 'Background family',
        value: semanticMetadata.family,
      },
      {
        label: 'Variant',
        value: semanticMetadata.variant,
      },
    );
  }

  if (atlasMetadata) {
    properties.push(
      {
        label: 'Atlas size',
        monospace: true,
        value: formatSize(atlasMetadata.size),
      },
      {
        label: 'Frames',
        value: String(atlasMetadata.frames.length),
      },
    );
  }

  if (asset.nineSlice) {
    properties.push({
      label: 'Slice margins',
      monospace: true,
      value: asset.sourceInsets
        ? formatInsets(asset.sourceInsets)
        : 'Auto (quarter image)',
    });
    if (asset.minimumSize) {
      properties.push({
        label: 'Minimum rendered size',
        monospace: true,
        value: formatSize(asset.minimumSize),
      });
    }
  }

  return Object.freeze(properties.map((property) => Object.freeze(property)));
}

function resolveAtlasMetadata(assetId) {
  if (assetId !== 'atlas:game') {
    return null;
  }

  return Object.freeze({
    frames: Object.freeze(
      Object.entries(gameAssetAtlasFrames)
        .map(([name, frame]) => Object.freeze({ name, ...frame }))
        .sort((left, right) =>
          left.source.localeCompare(right.source)
          || left.name.localeCompare(right.name),
        ),
    ),
    size: gameAssetAtlasSize,
  });
}

function resolveAssetType(asset) {
  if (asset.nineSlice) {
    return 'Nine-slice image';
  }

  if (asset.id.startsWith('atlas:')) {
    return 'Generated atlas';
  }

  if (asset.id.startsWith('public:')) {
    return 'Runtime image';
  }

  return 'Image';
}

function formatInsets(insets) {
  return [
    `L ${formatNumber(insets?.left)}`,
    `T ${formatNumber(insets?.top)}`,
    `R ${formatNumber(insets?.right)}`,
    `B ${formatNumber(insets?.bottom)}`,
  ].join(' · ');
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(2);
}

function formatSize(size) {
  return `${formatNumber(size?.width)} × ${formatNumber(size?.height)}px`;
}

function createNineSliceSuggestions(assets) {
  const suggestions = new Map();

  for (const asset of assets) {
    if (!asset.nineSlice || !asset.sourceInsets) {
      continue;
    }
    suggestions.set(resolveAssetFamily(asset.id), asset.sourceInsets);
  }

  return suggestions;
}

function resolveAssetFamily(assetId) {
  const separatorIndex = assetId.lastIndexOf('/');
  const directory = separatorIndex >= 0
    ? assetId.slice(0, separatorIndex + 1)
    : '';
  const filename = separatorIndex >= 0
    ? assetId.slice(separatorIndex + 1)
    : assetId;
  const stem = filename
    .replace(/\.[^.]+$/i, '')
    .replace(/\.9$/i, '')
    .replace(/-9slice$/i, '')
    .replace(/-(?:15|30|50)$/i, '')
    .replace(/-short$/i, '');

  const familyDirectory = directory === 'source:assets/ui/regular-button/'
    ? 'source:assets/ui/shared-button-family/'
    : directory;

  return `${familyDirectory}${stem}`;
}
