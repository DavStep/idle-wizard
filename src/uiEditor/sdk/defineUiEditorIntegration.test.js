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
      childWidgetIds: [],
      createThumbnail,
      folderPath: ['Brewing'],
      id: 'brewing.cauldron',
      sectionId: 'composite-widgets',
    });
    expect(integration.scenarios).toEqual([
      expect.objectContaining({ id: 'default', mount }),
    ]);
  });

  it('requires scenes, dialogs, and feature previews to declare child widgets', () => {
    for (const definition of [
      { id: 'room.preview', kind: 'scene' },
      { id: 'dialog.preview', kind: 'dialog' },
      { id: 'feature.preview', kind: 'widget' },
    ]) {
      expect(() =>
        defineUiEditorIntegration({
          apiVersion: 1,
          ...definition,
          label: definition.id,
          mount() {},
          sectionId:
            definition.kind === 'scene'
              ? 'scenes'
              : definition.kind === 'dialog'
                ? 'dialogs'
                : 'composite-widgets',
        }),
      ).toThrow('must declare childWidgetIds');
    }
  });

  it('normalizes unique child widget ids on a large preview', () => {
    const integration = defineUiEditorIntegration({
      apiVersion: 1,
      childWidgetIds: [' cost-button ', 'primitive.progress-bar'],
      id: 'feature.preview',
      kind: 'widget',
      label: 'Feature Preview',
      mount() {},
      sectionId: 'composite-widgets',
    });

    expect(integration.childWidgetIds).toEqual([
      'cost-button',
      'primitive.progress-bar',
    ]);
    expect(() =>
      defineUiEditorIntegration({
        apiVersion: 1,
        childWidgetIds: ['cost-button', 'cost-button'],
        id: 'feature.duplicate-child',
        kind: 'widget',
        label: 'Duplicate Child',
        mount() {},
        sectionId: 'composite-widgets',
      }),
    ).toThrow('Duplicate child widget id: cost-button');
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
