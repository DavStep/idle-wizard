// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';

import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  createPixiAssetManagerFake,
  installPixiPageTestCanvas,
} from '../workshop/PixiPageTestHarness.js';
import { RETAINED_PAGE_GEOMETRY } from '../workshop/RetainedPageKit.js';
import {
  AllianceMemberRow,
} from '../workshop/WorkshopDialogPixi.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import { AlliancePixiPage } from './AlliancePixiPage.js';

installPixiPageTestCanvas();

describe('AlliancePixiPage', () => {
  it('renders Alliance quests as taller Research-card rows with progress, rewards, and contribution', () => {
    const semanticRegistry = new SemanticTargetRegistry();
    const page = new AlliancePixiPage({
      assetManager: createPixiAssetManagerFake(Texture),
      semanticRegistry,
    });

    page.layout({ sourceWidth: 390, sourceHeight: 844 });
    const model = createModel('quests');
    const activateQuest = vi.fn(() => true);
    model.rows[0].semanticId = 'workshop.alliance.quest.fill-mana-tonic';
    model.rows[0].onActivate = activateQuest;
    page.bind(model);

    const row = page.quests.rows.getWidgets()[0];
    expect(row.getPreferredHeight(360)).toBe(96);
    expect(row.background.frameWidth).toBe(360);
    expect(row.background.frameHeight).toBe(96);
    expect(row.artWell).toMatchObject({
      frameWidth: 52,
      frameHeight: 52,
    });
    expect(row.progress.text).toBe('18/40');
    expect(row.progressBar.progress).toBeCloseTo(0.45);
    expect(row.contribution.text).toBe('Your contribution 8/10');
    expect(row.reward.amountLabel.textObject.text).toBe('3');
    expect(row.action.text.text).toBe('Fill');
    expect(row.action.width).toBe(72);
    expect(row.action.height).toBe(42);
    expect(
      semanticRegistry.isAvailable(
        'workshop.alliance.quest.fill-mana-tonic',
      ),
    ).toBe(true);
    expect(
      semanticRegistry.activate('workshop.alliance.quest.fill-mana-tonic'),
    ).toBe(true);
    expect(activateQuest).toHaveBeenCalledTimes(1);

    page.destroy();
  });

  it('keeps the coin route icon contained inside the Alliance quest art well', () => {
    const page = new AlliancePixiPage({
      assetManager: createPixiAssetManagerFake(Texture),
      semanticRegistry: new SemanticTargetRegistry(),
    });
    const model = createModel('quests');
    model.rows[0].itemKind = 'resource';
    model.rows[0].itemKey = 'coin';

    page.layout({ sourceWidth: 390, sourceHeight: 844 });
    page.bind(model);

    const row = page.quests.rows.getWidgets()[0];
    row.itemIcon.texture = Texture.WHITE;
    row.itemIcon.visible = true;
    row.setBounds(0, 0, 360, row.getPreferredHeight(360));
    expect(row.itemIcon.width).toBe(32);
    expect(row.itemIcon.height).toBe(32);
    expect(row.itemIcon.width).toBeLessThan(row.artWell.frameWidth);

    page.destroy();
  });

  it('composes the Alliance identity, stats, announcement, and roster in order', () => {
    const semanticRegistry = new SemanticTargetRegistry();
    const page = new AlliancePixiPage({
      assetManager: createPixiAssetManagerFake(Texture),
      semanticRegistry,
    });

    page.layout({ sourceWidth: 390, sourceHeight: 844 });
    page.bind(createModel('home'));
    page.activate();

    expect(page.homeIdentitySection.root.visible).toBe(true);
    expect(page.homeName.text).toBe('Night Owls');
    expect(page.homeTag.text).toBe('[OWL]');
    expect(page.homeMemberStat.amount).toBe('1/50');
    expect(page.homeMemberStat.iconFrame).toBe('alliance:members');
    expect(page.homeIncomeStat.amount).toBe('12.5K');
    expect(page.homeAnnouncement.detail.text).toContain(
      'Weekly goal: support every active member.',
    );
    expect(
      page.homeIdentitySection.root.x +
        page.homeFlag.x +
        page.homeFlag.flagWidth / 2,
    ).toBeCloseTo(195);
    const identityBottom =
      page.homeIdentitySection.root.y +
      page.homeIdentitySection.paper.y +
      page.homeIdentitySection.paper.frameHeight;
    const announcementTop =
      page.homeAnnouncement.root.y + page.homeAnnouncement.paper.y;
    const announcementBottom =
      page.homeAnnouncement.root.y +
      page.homeAnnouncement.paper.y +
      page.homeAnnouncement.paper.frameHeight;
    const rosterTop =
      page.homeMembersSection.root.y + page.homeMembersSection.paper.y;
    expect(announcementTop - identityBottom).toBe(8);
    expect(rosterTop - announcementBottom).toBe(8);
    for (const section of [
      page.homeIdentitySection,
      page.homeAnnouncement,
      page.homeMembersSection,
    ]) {
      const sectionLeft = section.root.x + section.paper.x;
      const sectionRight = sectionLeft + section.paper.frameWidth;
      expect(sectionLeft).toBeGreaterThanOrEqual(0);
      expect(sectionRight).toBeLessThanOrEqual(390);
    }
    expect(semanticRegistry.isAvailable('workshop.alliance.leave')).toBe(true);
    expect(semanticRegistry.activate('workshop.alliance.leave')).toBe(true);
    const memberRow = page.homeMemberRows.rows.getWidgets()[0];
    expect(memberRow).toBeInstanceOf(AllianceMemberRow);
    expect(memberRow.username.text).toBe('Luna');
    expect(memberRow.role.text).toBe('Trade Master');
    expect(memberRow.role.visible).toBe(true);
    expect(memberRow.level.text).toBe('Lv 14');
    expect(memberRow.prestigeStars.level).toBe(2);
    expect(memberRow.prestigeStars.visible).toBe(true);
    expect(memberRow.contribution.amount).toBe('12.5k');
    expect(memberRow.getPreferredHeight()).toBe(74);
    const roleSections = page.homeMemberRows.rows.getWidgets();
    expect(roleSections).toHaveLength(5);
    expect(roleSections.map((row) => row.role.text)).toEqual([
      'Trade Master',
      'Quartermaster',
      'Factor',
      'Broker',
      'Trader',
    ]);
    expect(roleSections.map((row) => row.roleCount.text)).toEqual([
      '1/1',
      '0/2',
      '0/5',
      '0/10',
      '0/50',
    ]);
    expect(roleSections.map((row) => row.getPreferredHeight())).toEqual([
      74,
      24,
      24,
      24,
      24,
    ]);
    expect(roleSections.slice(1).every((row) => !row.visual.visible)).toBe(
      true,
    );

    page.bind(createModel('requests'));
    expect(page.scrolls.get('requests').root.visible).toBe(true);
    expect(page.requests.rows.getWidgets()).toHaveLength(1);
    const requestRow = page.requests.rows.getWidgets()[0];
    expect(requestRow.primary.textLabel.text).toBe('Accept');
    expect(requestRow.researchCard.visible).toBe(true);
    expect(requestRow.getPreferredHeight()).toBe(80);
    expect(requestRow.detail.text).toBe('Lv 9');
    expect(requestRow.prestigeStars).toBeInstanceOf(PixiStarLevelLabel);
    expect(requestRow.prestigeStars.level).toBe(1);
    expect(requestRow.prestigeStars.starCount).toBe(1);
    expect(requestRow.prestigeStars.visible).toBe(true);

    const zeroPrestigeModel = createModel('requests');
    zeroPrestigeModel.rows[0].prestigeCount = 0;
    page.bind(zeroPrestigeModel);
    expect(requestRow.prestigeStars.level).toBe(0);
    expect(requestRow.prestigeStars.starCount).toBe(0);
    expect(requestRow.prestigeStars.visible).toBe(true);

    page.bind(createModel('chat'));
    expect(page.selectedTabId).toBe('home');
    expect(page.homeIdentitySection.root.visible).toBe(true);
    expect(page.homeAnnouncement.root.visible).toBe(true);
    expect(page.scrolls.has('chat')).toBe(false);

    page.destroy();
  });

  it('anchors focused Profile and Banner tabs below the settings content', () => {
    const page = new AlliancePixiPage({
      assetManager: createPixiAssetManagerFake(Texture),
      semanticRegistry: new SemanticTargetRegistry(),
    });
    const model = createModel('settings');
    model.settings = {
      allianceId: 'night-owls',
      mode: 'settings',
      name: 'Night Owls',
      tag: 'OWL',
      tagColor: 'ink',
      bannerColor: 'blue',
      emblemColor: 'gold',
      emblemId: 'owl',
      description: 'Patient traders building a stronger market together.',
      notice: 'Weekly goal: support every active member.',
      joinMode: 'apply',
      editable: true,
      canDisband: false,
      onSave: vi.fn(),
    };

    page.layout({ sourceWidth: 390, sourceHeight: 844 });
    page.bind(model);

    const pane = page.settingsPane;
    expect(pane.activeSection).toBe('profile');
    expect(pane.fields.get('name').visible).toBe(true);
    expect(pane.fields.get('name').textLabel.colorToken).toBe(page.theme.text);
    expect(pane.bannerPreview.visible).toBe(false);
    expect(pane.joinModeLabel.visible).toBe(false);
    expect(pane.scroll.scrollbarThumb.visible).toBe(false);
    expect(pane.saveButton.text.text).toBe('Save Profile');
    expect(pane.fields.get('name').y).toBe(13);
    expect(pane.sectionTabLayer.y).toBe(pane.scroll.height + 6);
    expect(pane.sectionTabLayer.y + 28).toBe(pane.lastBounds.height);
    expect(pane.sectionTabs[0].root.y).toBe(0);

    pane.selectSection('banner');
    page.relayout();
    expect(pane.fields.get('name').visible).toBe(false);
    expect(pane.bannerPreview.visible).toBe(true);
    expect(pane.bannerPreview.flagWidth).toBe(160);
    expect(pane.bannerPreview.x).toBe((pane.lastBounds.width - 160) / 2);
    expect(pane.emblemOptions[0].size).toBe(40);
    expect(pane.emblemOptions).toHaveLength(16);
    expect(pane.emblemOptions[6].root.y).toBe(46);
    expect(pane.emblemOptions[12].root.x).toBe(46);
    expect(pane.emblemOptionLayer.y).toBeGreaterThan(
      pane.bannerPreview.y + pane.bannerPreview.flagHeight,
    );
    expect(pane.emblemColorLabel.y).toBeGreaterThan(
      pane.bannerColorSwatchLayer.y + 24,
    );
    expect(pane.saveButton.text.text).toBe('Save Banner');
    expect(pane.scroll.scrollbarThumb.visible).toBe(false);
    expect(pane.bannerPreview.y).toBe(0);
    expect(pane.sectionTabLayer.y + 28).toBe(pane.lastBounds.height);

    page.destroy();
  });

  it('treats a direct Join Mode selection on Requests as a pending change', async () => {
    const onSave = vi.fn(async () => ({ ok: true }));
    const page = new AlliancePixiPage({
      assetManager: createPixiAssetManagerFake(Texture),
      semanticRegistry: new SemanticTargetRegistry(),
    });
    const model = createModel('requests');
    model.requestsSettings = {
      allianceId: 'night-owls',
      joinMode: 'apply',
      editable: true,
      onSave,
    };

    page.layout({ sourceWidth: 390, sourceHeight: 844 });
    page.bind(model);

    const pane = page.requestJoinModePane;
    expect(pane.root.visible).toBe(true);
    expect(pane.buttons[1].selected).toBe(true);
    expect(pane.saveButton.enabled).toBe(false);
    expect(pane.root.y + 102).toBe(
      844 - RETAINED_PAGE_GEOMETRY.chatClearance,
    );

    pane.select('closed');
    expect(pane.buttons[2].selected).toBe(true);
    expect(pane.status.text).toBe('Change Pending');
    expect(pane.saveButton.enabled).toBe(true);

    await pane.save();
    expect(onSave).toHaveBeenCalledWith('closed');
    expect(pane.status.text).toBe('Saved');

    page.destroy();
  });
});

