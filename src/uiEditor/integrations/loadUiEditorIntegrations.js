import {
  normalizeUiEditorIntegrationModules,
} from '../sdk/defineUiEditorIntegration.js';

const integrationModules = import.meta.glob(
  [
    '../../rendering/**/*.ui-editor.js',
    '../../pages/**/*.ui-editor.js',
  ],
  { eager: true },
);

export function loadUiEditorIntegrations() {
  return normalizeUiEditorIntegrationModules(integrationModules);
}

