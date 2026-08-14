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
import worldEventQuestRowIntegration from './pages/workshop/WorldEventQuestRow.ui-editor.js';
import inboxMailWidgetIntegration from './global/dialogs/InboxMailWidget.ui-editor.js';
import playerAvatarIntegration from './global/chrome/RootRunAvatarWidget.ui-editor.js';

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
    ).toEqual(expect.arrayContaining([
      'text',
      'fontFamily',
      'positionMode',
      'x',
      'y',
      'anchor',
      'paddingTop',
    ]));

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

  it('previews Support with its production copy and centered message only', () => {
    const dialogId = 'shop.support';
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
    const supportIntegration = retainedDialogIntegrations.find(
      ({ id }) => id === `dialog.${dialogId}`,
    );

    expect(fixture).toEqual({
      title: 'Support',
      message:
        'Thank you for trying to support the project but the transactions are not yet available <3',
    });
    expect(dialog.panel.titleLabel.text).toBe('Support');
    expect(dialog.messageLabel.align).toBe('center');
    expect(dialog.messageLabel.textObject.anchor.x).toBe(0.5);
    expect(dialog.messageLabel.textObject.anchor.y).toBe(0.5);
    expect(dialog.rangeControl.visible).toBe(false);
    expect(dialog.amountSelector.root.visible).toBe(false);
    expect(content.children.map(({ label }) => label)).toEqual(['Message']);
    expect(supportIntegration.childWidgetIds).toEqual([
      'compound.dialog-frame',
    ]);

    dialog.destroy();
    semanticRegistry.clear();
    input.destroy();
    parent.destroy({ children: true });
  });

  it('renders Daily Tasks as split live-point sections with icon rewards and claim states', () => {
    const dialogId = 'workshop.personalTasks';
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

    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(
      [...dialog.personalTaskSectionChrome.values()].map((section) => ({
        title: section.title.text,
        points: section.points.text,
        reset: section.reset.text,
        visible: section.root.visible,
      })),
    ).toEqual([
      {
        title: 'Today',
        points: '70 / 100 Points',
        reset: 'Resets in 2h',
        visible: true,
      },
      {
        title: 'This Week',
        points: '170 / 700 Points',
        reset: 'Resets in 4d 2h',
        visible: true,
      },
    ]);
    const rewardRows = dialog.rows.getWidgets();
    expect(rewardRows).toHaveLength(8);
    expect(
      rewardRows[0].resourceValue.runs.filter((run) => run.kind === 'icon'),
    ).toHaveLength(1);
    expect(rewardRows[0].model.statusIcon).toBe('checkmark');
    expect(rewardRows[3].action.variant).toBe('green');
    expect(
      rewardRows[7].resourceValue.runs.filter((run) => run.kind === 'icon'),
    ).toHaveLength(2);
    expect(rewardRows[7].action.enabled).toBe(false);

    dialog.destroy();
    semanticRegistry.clear();
    input.destroy();
    parent.destroy({ children: true });
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
      'primitive.text-field',
      'text-button',
    ]);
    const rowChildren = content.children.filter(
      ({ libraryEntryId }) =>
        libraryEntryId === 'compound.world-chat-message-row',
    );
    expect(rowChildren).toHaveLength(2);
    expect(
      content.children.find(
        ({ libraryEntryId }) => libraryEntryId === 'primitive.text-field',
      )?.label,
    ).toBe('Composer:PixiTextField');
    expect(
      content.children.find(
        ({ libraryEntryId }) => libraryEntryId === 'text-button',
      )?.label,
    ).toBe('Send:PixiTextButton');
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
    ).toEqual(['unselected', 'selected', 'pressed', 'disabled']);
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

  it('registers World Event quest sections as production-backed drill-in widgets', () => {
    const dialogId = 'workshop.worldEvent';
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
    const [content] = createRetainedDialogHierarchy(dialogId, dialog);
    const dialogIntegration = retainedDialogIntegrations.find(
      ({ id }) => id === `dialog.${dialogId}`,
    );

    expect(dialogIntegration.childWidgetIds).toEqual([
      'compound.dialog-frame',
      'compound.world-event-quest-row',
    ]);
    expect(
      content.children.filter(
        ({ libraryEntryId }) =>
          libraryEntryId === 'compound.world-event-quest-row',
      ),
    ).toHaveLength(2);
    expect(worldEventQuestRowIntegration.kind).toBe('widget');
    expect(typeof worldEventQuestRowIntegration.createThumbnail).toBe(
      'function',
    );
    expect(
      worldEventQuestRowIntegration.scenarios.map(({ id }) => id),
    ).toEqual(['available', 'unavailable', 'completed']);

    dialog.destroy();
    semanticRegistry.clear();
    input.destroy();
    parent.destroy({ children: true });
  });

  it('registers Inbox mail as a production-backed drill-in widget', () => {
    const inboxIntegration = retainedDialogIntegrations.find(
      ({ id }) => id === 'dialog.global.inbox',
    );

    expect(inboxIntegration.childWidgetIds).toEqual([
      'compound.dialog-frame',
      'compound.inbox-mail-widget',
    ]);
    expect(inboxMailWidgetIntegration.kind).toBe('widget');
    expect(typeof inboxMailWidgetIntegration.createThumbnail).toBe(
      'function',
    );
    expect(
      inboxMailWidgetIntegration.scenarios.map(({ id }) => id),
    ).toEqual(['claimable', 'claimed', 'message']);
  });

  it('registers the framed player avatar as a production-backed drill-in widget', () => {
    const playerIntegration = retainedDialogIntegrations.find(
      ({ id }) => id === 'dialog.global.player',
    );

    expect(playerIntegration.childWidgetIds).toEqual([
      'compound.dialog-frame',
      'compound.player-avatar',
      'primitive.star-level-label',
      'primitive.resource-label',
    ]);
    expect(playerAvatarIntegration.kind).toBe('widget');
    expect(typeof playerAvatarIntegration.createThumbnail).toBe('function');
    expect(
      playerAvatarIntegration.scenarios.map(({ id }) => id),
    ).toEqual(['mira', 'tinted-frame']);
  });
});
