import { Container } from 'pixi.js';

import { defineUiEditorIntegration } from '../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  UI_EDITOR_PIXI_VIEWPORTS,
  createUiEditorPixiAtomicComponents,
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../uiEditor/widgets/createUiEditorPixiSurface.js';
import {
  DIALOG_IDS_BY_PAGE,
  RETAINED_DIALOG_IDS,
  createDialogViewModel,
} from './acceptance/RetainedAcceptanceFixtures.js';
import {
  GLOBAL_DIALOG_IDS,
  createGlobalDialogFactories,
} from './global/dialogs/GlobalDialogFactories.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
} from './theme/PixiThemeTokens.js';
import { RetainedUiCounters } from './retained/RetainedUiCounters.js';
import { SemanticTargetRegistry } from './retained/SemanticTargetRegistry.js';
import {
  BrewingRecipeBookDialogPixi,
  BrewingRecipeChoiceDialogPixi,
} from './pages/brewing/BrewingDialogsPixi.js';
import { BrewingAutomationSettingsDialogPixi } from './pages/brewing/BrewingHudPixi.js';
import {
  GardenConfirmDialogPixi,
  GardenSeedDialogPixi,
} from './pages/garden/GardenDialogPixi.js';
import {
  GUILD_DIALOG_IDS,
  GuildDialogPixi,
  GuildRequestStackDialogPixi,
} from './pages/guild/GuildDialogPixi.js';
import { RootRunInventoryChoiceDialogPixi } from './pages/shared/RootRunInventoryChoiceDialogPixi.js';
import {
  SHOP_DIALOG_IDS,
  WORKSHOP_SUMMON_INFO_DIALOG_ID,
  ShopDialogPixi,
} from './pages/shop/ShopDialogPixi.js';
import { WorkshopDialogPixi } from './pages/workshop/WorkshopDialogPixi.js';

const DIALOG_SECTION = 'dialogs';
const DIALOG_ASSET_PREFIXES = Object.freeze([
  'source:assets/avatars/',
  'source:assets/characters/',
  'source:assets/icons/',
  'source:assets/items/',
  'source:assets/ui/',
  'public:ui/',
]);

const GLOBAL_DIALOG_FACTORIES = new Map(createGlobalDialogFactories());
const GLOBAL_DIALOG_IDS_IN_ORDER = Object.freeze([
  GLOBAL_DIALOG_IDS.SETTINGS,
  GLOBAL_DIALOG_IDS.FEEDBACK,
  GLOBAL_DIALOG_IDS.LEVEL,
  GLOBAL_DIALOG_IDS.INBOX,
  GLOBAL_DIALOG_IDS.PLAYER,
  GLOBAL_DIALOG_IDS.ALLIANCE,
  GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
  GLOBAL_DIALOG_IDS.CONFIRMATION,
]);

const INVENTORY_CHOICE_DIALOG_HIERARCHY = Object.freeze({
  'brewing.herbs': Object.freeze({
    rowLabel: 'ChooseHerbRow:InventoryChoiceRow',
  }),
  'garden.seed': Object.freeze({
    rowLabel: 'ChooseSeedRow:InventoryChoiceRow',
  }),
});

const WORLD_CHAT_ROW_WIDGET_ID = 'compound.world-chat-message-row';

