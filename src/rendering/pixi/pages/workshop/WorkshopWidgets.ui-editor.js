import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { AllianceFlagWidget } from '../../primitives/AllianceFlagWidget.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT, PIXI_ROOT_RUN_ASSETS } from '../../theme/PixiThemeTokens.js';
import {
  AllianceQuestRow,
  AllianceDirectoryRow,
  AllianceEmblemOption,
  AllianceMemberRow,
  LeaderboardRowPixi,
  PotionDiscoveryPagePixi,
  WorkshopDialogRow,
  WorldEventDonationOptionRow,
  WorldEventRewardRow,
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
const ALLIANCE_DIRECTORY_PREVIEW_WIDTH = 320;

export default [
  widget('compound.workshop-task-panel', 'Workshop Task Panel', ['compound.market-title-ribbon', 'compound.workshop-task-row', 'text-button'], taskPanelControl, variants(['expanded', 'collapsed', 'claimable', 'researching'])),
  widget('compound.workshop-task-row', 'Workshop Task Row', ['text-button', 'primitive.progress-bar'], taskRowControl, variants(['progress', 'claimable', 'researching', 'complete'])),
  widget('compound.workshop-summon-control', 'Workshop Summon Control', ['cost-button', 'info-button', 'primitive.notification-badge'], summonControl, variants(['available', 'unaffordable', 'notified'])),
  widget('compound.root-run-side-action', 'Root Run Side Action', ['primitive.notification-badge', 'compound.trade-alliance-banner'], sideActionControl, variants(['left', 'right', 'disabled', 'notified', 'timed', 'alliance-member'])),
  widget('compound.world-event-donation-option-row', 'World Event Donation Option Row', ['text-button', 'primitive.notification-badge'], donationOptionControl, variants(['available', 'notified', 'unavailable', 'seed-pack'])),
  widget('compound.trade-alliance-banner', 'Alliance Flag', [], allianceBannerControl, variants(['unity', 'crown', 'crescent', 'crossed-wands', 'owl', 'flame', 'oak-leaf', 'key', 'tower', 'sunburst', 'hourglass', 'dragon', 'cauldron', 'sword', 'shield', 'book'])),
  widget('primitive.alliance-emblem-option', 'Alliance Emblem Option', [], allianceEmblemOptionControl, variants(['unity', 'crown', 'crescent', 'crossed-wands', 'owl', 'flame', 'oak-leaf', 'key', 'tower', 'sunburst', 'hourglass', 'dragon', 'cauldron', 'sword', 'shield', 'book'])),
  widget('compound.alliance-directory-row', 'Alliance Directory Row', ['compound.trade-alliance-banner', 'compound.player-profile', 'primitive.resource-label', 'text-button'], allianceDirectoryControl, variants(['join', 'apply', 'cancel', 'closed', 'overflow'])),
  widget('compound.alliance-member-row', 'Alliance Member Row', ['compound.player-profile', 'primitive.star-level-label', 'primitive.resource-label', 'text-button'], allianceMemberControl, variants(['leader', 'member', 'same-rank', 'empty-section', 'passive'])),
  widget('compound.alliance-quest-row', 'Alliance Quest Row', ['primitive.progress-bar', 'primitive.resource-label', 'text-button'], allianceQuestControl, variants(['fill', 'route', 'claim', 'claimed', 'locked', 'overflow'])),
  widget('compound.leaderboard-row', 'Leaderboard Row', ['compound.player-profile', 'compound.trade-alliance-banner', 'primitive.star-level-label', 'primitive.resource-label'], leaderboardRowControl, variants(['player', 'current-player', 'alliance', 'current-alliance', 'alliance-overflow', 'world-event-points'])),
  widget('compound.world-event-reward-row', 'World Event Reward Row', [], worldEventRewardRowControl, variants(['two-rewards', 'current-rank', 'one-reward', 'long-rank'])),
  widget('compound.potion-discovery-page', 'Potion Discovery Page', [], potionDiscoveryControl, variants(['discovered', 'undiscovered', 'long-recipe'])),
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
    'compound.trade-alliance-banner': 'AllianceFlagWidget',
    'primitive.alliance-emblem-option': 'AllianceEmblemOption',
    'compound.alliance-directory-row': 'AllianceDirectoryRow',
    'compound.alliance-member-row': 'AllianceMemberRow',
    'compound.alliance-quest-row': 'AllianceQuestRow',
    'compound.leaderboard-row': 'LeaderboardRowPixi',
    'compound.world-event-reward-row': 'WorldEventRewardRow',
    'compound.potion-discovery-page': 'PotionDiscoveryPagePixi',
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
    panel: {
      paperFrame: {
        texture: assets?.getTexture?.(PIXI_ROOT_RUN_ASSETS.dialogPaper),
      },
    },
    registerTarget() {},
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    unregisterTarget() {},
  };
}

