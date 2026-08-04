import { describe, expect, it } from 'vitest';

import {
  defineUiEditorIntegration,
  normalizeUiEditorIntegrationModules,
} from './defineUiEditorIntegration.js';

describe('UI Lab integration definitions', () => {
  it('normalizes a versioned integration and its scenarios', () => {
    const createThumbnail = () => document.createElement('span');
    const mount = () => ({ preview: document.createElement('div') });
    const integration = defineUiEditorIntegration({
      apiVersion: 1,
      createThumbnail,
      folderPath: ['Brewing'],
      id: 'brewing.cauldron',
      kind: 'widget',
      label: 'Brewing Cauldron',
      mount,
      sectionId: 'composite-widgets',
    });

    expect(integration).toMatchObject({
      apiVersion: 1,
      createThumbnail,
      folderPath: ['Brewing'],
      id: 'brewing.cauldron',
      sectionId: 'composite-widgets',
    });
    expect(integration.scenarios).toEqual([
      expect.objectContaining({ id: 'default', mount }),
    ]);
  });

  it('rejects a non-function thumbnail hook', () => {
    expect(() =>
      defineUiEditorIntegration({
        apiVersion: 1,
        createThumbnail: true,
        id: 'invalid-thumbnail',
        label: 'Invalid thumbnail',
        mount() {},
        sectionId: 'buttons',
      }),
    ).toThrow('createThumbnail must be a function');
  });

  it('rejects duplicate ids discovered from separate feature modules', () => {
    const definition = {
      apiVersion: 1,
      id: 'duplicate',
      kind: 'widget',
      label: 'Duplicate',
      mount: () => ({ preview: document.createElement('div') }),
      sectionId: 'buttons',
    };

    expect(() =>
      normalizeUiEditorIntegrationModules({
        './first.ui-editor.js': { default: definition },
        './second.ui-editor.js': { default: definition },
      }),
    ).toThrow('Duplicate UI Lab integration: duplicate');
  });

  it('rejects unsupported versions before the editor mounts them', () => {
    expect(() =>
      defineUiEditorIntegration({
        apiVersion: 2,
        id: 'future',
        label: 'Future',
        mount() {},
        sectionId: 'buttons',
      }),
    ).toThrow('apiVersion must be 1');
  });
});