const DIALOG_LABELS = Object.freeze({
  'global.settings': 'Settings',
  'global.feedback': 'Feedback',
  'global.level': 'Level Rewards',
  'global.inbox': 'Inbox',
  'global.player': 'Player Info',
  'global.alliance': 'Alliance Info',
  'global.announcement': 'Announcement',
  'global.confirmation': 'Confirmation',
  'workshop.summonInfo': 'Summoning Seeds',
  'workshop.bag': 'Bag',
  'workshop.stats': 'Stats',
  'workshop.inbox': 'Workshop Inbox',
  'workshop.alliance': 'Alliance Directory',
  'workshop.leaderboard': 'Leaderboard',
  'workshop.discoveries': 'Discoveries',
  'workshop.personalTasks': 'Personal Tasks',
  'workshop.worldEvent': 'World Event',
  'workshop.worldEventDonate': 'World Event Donation',
  'workshop.worldChat': 'World Chat',
  'garden.seed': 'Choose Seed',
  'garden.cancel': 'Cancel Garden Progress',
  'garden.swap': 'Swap Garden Seed',
  'brewing.herbs': 'Choose Herb',
  'brewing.recipes': 'Recipe Book',
  'brewing.recipe-choice': 'Selected Recipe',
  'brewing.automation-settings': 'Cauldron Settings',
  'shop.stall': 'Load Stall',
  'shop.ledger': 'Market Ledger',
  'shop.request': 'Create Request',
  'shop.listing': 'Sell Listing',
  'shop.market': 'Player Market',
  'shop.tradeHistory': 'Trade History',
  'shop.support': 'Market Support',
  'guild.charter': 'Guild Charter',
  'guild.settings': 'Guild Settings',
  'guild.request': 'Guild Request',
  'guild.requestStack': 'Guild Request Stack',
  'guild.adventurer': 'Adventurer',
  'guild.applicant': 'Applicant',
});

export const UI_EDITOR_RETAINED_DIALOG_IDS = Object.freeze([
  ...GLOBAL_DIALOG_IDS_IN_ORDER,
  ...RETAINED_DIALOG_IDS,
]);

function createDialogScenarios(dialogId) {
  const globalScenarios = GLOBAL_DIALOG_SCENARIOS[dialogId];
  if (globalScenarios) {
    return globalScenarios.map((scenario) => ({
      ...scenario,
      mount: (context, fixture) =>
        mountRetainedDialog(context, dialogId, fixture),
    }));
  }

  return [
    {
      fixture: () => createUiEditorDialogFixture(dialogId, 0),
      id: 'populated',
      label: 'Populated',
      mount: (context, fixture) =>
        mountRetainedDialog(context, dialogId, fixture),
    },
    {
      fixture: () => createUiEditorDialogFixture(dialogId, 1),
      id: 'alternate',
      label: 'Alternate data',
      mount: (context, fixture) =>
        mountRetainedDialog(context, dialogId, fixture),
    },
  ];
}

async function mountRetainedDialog(context, dialogId, fixture) {
  const fixtureFactory =
    typeof fixture === 'function' ? fixture : () => fixture;
  const model = instrumentFixture(
    fixtureFactory?.() ?? {},
    context,
    dialogId,
  );

  return createUiEditorPixiSurface({
    assetFilter: dialogAssetFilter,
    component: resolveDialogComponentLabel(dialogId),
    layout: 'fill',
    viewport: UI_EDITOR_PIXI_VIEWPORTS.GAME_SCREEN,
    createControl: ({ assets, input, projection }) => {
      const counters = new RetainedUiCounters();
      const semanticRegistry = new SemanticTargetRegistry({ counters });
      const parent = new Container({ label: `${dialogId}:editor-parent` });
      const close = (payload = {}) => {
        context.emit('dialogCloseRequested', {
          dialogId,
          source: payload?.source ?? 'close',
        });
        return false;
      };
      const dialog = createUiEditorDialog({
        assets,
        close,
        counters,
        dialogId,
        input,
        model,
        parent,
        projection,
        semanticRegistry,
      });

      return {
        atomicComponents: createRetainedDialogHierarchy(dialogId, dialog),
        destroy() {
          dialog.destroy();
          semanticRegistry.clear();
          if (!parent.destroyed) {
            parent.destroy({ children: true });
          }
        },
        dialog,
        layout(nextProjection) {
          dialog.layout(nextProjection);
          if (!dialog.active) {
            dialog.activate();
          }
        },
        root: resolveDialogRoot(dialog),
      };
    },
  });
}

