import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import {
  GuildCharterPanel,
  GuildChronicleEntryRow,
  GuildChronicleSection,
  GuildPeopleSection,
  GuildPersonRow,
  GuildQuestBoardSection,
  GuildQuestCard,
  GuildRowsSection,
  GuildSectionRow,
  GuildSecretarySection,
} from './GuildPageWidgets.js';
import {
  GuildColorSwatch,
  GuildDetailRow,
  GuildProfileField,
  GuildQuestDetail,
  GuildQuestDetailLine,
} from './GuildDialogPixi.js';
import { guildUiEditorAssetFilter } from './GuildUiEditorAssets.js';

const WIDTH = 330;
const assetsFilter = guildUiEditorAssetFilter;

export default [
  entry('compound.guild-section-row', 'Guild Section Row', [], sectionRow, variants(['pair', 'button', 'identity', 'paragraph'])),
  entry('compound.guild-rows-section', 'Guild Rows Section', ['compound.research-station-title', 'compound.guild-section-row'], rowsSection, variants(['summary', 'empty'])),
  entry('compound.guild-charter-panel', 'Guild Charter Panel', ['compound.research-station-title', 'text-button'], charterPanel, variants(['available', 'unavailable'])),
  entry('compound.guild-secretary-section', 'Guild Secretary Section', ['compound.research-station-title', 'cost-button'], secretarySection, variants(['upgrade', 'maximum'])),
  entry('compound.guild-quest-card', 'Guild Quest Card', [], questCard, variants(['available', 'assigned'])),
  entry('compound.guild-quest-board', 'Guild Quest Board', ['compound.research-station-title', 'compound.guild-quest-card'], questBoard, variants(['requests', 'empty'])),
  entry('compound.guild-person-row', 'Guild Person Row', ['primitive.notification-badge'], personRow, variants(['idle', 'activity', 'hospital', 'dead'])),
  entry('compound.guild-people-section', 'Guild People Section', ['compound.research-station-title', 'compound.guild-person-row'], peopleSection, variants(['adventurers', 'empty'])),
  entry('compound.guild-chronicle-entry', 'Guild Chronicle Entry', [], chronicleEntry, variants(['character', 'paired', 'system', 'urgent'])),
  entry('compound.guild-chronicle-section', 'Guild Chronicle Section', ['compound.research-station-title', 'compound.guild-chronicle-entry'], chronicleSection, variants(['stories', 'empty'])),
  entry('compound.guild-profile-field', 'Guild Profile Field', ['primitive.text-field'], profileField, variants(['name', 'tag'])),
  entry('primitive.guild-color-swatch', 'Guild Color Swatch', [], colorSwatch, variants(['selected', 'unselected'])),
  entry('compound.guild-detail-row', 'Guild Detail Row', [], detailRow, variants(['pair', 'paragraph'])),
  entry('compound.guild-quest-detail-line', 'Guild Quest Detail Line', [], questDetailLine, variants(['difficulty', 'reward'])),
  entry('compound.guild-quest-detail', 'Guild Quest Detail', ['compound.guild-quest-detail-line'], questDetail, variants(['assigned', 'request-picker', 'event'])),
];

function variants(ids) { return ids.map((id) => ({ fixture: { state: id }, id, label: title(id) })); }
function title(value) { return value.charAt(0).toUpperCase() + value.slice(1); }

function entry(id, label, childWidgetIds, factory, scenarios) {
  const component = label.replaceAll(' ', '');
  return defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds,
    createThumbnail: () => createUiEditorPixiThumbnail({ assetFilter: assetsFilter, component, createControl: (deps) => factory({ ...deps, fixture: scenarios[0].fixture }), id }),
    folderPath: ['Guild'],
    id,
    kind: 'widget',
    label,
    sectionId: 'composite-widgets',
    properties: [{ label: 'Production widget', value: component }],
    scenarios: scenarios.map((scenario) => ({ ...scenario, mount: (_context, fixture) => createUiEditorPixiSurface({ assetFilter: assetsFilter, component, createControl: (deps) => factory({ ...deps, fixture }) }) })),
    usages: [{ label: 'Guild production UI', source: 'src/rendering/pixi/pages/guild/' }],
  });
}

function sectionRow({ assets, input, fixture }) {
  const control = new GuildSectionRow({ assetManager: assets, inputRouter: input, semanticPrefix: 'ui.guild', label: 'ui:guild:row' });
  const models = {
    pair: { label: 'Guild level', value: '4' },
    button: { action: () => true, kind: 'button', label: 'Open requests', value: '3 waiting' },
    identity: { color: 'violet', kind: 'identity', name: 'Moonlit Order', tag: 'MOON' },
    paragraph: { kind: 'paragraph', text: 'Members share a hall, secretary, and request board.' },
  };
  control.bind('preview', models[fixture.state]);
  const height = control.getPreferredHeight(WIDTH);
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control, WIDTH, height);
}