function taskFixture(state) {
  const claimable = state === 'claimable';
  const researching = state === 'researching';
  return {
    id: 'brew-potion', label: claimable ? 'Brew a Potion' : `${researching ? 'Researching' : 'Research'} Mana Tonic Brewing Speed I`, current: claimable ? 1 : state === 'complete' ? 5 : researching ? 0 : 3, required: claimable ? 1 : researching ? 1 : 5,
    progress: claimable || state === 'complete' ? 1 : researching ? 0 : 0.6, actionLabel: claimable ? 'Turn In' : '', enabled: true, showProgress: true,
    ...(researching ? { value: '1m 5s', researchTimer: { active: true, totalMs: 120_000, remainingMs: 65_000 } } : {}),
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
  control.bind({ title: "Elara's Request", nextText: 'Help prepare the workshop.', rows: [taskFixture(['claimable', 'researching'].includes(fixture.state) ? fixture.state : 'progress')], rewardLines: ['20 Mana', '5 Coin'], expanded: fixture.state !== 'collapsed', canToggle: true, showPin: true });
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
  const feature = state === 'timed' || state === 'alliance-member';
  const page = pageStub(input, context);
  const control = feature
    ? new WorkshopFeatureButton({ page, assetManager: assets })
    : new WorkshopIconPanelAction({ page, assetManager: assets, id: 'bag', label: 'Bag', side: state === 'right' ? 'right' : 'left', textureId: PIXI_ROOT_RUN_ASSETS.workshopBag, onActivate: () => context?.emit('sideAction') ?? true });
  if (feature) {
    control.bind(state === 'alliance-member'
      ? { id: 'alliance', label: 'Alliance', side: 'left', weight: 10, enabled: true, visible: true, allianceFlag: { bannerColor: 'violet', emblemColor: 'white', emblemId: 'owl' }, onActivate: () => context?.emit('sideAction') ?? true }
      : { id: 'worldEvent', label: 'Event', side: 'right', weight: 30, enabled: true, visible: true, timer: '2d 4h', onActivate: () => context?.emit('sideAction') ?? true });
    control.setBounds(0, 0, ROOT_RUN_SIDE_ACTION_GEOMETRY.hitWidth ?? 50);
  } else {
    control.setModel({ label: 'Bag', side: state === 'right' ? 'right' : 'left', enabled: state !== 'disabled', notification: state === 'notified', visible: true, action: () => context?.emit('sideAction') ?? true });
    control.setBounds(0, 0);
  }
  return wrap(control, 50, 60);
}

function donationOptionControl({ assets, input, fixture = { state: 'available' }, context }) {
  const control = new WorldEventDonationOptionRow({ dialog: dialogStub(assets, input), index: 0 });
  control.bind({ id: 'mint', itemKey: fixture.state === 'seed-pack' ? 'mintSeed' : 'calmingDraught', itemKind: fixture.state === 'seed-pack' ? 'seed' : 'potion', label: fixture.state === 'seed-pack' ? 'Mint Seeds' : 'Calming Draught', pointsEachLabel: '120 points each', totalLabel: '360 points total', actionLabel: fixture.state === 'unavailable' ? 'Unavailable' : 'Donate', enabled: fixture.state !== 'unavailable', notification: fixture.state === 'notified', onActivate: fixture.state === 'unavailable' ? null : () => context?.emit('donated') ?? true });
  control.setBounds(0, 0, WIDTH, 48);
  return wrap(control, WIDTH, 48);
}

function allianceMemberControl({ assets, input, fixture = { state: 'leader' }, context }) {
  const control = new AllianceMemberRow({ dialog: dialogStub(assets, input) });
  const emptySection = fixture.state === 'empty-section';
  control.bind({
    username: emptySection ? '' : 'Elara',
    character: 'elara',
    role: fixture.state === 'leader' ? 'tradeMaster' : emptySection ? 'factor' : 'trader',
    roleLabel: fixture.state === 'leader' ? 'Trade Master' : emptySection ? 'Factor' : 'Trader',
    roleCountLabel: fixture.state === 'leader' ? '1/1' : emptySection ? '0/5' : '3/50',
    levelLabel: 'Lv 12',
    prestigeCount: 2,
    totalContributionLabel: '12.5k',
    showRankHeader: fixture.state !== 'same-rank',
    sectionOnly: emptySection,
    onActivate: fixture.state === 'passive' || emptySection ? null : () => context?.emit('memberOpened') ?? true,
  });
  const height = control.getPreferredHeight();
  control.setBounds(0, 0, 282, height);
  return wrap(control, 282, height);
}

function allianceQuestControl({ assets, input, fixture = { state: 'fill' }, context }) {
  const control = new AllianceQuestRow({ dialog: dialogStub(assets, input) });
  const claimed = fixture.state === 'claimed';
  const locked = fixture.state === 'locked';
  const route = fixture.state === 'route';
  control.bind({
    id: route ? 'grand-route' : 'fill-mana-tonic',
    title: route
      ? 'Grand Route'
      : fixture.state === 'overflow'
        ? 'Fill 5000 Moonflower Seeds Before The Eclipse Ends'
        : 'Fill 500 Mana Tonic',
    itemKind: route ? 'resource' : fixture.state === 'overflow' ? 'seed' : 'potion',
    itemKey: route ? 'coin' : fixture.state === 'overflow' ? 'moonflowerSeed' : 'manaTonic',
    objectiveLabel: route
      ? 'Collect 250,000 Gold Coins'
      : fixture.state === 'overflow'
        ? 'Donate 5,000 Moonflower Seeds'
        : 'Donate 500 Mana Tonics',
    contributionLabel: route
      ? 'Your contribution 12,500/12,500'
      : 'Your contribution 8/10',
    progressLabel: route ? '86,027/250,000' : fixture.state === 'fill' ? '18/40' : '40/40',
    progress: route ? 86_027 / 250_000 : fixture.state === 'fill' ? 0.45 : 1,
    rewardAmountLabel: route ? '12' : '3',
    rewardResource: 'crystal',
    actionLabel: claimed
      ? 'Claimed'
      : locked
        ? 'Locked'
        : route || fixture.state === 'claim'
          ? 'Claim'
          : 'Fill',
    actionVariant: claimed || locked || route ? 'gray' : 'green',
    claimed,
    enabled: !claimed && !locked && !route,
    lockReason: locked
      ? 'Quest progress this week belongs to Moss Hall. Rejoin that alliance to continue, or wait for the weekly reset.'
      : '',
    actionWidth: 72,
    actionHeight: 42,
    onActivate: claimed || route
      ? null
      : () => context?.emit(locked ? 'allianceQuestLocked' : 'allianceQuestActivated') ?? true,
  });
  const height = control.getPreferredHeight(252);
  control.setBounds(0, 0, 252, height);
  return wrap(control, 252, height);
}

function leaderboardRowControl({ assets, input, fixture = { state: 'player' }, context }) {
  const control = new LeaderboardRowPixi({ dialog: dialogStub(assets, input) });
  const alliance = ['alliance', 'current-alliance', 'alliance-overflow'].includes(fixture.state);
  const currentAlliance = fixture.state === 'current-alliance';
  const allianceOverflow = fixture.state === 'alliance-overflow';
  const worldEvent = fixture.state === 'world-event-points';
  control.bind(
    alliance
      ? {
          id: 'night-owls',
          type: 'leaderboardAlliance',
          rank: 2,
          name: allianceOverflow
            ? 'The Fellowship of Patient Night Traders Beyond The Moon'
            : 'Night Owls',
          allianceTag: allianceOverflow ? 'ROOT' : 'OWL',
          allianceTagColor: 'violet',
          bannerColor: 'violet',
          emblemColor: 'white',
          emblemId: 'sunburst',
          leaderName: allianceOverflow ? 'ArchwizardLongname' : 'Elara',
          leaderCharacter: 'elara',
          leaderFrame: 'violet',
          memberCount: 34,
          memberCapacity: 50,
          current: currentAlliance,
          totalCoinLabel: allianceOverflow ? '987.6m' : '707k',
          totalSuffix: 'total',
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
          ...(worldEvent
            ? { totalMetric: 'points', totalLabel: '1,302,270' }
            : {
                totalCoinLabel:
                  fixture.state === 'current-player' ? '57.8k' : '13.9m',
              }),
          onActivate: () => context?.emit('playerOpened') ?? true,
        },
  );
  const height = control.getPreferredHeight();
  control.setBounds(0, 0, 258, height);
  return wrap(control, 258, height);
}

function worldEventRewardRowControl({ assets, input, fixture = { state: 'two-rewards' } }) {
  const control = new WorldEventRewardRow({
    dialog: dialogStub(assets, input),
  });
  control.bind({
    id: `reward:${fixture.state}`,
    type: 'worldEventReward',
    current: fixture.state === 'current-rank',
    rankLabel:
      fixture.state === 'long-rank' ? 'Rank 101+ Qualified' : 'Rank 1',
    rewards:
      fixture.state === 'one-reward'
        ? [{ resourceKey: 'crystal', amountLabel: '1' }]
        : [
            { resourceKey: 'emerald', amountLabel: '5' },
            { resourceKey: 'crystal', amountLabel: '10' },
          ],
  });
  control.setBounds(0, 0, 258, 50);
  return wrap(control, 258, 50);
}

function allianceDirectoryControl({ assets, input, fixture = { state: 'join' }, context }) {
  const control = new AllianceDirectoryRow({ dialog: dialogStub(assets, input) });
  const action = {
    apply: { label: 'Apply', variant: 'green', enabled: true },
    cancel: { label: 'Cancel', variant: 'brown-dark', enabled: true },
    closed: { label: 'Closed', variant: 'gray', enabled: false },
  }[fixture.state] ?? { label: 'Join', variant: 'green', enabled: true };
  control.bind({
    tag: fixture.state === 'overflow' ? 'ROOT' : 'OWL',
    name: fixture.state === 'overflow' ? 'The Fellowship of Patient Night Traders' : 'Night Owls',
    leaderName: fixture.state === 'overflow' ? 'ArchwizardLongname' : 'Elara',
    leaderCharacter: 'elara',
    leaderFrame: 'violet',
    totalIncomeLabel: fixture.state === 'overflow' ? '987.6m' : '12.4k',
    memberCount: 18,
    memberCapacity: 50,
    bannerColor: fixture.state === 'overflow' ? 'violet' : 'blue',
    emblemColor: fixture.state === 'overflow' ? 'magenta' : 'gold',
    emblemId: fixture.state === 'overflow' ? 'crossed-wands' : 'oak-leaf',
    onActivate: () => context?.emit('allianceOpened') ?? true,
    action: {
      ...action,
      onActivate: action.enabled ? () => context?.emit('allianceAction') ?? true : null,
    },
  });
  control.setBounds(
    0,
    0,
    ALLIANCE_DIRECTORY_PREVIEW_WIDTH,
    control.getPreferredHeight(),
  );
  return wrap(
    control,
    ALLIANCE_DIRECTORY_PREVIEW_WIDTH,
    control.getPreferredHeight(),
  );
}

function allianceBannerControl({ assets, fixture = { state: 'blue-gold' } }) {
  const colors = {
    crown: { bannerColor: 'red', emblemColor: 'white', emblemId: 'crown' },
    owl: { bannerColor: 'violet', emblemColor: 'gold', emblemId: 'owl' },
    flame: { bannerColor: 'ink', emblemColor: 'amber', emblemId: 'flame' },
  }[fixture.state] ?? { bannerColor: 'blue', emblemColor: 'gold', emblemId: fixture.state };
  const control = new AllianceFlagWidget({
    assetManager: assets,
    label: 'workshop-editor-trade-alliance-banner',
  });
  control.setColors(colors);
  control.setSize(86, 100);
  return {
    control,
    destroy: () => control.destroy({ children: true }),
    height: control.flagHeight,
    root: control,
    width: control.flagWidth,
  };
}

function allianceEmblemOptionControl({ assets, input, fixture = { state: 'unity' }, context }) {
  const control = new AllianceEmblemOption({
    assetManager: assets,
    inputRouter: input,
    emblemId: fixture.state,
    label: `workshop-editor-alliance-emblem-${fixture.state}`,
    action: () => context?.emit('emblemSelected', { emblemId: fixture.state }) ?? true,
  });
  control.setSelected(true);
  control.setTint(0xfff9ed);
  control.setBounds(0, 0, 32);
  return wrap(control, 32, 32);
}

function potionDiscoveryControl({ assets, input, fixture = { state: 'discovered' }, context }) {
  const control = new PotionDiscoveryPagePixi({ dialog: dialogStub(assets, input) });
  const discovered = fixture.state !== 'undiscovered';
  const ingredients = [{ key: 'mintHerb', label: 'Mint', quantity: 2 }, { key: 'sageHerb', label: 'Sage', quantity: 1 }];
  if (fixture.state === 'long-recipe') ingredients.push({ key: 'lavenderHerb', label: 'Lavender', quantity: 3 }, { key: 'valerianHerb', label: 'Valerian', quantity: 1 });
  control.bind({ discovered, potionKey: 'minorManaPotion', label: 'Minor Mana Potion', discovererUsername: 'Elara', discoveredAtLabel: 'Today', ingredients, manaLabel: '12 mana', durationLabel: '5 sec', royaltyLabel: '2 coin', onDiscovererActivate: () => context?.emit('discovererOpened') ?? true });
  const width = 155;
  const height = control.getPreferredHeight();
  control.setBounds(0, 0, width, height);
  return wrap(control, width, height);
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
