import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { PixiLoadingSplash } from './PixiLoadingSplash.js';

const WIDGET_ID = 'global.loading-splash';

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: ['primitive.progress-bar', 'primitive.text-label', 'text-button'],
  createThumbnail: createLoadingSplashThumbnail,
  folderPath: ['Global'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'App Loading Splash',
  properties: [
    { label: 'Production class', value: 'PixiLoadingSplash' },
    { label: 'Contract', value: 'Safe-area loading art, phase detail, issue detail, and shared progress rail' },
  ],
  scenarios: [
    { fixture: { progress: 0.2, status: 'Connecting user...' }, id: 'connecting', label: 'Connecting', mount: mountLoadingSplash },
    { fixture: { progress: 0.68, status: 'Loading assets...' }, id: 'loading', label: 'Loading', mount: mountLoadingSplash },
    { fixture: { progress: 0.42, status: 'Updating 10.1 MB / 24.0 MB' }, id: 'updating', label: 'Updating', mount: mountLoadingSplash },
    { fixture: { progress: 0, status: 'Issue: Server is paused.' }, id: 'issue', label: 'Issue', mount: mountLoadingSplash },
    { fixture: { progress: 1, status: 'Ready' }, id: 'ready', label: 'Ready', mount: mountLoadingSplash },
  ],
  sectionId: 'composite-widgets',
  usages: [
    { label: 'App startup, backend reconnect, and live-update progress', source: 'src/rendering/pixi/global/gates/PixiLoadingSplash.js' },
  ],
});

function createLoadingSplashThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: loadingAssetFilter,
    component: 'PixiLoadingSplash',
    createControl: ({ assets }) => createLoadingSplashControl({
      assets,
      fixture: {
        progress: 0.68,
        status: 'Loading assets...',
        userId: '12345678abcdef12345678abcdef12345678',
      },
      projection: createProjection(),
    }),
    id: WIDGET_ID,
  });
}

async function mountLoadingSplash(_context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    assetFilter: loadingAssetFilter,
    component: 'PixiLoadingSplash',
    createControl: ({ assets, projection }) => createLoadingSplashControl({ assets, fixture: state, projection }),
    layout: 'fill',
  });
  const splash = surface.control.splash;
  return {
    ...surface,
    controls: [
      {
        formatValue: (value) => `${Math.round(Number(value) * 100)}%`,
        getValue: () => state.progress,
        id: 'progress',
        label: 'Progress',
        max: 1,
        min: 0,
        setValue: (value) => {
          state.progress = Number(value);
          splash.setProgress(state.progress);
        },
        step: 0.01,
        type: 'range',
      },
      {
        getValue: () => state.status,
        id: 'status',
        label: 'Status',
        setValue: (value) => {
          state.status = String(value);
          splash.setStatus(state.status);
        },
        type: 'text',
      },
    ],
  };
}

function createLoadingSplashControl({ assets, fixture, projection }) {
  const splash = new PixiLoadingSplash({
    assets,
    getUserId: () => fixture.userId,
  });
  splash.setStatus(fixture.status);
  splash.setProgress(fixture.progress);
  splash.layout(projection ?? createProjection());
  return {
    destroy: () => splash.destroy({ children: true }),
    height: 844,
    layout: (nextProjection) => splash.layout(nextProjection),
    root: splash,
    splash,
    width: 390,
  };
}

function createProjection() {
  return {
    sourceHeight: 844,
    sourceOffsetX: 0,
    sourceScale: 3,
    stageLogicalWidth: 1170,
    viewportPx: { height: 844, width: 390 },
  };
}

function loadingAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return assetId.includes('/idle-witch-craft-splash/')
    || assetId.includes('/progress-bars/')
    || assetId.includes('/ui/regular-button/');
}
