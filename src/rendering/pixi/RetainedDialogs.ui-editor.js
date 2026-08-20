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
import { DEFAULT_PIXI_THEME_SNAPSHOT } from './theme/PixiThemeTokens.js';
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
  PRESTIGE_INFO_DIALOG_ID,
  PrestigeInfoDialogPixi,
} from './pages/prestige/PrestigeDialogPixi.js';
import {
  GUILD_DIALOG_IDS,
  GuildDialogPixi,
  GuildRequestStackDialogPixi,
} from './pages/guild/GuildDialogPixi.js';
import { RootRunInventoryChoiceDialogPixi } from './pages/shared/RootRunInventoryChoiceDialogPixi.js';
import {
  SHOP_DIALOG_IDS,
  WORKSHOP_SUMMON_INFO_DIALOG_ID,
  WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID,
  ShopDialogPixi,
} from './pages/shop/ShopDialogPixi.js';
import { WorkshopDialogPixi } from './pages/workshop/WorkshopDialogPixi.js';

const DIALOG_SECTION = 'dialogs';
const DIALOG_ASSET_PREFIXES = Object.freeze([
  'source:assets/avatars/',
  'source:assets/characters/',
  'source:assets/guild/',
  'source:assets/icons/',
  'source:assets/items/',
  'source:assets/ui/',
  'public:ui/',
]);

const GLOBAL_DIALOG_FACTORIES = new Map(createGlobalDialogFactories());
const GLOBAL_DIALOG_IDS_IN_ORDER = Object.freeze([
  GLOBAL_DIALOG_IDS.SETTINGS,
  GLOBAL_DIALOG_IDS.FEEDBACK,
  GLOBAL_DIALOG_IDS.CHAT_REPORT,
  GLOBAL_DIALOG_IDS.LEVEL,
  GLOBAL_DIALOG_IDS.INBOX,
  GLOBAL_DIALOG_IDS.PLAYER,
  GLOBAL_DIALOG_IDS.ALLIANCE,
  GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
  GLOBAL_DIALOG_IDS.CONFIRMATION,
]);

const INVENTORY_CHOICE_DIALOG_HIERARCHY = Object.freeze({
  'workshop.summonInfo': Object.freeze({
    childWidgetIds: Object.freeze([
      'primitive.settings-slider',
      'primitive.settings-toggle',
    ]),
    rowLabel: 'SummonSeedPreferenceRow',
    rowWidgetId: 'compound.summon-seed-preference-row',
  }),
  'workshop.bag': Object.freeze({
    rowLabel: 'BagItemRow:InventoryChoiceRow',
    rowsProperty: 'rows',
    tabbed: true,
  }),
  'brewing.herbs': Object.freeze({
    rowLabel: 'ChooseHerbRow:InventoryChoiceRow',
  }),
  'garden.seed': Object.freeze({
    rowLabel: 'ChooseSeedRow:InventoryChoiceRow',
  }),
});

const WORLD_CHAT_ROW_WIDGET_ID = 'compound.world-chat-message-row';
const INBOX_MAIL_WIDGET_ID = 'compound.inbox-mail-widget';
const PLAYER_PROFILE_WIDGET_ID = 'compound.player-profile';
const RESOURCE_LABEL_WIDGET_ID = 'primitive.resource-label';
const STAR_LEVEL_WIDGET_ID = 'primitive.star-level-label';
const WORLD_EVENT_QUEST_ROW_WIDGET_ID = 'compound.world-event-quest-row';
const ALLIANCE_DIRECTORY_ROW_WIDGET_ID = 'compound.alliance-directory-row';
const ALLIANCE_MEMBER_ROW_WIDGET_ID = 'compound.alliance-member-row';
const ALLIANCE_QUEST_ROW_WIDGET_ID = 'compound.alliance-quest-row';