export function createUiEditorDialog({
  assets,
  close,
  counters,
  dialogId,
  input,
  model,
  parent,
  projection,
  semanticRegistry,
}) {
  if (GLOBAL_DIALOG_FACTORIES.has(dialogId)) {
    return createGlobalDialog({
      assets,
      close,
      counters,
      dialogId,
      input,
      model,
      projection,
      semanticRegistry,
    });
  }

  const dialog = createUiEditorOwnedDialog({
    assets,
    close,
    counters,
    dialogId,
    input,
    parent,
    semanticRegistry,
  });
  dialog.bind(model);
  return dialog;
}

function createGlobalDialog({
  assets,
  close,
  counters,
  dialogId,
  input,
  model,
  projection,
  semanticRegistry,
}) {
  const factory = GLOBAL_DIALOG_FACTORIES.get(dialogId);
  const dialog = factory({
    assets,
    counters,
    dialogRegistry: null,
    inputRouter: input,
    projection,
    semanticRegistry,
    textEntryService: null,
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
  });
  dialog.bind({
    ...model,
    actions: {
      ...(model.actions ?? {}),
      close,
    },
    onClose: close,
  });
  dialog.layout(projection);
  return dialog;
}

export function createUiEditorDialogFixture(dialogId, variantIndex = 0) {
  const globalScenarios = GLOBAL_DIALOG_SCENARIOS[dialogId];
  if (globalScenarios) {
    const selectedScenario =
      globalScenarios[variantIndex] ?? globalScenarios[0];
    return selectedScenario.fixture();
  }
  if (dialogId === 'brewing.herbs') {
    return createChooseHerbDialogFixture(variantIndex);
  }
  if (dialogId === 'workshop.worldChat') {
    return createWorldChatDialogFixture(variantIndex);
  }
  return normalizeUiEditorDialogFixture(
    dialogId,
    createDialogViewModel(dialogId, variantIndex === 0 ? 'a' : 'b'),
  );
}

function normalizeUiEditorDialogFixture(dialogId, fixture) {
  if (!fixture || Object.getPrototypeOf(fixture) !== Object.prototype) {
    return fixture;
  }
  return {
    ...fixture,
    title: DIALOG_LABELS[dialogId] ?? titleCaseIdentifier(dialogId),
  };
}

function createWorldChatDialogFixture(variantIndex) {
  const alternate = variantIndex > 0;
  return {
    rows: [
      {
        ageLabel: alternate ? '2m' : 'now',
        allianceTag: alternate ? 'OWL' : 'ARC',
        allianceTagColor: alternate ? 'green' : 'violet',
        body: alternate
          ? 'The night market is open.'
          : 'Anyone joining the next expedition?',
        character: alternate ? 'juniper' : 'mira',
        enabled: true,
        id: `world-chat-player-${variantIndex}`,
        onActivate: () => true,
        username: alternate ? 'Juniper' : 'Mira',
      },
      {
        ageLabel: alternate ? '1m' : 'just now',
        body: alternate
          ? 'A new world event has begun.'
          : 'Mira discovered a rare potion.',
        id: `world-chat-system-${variantIndex}`,
        systemPlayerDetail: alternate
          ? 'A new world event has begun.'
          : 'discovered a rare potion.',
        systemPlayerUsername: alternate ? '' : 'Mira',
        type: 'system',
        username: 'System',
      },
    ],
    tabs: [
      { id: 'world', label: 'World', selected: true },
      { id: 'alliance', label: 'Alliance' },
    ],
    title: 'World Chat',
  };
}

function createChooseHerbDialogFixture(variantIndex) {
  const selected = variantIndex > 0;
  return {
    actions: {
      selectHerb: () => true,
    },
    cauldronIndex: variantIndex,
    rows: [
      {
        detail: '2 Available',
        enabled: true,
        id: 'sageHerb',
        itemKind: 'herb',
        key: 'sageHerb',
        label: 'Sage',
        quantity: 2,
        selected,
        semanticId: 'brewing.herb.sageHerb',
      },
      {
        detail: '3 Available',
        enabled: true,
        id: 'mintHerb',
        itemKind: 'herb',
        key: 'mintHerb',
        label: 'Mint',
        quantity: 3,
        semanticId: 'brewing.herb.mintHerb',
      },
    ],
    slotIndex: variantIndex,
    title: 'Choose Herb',
  };
}

