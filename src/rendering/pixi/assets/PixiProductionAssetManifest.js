import {
  gameAssetAtlasImageUrl,
} from '../../../assets/generated/game-asset-atlas.generated.js';

const sourceRasterModules = import.meta.glob(
  '../../../../assets/game/source/**/*.{png,webp}',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
);

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
  '/ui/guild-quest/button-brown.9.png',
  '/ui/guild-quest/button-green.9.png',
  '/ui/guild-quest/close-panel.9.png',
  '/ui/guild-quest/close-x.png',
  '/ui/guild-quest/dialog-panel.9.png',
  '/ui/guild-quest/divider.png',
  '/ui/guild-quest/icon-coin.png',
  '/ui/guild-quest/icon-difficulty.png',
  '/ui/guild-quest/icon-expires.png',
  '/ui/guild-quest/icon-herbs.png',
  '/ui/guild-quest/icon-reward.png',
  '/ui/guild-quest/icon-seeds.png',
  '/ui/guild-quest/icon-stats.png',
  '/ui/guild-quest/list-row.9.png',
  '/ui/guild-quest/paper.9.png',
  '/ui/guild-quest/paperclip.png',
  '/ui/guild-quest/quest-photo-smuggler-tunnel.png',
  '/ui/guild-quest/selected-frame.9.png',
  '/ui/guild-quest/wax-seal.png',
  '/ui/intro-dialog-panel.9.png',
  '/ui/root-run-level-star.png',
  '/ui/player-card-button-brown-dark-fill.9.png',
  '/ui/player-card-button-brown-fill.9.png',
  '/ui/player-card-panel-v2.9.png',
  '/ui/player-card-panel.9.png',
  '/ui/root-run-dialog/expedition-dialog-front.9.png',
  '/ui/player-card-panel-selected.9.png',
  '/ui/xp-stars.webp',
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

const sourceAssets = Object.entries(sourceRasterModules).map(([path, src]) =>
  Object.freeze({
    id: normalizeSourceAssetId(path),
    src,
    kind: 'texture',
  }),
);

const publicAssets = PUBLIC_ASSET_PATHS.map((publicPath) => {
  const legacyUiPath = publicPath.startsWith('/ui/')
    ? `../../../../assets/game/source${publicPath}`
    : null;
  const src =
    (legacyUiPath
      ? sourceRasterModules[legacyUiPath] ??
        sourceDataModules[legacyUiPath]
      : null) ??
    resolvePixiPublicAssetUrl(publicPath);
  return Object.freeze({
    id: `public:${publicPath.slice(1)}`,
    src,
    kind: /\.(?:png|webp)$/i.test(publicPath)
      ? 'texture'
      : 'binary',
  });
});

export const PIXI_PRODUCTION_ASSET_MANIFEST = Object.freeze([
  Object.freeze({
    id: 'atlas:game',
    src: gameAssetAtlasImageUrl,
    kind: 'texture',
  }),
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