const DIALOG_CHILD_WIDGET_IDS = Object.freeze({
  [GLOBAL_DIALOG_IDS.SETTINGS]: Object.freeze([
    'tab-button',
    'primitive.text-field',
    'primitive.settings-slider',
    'compound.device-preferences',
    'compound.device-identity-footer',
    PLAYER_PROFILE_WIDGET_ID,
    'compound.player-selectable-profile',
    'text-button',
  ]),
  [GLOBAL_DIALOG_IDS.FEEDBACK]: Object.freeze([
    'tab-button',
    'primitive.text-field',
    'text-button',
  ]),
  [GLOBAL_DIALOG_IDS.CHAT_REPORT]: Object.freeze([
    'primitive.text-field',
    'text-button',
  ]),
  [GLOBAL_DIALOG_IDS.LEVEL]: Object.freeze(['text-button']),
  [GLOBAL_DIALOG_IDS.ALLIANCE]: Object.freeze([
    'compound.workshop-dialog-row',
    ALLIANCE_MEMBER_ROW_WIDGET_ID,
    'text-button',
  ]),
  [GLOBAL_DIALOG_IDS.ANNOUNCEMENT]: Object.freeze([
    'compound.feature-unlock-announcement-item',
    STAR_LEVEL_WIDGET_ID,
  ]),
  [GLOBAL_DIALOG_IDS.CONFIRMATION]: Object.freeze(['text-button']),
  'workshop.bag': Object.freeze([
    'compound.inventory-choice-row',
    'tab-button',
  ]),
  'workshop.stats': Object.freeze(['compound.workshop-dialog-row']),
  'workshop.inbox': Object.freeze(['compound.workshop-dialog-row']),
  'workshop.alliance': Object.freeze([
    'compound.alliance-directory-row',
    'compound.alliance-member-row',
    ALLIANCE_QUEST_ROW_WIDGET_ID,
    'primitive.guild-color-swatch',
    'primitive.resource-label',
    'primitive.text-field',
    'tab-button',
    'text-button',
  ]),
  'workshop.leaderboard': Object.freeze([
    'compound.leaderboard-row',
    'compound.player-profile',
    'primitive.star-level-label',
    'primitive.resource-label',
    'tab-button',
  ]),
  'workshop.discoveries': Object.freeze([
    'compound.potion-discovery-page',
    'text-button',
  ]),
  'workshop.personalTasks': Object.freeze([
    'compound.workshop-dialog-row',
    'primitive.progress-bar',
    'text-button',
  ]),
  'workshop.worldEventDonate': Object.freeze([
    'compound.inventory-choice-row',
    'compound.dialog-summary-row',
    'primitive.settings-slider',
    'text-button',
  ]),
  'garden.cancel': Object.freeze(['text-button']),
  'garden.swap': Object.freeze(['text-button']),
  [PRESTIGE_INFO_DIALOG_ID]: Object.freeze([]),
  'brewing.recipes': Object.freeze([
    'compound.brewing-recipe-card',
    'compound.brewing-recipe-ingredient-row',
    'text-button',
  ]),
  'brewing.recipe-choice': Object.freeze(['text-button']),
  'brewing.automation-settings': Object.freeze([
    'compound.brewing-automation-toggle',
  ]),
  'shop.stall': Object.freeze([
    'compound.dialog-summary-row',
    'primitive.settings-slider',
    'text-button',
  ]),
  'shop.ledger': Object.freeze(['compound.market-ledger-row']),
  'shop.request': Object.freeze([
    'compound.dialog-field',
    'compound.amount-selector',
    'text-button',
  ]),
  'shop.listing': Object.freeze([
    'compound.dialog-field',
    'compound.amount-selector',
    'text-button',
  ]),
  'shop.market': Object.freeze([
    'compound.dialog-field',
    'compound.player-market-offer-row',
    'tab-button',
    'text-button',
  ]),
  'shop.buy': Object.freeze([
    'compound.player-profile',
    'compound.inventory-choice-row',
    'primitive.resource-label',
    'primitive.settings-slider',
    'text-button',
  ]),
  'shop.tradeHistory': Object.freeze(['compound.market-compact-row']),
  'shop.support': Object.freeze([]),
  'guild.charter': Object.freeze([
    'compound.guild-profile-field',
    'primitive.guild-color-swatch',
    'text-button',
  ]),
  'guild.settings': Object.freeze([
    'compound.guild-profile-field',
    'primitive.guild-color-swatch',
    'text-button',
  ]),
  'guild.request': Object.freeze([
    'compound.guild-quest-detail',
    'compound.guild-quest-detail-line',
    'text-button',
  ]),
  'guild.requestStack': Object.freeze([
    'compound.guild-quest-detail',
    'compound.guild-quest-detail-line',
    'text-button',
  ]),
  'guild.adventurer': Object.freeze([
    'compound.guild-detail-row',
    'tab-button',
    'text-button',
  ]),
  'guild.applicant': Object.freeze([
    'compound.guild-detail-row',
    'tab-button',
    'text-button',
  ]),
});