export function createUiEditorOwnedDialog({
  assets,
  close,
  counters,
  dialogId,
  input,
  parent,
  semanticRegistry,
}) {
  const common = {
    assetManager: assets,
    counters,
    inputRouter: input,
    onClose: close,
    parent,
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
  };

  if (dialogId.startsWith('workshop.')) {
    if (dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID) {
      return new ShopDialogPixi({
        ...common,
        dialogId,
        semanticRegistry,
        textEntryService: null,
      });
    }
    return new WorkshopDialogPixi({
      ...common,
      dialogId,
      semanticTargets: semanticRegistry,
      textEntryService: null,
    });
  }

  if (dialogId === 'garden.seed') {
    return new GardenSeedDialogPixi({
      ...common,
      semanticTargets: semanticRegistry,
    });
  }
  if (dialogId === 'garden.cancel') {
    return new GardenConfirmDialogPixi({
      ...common,
      confirmLabel: 'Empty',
      id: dialogId,
      title: 'Cancel Progress?',
      variant: 'danger',
    });
  }
  if (dialogId === 'garden.swap') {
    return new GardenConfirmDialogPixi({
      ...common,
      confirmLabel: 'Swap',
      id: dialogId,
      title: 'Swap Seed?',
    });
  }

  if (dialogId === 'brewing.herbs') {
    return new RootRunInventoryChoiceDialogPixi({
      ...common,
      id: dialogId,
      itemKind: 'herb',
      listLabel: 'brewing-herb-dialog-list',
      selectActionName: 'selectHerb',
      semanticTargets: semanticRegistry,
      title: 'Choose Herb',
    });
  }
  if (dialogId === 'brewing.recipes') {
    return new BrewingRecipeBookDialogPixi({
      ...common,
      semanticTargets: semanticRegistry,
    });
  }
  if (dialogId === 'brewing.recipe-choice') {
    return new BrewingRecipeChoiceDialogPixi(common);
  }
  if (dialogId === 'brewing.automation-settings') {
    return new BrewingAutomationSettingsDialogPixi(common);
  }

  if (Object.values(SHOP_DIALOG_IDS).includes(dialogId)) {
    return new ShopDialogPixi({
      ...common,
      dialogId,
      semanticRegistry,
      textEntryService: null,
    });
  }

  if (Object.values(GUILD_DIALOG_IDS).includes(dialogId)) {
    if (dialogId === GUILD_DIALOG_IDS.REQUEST_STACK) {
      return new GuildRequestStackDialogPixi({
        ...common,
        semanticRegistry,
      });
    }
    return new GuildDialogPixi({
      ...common,
      dialogId,
      semanticRegistry,
      textEntryService: null,
    });
  }

  throw new Error(`No UI editor factory for retained dialog: ${dialogId}`);
}

function instrumentFixture(value, context, path) {
  if (typeof value === 'function') {
    return (...args) => {
      context.emit('dialogAction', {
        action: path,
        argumentCount: args.length,
      });
      const result = value(...args);
      context.invalidate();
      return result;
    };
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      instrumentFixture(item, context, `${path}.${index}`),
    );
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        instrumentFixture(item, context, `${path}.${key}`),
      ]),
    );
  }
  return value;
}

function resolveDialogRoot(dialog) {
  return dialog.getRoot?.() ?? dialog.getDisplayObject?.() ?? dialog.root;
}

export function createRetainedDialogHierarchy(dialogId, dialog) {
  const panel = resolveDialogPanel(dialog);
  const content = panel?.content;
  const paperFrame = panel?.paperFrame;
  const children = createDialogContentHierarchy(dialogId, dialog, content);

  if (!content) {
    return [];
  }

  return [
    createUiEditorPixiHierarchyComponent({
      children,
      displayObjects: [paperFrame, content].filter(Boolean),
      id: `${dialogId}:content`,
      label: 'Content',
      primary: content,
      type: '9-slice',
    }),
  ];
}

