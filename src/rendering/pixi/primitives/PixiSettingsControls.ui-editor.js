import { defineUiEditorIntegration } from '../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import {
  ROOT_RUN_SETTINGS_SLIDER_MODES,
  RootRunSettingsSliderPixi,
} from './PixiSettingsControls.js';

const SLIDER_WIDTH = 240;

export default defineUiEditorIntegration({
  apiVersion: 1,
  id: 'primitive.settings-slider',
  kind: 'widget',
  label: 'Settings Slider',
  createThumbnail: createSettingsSliderThumbnail,
  sectionId: 'sliders',
  properties: [
    { label: 'Production class', value: 'RootRunSettingsSliderPixi' },
    { label: 'Input', value: 'Production press and drag router' },
  ],
  usages: [
    {
      label: 'Settings and market allocation controls',
      source: 'src/rendering/pixi/primitives/PixiSettingsControls.js',
    },
  ],
  scenarios: [
    { id: 'range', label: 'Integer range', mount: mountRangeSlider },
    { id: 'milestones', label: 'Milestones', mount: mountMilestoneSlider },
    { id: 'disabled', label: 'Disabled', mount: mountDisabledSlider },
  ],
});

async function mountRangeSlider(context) {
  const state = { enabled: true, value: 40 };
  const surface = await createSliderSurface(context, state, () => ({
    enabled: state.enabled,
    max: 100,
    min: 0,
    mode: ROOT_RUN_SETTINGS_SLIDER_MODES.RANGE,
    onChange: (value) => updateFromWidget(context, state, value),
    step: 5,
    tone: 'blue',
    value: state.value,
  }));
  return createSliderInstance(context, state, surface, { max: 100, step: 5 });
}

async function mountMilestoneSlider(context) {
  const state = { enabled: true, value: 'low' };
  const options = [
    { label: 'None', tone: 'root', value: 'none' },
    { label: 'Low', tone: 'red', value: 'low' },
    { enabled: false, label: 'Medium', tone: 'yellow', value: 'medium' },
    { label: 'High', tone: 'green', value: 'high' },
  ];
  const surface = await createSliderSurface(context, state, () => ({
    enabled: state.enabled,
    mode: ROOT_RUN_SETTINGS_SLIDER_MODES.MILESTONES,
    onChange: (value) => updateFromWidget(context, state, value),
    options,
    value: state.value,
  }));
  const slider = surface.control.slider;
  return {
    ...surface,
    controls: [
      {
        getValue: () => state.value,
        id: 'value',
        label: 'Stop',
        options: options.map(({ enabled, label, value }) => ({
          disabled: enabled === false,
          label,
          value,
        })),
        setValue: (value) => {
          state.value = value;
          slider.bind(sliderModel());
        },
        type: 'select',
      },
      enabledControl(state, () => slider.bind(sliderModel())),
    ],
  };

  function sliderModel() {
    return {
      enabled: state.enabled,
      mode: ROOT_RUN_SETTINGS_SLIDER_MODES.MILESTONES,
      onChange: (value) => updateFromWidget(context, state, value),
      options,
      value: state.value,
    };
  }
}

async function mountDisabledSlider(context) {
  const state = { enabled: false, value: 75 };
  const surface = await createSliderSurface(context, state, () => ({
    enabled: false,
    max: 100,
    min: 0,
    mode: ROOT_RUN_SETTINGS_SLIDER_MODES.RANGE,
    onChange: (value) => updateFromWidget(context, state, value),
    step: 5,
    tone: 'yellow',
    value: state.value,
  }));
  return createSliderInstance(context, state, surface, { max: 100, step: 5 });
}

async function createSliderSurface(context, state, getModel) {
  return createUiEditorPixiSurface({
    assetFilter: sliderAssetFilter,
    component: 'RootRunSettingsSliderPixi',
    createControl: ({ assets, input }) => createSliderControl({
      assets,
      input,
      model: getModel(),
    }),
  });
}

function createSettingsSliderThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: sliderAssetFilter,
    component: 'RootRunSettingsSliderPixi',
    createControl: ({ assets }) => createSliderControl({
      assets,
      input: null,
      model: {
        enabled: true,
        max: 100,
        min: 0,
        mode: ROOT_RUN_SETTINGS_SLIDER_MODES.RANGE,
        onChange: () => true,
        step: 5,
        tone: 'blue',
        value: 40,
      },
    }),
    id: 'primitive.settings-slider',
  });
}

function createSliderControl({ assets, input, model }) {
  const slider = new RootRunSettingsSliderPixi({
    assetManager: assets,
    inputRouter: input,
    label: 'uiLabSettingsSlider',
  });
  slider.bind(model);
  slider.setBounds(0, 0, SLIDER_WIDTH);
  return {
    destroy: () => slider.destroy({ children: true }),
    height: slider.controlHeight,
    root: slider,
    slider,
    width: SLIDER_WIDTH,
  };
}

function sliderAssetFilter({ id }) {
  return id.includes('/ui/root-run-progress/') ||
    id.endsWith('/ui/root-run-settings/settings-knob.png');
}

function createSliderInstance(context, state, surface, { max, step }) {
  const slider = surface.control.slider;
  const bind = () => slider.bind({
    enabled: state.enabled,
    max,
    min: 0,
    mode: ROOT_RUN_SETTINGS_SLIDER_MODES.RANGE,
    onChange: (value) => updateFromWidget(context, state, value),
    step,
    tone: 'blue',
    value: state.value,
  });
  return {
    ...surface,
    controls: [
      {
        formatValue: (value) => String(value),
        getValue: () => state.value,
        id: 'value',
        label: 'Value',
        max,
        min: 0,
        setValue: (value) => {
          state.value = Number(value);
          bind();
        },
        step,
        type: 'range',
      },
      enabledControl(state, bind),
    ],
  };
}

function enabledControl(state, refresh) {
  return {
    getValue: () => state.enabled,
    id: 'enabled',
    label: 'Enabled',
    setValue: (value) => {
      state.enabled = value === true;
      refresh();
    },
    type: 'checkbox',
  };
}

function updateFromWidget(context, state, value) {
  state.value = value;
  context.emit('valueChanged', { value });
  context.invalidate();
  return true;
}
