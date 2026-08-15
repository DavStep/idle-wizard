import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT, PIXI_ROOT_RUN_ASSETS } from '../../theme/PixiThemeTokens.js';
import {
  AllianceDirectoryRow,
  AllianceMemberRow,
  LeaderboardRowPixi,
  PotionDiscoveryRowPixi,
  WorkshopDialogRow,
  WorldEventDonationOptionRow,
} from './WorkshopDialogPixi.js';
import {
  ROOT_RUN_SIDE_ACTION_GEOMETRY,
  WorkshopFeatureButton,
  WorkshopIconPanelAction,
  WorkshopSummonControl,
  WorkshopTaskPanel,
  WorkshopTaskRow,
} from './WorkshopPixiPage.js';

const WIDTH = 314;

export default [
  widget('compound.workshop-task-panel', 'Workshop Task Panel', ['compound.workshop-task-row', 'text-button'], taskPanelControl, variants(['expanded', 'collapsed', 'claimable'])),
  widget('compound.workshop-task-row', 'Workshop Task Row', ['text-button', 'primitive.progress-bar'], taskRowControl, variants(['progress', 'claimable', 'complete'])),
  widget('compound.workshop-summon-control', 'Workshop Summon Control', ['cost-button', 'info-button', 'primitive.notification-badge'], summonControl, variants(['available', 'unaffordable', 'notified'])),
  widget('compound.root-run-side-action', 'Root Run Side Action', ['primitive.notification-badge'], sideActionControl, variants(['left', 'right', 'disabled', 'notified', 'timed'])),
  widget('compound.world-event-donation-option-row', 'World Event Donation Option Row', ['cost-button'], donationOptionControl, variants(['available', 'unavailable', 'seed-pack'])),
  widget('compound.alliance-directory-row', 'Alliance Directory Row', ['compound.alliance-member-row', 'primitive.managed-scroll-area', 'text-button'], allianceDirectoryControl, variants(['collapsed', 'expanded', 'full'])),
  widget('compound.alliance-member-row', 'Alliance Member Row', ['text-button'], allianceMemberControl, variants(['leader', 'member', 'passive'])),
  widget('compound.leaderboard-row', 'Leaderboard Row', ['compound.player-profile', 'primitive.star-level-label', 'primitive.resource-label'], leaderboardRowControl, variants(['player', 'current-player', 'alliance'])),
  widget('compound.potion-discovery-row', 'Potion Discovery Row', [], potionDiscoveryControl, variants(['discovered', 'undiscovered', 'long-recipe'])),
  widget('compound.workshop-dialog-row', 'Workshop Dialog Row', ['text-button', 'primitive.inline-text'], dialogRowControl, variants(['value', 'resource', 'action', 'locked'])),
];

function widget(id, label, childWidgetIds, factory, scenarios) {
  const component = label.replaceAll(' ', '');
  return defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds,
    createThumbnail: () => createUiEditorPixiThumbnail({ assetFilter: workshopAssetFilter, component, createControl: (deps) => factory({ ...deps, fixture: scenarios[0].fixture }), id }),
    folderPath: ['Workshop'],
    id,
    kind: 'widget',
    label,
    sectionId: 'composite-widgets',
    properties: [
      { label: 'Production class', value: productionClass(id) },
      { label: 'Contract', value: label },
    ],
    scenarios: scenarios.map((scenario) => ({
      ...scenario,
      mount: (context, fixture) => createUiEditorPixiSurface({
        assetFilter: workshopAssetFilter,
        component,
        createControl: (deps) => factory({ ...deps, context, fixture }),
      }),
    })),
    usages: [{ label: 'Workshop room and dialogs', source: 'src/rendering/pixi/pages/workshop/' }],
  });
}

function variants(ids) {
  return ids.map((id) => ({ fixture: { state: id }, id, label: id.charAt(0).toUpperCase() + id.slice(1).replaceAll('-', ' ') }));
}

function productionClass(id) {
  return ({
    'compound.workshop-task-panel': 'WorkshopTaskPanel',
    'compound.workshop-task-row': 'WorkshopTaskRow',
    'compound.workshop-summon-control': 'WorkshopSummonControl',
    'compound.root-run-side-action': 'WorkshopIconPanelAction / WorkshopFeatureButton',
    'compound.world-event-donation-option-row': 'WorldEventDonationOptionRow',
    'compound.alliance-directory-row': 'AllianceDirectoryRow',
    'compound.alliance-member-row': 'AllianceMemberRow',
    'compound.leaderboard-row': 'LeaderboardRowPixi',
    'compound.potion-discovery-row': 'PotionDiscoveryRowPixi',
    'compound.workshop-dialog-row': 'WorkshopDialogRow',
  })[id];
}