function createDialogContentHierarchy(dialogId, dialog, content) {
  const reusableChildren = createReusableDialogContentHierarchy(
    dialogId,
    dialog,
  );
  const componentOverrides = new Map();

  for (const component of reusableChildren) {
    for (const displayObject of component.getSelectionDisplayObjects()) {
      componentOverrides.set(displayObject, component);
    }
  }

  return createUiEditorPixiAtomicComponents(content, {
    componentOverrides,
    includeHidden: false,
  });
}

function createReusableDialogContentHierarchy(dialogId, dialog) {
  if (dialogId === 'workshop.worldChat') {
    return (dialog.rows?.getWidgets?.() ?? []).map((row, index) =>
      createUiEditorPixiHierarchyComponent({
        displayObjects: [row.root],
        id: `${dialogId}:row:${row.model?.id ?? index}`,
        label: 'ChatMessageRow:WorldChatMessageRow',
        libraryEntryId: WORLD_CHAT_ROW_WIDGET_ID,
        primary: row.root,
        type: 'widget',
      }),
    );
  }

  const inventoryChoiceConfig =
    INVENTORY_CHOICE_DIALOG_HIERARCHY[dialogId];
  if (!inventoryChoiceConfig) {
    return [];
  }

  const rows = dialog.list?.rows?.getWidgets?.() ?? [];

  return rows.map((row, index) =>
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.root],
      id: `${dialogId}:row:${row.key ?? index}`,
      label: inventoryChoiceConfig.rowLabel,
      libraryEntryId: 'compound.inventory-choice-row',
      primary: row.root,
      type: 'widget',
    }),
  );
}

function resolveDialogPanel(dialog) {
  return dialog.modal?.panel ?? dialog.panel ?? null;
}

function resolveDialogComponentLabel(dialogId) {
  const label = DIALOG_LABELS[dialogId] ?? titleCaseIdentifier(dialogId);
  const baseName = label
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join('');
  return `${baseName.endsWith('Dialog') ? baseName : `${baseName}Dialog`}:BaseDialog`;
}

function dialogAssetFilter(asset) {
  return DIALOG_ASSET_PREFIXES.some((prefix) =>
    String(asset?.id ?? '').startsWith(prefix),
  );
}

function resolveDialogFolder(dialogId) {
  const family = dialogId.split('.')[0];
  return family === 'shop' ? 'Market' : titleCaseIdentifier(family);
}

function resolveDialogSource(dialogId) {
  if (dialogId.startsWith('global.')) {
    return 'src/rendering/pixi/global/dialogs/';
  }
  if (dialogId.startsWith('workshop.')) {
    return dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID
      ? 'src/rendering/pixi/pages/shop/ShopDialogPixi.js'
      : 'src/rendering/pixi/pages/workshop/WorkshopDialogPixi.js';
  }
  if (dialogId.startsWith('garden.')) {
    return 'src/rendering/pixi/pages/garden/GardenDialogPixi.js';
  }
  if (dialogId.startsWith('brewing.')) {
    return 'src/rendering/pixi/pages/brewing/';
  }
  if (dialogId.startsWith('shop.')) {
    return 'src/rendering/pixi/pages/shop/ShopDialogPixi.js';
  }
  return 'src/rendering/pixi/pages/guild/GuildDialogPixi.js';
}