const DIALOG_LABELS = Object.freeze({
  'global.settings': 'Settings',
  'global.feedback': 'Feedback',
  'global.chatReport': 'Report',
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
  'workshop.alliance': 'Trade Alliance',
  'workshop.leaderboard': 'Leaderboard',
  'workshop.discoveries': 'Discoveries',
  'workshop.personalTasks': 'Daily Tasks',
  'workshop.worldEvent': 'World Event',
  'workshop.worldEventDonate': 'Donate',
  'workshop.worldChat': 'World Chat',
  'garden.seed': 'Choose Seed',
  'garden.cancel': 'Cancel Garden Progress',
  'garden.swap': 'Swap Garden Seed',
  [PRESTIGE_INFO_DIALOG_ID]: 'Info',
  'brewing.herbs': 'Choose Herb',
  'brewing.recipes': 'Recipe Book',
  'brewing.recipe-choice': 'Selected Recipe',
  'brewing.automation-settings': 'Cauldron Settings',
  'shop.stall': 'Load Stall',
  'shop.ledger': 'Market Ledger',
  'shop.request': 'Create Request',
  'shop.listing': 'Sell Listing',
  'shop.market': 'Player Market',
  'shop.buy': 'Buy Offer',
  'shop.tradeHistory': 'Trade History',
  'shop.support': 'Support',
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
  if (dialogId === 'workshop.worldEvent') {
    return [
      scenario('quests', 'Quests', () => createWorldEventDialogFixture(0)),
      scenario(
        'unavailable',
        'Unavailable donations',
        () => createWorldEventDialogFixture(1),
      ),
      scenario(
        'leaderboard',
        'Leaderboard',
        () => createWorldEventDialogFixture(2),
      ),
      scenario(
        'rewards',
        'Rewards',
        () => createWorldEventDialogFixture(3),
      ),
    ].map((entry) => ({
      ...entry,
      mount: (context, fixture) =>
        mountRetainedDialog(context, dialogId, fixture),
    }));
  }
  if (dialogId === 'workshop.alliance') {
    return [
      scenario('owned', 'Owned alliance', () => createUiEditorDialogFixture(dialogId, 0)),
      scenario('browse', 'Browse alliances', () => createUiEditorDialogFixture(dialogId, 1)),
      scenario('create', 'Create alliance', () => createUiEditorDialogFixture(dialogId, 2)),
    ].map((entry) => ({
      ...entry,
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
  const model = instrumentFixture(fixtureFactory?.() ?? {}, context, dialogId);

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
  if (dialogId === 'workshop.worldEvent') {
    return createWorldEventDialogFixture(variantIndex);
  }
  if (dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID) {
    return createSummonInfoDialogFixture(variantIndex);
  }
  if (dialogId === 'workshop.discoveries') {
    return createDiscoveriesDialogFixture(variantIndex);
  }
  if (dialogId === WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID) {
    return createDialogViewModel(
      dialogId,
      variantIndex === 0 ? 'a' : 'b',
    );
  }
  if (dialogId === 'workshop.alliance') {
    if (variantIndex === 0) {
      return createDialogViewModel(dialogId, 'a');
    }
    return variantIndex === 1
      ? createTradeAllianceDirectoryFixture()
      : createTradeAllianceCreateFixture();
  }
  if (dialogId === 'workshop.leaderboard') {
    return createLeaderboardDialogFixture(variantIndex);
  }
  if (dialogId === SHOP_DIALOG_IDS.SUPPORT) {
    return {
      title: 'Support',
      message:
        'Thank you for trying to support the project but the transactions are not yet available <3',
    };
  }
  return normalizeUiEditorDialogFixture(
    dialogId,
    createDialogViewModel(dialogId, variantIndex === 0 ? 'a' : 'b'),
  );
}

function createSummonInfoDialogFixture(variantIndex = 0) {
  const alternate = variantIndex > 0;
  const sliderOptions = [
    { value: 'none', tone: 'root' },
    { value: 'low', tone: 'red' },
    { value: 'medium', tone: 'yellow' },
    { value: 'high', tone: 'green' },
  ];
  const seeds = alternate
    ? [
        ['sageSeed', 'Sage Seed', 'High', 'high', 'green', '58% Chance'],
        ['mintSeed', 'Mint Seed', 'Low', 'low', 'red', '24% Chance'],
      ]
    : [
        ['sageSeed', 'Sage Seed', 'Medium', 'medium', 'yellow', '46% Chance'],
        ['mintSeed', 'Mint Seed', 'Low', 'low', 'red', '23% Chance'],
        ['briarSeed', 'Briar Seed', 'None', 'none', 'text', '0% Chance'],
        ['lavenderSeed', 'Lavender Seed', 'High', 'high', 'green', '31% Chance'],
      ];

  return {
    title: 'Summoning Seeds',
    autoSummonUnlocked: true,
    summaryRows: [
      {
        id: 'auto',
        label: 'Auto Summon',
        value: '',
        icon: { kind: 'automation' },
        iconLeading: true,
      },
      {
        id: 'reserve',
        label: 'Keep Mana Above',
        value: alternate ? '250' : '0',
        valueIconResourceKey: 'mana',
      },
    ],
    settingsToggle: {
      value: !alternate,
      enabled: true,
      onChange: () => true,
    },
    manaSlider: {
      mode: 'range',
      min: 0,
      max: 5_000,
      step: 1,
      value: alternate ? 250 : 0,
      tone: 'blue',
      enabled: true,
      onChange: () => true,
    },
    items: seeds.map(([id, label, value, preference, valueTone, detail]) => ({
      id,
      label,
      detail,
      value,
      valueTone,
      itemKind: 'seed',
      itemKey: id,
      dropSlider: {
        mode: 'milestones',
        value: preference,
        options: sliderOptions,
        enabled: true,
        onChange: () => true,
      },
    })),
  };
}

function createDiscoveriesDialogFixture(variantIndex = 0) {
  const discovered = [
    {
      discovered: true,
      discoveredAtLabel: 'Jan 2, 2026',
      discovererSemanticId: 'workshop.discoveries.discoverer.ada',
      discovererUsername: 'Ada',
      durationLabel: '75s Brew',
      id: 'potion:silverleafQuiet',
      ingredients: [
        { key: 'mintHerb', label: 'Mint', quantity: 1 },
        { key: 'glowcapHerb', label: 'Glowcap', quantity: 1 },
        { key: 'moonflowerHerb', label: 'Moonflower', quantity: 1 },
      ],
      label: 'Silverleaf Quiet',
      manaLabel: '34 Mana',
      onDiscovererActivate: () => true,
      potionKey: 'silverleafQuiet',
      royaltyLabel: '12.5 Coin Royalty',
      type: 'potionDiscovery',
    },
  ];
  const undiscovered = Array.from(
    { length: variantIndex === 0 ? 1 : 4 },
    (_, index) => ({
      discovered: false,
      id: `potion:unknown-${index}`,
      potionKey: `unknown-${index}`,
      type: 'potionDiscovery',
    }),
  );
  return {
    title: 'Discoveries',
    rows: [...discovered, ...undiscovered],
  };
}

function createLeaderboardDialogFixture(variantIndex = 0) {
  const alliance = variantIndex === 1;
  return {
    title: 'Leaderboard',
    rowWidget: 'leaderboard',
    selectedTabId: alliance ? 'alliance' : 'singlePlayer',
    selectedPeriodId: 'allTime',
    emptyLabel: alliance ? 'No alliances yet' : 'No players yet',
    tabs: [
      { id: 'singlePlayer', label: 'Players', selected: !alliance },
      { id: 'alliance', label: 'Alliances', selected: alliance },
    ],
    periodTabs: [
      { id: 'daily', label: 'Daily' },
      { id: 'weekly', label: 'Weekly' },
      { id: 'monthly', label: 'Monthly' },
      { id: 'allTime', label: 'All Time', selected: true },
    ],
    rows: alliance
      ? [
          {
            id: 'night-owls',
            type: 'leaderboardAlliance',
            rank: 1,
            name: 'Night Owls',
            allianceTag: 'OWL',
            allianceTagColor: 'violet',
            memberCount: 34,
            totalCoinLabel: '13.9m',
            onActivate: () => true,
          },
          {
            id: 'sun-circle',
            type: 'leaderboardAlliance',
            rank: 2,
            name: 'Sun Circle',
            allianceTag: 'SUN',
            allianceTagColor: 'amber',
            memberCount: 28,
            totalCoinLabel: '707k',
            onActivate: () => true,
          },
        ]
      : [
          ['Elara', 'mira', 'sun', 'OWL', 'violet', 48, 3, '13.9m'],
          ['Trix', 'juniper', 'emerald', 'SUN', 'amber', 32, 1, '707k'],
          ['Gandalf The Green', 'elara', 'classic', 'DBP', 'green', 17, 0, '613k'],
          ['StepWizzard', 'rowan', 'violet', 'OWL', 'violet', 14, 2, '93.3k'],
          ['Squeak69', 'mira', 'bronze', 'SUN', 'amber', 12, 0, '57.8k'],
        ].map(([username, character, frame, allianceTag, allianceTagColor, playerLevel, prestigeCount, totalCoinLabel], index) => ({
          id: `leaderboard-player-${index}`,
          type: 'leaderboardPlayer',
          rank: index + 1,
          username,
          character,
          frame,
          allianceTag,
          allianceTagColor,
          playerLevel,
          prestigeCount,
          current: index === 3,
          totalCoinLabel,
          onActivate: () => true,
        })),
  };
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

function createTradeAllianceDirectoryFixture() {
  const members = [
    ['Mira', 'mira', 'Trade Master', 'Lv 24'],
    ['Juniper', 'juniper', 'Quartermaster', 'Lv 18'],
    ['Rowan', 'rowan', 'Trader', 'Lv 12'],
  ].map(([username, character, roleLabel, levelLabel], index) => ({
    id: `directory-member-${index}`,
    username,
    character,
    roleLabel,
    levelLabel,
    onActivate: () => true,
  }));
  return {
    title: 'Trade Alliance',
    directory: true,
    status: '',
    rows: [
      {
        id: 'night-owls',
        type: 'allianceDirectory',
        name: 'Night Owls',
        tag: 'OWL',
        tagColor: 'violet',
        totalIncomeLabel: '12.4k',
        memberCount: members.length,
        memberCapacity: 50,
        expanded: true,
        members,
        onActivate: () => true,
        action: {
          label: 'Apply',
          variant: 'green',
          enabled: true,
          onActivate: () => true,
        },
      },
    ],
  };
}

function createTradeAllianceCreateFixture() {
  return {
    title: 'Trade Alliance',
    directory: false,
    selectedTabId: 'create',
    tabs: [
      { id: 'browse', label: 'Browse', selected: false, onSelect: () => true },
      { id: 'create', label: 'Create', selected: true, onSelect: () => true },
    ],
    settings: {
      allianceId: 'new-alliance',
      mode: 'create',
      name: '',
      tag: '',
      tagColor: 'ink',
      description: '',
      joinMode: 'apply',
      editable: true,
      onSave: async () => ({ ok: true }),
    },
    rows: [],
  };
}

function createWorldChatDialogFixture(variantIndex) {
  const alternate = variantIndex > 0;
  return {
    composer: {
      enabled: true,
      maxLength: 160,
      placeholder: 'Message',
    },
    onSubmit: async () => ({ ok: true }),
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
        frame: alternate ? 'emerald' : 'violet',
        id: `world-chat-player-${variantIndex}`,
        isOwn: !alternate,
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
    title: 'World Chat',
  };
}

function createWorldEventDialogFixture(variantIndex) {
  if (variantIndex === 3) {
    return {
      header: {
        artAssetId: 'source:assets/world-events/political-change.png',
        body:
          'Bells ring from towers that disagreed yesterday.\nNew clerks ask every workshop to prove the town still moves.',
        headline: 'New King Crowned',
        meta: '1,302,270 points · 5h',
      },
      rowWidget: 'worldEventReward',
      rows: [
        {
          id: 'reward:1',
          type: 'worldEventReward',
          rankLabel: 'Rank 1',
          rewards: [
            { resourceKey: 'emerald', amountLabel: '5' },
            { resourceKey: 'crystal', amountLabel: '10' },
          ],
        },
        {
          id: 'reward:2',
          type: 'worldEventReward',
          rankLabel: 'Rank 2',
          rewards: [
            { resourceKey: 'emerald', amountLabel: '3' },
            { resourceKey: 'crystal', amountLabel: '7' },
          ],
        },
        {
          id: 'reward:101+',
          type: 'worldEventReward',
          rankLabel: 'Rank 101+ Qualified',
          rewards: [{ resourceKey: 'crystal', amountLabel: '1' }],
        },
      ],
      selectedTabId: 'rewards',
      status: 'Leaderboard Rewards: 2k points to qualify',
      tabs: [
        { id: 'tasks', label: 'Quests' },
        { id: 'leaderboard', label: 'Leaderboard' },
        { id: 'rewards', label: 'Rewards', selected: true },
      ],
      title: 'World Event',
    };
  }
  if (variantIndex === 2) {
    return {
      header: {
        artAssetId: 'source:assets/world-events/political-change.png',
        body:
          'Bells ring from towers that disagreed yesterday.\nNew clerks ask every workshop to prove the town still moves.',
        headline: 'New King Crowned',
        meta: '1,302,270 points · 5h',
      },
      rowWidget: 'leaderboard',
      rows: [
        ['c00p', 'mira', 'violet', 'DBP', 'violet', 30, 3, '1,302,270'],
        ['ftwizard', 'elara', 'sun', 'DBP', 'amber', 30, 2, '1,162,530'],
        ['Azalea', 'juniper', 'emerald', 'SW', 'green', 15, 1, '1,129,463'],
        ['ShaeZard', 'rowan', 'classic', '', 'ink', 21, 0, '32,821'],
        ['Gandalf The Green', 'bramble', 'classic', '', 'ink', 17, 0, '2,391'],
      ].map((entry, index) => ({
        id: `world-event-player-${index}`,
        type: 'leaderboardPlayer',
        rank: index + 1,
        username: entry[0],
        character: entry[1],
        frame: entry[2],
        allianceTag: entry[3],
        allianceTagColor: entry[4],
        playerLevel: entry[5],
        prestigeCount: entry[6],
        current: index === 0,
        totalMetric: 'points',
        totalLabel: entry[7],
      })),
      selectedTabId: 'leaderboard',
      tabs: [
        { id: 'tasks', label: 'Quests' },
        { id: 'leaderboard', label: 'Leaderboard', selected: true },
        { id: 'rewards', label: 'Rewards' },
      ],
      title: 'World Event',
    };
  }
  const alternate = variantIndex > 0;
  const donationOptions = [
    {
      actionLabel: alternate ? 'Unavailable' : 'Donate',
      enabled: !alternate,
      id: 'calming-draught',
      itemKey: 'calmingDraught',
      itemKind: 'potion',
      label: 'Calming Draught',
      ...(alternate ? {} : { onActivate: () => true }),
      pointsEachLabel: '120 points each',
      resourceKey: 'potion',
      totalLabel: '0 points total',
    },
    {
      actionLabel: alternate ? 'Unavailable' : 'Donate',
      enabled: !alternate,
      id: 'valerian-rest',
      itemKey: 'valerianRest',
      itemKind: 'potion',
      label: 'Valerian Rest',
      ...(alternate ? {} : { onActivate: () => true }),
      pointsEachLabel: '320 points each',
      resourceKey: 'potion',
      totalLabel: '0 points total',
    },
  ];

  return {
    header: {
      artAssetId: 'source:assets/world-events/political-change.png',
      body: 'Bells ring from towers that disagreed yesterday.\nNew clerks ask every workshop to prove the town still moves.',
      headline: 'New King Crowned',
      meta: '0 points · 4d 2h',
    },
    rowWidget: 'worldEventQuest',
    rows: [
      {
        completed: alternate,
        description:
          'The coronation bells have people cheering, arguing, and fainting in the same street. Donate calming draughts so the crowd stays upright long enough for the heralds to finish.',
        donationOptions,
        id: 'quest:quiet-the-crowd',
        pointsLabel: alternate ? '1,240 points' : '0 points',
        title: 'Quiet The Crowd',
      },
      {
        completed: false,
        description:
          'The new seal is crossing town in a box that everyone wants to touch. Donate warding potions so the seal reaches the hall without a new scandal.',
        donationOptions: donationOptions.slice(0, 1).map((option) => ({
          ...option,
          id: 'briar-ward',
          itemKey: 'briarWard',
          label: 'Briar Ward',
          pointsEachLabel: '180 points each',
        })),
        id: 'quest:protect-the-seal',
        pointsLabel: '0 points',
        title: 'Protect The Seal',
      },
    ],
    selectedTabId: 'tasks',
    tabs: [
      { id: 'tasks', label: 'Quests', selected: true },
      { id: 'leaderboard', label: 'Leaderboard' },
      { id: 'rewards', label: 'Rewards' },
    ],
    title: 'World Event',
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
    if (
      dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID ||
      dialogId === WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID
    ) {
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

  if (dialogId === PRESTIGE_INFO_DIALOG_ID) {
    return new PrestigeInfoDialogPixi({
      ...common,
      semanticRegistry,
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
  if (dialogId === GLOBAL_DIALOG_IDS.ANNOUNCEMENT) {
    return [
      ...(dialog.unlockItems?.collection?.getWidgets?.() ?? []).map((item, index) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [item.root],
          id: `${dialogId}:unlock:${item.data?.id ?? index}`,
          label: 'FeatureUnlock:FeatureUnlockAnnouncementItem',
          libraryEntryId: 'compound.feature-unlock-announcement-item',
          primary: item.root,
          type: 'widget',
        }),
      ),
      ...(dialog.researchStars?.visible
        ? [
            createUiEditorPixiHierarchyComponent({
              displayObjects: [dialog.researchStars],
              id: `${dialogId}:research-stars`,
              label: 'ResearchRank:PixiStarLevelLabel',
              libraryEntryId: STAR_LEVEL_WIDGET_ID,
              primary: dialog.researchStars,
              type: 'widget',
            }),
          ]
        : []),
    ];
  }

  if (dialogId === GLOBAL_DIALOG_IDS.ALLIANCE) {
    return [
      ...(dialog.summaryRows?.getWidgets?.() ?? []).map((row, index) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [row.root],
          id: `${dialogId}:summary:${row.model?.id ?? index}`,
          label: 'TradeInfo:WorkshopDialogRow',
          libraryEntryId: 'compound.workshop-dialog-row',
          primary: row.root,
          type: 'widget',
        }),
      ),
      ...(dialog.memberRows?.getWidgets?.() ?? []).map((row, index) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [row.root],
          id: `${dialogId}:member:${row.model?.memberIdentity ?? index}`,
          label: 'AllianceMember:AllianceMemberRow',
          libraryEntryId: ALLIANCE_MEMBER_ROW_WIDGET_ID,
          primary: row.root,
          type: 'widget',
        }),
      ),
    ];
  }

  if (dialogId === GLOBAL_DIALOG_IDS.PLAYER) {
    return [
      createUiEditorPixiHierarchyComponent({
        displayObjects: [dialog.profileWidget],
        id: `${dialogId}:profile`,
        label: 'PlayerProfile:PlayerProfileWidget',
        libraryEntryId: PLAYER_PROFILE_WIDGET_ID,
        primary: dialog.profileWidget,
        type: 'widget',
      }),
      createUiEditorPixiHierarchyComponent({
        displayObjects: [dialog.prestigeStars],
        id: `${dialogId}:prestige-stars`,
        label: 'PrestigeStars:PixiStarLevelLabel',
        libraryEntryId: STAR_LEVEL_WIDGET_ID,
        primary: dialog.prestigeStars,
        type: 'widget',
      }),
      createUiEditorPixiHierarchyComponent({
        displayObjects: [dialog.totalCoinValue],
        id: `${dialogId}:total-coin`,
        label: 'TotalCoin:PixiResourceLabel',
        libraryEntryId: RESOURCE_LABEL_WIDGET_ID,
        primary: dialog.totalCoinValue,
        type: 'widget',
      }),
    ];
  }

  if (dialogId === GLOBAL_DIALOG_IDS.INBOX) {
    return (dialog.mailRows?.getWidgets?.() ?? []).map((row, index) =>
      createUiEditorPixiHierarchyComponent({
        displayObjects: [row.root],
        id: `${dialogId}:mail:${row.data?.mailKey ?? index}`,
        label: 'InboxMail:InboxMailWidget',
        libraryEntryId: INBOX_MAIL_WIDGET_ID,
        primary: row.root,
        type: 'widget',
      }),
    );
  }

  if (dialogId === 'workshop.worldChat') {
    return [
      ...(dialog.rows?.getWidgets?.() ?? []).map((row, index) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [row.root],
          id: `${dialogId}:row:${row.model?.id ?? index}`,
          label: 'ChatMessageRow:WorldChatMessageRow',
          libraryEntryId: WORLD_CHAT_ROW_WIDGET_ID,
          primary: row.root,
          type: 'widget',
        }),
      ),
      createUiEditorPixiHierarchyComponent({
        displayObjects: [dialog.composerField],
        id: `${dialogId}:composer`,
        label: 'Composer:PixiTextField',
        libraryEntryId: 'primitive.text-field',
        primary: dialog.composerField,
        type: 'widget',
      }),
      createUiEditorPixiHierarchyComponent({
        displayObjects: [dialog.composerSubmit?.root],
        id: `${dialogId}:send`,
        label: 'Send:PixiTextButton',
        libraryEntryId: 'text-button',
        primary: dialog.composerSubmit?.root,
        type: 'widget',
      }),
    ];
  }

  if (dialogId === 'workshop.worldEvent') {
    const rowWidget = dialog.viewModel?.rowWidget;
    const leaderboard = rowWidget === 'leaderboard';
    const rewards = rowWidget === 'worldEventReward';
    const rows = leaderboard
      ? dialog.worldEventLeaderboardRows?.getWidgets?.() ?? []
      : rewards
        ? dialog.worldEventRewardRows?.getWidgets?.() ?? []
        : dialog.worldEventRows?.getWidgets?.() ?? [];
    return rows.map((row, index) =>
      createUiEditorPixiHierarchyComponent({
        displayObjects: [row.root],
        id: `${dialogId}:${leaderboard ? 'leaderboard' : rewards ? 'reward' : 'quest'}:${
          row.model?.id ?? index
        }`,
        label: leaderboard
          ? 'WorldEventLeaderboard:LeaderboardRowPixi'
          : rewards
            ? 'WorldEventReward:WorldEventRewardRow'
            : 'WorldEventQuest:WorldEventQuestRow',
        libraryEntryId: leaderboard
          ? 'compound.leaderboard-row'
          : rewards
            ? 'compound.world-event-reward-row'
            : WORLD_EVENT_QUEST_ROW_WIDGET_ID,
        primary: row.root,
        type: 'widget',
      }),
    );
  }

  if (dialogId === 'workshop.alliance') {
    const directoryRows = dialog.allianceRows?.getWidgets?.() ?? [];
    const ownedMemberRows = dialog.allianceMemberRows?.getWidgets?.() ?? [];
    const directoryMemberRows = directoryRows.flatMap((row) =>
      Array.from(row.memberWidgets?.values?.() ?? []),
    );
    const settingsPane = dialog.allianceSettingsPane;
    const settingsFields = Array.from(settingsPane?.fields?.entries?.() ?? [])
      .filter(([, field]) => field.visible)
      .map(([key, field]) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [field],
          id: `${dialogId}:profile:${key}`,
          label: `${titleCaseIdentifier(key)}:PixiTextField`,
          libraryEntryId: 'primitive.text-field',
          primary: field,
          type: 'widget',
        }),
      );
    const settingsSwatches = (settingsPane?.swatches ?? [])
      .filter((swatch) => swatch.root.visible)
      .map((swatch) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [swatch.root],
          id: `${dialogId}:profile:tag-color:${swatch.colorId}`,
          label: `${titleCaseIdentifier(swatch.colorId)}:GuildColorSwatch`,
          libraryEntryId: 'primitive.guild-color-swatch',
          primary: swatch.root,
          type: 'widget',
        }),
      );
    const settingsActions = [
      ['save', settingsPane?.saveButton],
      ['disband', settingsPane?.disbandButton],
    ]
      .filter(([, button]) => button?.root?.visible)
      .map(([key, button]) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [button.root],
          id: `${dialogId}:profile:${key}`,
          label: `${titleCaseIdentifier(key)}:RetainedButton`,
          libraryEntryId: 'text-button',
          primary: button.root,
          type: 'widget',
        }),
      );
    return [
      ...directoryRows.map((row, index) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [row.root],
          id: `${dialogId}:directory:${row.model?.id ?? index}`,
          label: 'AllianceDirectory:AllianceDirectoryRow',
          libraryEntryId: ALLIANCE_DIRECTORY_ROW_WIDGET_ID,
          primary: row.root,
          type: 'widget',
        }),
      ),
      ...[...ownedMemberRows, ...directoryMemberRows].map((row, index) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [row.root],
          id: `${dialogId}:member:${row.model?.id ?? index}`,
          label: 'AllianceMember:AllianceMemberRow',
          libraryEntryId: ALLIANCE_MEMBER_ROW_WIDGET_ID,
          primary: row.root,
          type: 'widget',
        }),
      ),
      ...settingsFields,
      ...settingsSwatches,
      ...settingsActions,
    ];
  }

  if (dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID) {
    const controls = [
      ['auto-toggle', 'AutoSummon:RootRunSettingsTogglePixi', 'primitive.settings-toggle', dialog.settingsToggle],
      ['mana-reserve', 'ManaReserve:RootRunSettingsSliderPixi', 'primitive.settings-slider', dialog.manaSettingsSlider],
      ['drop-rate', 'DropRate:RootRunSettingsSliderPixi', 'primitive.settings-slider', dialog.dropSettingsSlider],
    ];
    return [
      ...(dialog.list?.rows?.getWidgets?.() ?? []).map((row, index) =>
        createUiEditorPixiHierarchyComponent({
          displayObjects: [row.root],
          id: `${dialogId}:row:${row.key ?? index}`,
          label: 'SummonSeedPreferenceRow',
          libraryEntryId: 'compound.summon-seed-preference-row',
          primary: row.root,
          type: 'widget',
        }),
      ),
      ...controls
        .filter(([, , , control]) => control?.visible)
        .map(([id, label, libraryEntryId, control]) =>
          createUiEditorPixiHierarchyComponent({
            displayObjects: [control],
            id: `${dialogId}:${id}`,
            label,
            libraryEntryId,
            primary: control,
            type: 'widget',
          }),
        ),
    ];
  }

  const inventoryChoiceConfig = INVENTORY_CHOICE_DIALOG_HIERARCHY[dialogId];
  if (!inventoryChoiceConfig) {
    return [];
  }

  const rows = inventoryChoiceConfig.rowsProperty
    ? dialog[inventoryChoiceConfig.rowsProperty]?.getWidgets?.() ?? []
    : dialog.list?.rows?.getWidgets?.() ?? [];

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
    return dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID ||
      dialogId === WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID
      ? 'src/rendering/pixi/pages/shop/ShopDialogPixi.js'
      : 'src/rendering/pixi/pages/workshop/WorkshopDialogPixi.js';
  }
  if (dialogId.startsWith('garden.')) {
    return 'src/rendering/pixi/pages/garden/GardenDialogPixi.js';
  }
  if (dialogId.startsWith('prestige.')) {
    return 'src/rendering/pixi/pages/prestige/PrestigeDialogPixi.js';
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
        accountStatus: 'mira@example.com',
        connectLabel: 'Disconnect Account',
        userId: 'c5b53a9f2e6484af',
        username: 'Mira',
        version: '0.9.0',
      },
      preferences: { haptics: true, music: 72, sfx: 58, theme: false },
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
      feedback: {
        kind: 'bug',
        value: 'The collect button stopped responding.',
      },
      kind: 'bug',
      tabId: 'report',
    })),
  ]),
  [GLOBAL_DIALOG_IDS.CHAT_REPORT]: Object.freeze([
    scenario('empty', 'Empty report', () => ({
      focusInput: false,
      message: {
        id: 'world-chat-player',
        username: 'Mira',
      },
      title: 'Report',
      value: '',
    })),
    scenario('draft', 'Report draft', () => ({
      focusInput: false,
      message: {
        id: 'world-chat-player',
        username: 'Mira',
      },
      title: 'Report',
      value: 'This message is bothering other players.',
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
        allianceTagColor: 'green',
        character: 'mira',
        playerLevel: 12,
        prestigeCount: 2,
        totalProducedCoin: 128450,
        totalBrewedPotions: 86,
        totalHarvestedHerbs: 240,
        connected: true,
        lastSeenAtMs: 1_690_000_000_000,
        totalPlayTimeSeconds: 45_000,
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
        joinMode: 'apply',
        name: 'Fellowship Of Patient Merchants',
        notice: 'Weekly goal: support every active member.',
        seasonIncome: 84520,
        tag: 'NIGHT',
      },
      members: [
        {
          memberIdentity: 'mira',
          playerLevel: 12,
          role: 'leader',
          username: 'Mira',
        },
        {
          memberIdentity: 'rowan',
          playerLevel: 9,
          role: 'member',
          username: 'Rowan',
        },
        {
          memberIdentity: 'juniper',
          playerLevel: 7,
          role: 'member',
          username: 'Juniper',
        },
      ],
    })),
    scenario('pending', 'Application pending', () => ({
      alliance: {
        allianceId: 'moss-hall',
        description: 'A quiet hall for patient traders.',
        joinMode: 'apply',
        name: 'Moss Hall',
        seasonIncome: 84520,
        tag: 'MOSS',
      },
      members: [
        {
          character: 'mira',
          frame: 'sun',
          memberIdentity: 'mira',
          playerLevel: 12,
          role: 'tradeMaster',
          username: 'Mira',
        },
      ],
      ownApplications: [{ allianceId: 'moss-hall' }],
    })),
    scenario('unavailable', 'No available action', () => ({
      actionEnabled: false,
      alliance: {
        allianceId: 'moss-hall',
        description: 'A quiet hall for patient traders.',
        joinMode: 'apply',
        name: 'Moss Hall',
        seasonIncome: 84520,
        tag: 'MOSS',
      },
      members: [
        {
          character: 'mira',
          frame: 'sun',
          memberIdentity: 'mira',
          playerLevel: 12,
          role: 'tradeMaster',
          username: 'Mira',
        },
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
    scenario('research', 'Research complete', () => ({
      animation: { kind: 'research-complete' },
      dismissible: true,
      icon: {
        frameName: 'herb:sageHerb',
        silhouetteFrameName: 'herb:sageHerb',
      },
      kind: 'research',
      research: {
        starLevel: 1,
        starMaxLevel: 2,
      },
      rows: [
        {
          id: 'research:name',
          kind: 'row',
          label: 'Research',
          starLevel: 1,
          starSlotCount: 2,
          value: 'Sage Growing',
        },
        {
          id: 'research:effect',
          kind: 'row',
          label: 'Effect',
          value: '-5% time',
        },
      ],
      title: 'Research Complete!',
      variant: 'banner-rows',
    })),
  ]),
  [GLOBAL_DIALOG_IDS.CONFIRMATION]: Object.freeze([
    scenario('default', 'Default', () => ({
      cancelColor: 'yellow',
      cancelLabel: 'Cancel',
      confirmColor: 'yellow',
      confirmLabel: 'Empty',
      message: 'Are you sure you want to empty the cauldron contents?',
      title: 'Empty Cauldron?',
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
  if (dialogId === GLOBAL_DIALOG_IDS.PLAYER) {
    return [
      'compound.dialog-frame',
      PLAYER_PROFILE_WIDGET_ID,
      STAR_LEVEL_WIDGET_ID,
      RESOURCE_LABEL_WIDGET_ID,
      'text-button',
    ];
  }
  if (dialogId === GLOBAL_DIALOG_IDS.INBOX) {
    return ['compound.dialog-frame', INBOX_MAIL_WIDGET_ID];
  }
  if (dialogId === 'workshop.worldChat') {
    return [
      'compound.dialog-frame',
      WORLD_CHAT_ROW_WIDGET_ID,
      'primitive.text-field',
      'text-button',
    ];
  }
  if (dialogId === 'workshop.worldEvent') {
    return [
      'compound.dialog-frame',
      WORLD_EVENT_QUEST_ROW_WIDGET_ID,
      'compound.leaderboard-row',
      'compound.world-event-reward-row',
    ];
  }
  if (INVENTORY_CHOICE_DIALOG_HIERARCHY[dialogId]) {
    const rowWidgetId =
      INVENTORY_CHOICE_DIALOG_HIERARCHY[dialogId].rowWidgetId ??
      'compound.inventory-choice-row';
    return [
      'compound.dialog-frame',
      rowWidgetId,
      ...(INVENTORY_CHOICE_DIALOG_HIERARCHY[dialogId].childWidgetIds ?? []),
      ...(INVENTORY_CHOICE_DIALOG_HIERARCHY[dialogId].tabbed
        ? ['tab-button']
        : []),
    ];
  }
  return [
    'compound.dialog-frame',
    ...(DIALOG_CHILD_WIDGET_IDS[dialogId] ?? []),
  ];
}

function scenario(id, label, fixture) {
  return Object.freeze({ fixture, id, label });
}

// Keep the production family inventory in the same order as the editor. This
// assertion fails at module load if a retained page dialog is added without a
// corresponding editor entry.
for (const dialogId of Object.values(DIALOG_IDS_BY_PAGE).flat()) {
  if (!UI_EDITOR_RETAINED_DIALOG_IDS.includes(dialogId)) {
    throw new Error(
      `Retained dialog is missing from the UI editor: ${dialogId}`,
    );
  }
}