function pageStub(input, context = null) {
  return {
    cancelFrame: (id) => globalThis.cancelAnimationFrame?.(id),
    inputRouter: input,
    openDialog: (id) => context?.emit('dialogOpened', { id }) ?? true,
    registerSemanticTarget() {},
    requestFrame: (callback) => globalThis.requestAnimationFrame?.(callback) ?? 0,
    root: { visible: true },
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    timeSource: () => context?.clock.now() ?? 0,
    unregisterSemanticTarget() {},
  };
}

function dialogStub(assets, input) {
  return {
    assetManager: assets,
    contentTheme: createDialogContentTheme(DEFAULT_PIXI_THEME_SNAPSHOT),
    dialogId: 'workshop.editor',
    inputRouter: input,
    isBagDialog: false,
    registerTarget() {},
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    unregisterTarget() {},
  };
}

function taskFixture(state) {
  const claimable = state === 'claimable';
  return {
    id: 'brew-potion', label: claimable ? 'Brew a Potion' : 'Collect Mint', current: claimable ? 1 : state === 'complete' ? 5 : 3, required: claimable ? 1 : 5,
    progress: claimable || state === 'complete' ? 1 : 0.6, actionLabel: claimable ? 'Claim' : '', enabled: true, showProgress: true,
  };
}

function taskRowControl({ assets, input, fixture = { state: 'progress' }, context }) {
  const control = new WorkshopTaskRow({ page: pageStub(input, context), assetManager: assets });
  control.bind({ ...taskFixture(fixture.state), onActivate: () => context?.emit('taskClaimed') ?? true });
  control.setBounds(0, 0, 294);
  return wrap(control, 294, control.getPreferredHeight());
}

function taskPanelControl({ assets, input, fixture = { state: 'expanded' }, context }) {
  const control = new WorkshopTaskPanel({ page: pageStub(input, context), assetManager: assets });
  control.bind({ title: "Elara's Request", nextText: 'Help prepare the workshop.', rows: [taskFixture(fixture.state === 'claimable' ? 'claimable' : 'progress')], rewardLines: ['20 Mana', '5 Coin'], expanded: fixture.state !== 'collapsed', canToggle: true, showPin: true });
  control.setBounds(0, 0, WIDTH);
  return wrap(control, WIDTH, control.height);
}

function summonControl({ assets, input, fixture = { state: 'available' }, context }) {
  const control = new WorkshopSummonControl({ page: pageStub(input, context), assetManager: assets, reducedMotion: true });
  control.bind({ cost: 25, enabled: fixture.state !== 'unaffordable', pressEnabled: true, notification: fixture.state === 'notified' }, { summon: () => context?.emit('seedSummoned') ?? true, info: () => context?.emit('summonInfoOpened') ?? true });
  control.setBounds(98, 60);
  control.setActive(true);
  return wrap(control, 196, 120);
}

function sideActionControl({ assets, input, fixture = { state: 'left' }, context }) {
  const state = fixture.state;
  const feature = state === 'timed';
  const page = pageStub(input, context);
  const control = feature
    ? new WorkshopFeatureButton({ page, assetManager: assets })
    : new WorkshopIconPanelAction({ page, assetManager: assets, id: 'bag', label: 'Bag', side: state === 'right' ? 'right' : 'left', textureId: PIXI_ROOT_RUN_ASSETS.workshopBag, onActivate: () => context?.emit('sideAction') ?? true });
  if (feature) {
    control.bind({ id: 'worldEvent', label: 'Event', side: 'right', weight: 30, enabled: true, visible: true, timer: '2d 4h', onActivate: () => context?.emit('sideAction') ?? true });
    control.setBounds(0, 0, ROOT_RUN_SIDE_ACTION_GEOMETRY.hitWidth ?? 50);
  } else {
    control.setModel({ label: 'Bag', side: state === 'right' ? 'right' : 'left', enabled: state !== 'disabled', notification: state === 'notified', visible: true, action: () => context?.emit('sideAction') ?? true });
    control.setBounds(0, 0);
  }
  return wrap(control, 50, 60);
}

function donationOptionControl({ assets, input, fixture = { state: 'available' }, context }) {
  const control = new WorldEventDonationOptionRow({ dialog: dialogStub(assets, input), index: 0 });
  control.bind({ id: 'mint', itemKey: fixture.state === 'seed-pack' ? 'mintSeed' : 'calmingDraught', itemKind: fixture.state === 'seed-pack' ? 'seed' : 'potion', label: fixture.state === 'seed-pack' ? 'Mint Seeds' : 'Calming Draught', pointsEachLabel: '120 points each', totalLabel: '360 points total', actionLabel: fixture.state === 'unavailable' ? 'Unavailable' : 'Donate', enabled: fixture.state !== 'unavailable', onActivate: fixture.state === 'unavailable' ? null : () => context?.emit('donated') ?? true });
  control.setBounds(0, 0, WIDTH, 48);
  return wrap(control, WIDTH, 48);
}

