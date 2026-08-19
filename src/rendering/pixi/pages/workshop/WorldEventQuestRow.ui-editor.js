import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { WorldEventQuestRow } from './WorkshopDialogPixi.js';

const WIDGET_ID = 'compound.world-event-quest-row';
const WIDGET_WIDTH = 314;

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: ['compound.world-event-donation-option-row'],
  createThumbnail: createWorldEventQuestRowThumbnail,
  folderPath: ['Workshop'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'World Event Quest Row',
  properties: [
    { label: 'Production class', value: 'WorldEventQuestRow' },
    {
      label: 'Contract',
      value: 'One event request with narrative, contribution status, and backed donation option rows',
    },
  ],
  scenarios: [
    {
      fixture: createQuestFixture(),
      id: 'available',
      label: 'Donation available',
      mount: mountWorldEventQuestRow,
    },
    {
      fixture: createQuestFixture({
        donationOptions: createQuestFixture().donationOptions.map((option) => ({
          ...option,
          actionLabel: 'Unavailable',
          enabled: false,
          onActivate: null,
        })),
      }),
      id: 'unavailable',
      label: 'Donations unavailable',
      mount: mountWorldEventQuestRow,
    },
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'World Event Quests tab',
      source: 'src/rendering/pixi/pages/workshop/WorkshopDialogPixi.js',
    },
  ],
});

function createWorldEventQuestRowThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: worldEventAssetFilter,
    component: 'WorldEventQuestRow',
    createControl: ({ assets }) =>
      createWorldEventQuestRowControl({
        assets,
        fixture: createQuestFixture(),
        input: null,
      }),
    id: WIDGET_ID,
  });
}

async function mountWorldEventQuestRow(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: worldEventAssetFilter,
    component: 'WorldEventQuestRow',
    createControl: ({ assets, input }) =>
      createWorldEventQuestRowControl({
        assets,
        fixture: {
          ...fixture,
          donationOptions: fixture.donationOptions.map((option) => ({
            ...option,
            ...(option.enabled
              ? {
                  onActivate: () => {
                    context.emit('worldEventDonationOpened', {
                      optionId: option.id,
                    });
                    return true;
                  },
                }
              : {}),
          })),
        },
        input,
      }),
  });
}

function createWorldEventQuestRowControl({ assets, fixture, input }) {
  const contentTheme = createDialogContentTheme(
    DEFAULT_PIXI_THEME_SNAPSHOT,
  );
  const dialog = {
    assetManager: assets,
    contentTheme,
    dialogId: 'workshop.worldEvent',
    inputRouter: input,
    registerTarget() {},
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    unregisterTarget() {},
  };
  const row = new WorldEventQuestRow({ dialog });
  row.bind(fixture);
  const height = row.getPreferredHeight();
  row.setBounds(0, 0, WIDGET_WIDTH, height);

  return {
    atomicComponents: createWorldEventQuestRowHierarchy(row),
    destroy: () => row.destroy(),
    height,
    root: row.root,
    row,
    width: WIDGET_WIDTH,
  };
}

function createWorldEventQuestRowHierarchy(row) {
  const components = [
    hierarchy(row.card, 'frame', 'Quest section frame', '9-slice'),
    hierarchy(row.title, 'title', 'Quest title', 'label', row.title),
    hierarchy(row.points, 'points', 'Contribution points', 'label', row.points),
    hierarchy(row.description, 'description', 'Quest narrative', 'label', row.description),
    hierarchy(row.progress, 'progress', 'Quest progress', 'label', row.progress),
    hierarchy(row.status, 'status', 'Quest status', 'label', row.status),
  ];

  row.options.forEach((option, index) => {
    if (!option.root.visible) {
      return;
    }
    components.push(
      hierarchy(option.backing, `option-${index}-backing`, `Donation ${index + 1} background`, '9-slice'),
      hierarchy(option.icon, `option-${index}-icon`, `Donation ${index + 1} item art`, 'image'),
      hierarchy(option.label, `option-${index}-label`, `Donation ${index + 1} title`, 'label', option.label),
      hierarchy(option.points, `option-${index}-points`, `Donation ${index + 1} points each`, 'label', option.points),
      hierarchy(option.total, `option-${index}-total`, `Donation ${index + 1} total`, 'label', option.total),
      hierarchy(option.action, `option-${index}-action`, `Donation ${index + 1} action`, 'button'),
    );
  });

  return components;
}

function hierarchy(primary, id, label, type, textTarget = null) {
  return createUiEditorPixiHierarchyComponent({
    displayObjects: [primary],
    id: `world-event-quest-row:${id}`,
    label,
    primary,
    ...(textTarget ? { textTarget } : {}),
    type,
  });
}

function createQuestFixture(overrides = {}) {
  return {
    description: 'The coronation bells have people cheering, arguing, and fainting in the same street. Donate calming draughts so the crowd stays upright.',
    donationOptions: [
      {
        actionLabel: 'Donate',
        enabled: true,
        id: 'calming-draught',
        itemKey: 'calmingDraught',
        itemKind: 'potion',
        label: 'Calming Draught',
        onActivate: () => true,
        pointsEachLabel: '120 points each',
        resourceKey: 'potion',
        totalLabel: '0 points total',
      },
      {
        actionLabel: 'Donate',
        enabled: true,
        id: 'valerian-rest',
        itemKey: 'valerianRest',
        itemKind: 'potion',
        label: 'Valerian Rest',
        onActivate: () => true,
        pointsEachLabel: '320 points each',
        resourceKey: 'potion',
        totalLabel: '0 points total',
      },
    ],
    id: 'quest:quiet-the-crowd',
    pointsLabel: '0 points',
    title: 'Quiet The Crowd',
    ...overrides,
  };
}

function worldEventAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return assetId.startsWith('source:assets/items/')
    || assetId.startsWith('source:assets/ui/');
}
