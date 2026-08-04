// @vitest-environment jsdom

import { Container, Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';

import {
  createPixiAssetManagerFake,
  installPixiPageTestCanvas,
} from './pages/workshop/PixiPageTestHarness.js';
import { PixiInputRouter } from './input/PixiInputRouter.js';
import { RetainedUiCounters } from './retained/RetainedUiCounters.js';
import { SemanticTargetRegistry } from './retained/SemanticTargetRegistry.js';
import {
  createUiEditorPixiAtomicComponents,
} from '../../uiEditor/widgets/createUiEditorPixiSurface.js';
import retainedDialogIntegrations, {
  UI_EDITOR_RETAINED_DIALOG_IDS,
  createUiEditorDialog,
  createUiEditorDialogFixture,
  createRetainedDialogHierarchy,
} from './RetainedDialogs.ui-editor.js';
import inventoryChoiceRowIntegration from './pages/shared/RootRunInventoryChoiceDialogPixi.ui-editor.js';
import worldChatMessageRowIntegration from './pages/workshop/WorldChatMessageRowPixi.ui-editor.js';

installPixiPageTestCanvas();

const PROJECTION = Object.freeze({
  dialogShift: 0,
  sourceHeight: 2170 / 3,
  sourceOffsetX: 0,
  sourceScale: 1,
  sourceWidth: 360,
  stageLogicalWidth: 360,
});

describe('retained dialog UI editor integrations', () => {
  it('exposes editable confirmation content without renderer internals', () => {
    const dialogId = 'global.confirmation';
    const parent = new Container();
    const counters = new RetainedUiCounters();
    const input = new PixiInputRouter();
    const semanticRegistry = new SemanticTargetRegistry({ counters });
    const dialog = createUiEditorDialog({
      assets: createPixiAssetManagerFake(Texture),
      close: () => false,
      counters,
      dialogId,
      input,
      model: createUiEditorDialogFixture(dialogId),
      parent,
      projection: PROJECTION,
      semanticRegistry,
    });

    dialog.layout(PROJECTION);
    dialog.activate();
    const components = createUiEditorPixiAtomicComponents(dialog.getRoot());
    const labels = components.map(({ label }) => label);

    expect(labels).toEqual(expect.arrayContaining([
      'Title',
      'Message',
      'Cancel button',
      'Confirm button',
    ]));
    expect(labels.some((label) => /slice/i.test(label))).toBe(false);
    expect(
      components.find(({ label }) => label === 'Message')
        .getFields()
        .map(({ id }) => id),
    ).toEqual(['x', 'y', 'text']);

    dialog.destroy();
    semanticRegistry.clear();
    input.destroy();
    parent.destroy({ children: true });
  });

  it.each([
    [
      'global.feedback',
      [
        'Feedback button',
        'Bug button',
        'Feature button',
        'Feedback field',
        'Feedback send button',
      ],
    ],
    [
      'global.confirmation',
      ['Message', 'Cancel button', 'Confirm button'],
    ],
  ])('shows the populated semantic content for %s in the hierarchy', (
    dialogId,
    expectedLabels,
  ) => {
    const parent = new Container();
    const counters = new RetainedUiCounters();
    const input = new PixiInputRouter();
    const semanticRegistry = new SemanticTargetRegistry({ counters });
    const dialog = createUiEditorDialog({
      assets: createPixiAssetManagerFake(Texture),
      close: () => false,
      counters,
      dialogId,
      input,
      model: createUiEditorDialogFixture(dialogId),
      parent,
      projection: PROJECTION,
      semanticRegistry,
    });

    dialog.layout(PROJECTION);
    dialog.activate();
    const [content] = createRetainedDialogHierarchy(dialogId, dialog);
    const labels = content.children.map(({ label }) => label);

    expect(labels).toEqual(expect.arrayContaining(expectedLabels));

    dialog.destroy();
    semanticRegistry.clear();
    input.destroy();
    parent.destroy({ children: true });
  });

  it('constructs and binds both editor fixtures for every retained dialog', () => {
    const mountedIds = [];

    for (const dialogId of UI_EDITOR_RETAINED_DIALOG_IDS) {
      for (const variantIndex of [0, 1]) {
        const parent = new Container();
        const counters = new RetainedUiCounters();
        const input = new PixiInputRouter();
        const semanticRegistry = new SemanticTargetRegistry({ counters });
        const fixture = createUiEditorDialogFixture(dialogId, variantIndex);
        const dialog = createUiEditorDialog({
          assets: createPixiAssetManagerFake(Texture),
          close: () => false,
          counters,
          dialogId,
          input,
          model: fixture,
          parent,
          projection: PROJECTION,
          semanticRegistry,
        });

        dialog.layout(PROJECTION);
        dialog.activate();
        const expectedTitle = retainedDialogIntegrations.find(
          ({ id }) => id === `dialog.${dialogId}`,
        )?.label;
        const panel = dialog.modal?.panel ?? dialog.panel;
        const renderedTitle = panel?.titleLabel?.textObject?.text ?? '';
        expect(
          renderedTitle.includes(dialogId),
          `${dialogId}:${variantIndex}:runtime-title-leak`,
        ).toBe(false);
        if (!dialogId.startsWith('global.')) {
          expect(
            fixture.title,
            `${dialogId}:${variantIndex}:fixture-title`,
          ).toBe(expectedTitle);
        }
        if (dialogId.startsWith('workshop.')) {
          expect(
            renderedTitle,
            `${dialogId}:${variantIndex}:title`,
          ).toBe(expectedTitle);
        }
        const root =
          dialog.getRoot?.() ?? dialog.getDisplayObject?.() ?? dialog.root;
        expect(root, `${dialogId}:${variantIndex}`).toBeInstanceOf(Container);
        expect(root.visible, `${dialogId}:${variantIndex}`).toBe(true);
        expect(root.renderable, `${dialogId}:${variantIndex}`).toBe(true);
        const hierarchy = createRetainedDialogHierarchy(dialogId, dialog);
        expect(
          hierarchy[0]?.label,
          `${dialogId}:${variantIndex}:hierarchy-root`,
        ).toBe('Content');
        expect(
          hierarchy[0]?.type,
          `${dialogId}:${variantIndex}:hierarchy-type`,
        ).toBe('9-slice');
        const declaredChildWidgetIds = new Set(
          retainedDialogIntegrations.find(
            ({ id }) => id === `dialog.${dialogId}`,
          )?.childWidgetIds ?? [],
        );
        expect(
          hierarchy[0]?.children.length,
          `${dialogId}:${variantIndex}:hierarchy-children`,
        ).toBeGreaterThan(0);
        for (const child of hierarchy[0]?.children ?? []) {
          if (child.libraryEntryId) {
            expect(child.type, `${dialogId}:${variantIndex}:${child.label}:type`)
              .toBe('widget');
            expect(
              declaredChildWidgetIds.has(child.libraryEntryId),
              `${dialogId}:${variantIndex}:${child.label}:library-entry`,
            ).toBe(true);
            expect(
              child.children,
              `${dialogId}:${variantIndex}:${child.label}:children`,
            ).toEqual([]);
          } else {
            expect(
              ['button', 'image', 'text', 'text-field'],
              `${dialogId}:${variantIndex}:${child.label}:atomic-type`,
            ).toContain(child.type);
            expect(
              child.getSelectionDisplayObjects(),
              `${dialogId}:${variantIndex}:${child.label}:selection-target`,
            ).not.toEqual([]);
          }
        }

        dialog.destroy();
        semanticRegistry.clear();
        input.destroy();
        parent.destroy({ children: true });
      }
      mountedIds.push(dialogId);
    }

    expect(mountedIds).toEqual(UI_EDITOR_RETAINED_DIALOG_IDS);
  });

  it.each([
    ['garden.seed', 'ChooseSeedRow:InventoryChoiceRow'],
    ['brewing.herbs', 'ChooseHerbRow:InventoryChoiceRow'],
  ])('models %s as BaseDialog content with reusable row instances', (
    dialogId,
    expectedRowLabel,
  ) => {
    const parent = new Container();
    const counters = new RetainedUiCounters();
    const input = new PixiInputRouter();
    const semanticRegistry = new SemanticTargetRegistry({ counters });
    const dialog = createUiEditorDialog({
      assets: createPixiAssetManagerFake(Texture),
      close: () => false,
      counters,
      dialogId,
      input,
      model: createUiEditorDialogFixture(dialogId),
      parent,
      projection: PROJECTION,
      semanticRegistry,
    });

    dialog.layout(PROJECTION);
    dialog.activate();
    const [content] = createRetainedDialogHierarchy(dialogId, dialog);

    expect([content.label, content.type]).toEqual(['Content', '9-slice']);
    expect(content.children).toHaveLength(2);
    expect(
      content.children.map(({ label, libraryEntryId }) => [
        label,
        libraryEntryId,
      ]),
    ).toEqual([
      [
        expectedRowLabel,
        'compound.inventory-choice-row',
      ],
      [
        expectedRowLabel,
        'compound.inventory-choice-row',
      ],
    ]);
    expect(content.children.every(({ children }) => children.length === 0)).toBe(
      true,
    );

    dialog.destroy();
    semanticRegistry.clear();
    input.destroy();
    parent.destroy({ children: true });
  });

  it('uses a readable World Chat title and exposes production chat rows as leaves', () => {
    const dialogId = 'workshop.worldChat';
    const parent = new Container();
    const counters = new RetainedUiCounters();
    const input = new PixiInputRouter();
    const semanticRegistry = new SemanticTargetRegistry({ counters });
    const fixture = createUiEditorDialogFixture(dialogId);
    const dialog = createUiEditorDialog({
      assets: createPixiAssetManagerFake(Texture),
      close: () => false,
      counters,
      dialogId,
      input,
      model: fixture,
      parent,
      projection: PROJECTION,
      semanticRegistry,
    });

    dialog.layout(PROJECTION);
    dialog.activate();
    const [content] = createRetainedDialogHierarchy(dialogId, dialog);
    const worldChatIntegration = retainedDialogIntegrations.find(
      ({ id }) => id === `dialog.${dialogId}`,
    );

    expect(fixture.title).toBe('World Chat');
    expect(dialog.panel.titleLabel.textObject.text).toBe('World Chat');
    expect(worldChatIntegration.childWidgetIds).toEqual([
      'compound.dialog-frame',
      'compound.world-chat-message-row',
    ]);
    const rowChildren = content.children.filter(
      ({ libraryEntryId }) =>
        libraryEntryId === 'compound.world-chat-message-row',
    );
    expect(rowChildren).toHaveLength(2);
    expect(
      rowChildren.map(({ label, libraryEntryId, children }) => ({
        children,
        label,
        libraryEntryId,
      })),
    ).toEqual([
      {
        children: [],
        label: 'ChatMessageRow:WorldChatMessageRow',
        libraryEntryId: 'compound.world-chat-message-row',
      },
      {
        children: [],
        label: 'ChatMessageRow:WorldChatMessageRow',
        libraryEntryId: 'compound.world-chat-message-row',
      },
    ]);
    expect(
      content.children.filter(({ libraryEntryId }) => !libraryEntryId).length,
    ).toBeGreaterThan(0);

    dialog.destroy();
    semanticRegistry.clear();
    input.destroy();
    parent.destroy({ children: true });
  });

  it('registers the production inventory row as a drill-in widget with states', () => {
    const chooseSeedIntegration = retainedDialogIntegrations.find(
      ({ id }) => id === 'dialog.garden.seed',
    );
    const chooseHerbIntegration = retainedDialogIntegrations.find(
      ({ id }) => id === 'dialog.brewing.herbs',
    );

    expect(chooseSeedIntegration.childWidgetIds).toEqual([
      'compound.dialog-frame',
      'compound.inventory-choice-row',
    ]);
    expect(chooseHerbIntegration.childWidgetIds).toEqual([
      'compound.dialog-frame',
      'compound.inventory-choice-row',
    ]);
    expect(inventoryChoiceRowIntegration.kind).toBe('widget');
    expect(typeof inventoryChoiceRowIntegration.createThumbnail).toBe(
      'function',
    );
    expect(
      inventoryChoiceRowIntegration.scenarios.map(({ id }) => id),
    ).toEqual(['unselected', 'selected', 'disabled']);
  });

  it('registers the production World Chat row as a drill-in widget with states', () => {
    expect(worldChatMessageRowIntegration.kind).toBe('widget');
    expect(typeof worldChatMessageRowIntegration.createThumbnail).toBe(
      'function',
    );
    expect(
      worldChatMessageRowIntegration.scenarios.map(({ id }) => id),
    ).toEqual(['player', 'system', 'disabled']);
  });
});