function rowsSection({ assets, input, fixture }) {
  const control = new GuildRowsSection({ title: 'Guild Summary', assetManager: assets, inputRouter: input, label: 'ui:guild:summary' });
  control.bind(fixture.state === 'empty' ? { emptyLabel: 'No guild yet', rows: [] } : { countLabel: '3', rows: [{ id: 'level', label: 'Guild level', value: '4' }, { id: 'members', label: 'Members', value: '8/12' }, { id: 'status', kind: 'identity', name: 'Moonlit Order', tag: 'MOON' }] });
  const height = control.getPreferredHeight(WIDTH);
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control, WIDTH, height);
}

function charterPanel({ assets, input, fixture }) {
  const control = new GuildCharterPanel({ assetManager: assets, inputRouter: input });
  control.bind({ action: () => true, actionLabel: 'Start Guild', costLabel: '500 coin', enabled: fixture.state === 'available' });
  const height = control.getPreferredHeight(); control.setBounds(0, 0, WIDTH, height); return wrap(control, WIDTH, height);
}

function secretarySection({ assets, input, fixture }) {
  const control = new GuildSecretarySection({ assetManager: assets, inputRouter: input });
  control.bind({ action: () => true, secretary: { boardSlots: 3, canUpgrade: fixture.state === 'upgrade', hiredCap: 4, level: fixture.state === 'upgrade' ? 2 : 10, next: fixture.state === 'upgrade' ? { boardSlots: 4, costCoin: 800, hiredCap: 5 } : null } });
  const height = control.getPreferredHeight(); control.setBounds(0, 0, WIDTH, height); return wrap(control, WIDTH, height);
}

function questCard({ assets, input, fixture }) {
  const control = new GuildQuestCard({ assetManager: assets, inputRouter: input });
  control.bind('quest', questModel(), { open: () => true, remove: fixture.state === 'assigned' ? () => true : null });
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT); control.setBounds(0, 0, WIDTH, 80); return wrap(control, WIDTH, 80);
}

function questBoard({ assets, input, fixture }) {
  const control = new GuildQuestBoardSection({ assetManager: assets, inputRouter: input });
  control.bind({ capacity: 3, countLabel: fixture.state === 'empty' ? '0 / 3 Posted' : '2 / 3 Posted', requests: fixture.state === 'empty' ? [] : [{ ...questModel(), id: 'q1' }, { ...questModel(), id: 'q2', title: 'Escort The Herbalist' }] });
  const height = control.getPreferredHeight(); control.setBounds(0, 0, WIDTH, height); return wrap(control, WIDTH, height);
}

function personRow({ assets, input, fixture }) {
  const control = new GuildPersonRow({ assetManager: assets, inputRouter: input, semanticPrefix: 'ui.guild.person', label: 'ui:guild:person' });
  control.bind('mira', fixture.state === 'activity' ? { action: () => true, detailLabel: 'Shares supper and trades stories from the road with Orin Moss.', displayName: 'Mira Ashveil', iconKey: 'adventurer_cleric', level: 7, status: 'idle', statusLabel: 'With Orin Moss' } : { action: () => true, displayName: 'Mira Ashveil', iconKey: 'adventurer_cleric', level: 7, notification: fixture.state !== 'idle', status: fixture.state });
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT); control.setBounds(0, 0, WIDTH, 80); return wrap(control, WIDTH, 80);
}

function peopleSection({ assets, input, fixture }) {
  const control = new GuildPeopleSection({ title: 'Adventurers', assetManager: assets, inputRouter: input, semanticPrefix: 'ui.guild.person', label: 'ui:guild:people' });
  control.bind({ countLabel: fixture.state === 'empty' ? '0/4' : '2/4', people: fixture.state === 'empty' ? [] : [{ id: '1', displayName: 'Mira Ashveil', iconKey: 'adventurer_cleric', level: 7, status: 'idle' }, { id: '2', displayName: 'Orin Moss', iconKey: 'adventurer_shadowdagger', level: 5, status: 'questing' }] });
  const height = control.getPreferredHeight(); control.setBounds(0, 0, WIDTH, height); return wrap(control, WIDTH, height);
}

