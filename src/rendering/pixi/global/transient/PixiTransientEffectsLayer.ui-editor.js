import { Container } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { createRewardFlyoutRuns } from './RewardFlyoutRuns.js';
import { RewardFlyoutWidget } from './PixiTransientEffectsLayer.js';

const WIDGET_ID = 'compound.reward-flyout';

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createRewardFlyoutThumbnail,
  folderPath: ['Feedback'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Reward / Spend Flyout',
  properties: [
    { label: 'Production class', value: 'RewardFlyoutWidget' },
    { label: 'Contract', value: 'Transient icon-backed reward or spend message' },
  ],
  scenarios: [
    { fixture: { message: '+12 coin', progress: 0.24 }, id: 'reward', label: 'Reward', mount: mountRewardFlyout },
    { fixture: { message: '-25 coin', progress: 0.24 }, id: 'spend', label: 'Spend', mount: mountRewardFlyout },
    { fixture: { message: '+3 sage seed', progress: 0.24 }, id: 'seed', label: 'Seed reward', mount: mountRewardFlyout },
    { fixture: { message: '+1 minor mana potion', progress: 0.7 }, id: 'leaving', label: 'Leaving', mount: mountRewardFlyout },
  ],
  sectionId: 'composite-widgets',
  usages: [
    { label: 'Page-owned reward and spend feedback', source: 'src/rendering/pixi/global/transient/PixiTransientEffectsLayer.js' },
  ],
});

function createRewardFlyoutThumbnail() {
  return createUiEditorPixiThumbnail({
    component: 'RewardFlyoutWidget',
    createControl: ({ assets }) => createRewardFlyoutControl({ assets, fixture: { message: '+12 coin', progress: 0.24 } }),
    id: WIDGET_ID,
  });
}

async function mountRewardFlyout(_context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    component: 'RewardFlyoutWidget',
    createControl: ({ assets }) => createRewardFlyoutControl({ assets, fixture: state }),
  });
  const widget = surface.control.widget;
  return {
    ...surface,
    controls: [
      {
        getValue: () => state.message,
        id: 'message',
        label: 'Message',
        setValue: (value) => {
          state.message = String(value);
          widget.bind('uiLabRewardFlyout', { message: state.message, runs: createRewardFlyoutRuns(state.message) });
          widget.update(state.progress, { delayed: false });
          widget.root.position.set(170, 44);
        },
        type: 'text',
      },
      {
        formatValue: (value) => `${Math.round(Number(value) * 100)}%`,
        getValue: () => state.progress,
        id: 'motion',
        label: 'Motion',
        max: 1,
        min: 0,
        setValue: (value) => {
          state.progress = Number(value);
          widget.update(state.progress, { delayed: false });
          widget.root.position.set(170, 44);
        },
        step: 0.01,
        type: 'range',
      },
    ],
  };
}

function createRewardFlyoutControl({ assets, fixture }) {
  const root = new Container({ label: 'uiLabRewardFlyoutRoot' });
  const widget = new RewardFlyoutWidget({ assets, parent: root });
  widget.bind('uiLabRewardFlyout', {
    message: fixture.message,
    runs: createRewardFlyoutRuns(fixture.message),
  });
  widget.update(fixture.progress, { delayed: false });
  widget.root.position.set(170, 44);
  return {
    destroy: () => {
      widget.destroy();
      root.destroy();
    },
    height: 88,
    root,
    widget,
    width: 340,
  };
}