function titleCaseIdentifier(value) {
  return String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const GLOBAL_DIALOG_SCENARIOS = Object.freeze({
  [GLOBAL_DIALOG_IDS.SETTINGS]: Object.freeze([
    scenario('device', 'Device preferences', () => ({
      account: {
        accountStatus: 'connected as mira@example.com',
        connectLabel: 'Disconnect',
        userId: 'c5b53a9f2e6484af',
        username: 'Mira',
        version: '0.9.0',
      },
      preferences: { haptics: true, music: true, sfx: true, theme: false },
      tabId: 'configurations',
    })),
    scenario('wizard', 'Wizard profile', () => ({
      account: { username: 'Mira' },
      categories: [
        {
          key: 'character',
          options: [
            { key: 'elara', label: 'Elara' },
            { key: 'mira', label: 'Mira' },
            { key: 'rowan', label: 'Rowan' },
            { key: 'juniper', label: 'Juniper' },
          ],
        },
        {
          key: 'frame',
          options: [
            { key: 'classic', label: 'Classic', tint: 0xffffff },
            { key: 'forest', label: 'Forest', tint: 0x79b93f },
          ],
        },
      ],
      researched: {
        character: { elara: true, mira: true, rowan: true, juniper: true },
        frame: { classic: true, forest: true },
      },
      selections: { character: 'mira', frame: 'classic' },
      tabId: 'account',
    })),
  ]),
  [GLOBAL_DIALOG_IDS.FEEDBACK]: Object.freeze([
    scenario('feedback', 'Feedback', () => ({
      feedback: { kind: 'feedback', value: 'The Workshop feels great.' },
      kind: 'feedback',
      tabId: 'report',
    })),
    scenario('bug', 'Bug report', () => ({
      feedback: { kind: 'bug', value: 'The collect button stopped responding.' },
      kind: 'bug',
      tabId: 'report',
    })),
  ]),
  [GLOBAL_DIALOG_IDS.LEVEL]: Object.freeze([
    scenario('current', 'Current level', () => ({
      currentLevel: 7,
      maxLevel: 8,
      selectedLevel: 7,
      levels: [
        {
          addedRows: [
            { id: 'mana', label: 'Mana capacity', value: '+20' },
            { id: 'market', label: 'Unlocks', value: 'Market request' },
          ],
          current: true,
          level: 7,
          totalRows: [
            { id: 'mana-total', label: 'Mana capacity', value: '180' },
            { id: 'plots-total', label: 'Garden plots', value: '6' },
          ],
          unlocked: true,
        },
        { level: 8, unlocked: false },
      ],
    })),
    scenario('previous', 'Previous level', () => ({
      currentLevel: 7,
      maxLevel: 7,
      selectedLevel: 4,
      levels: [
        {
          addedRows: [{ id: 'garden', label: 'Unlocks', value: 'Garden' }],
          level: 4,
          totalRows: [{ id: 'plots', label: 'Garden plots', value: '3' }],
          unlocked: true,
        },
      ],
    })),
  ]),
  [GLOBAL_DIALOG_IDS.INBOX]: Object.freeze([
    scenario('mail', 'Mail with reward', () => ({
      mail: [
        {
          body: 'A courier left this at the Workshop door.',
          hasReward: true,
          mailKey: 'welcome',
          read: false,
          rewardCollected: false,
          rewardText: '+100 coin',
          senderLabel: 'Elara',
          title: 'Welcome, Wizard',
        },
        {
          body: 'The market ledger is ready for review.',
          mailKey: 'ledger',
          read: true,
          senderLabel: 'Market Clerk',
          title: 'Weekly Ledger',
        },
      ],
    })),
    scenario('empty', 'Empty', () => ({ mail: [] })),
  ]),
  [GLOBAL_DIALOG_IDS.PLAYER]: Object.freeze([
    scenario('player', 'Player profile', () => ({
      player: {
        allianceId: 'moss-hall',
        allianceName: 'Moss Hall',
        allianceTag: 'MOSS',
        character: 'mira',
        playerLevel: 12,
        prestigeCount: 2,
        totalProducedCoin: 128450,
        username: 'Mira',
      },
    })),
    scenario('loading', 'Loading', () => ({ loading: true })),
  ]),
  [GLOBAL_DIALOG_IDS.ALLIANCE]: Object.freeze([
    scenario('alliance', 'Alliance roster', () => ({
      alliance: {
        allianceId: 'moss-hall',
        description: 'A quiet hall for patient traders.',
        joinMode: 'open',
        name: 'Moss Hall',
        seasonIncome: 84520,
        tag: 'MOSS',
      },
      members: [
        { memberIdentity: 'mira', playerLevel: 12, role: 'leader', username: 'Mira' },
        { memberIdentity: 'rowan', playerLevel: 9, role: 'member', username: 'Rowan' },
        { memberIdentity: 'juniper', playerLevel: 7, role: 'member', username: 'Juniper' },
      ],
    })),
    scenario('loading', 'Loading', () => ({ loading: true })),
  ]),
  [GLOBAL_DIALOG_IDS.ANNOUNCEMENT]: Object.freeze([
    scenario('rewards', 'Reward report', () => ({
      dismissible: true,
      framed: true,
      rows: [
        { id: 'coin', label: 'Coin', value: '+1,200' },
        { id: 'mana', label: 'Mana', value: '+80' },
      ],
      title: 'While Away',
    })),
    scenario('level', 'Level up', () => ({
      animation: { kind: 'level-rewards' },
      continueLabel: 'Tap to continue',
      dismissible: true,
      kind: 'level',
      rows: [
        { id: 'mana', label: 'Mana capacity', value: '+20' },
        { id: 'unlock', label: 'Unlocks', value: 'Garden' },
      ],
      title: 'Level Up!',
    })),
    scenario('unlock', 'Feature unlock', () => ({
      dismissible: true,
      items: [
        {
          feature: 'garden',
          icon: { assetId: 'source:assets/icons/icon-garden-plot-tab.png' },
          id: 'unlock:garden',
          label: 'Garden',
          pageId: 'garden',
          value: 'New room available',
        },
      ],
      kind: 'unlock',
      title: 'Garden Unlocked',
    })),
  ]),
  [GLOBAL_DIALOG_IDS.CONFIRMATION]: Object.freeze([
    scenario('default', 'Default', () => ({
      cancelLabel: 'Keep brewing',
      confirmLabel: 'Reset cauldron',
      message: 'Reset this cauldron and return its ingredients?',
      rows: [{ id: 'cost', label: 'Mana returned', value: '24' }],
      title: 'Reset Cauldron?',
    })),
    scenario('pending', 'Pending', () => ({
      cancelEnabled: false,
      confirmEnabled: false,
      confirmLabel: 'Saving',
      message: 'Updating your account settings.',
      pending: true,
      status: 'Please wait',
      title: 'Saving Changes',
    })),
  ]),
});

export default UI_EDITOR_RETAINED_DIALOG_IDS.map((dialogId) =>
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: resolveDialogChildWidgetIds(dialogId),
    folderPath: [resolveDialogFolder(dialogId)],
    id: `dialog.${dialogId}`,
    kind: 'dialog',
    label: DIALOG_LABELS[dialogId] ?? titleCaseIdentifier(dialogId),
    properties: [
      { label: 'Runtime id', value: dialogId },
      { label: 'Data source', value: 'Deterministic UI Lab fixture' },
    ],
    scenarios: createDialogScenarios(dialogId),
    sectionId: DIALOG_SECTION,
    usages: [
      {
        label: 'Production retained dialog',
        source: resolveDialogSource(dialogId),
      },
    ],
  }),
);

function resolveDialogChildWidgetIds(dialogId) {
  if (dialogId === 'workshop.worldChat') {
    return ['compound.dialog-frame', WORLD_CHAT_ROW_WIDGET_ID];
  }
  return INVENTORY_CHOICE_DIALOG_HIERARCHY[dialogId]
    ? ['compound.dialog-frame', 'compound.inventory-choice-row']
    : ['compound.dialog-frame'];
}

function scenario(id, label, fixture) {
  return Object.freeze({ fixture, id, label });
}

// Keep the production family inventory in the same order as the editor. This
// assertion fails at module load if a retained page dialog is added without a
// corresponding editor entry.
for (const dialogId of Object.values(DIALOG_IDS_BY_PAGE).flat()) {
  if (!UI_EDITOR_RETAINED_DIALOG_IDS.includes(dialogId)) {
    throw new Error(`Retained dialog is missing from the UI editor: ${dialogId}`);
  }
}
