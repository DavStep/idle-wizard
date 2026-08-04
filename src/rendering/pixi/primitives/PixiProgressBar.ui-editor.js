import { defineUiEditorIntegration } from '../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import {
  PixiProgressBar,
  PixiTimedProgressBar,
} from './PixiProgressBar.js';

const PROGRESS_WIDTH = 240;
const PROGRESS_HEIGHT = 14;

export default defineUiEditorIntegration({
  apiVersion: 1,
  id: 'primitive.progress-bar',
  kind: 'widget',
  label: 'Progress Bar',
  createThumbnail: createProgressThumbnail,
  sectionId: 'progress-bars',
  properties: [
    { label: 'Production class', value: 'PixiProgressBar' },
    { label: 'Interactive height', value: '14px' },
  ],
  usages: [
    {
      label: 'Shared passive and timed progress rails',
      source: 'src/rendering/pixi/primitives/PixiProgressBar.js',
    },
  ],
  scenarios: [
    {
      id: 'manual',
      label: 'Manual value',
      mount: mountManualProgress,
    },
    {
      id: 'timed',
      label: 'Timed loop',
      mount: mountTimedProgress,
    },
    {
      id: 'range',
      label: 'Range fill',
      mount: mountRangeProgress,
    },
  ],
});

async function mountManualProgress() {
  const state = { progress: 0.55, tone: 'purple' };
  const surface = await createProgressSurface({
    createBar: ({ assets }) => {
      const bar = new PixiProgressBar({
        assetManager: assets,
        height: PROGRESS_HEIGHT,
        progress: state.progress,
        tone: resolveProductionTone(state.tone),
        usePlayerStyle: false,
        width: PROGRESS_WIDTH,
      });
      return createBarControl(bar);
    },
  });
  const bar = surface.control.bar;
  return {
    ...surface,
    controls: [
      rangeControl('progress', 'Value', 0, 1, 0.01, () => state.progress, (value) => {
        state.progress = clamp01(value);
        bar.setProgress(state.progress);
      }, formatPercent),
      selectControl('tone', 'Tone', () => state.tone, (value) => {
        state.tone = value;
        bar.setTone(resolveProductionTone(value));
      }, ['purple', 'blue', 'green', 'yellow', 'red']),
    ],
  };
}

async function mountTimedProgress(context) {
  const state = { durationMs: 4000, loop: true };
  const surface = await createProgressSurface({
    createBar: ({ assets }) => {
      const bar = new PixiTimedProgressBar({
        assetManager: assets,
        height: PROGRESS_HEIGHT,
        tone: 'blue',
        usePlayerStyle: false,
        width: PROGRESS_WIDTH,
      });
      return createBarControl(bar);
    },
  });
  const bar = surface.control.bar;
  const update = (now) => {
    const elapsed = state.loop ? now % state.durationMs : Math.min(now, state.durationMs);
    bar.setProgress(elapsed / state.durationMs);
    context.invalidate();
  };
  context.registerCleanup(context.clock.subscribe(update));
  update(0);
  return {
    ...surface,
    controls: [
      rangeControl(
        'duration',
        'Duration',
        1000,
        10000,
        250,
        () => state.durationMs,
        (value) => {
          state.durationMs = Math.max(1000, Number(value) || 4000);
          update(context.clock.now());
        },
        (value) => `${(value / 1000).toFixed(2)}s`,
      ),
      checkboxControl('loop', 'Loop', () => state.loop, (value) => {
        state.loop = value;
        update(context.clock.now());
      }),
    ],
    actions: [
      {
        enabled: () => !context.clock.playing,
        id: 'play',
        label: 'Play',
        run: () => context.clock.play(),
      },
      {
        enabled: () => context.clock.playing,
        id: 'pause',
        label: 'Pause',
        run: () => context.clock.pause(),
      },
      {
        id: 'advance',
        label: 'Advance 1s',
        run: () => context.clock.advance(1000),
      },
      {
        id: 'reset',
        label: 'Reset timer',
        run: () => context.clock.reset(0),
      },
    ],
  };
}

async function mountRangeProgress() {
  const state = { start: 0.2, end: 0.75 };
  const surface = await createProgressSurface({
    createBar: ({ assets }) => {
      const bar = new PixiProgressBar({
        assetManager: assets,
        height: PROGRESS_HEIGHT,
        tone: 'green',
        usePlayerStyle: false,
        width: PROGRESS_WIDTH,
      });
      bar.setRange(state.start, state.end);
      return createBarControl(bar);
    },
  });
  const bar = surface.control.bar;
  const update = () => bar.setRange(state.start, state.end);
  return {
    ...surface,
    controls: [
      rangeControl('start', 'Start', 0, 1, 0.01, () => state.start, (value) => {
        state.start = Math.min(clamp01(value), state.end);
        update();
      }, formatPercent),
      rangeControl('end', 'End', 0, 1, 0.01, () => state.end, (value) => {
        state.end = Math.max(state.start, clamp01(value));
        update();
      }, formatPercent),
    ],
  };
}

function createProgressSurface({ createBar }) {
  return createUiEditorPixiSurface({
    assetFilter: progressAssetFilter,
    component: 'PixiProgressBar',
    createControl: createBar,
  });
}

function createProgressThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: progressAssetFilter,
    component: 'PixiProgressBar',
    createControl: ({ assets }) => createBarControl(new PixiProgressBar({
      assetManager: assets,
      height: PROGRESS_HEIGHT,
      progress: 0.55,
      tone: 'root',
      usePlayerStyle: false,
      width: PROGRESS_WIDTH,
    })),
    id: 'primitive.progress-bar',
  });
}

function progressAssetFilter({ id }) {
  return id.includes('/ui/root-run-progress/');
}

function createBarControl(bar) {
  return {
    bar,
    destroy: () => bar.destroy({ children: true }),
    height: PROGRESS_HEIGHT,
    root: bar,
    width: PROGRESS_WIDTH,
  };
}

function rangeControl(id, label, min, max, step, getValue, setValue, formatValue) {
  return { formatValue, getValue, id, label, max, min, setValue, step, type: 'range' };
}

function selectControl(id, label, getValue, setValue, options) {
  return { getValue, id, label, options, setValue, type: 'select' };
}

function checkboxControl(id, label, getValue, setValue) {
  return { getValue, id, label, setValue, type: 'checkbox' };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function formatPercent(value) {
  return `${Math.round(Number(value) * 100)}%`;
}

function resolveProductionTone(tone) {
  return tone === 'purple' ? 'root' : tone;
}