function chronicleEntry({ assets, fixture }) {
  const participants = fixture.state === 'system'
    ? []
    : [
        { displayName: 'Mira Ashveil', iconKey: 'adventurer_cleric' },
        ...(fixture.state === 'paired'
          ? [{ displayName: 'Orin Moss', iconKey: 'adventurer_shadowdagger' }]
          : []),
      ];
  const control = new GuildChronicleEntryRow({ assetManager: assets, label: 'ui:guild:chronicle-entry' });
  control.bind('story', {
    authorLabel: participants.length > 0 ? participants.map(({ displayName }) => displayName).join(' & ') : 'Guild Hall',
    message: fixture.state === 'paired'
      ? 'Share supper and trade stories from the road.'
      : fixture.state === 'system'
        ? 'Three requests arrive for the board.'
        : fixture.state === 'urgent'
          ? 'Returns from Night Watch and goes to the Guild Hospital.'
          : 'Reaches level 7.',
    participants,
    timeLabel: fixture.state === 'system' ? '1h ago' : '28m ago',
    tone: fixture.state === 'urgent' ? 'red' : '',
  });
  const height = control.getPreferredHeight(WIDTH);
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control, WIDTH, height);
}

function chronicleSection({ assets, fixture }) {
  const control = new GuildChronicleSection({ assetManager: assets, label: 'ui:guild:chronicle' });
  control.bind(fixture.state === 'empty'
    ? { entries: [], emptyLabel: 'The Chronicle Is Waiting For Its First Story' }
    : {
        countLabel: '3/80',
        entries: [
          { id: '1', authorLabel: 'Mira Ashveil', message: 'Reaches level 7.', participants: [{ displayName: 'Mira Ashveil', iconKey: 'adventurer_cleric' }], timeLabel: '28m ago' },
          { id: '2', authorLabel: 'Mira Ashveil & Orin Moss', message: 'Share supper and trade stories from the road.', participants: [{ displayName: 'Mira Ashveil', iconKey: 'adventurer_cleric' }, { displayName: 'Orin Moss', iconKey: 'adventurer_shadowdagger' }], timeLabel: '1h ago' },
          { id: '3', authorLabel: 'Guild Hall', message: 'Three requests arrive for the board.', participants: [], timeLabel: '2h ago' },
        ],
      });
  const height = control.getPreferredHeight(WIDTH);
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control, WIDTH, height);
}

function profileField({ assets, input, fixture }) {
  const control = new GuildProfileField({ assetManager: assets, inputRouter: input, label: 'ui:guild:field', labelText: fixture.state === 'tag' ? 'Guild tag' : 'Guild name', maxLength: fixture.state === 'tag' ? 5 : 24 });
  control.setValue(fixture.state === 'tag' ? 'MOON' : 'Moonlit Order'); control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT); control.setBounds(0, 0, WIDTH, 48); return wrap(control, WIDTH, 48);
}

function colorSwatch({ assets, input, fixture }) {
  const control = new GuildColorSwatch({ assetManager: assets, inputRouter: input, semanticId: 'ui.guild.color', colorId: 'violet', action: () => true, label: 'ui:guild:swatch' });
  control.setSelected(fixture.state === 'selected'); control.setBounds(0, 0, 32); return wrap(control, 32, 32);
}

function detailRow({ fixture }) {
  const control = new GuildDetailRow({ label: 'ui:guild:detailRow' });
  control.bind('row', fixture.state === 'paragraph' ? { text: 'A quiet guild with a taste for difficult work.' } : { label: 'Members', value: '8/12', valueResourceKey: 'coin' });
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT); const height = control.getPreferredHeight(WIDTH); control.setBounds(0, 0, WIDTH, height); return wrap(control, WIDTH, height);
}

function questDetailLine({ assets, fixture }) {
  const reward = fixture.state === 'reward'; const control = new GuildQuestDetailLine({ assetManager: assets, label: reward ? 'Choose One Reward' : 'Difficulty', reward }); control.setValue(reward ? '120-180 coin, 2-4 seeds, or 1-3 herbs' : 'Hard', { colorKey: reward ? 'text' : '#be403b' }); control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT); control.setBounds(0, 0, 264, reward ? 50 : 22); return wrap(control, 264, reward ? 50 : 22);
}

function questDetail({ assets, fixture }) {
  const showArtwork = fixture.state === 'request-picker'; const height = showArtwork ? 326 : 230; const control = new GuildQuestDetail({ assetManager: assets, showArtwork, label: 'ui:guild:questDetail' }); control.bind({ ...questModel(), eventLabel: fixture.state === 'event' ? 'Moon Festival' : '' }, { pageLabel: '1/3' }); control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT); control.setSize(264, height); return wrap(control, 264, height);
}

function questModel() { return { difficulty: 'Hard', expiresLabel: '2h', id: 'quest', lore: 'Recover the moonstone ledger before floodwater seals the archive.', rewardText: '120-180 coin, 2-4 seeds, or 1-3 herbs', statLabel: 'Wisdom / Luck', title: 'The Flooded Archive' }; }
function wrap(control, width, height) { return { control, destroy: () => control.destroy(), height, root: control.root, width }; }