function allianceMemberControl({ assets, input, fixture = { state: 'leader' }, context }) {
  const control = new AllianceMemberRow({ dialog: dialogStub(assets, input) });
  control.bind({ username: 'Elara', character: 'elara', roleLabel: fixture.state === 'leader' ? 'Trade Master' : 'Trader', levelLabel: 'Lv 12', onActivate: fixture.state === 'passive' ? null : () => context?.emit('memberOpened') ?? true });
  control.setBounds(0, 0, 236, 40);
  return wrap(control, 236, 40);
}

function leaderboardRowControl({ assets, input, fixture = { state: 'player' }, context }) {
  const control = new LeaderboardRowPixi({ dialog: dialogStub(assets, input) });
  const alliance = fixture.state === 'alliance';
  control.bind(
    alliance
      ? {
          id: 'night-owls',
          type: 'leaderboardAlliance',
          rank: 2,
          name: 'Night Owls',
          allianceTag: 'OWL',
          allianceTagColor: 'violet',
          memberCount: 34,
          totalCoinLabel: '707k',
          onActivate: () => context?.emit('allianceOpened') ?? true,
        }
      : {
          id: 'elara',
          type: 'leaderboardPlayer',
          rank: fixture.state === 'current-player' ? 34 : 1,
          username: fixture.state === 'current-player' ? 'StepWizzard' : 'Elara',
          allianceTag: 'OWL',
          allianceTagColor: 'violet',
          character: 'elara',
          frame: fixture.state === 'current-player' ? 'emerald' : 'sun',
          playerLevel: 48,
          prestigeCount: 3,
          current: fixture.state === 'current-player',
          totalCoinLabel: fixture.state === 'current-player' ? '57.8k' : '13.9m',
          onActivate: () => context?.emit('playerOpened') ?? true,
        },
  );
  control.setBounds(0, 0, 258, 50);
  return wrap(control, 258, 50);
}

function allianceDirectoryControl({ assets, input, fixture = { state: 'collapsed' }, context }) {
  const control = new AllianceDirectoryRow({ dialog: dialogStub(assets, input) });
  const expanded = fixture.state !== 'collapsed';
  const members = Array.from({ length: fixture.state === 'full' ? 7 : 3 }, (_, index) => ({ id: index, username: ['Elara', 'Morrow', 'Thistle'][index % 3], character: ['elara', 'mira', 'juniper'][index % 3], roleLabel: index === 0 ? 'Trade Master' : 'Trader', levelLabel: `Lv ${12 - index}`, onActivate: () => true }));
  control.bind({ tag: 'OWL', name: 'Night Owls', totalIncomeLabel: '12.4K', memberCount: members.length, memberCapacity: 50, expanded, members, onActivate: () => context?.emit('allianceExpanded') ?? true, action: { label: 'View Alliance', enabled: true, onActivate: () => true } });
  control.setBounds(0, 0, WIDTH, control.getPreferredHeight());
  return wrap(control, WIDTH, control.getPreferredHeight());
}

function potionDiscoveryControl({ assets, input, fixture = { state: 'discovered' }, context }) {
  const control = new PotionDiscoveryRowPixi({ dialog: dialogStub(assets, input) });
  const discovered = fixture.state !== 'undiscovered';
  const ingredients = [{ key: 'mintHerb', label: 'Mint', quantity: 2 }, { key: 'sageHerb', label: 'Sage', quantity: 1 }];
  if (fixture.state === 'long-recipe') ingredients.push({ key: 'lavenderHerb', label: 'Lavender', quantity: 3 }, { key: 'valerianHerb', label: 'Valerian', quantity: 1 });
  control.bind({ discovered, potionKey: 'minorManaPotion', label: 'Minor Mana Potion', discovererUsername: 'Elara', discoveredAtLabel: 'Today', ingredients, manaLabel: '12 mana', durationLabel: '5 sec', royaltyLabel: '2 coin', onDiscovererActivate: () => context?.emit('discovererOpened') ?? true });
  const height = control.getPreferredHeight();
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control, WIDTH, height);
}

function dialogRowControl({ assets, input, fixture = { state: 'value' }, context }) {
  const control = new WorkshopDialogRow({ dialog: dialogStub(assets, input) });
  const state = fixture.state;
  control.bind(state === 'resource'
    ? { label: 'Rewards', resourceValues: [{ resourceKey: 'mana', amountLabel: '25' }, { resourceKey: 'coin', amountLabel: '10' }] }
    : { label: state === 'locked' ? 'Advanced Summoning' : 'Mana Capacity', value: state === 'locked' ? 'Level 8' : '120', statusIcon: state === 'locked' ? 'lock' : '', actionLabel: state === 'action' ? 'Open' : '', enabled: state !== 'locked', onActivate: () => context?.emit('rowActivated') ?? true });
  const height = control.getPreferredHeight();
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control, WIDTH, height);
}

function wrap(control, width, height) {
  return { control, destroy: () => control.destroy(), height, root: control.root, width };
}

function workshopAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return assetId.includes('/ui/') || assetId.includes('/icons/') || assetId.includes('/items/') || assetId.includes('/rooms/workshop/');
}