function createModel(selectedTabId) {
  return {
    ownedAlliance: true,
    selectedTabId,
    flag: {
      bannerColor: 'blue',
      emblemColor: 'gold',
      emblemId: 'owl',
    },
    tradeInfo: {
      identityLabel: '[OWL] Night Owls',
      name: 'Night Owls',
      tag: 'OWL',
      description: 'Patient traders building a stronger market together.',
      notice: 'Weekly goal: support every active member.',
      memberCountLabel: '1/50',
    },
    tradeInfoRows: [
      { id: 'members', label: 'Members', value: '1/50' },
      { id: 'join', label: 'Join Mode', value: 'Apply' },
      { id: 'income', label: 'Season Income', value: '12.5K' },
      {
        id: 'leave',
        label: 'Membership',
        value: '',
        actionLabel: 'Leave',
        enabled: true,
        onActivate: vi.fn(),
      },
    ],
    members: [
      {
        id: 'luna',
        username: 'Luna',
        role: 'tradeMaster',
        roleLabel: 'Trade Master',
        levelLabel: 'Lv 14',
        prestigeCount: 2,
        totalContributionLabel: '12.5k',
        showRankHeader: true,
        onActivate: vi.fn(),
      },
    ],
    directory: false,
    rows:
      selectedTabId === 'quests'
        ? [
            {
              id: 'fill-mana-tonic',
              title: 'Fill Mana Tonic',
              itemKind: 'potion',
              itemKey: 'manaTonic',
              contributionLabel: 'Your contribution 8/10',
              progressLabel: '18/40',
              progress: 0.45,
              rewardAmountLabel: '3',
              rewardResource: 'crystal',
              actionLabel: 'Fill',
              actionVariant: 'green',
              actionWidth: 72,
              actionHeight: 42,
              enabled: true,
              onActivate: vi.fn(),
            },
          ]
        : selectedTabId === 'requests'
        ? [
            {
              id: 'thorne',
              username: 'Thorne',
              detail: 'Lv 9',
              prestigeCount: 1,
              preview: '8.4K Produced',
              primaryAction: {
                label: 'Accept',
                enabled: true,
                onActivate: vi.fn(),
              },
              secondaryAction: {
                label: 'Deny',
                enabled: true,
                onActivate: vi.fn(),
              },
            },
          ]
        : [],
    settings: null,
    chat: {
      rows: [
        {
          id: 'message-1',
          username: 'Luna',
          body: 'Welcome to the hall.',
          ageLabel: 'now',
        },
      ],
      onSubmit: vi.fn(),
    },
  };
}
