import {
  gameAssetAtlases,
  gameAtlasBackedSourceAssets,
  gameStandaloneSourceAssets,
} from '../../../assets/generated/game-asset-atlas.generated.js';

const sourceDataModules = import.meta.glob(
  '../../../../assets/game/source/**/*.json',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
);

const sourceNineSliceMetadataModules = import.meta.glob(
  '../../../../assets/game/source/**/*.9slice.json',
  {
    eager: true,
    import: 'default',
  },
);

const PUBLIC_ASSET_PATHS = Object.freeze([
  '/spine/tutorial-pointer/pointer.atlas',
  '/spine/tutorial-pointer/pointer.png',
  '/spine/tutorial-pointer/pointer.skel',
  '/ui/intro-dialog-panel.9.png',
  '/ui/root-run-level-star.png',
  '/ui/root-run-dialog/expedition-dialog-front.9.png',
  '/ui/xp-stars.png',
]);

export const PIXI_STARTUP_ASSET_IDS = Object.freeze([
  'source:assets/ui/idle-witch-craft-splash/splash-screen.png',
  'source:assets/ui/root-run-progress/progress-track.9.png',
  'source:assets/ui/root-run-progress/progress-fill-mask.9.png',
]);

function normalizeSourceAssetId(path) {
  const normalized = path
    .replace(
      /^(?:\.\.\/){4}assets\/game\/source\//,
      'assets/',
    )
    .replace(/^(?:\.\.\/){3}/, '');
  return `source:${normalized}`;
}

const sourceAssets = Object.freeze([
  ...gameStandaloneSourceAssets,
  ...gameAtlasBackedSourceAssets,
]);
const sourceAssetsById = new Map(
  sourceAssets.map((asset) => [asset.id, asset]),
);

const publicAssets = PUBLIC_ASSET_PATHS.map((publicPath) => {
  const legacyUiPath = publicPath.startsWith('/ui/')
    ? `source:assets${publicPath}`
    : null;
  const src =
    (legacyUiPath
      ? sourceAssetsById.get(legacyUiPath)?.src ??
        sourceDataModules[`../../../../assets/game/source${publicPath}`]
      : null) ??
    resolvePixiPublicAssetUrl(publicPath);
  return Object.freeze({
    id: `public:${publicPath.slice(1)}`,
    src,
    kind: /\.png$/i.test(publicPath)
      ? 'texture'
      : 'binary',
  });
});

export const PIXI_PRODUCTION_ASSET_MANIFEST = Object.freeze([
  ...gameAssetAtlases.map((atlas) => Object.freeze({
    id: atlas.id,
    src: atlas.imageUrl,
    kind: 'texture',
  })),
  ...sourceAssets,
  ...publicAssets,
]);

export const PIXI_SOURCE_NINE_SLICE_METADATA = Object.freeze(
  Object.entries(sourceNineSliceMetadataModules).map(([metadataPath, metadata]) =>
    Object.freeze({
      assetId: normalizeSourceAssetId(
        metadataPath.replace(/\.9slice\.json$/i, '.png'),
      ),
      metadata: Object.freeze(metadata),
    }),
  ),
);

const SOURCE_NINE_SLICE_METADATA_BY_ASSET_ID = new Map(
  PIXI_SOURCE_NINE_SLICE_METADATA.map(({ assetId, metadata }) => [
    assetId,
    metadata,
  ]),
);

export function getPixiSourceNineSliceMetadata(assetId) {
  return SOURCE_NINE_SLICE_METADATA_BY_ASSET_ID.get(
    String(assetId ?? ''),
  ) ?? null;
}

export function getPixiSourceAssetId(relativePath) {
  const normalized = String(relativePath ?? '')
    .replace(/^\/+/, '')
    .replace(/^src\//, '');
  return `source:${normalized}`;
}

export function getPixiPublicAssetId(path) {
  return `public:${String(path ?? '').replace(/^\/+/, '')}`;
}

export function resolvePixiPublicAssetUrl(
  assetPath,
  baseUrl = import.meta.env?.BASE_URL ?? '/',
) {
  const normalizedBaseUrl = String(baseUrl || '/');
  const normalizedAssetPath = String(assetPath ?? '').replace(/^\/+/, '');
  const separator = normalizedBaseUrl.endsWith('/') ? '' : '/';

  return `${normalizedBaseUrl}${separator}${normalizedAssetPath}`;
}
