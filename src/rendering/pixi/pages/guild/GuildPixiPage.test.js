// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Rectangle, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import {
  PIXI_DIALOG_PALETTE,
  PIXI_DIALOG_FOOTER_TABS_GEOMETRY,
  PixiDialogFrame,
} from '../../primitives/PixiDialogFrame.js';
import { getPixiButtonSkin } from '../../primitives/PixiButtonStyle.js';
import { PIXI_ROOT_RUN_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import { GUILD_DIALOG_IDS } from './GuildDialogPixi.js';
import { GuildPersonRow } from './GuildPageWidgets.js';
import { GuildPixiPage } from './GuildPixiPage.js';

globalThis.CanvasRenderingContext2D.prototype.createLinearGradient =
  () => ({
    addColorStop() {},
  });
globalThis.CanvasRenderingContext2D.prototype.fillRect = () => {};

describe('GuildPixiPage', () => {
  it('constructs all page sections once and retains keyed pooled widgets', () => {
    const harness = createHarness();
    const pages = new PageRegistry({
      pages: [['guild', harness.page]],
    });
    pages.bind('guild', createGuildViewModel());
    pages.activate('guild');

    const root = harness.page.root;
    const quest = harness.page.boardSection.cards.get('quest-1');
    const adventurer =
      harness.page.adventurersSection.people.get('adventurer-1');
    const before = harness.page.getPoolStats();

    pages.bind(
      'guild',
      createGuildViewModel({
        rewardText: '25 coin',
        statusLabel: 'resting',
      }),
    );

    expect(harness.page.root).toBe(root);
    expect(
      harness.page.boardSection.cards.get('quest-1'),
    ).toBe(quest);
    expect(
      harness.page.adventurersSection.people.get('adventurer-1'),
    ).toBe(adventurer);
    expect(harness.page.getPoolStats().board.pool.allocated).toBe(
      before.board.pool.allocated,
    );
    expect(
      harness.page.getPoolStats().adventurers.pool.allocated,
    ).toBe(before.adventurers.pool.allocated);
    expect(quest.reward.text).toBe('Reward: 25 coin');
    expect(adventurer.statusLabel.text).toBe('Resting');
    expect(harness.page.hallSection.titlePlaque.title.text).toBe(
      'Guild Hall',
    );
    expect(
      harness.page.hallSection.rows.getWidgets().map((row) => row.key),
    ).toEqual(['identity', 'adventurers', 'board', 'settings']);
    expect(harness.page.hallSection.contentLayer.x).toBe(16);
    expect(harness.page.secretarySection.titlePlaque.title.text).toBe(
      'Secretary',
    );
    expect(harness.page.secretarySection.titlePlaque.root.visible).toBe(
      true,
    );
    expect(
      harness.page.secretarySection.root.y -
        (harness.page.hallSection.root.y +
          harness.page.hallSection.getPreferredHeight(374)),
    ).toBe(18);
    expect(quest.paper.root.frameWidth).toBe(330);
    expect(quest.paper.root.frameHeight).toBe(80);
    expect(harness.page.boardSection.titlePlaque.title.text).toBe(
      "Adventurers' Board",
    );
    expect(harness.page.boardSection.boardFrame.frameWidth).toBe(358);
    expect(harness.page.boardSection.emptySlotLabels[0].visible).toBe(false);
    expect(harness.page.boardSection.emptySlotLabels[1].visible).toBe(true);
    expect(harness.page.boardSection.emptySlotLabels[2].visible).toBe(true);
    expect(harness.page.boardSection.countLabel.text).toBe('1 / 3 Posted');
    expect(harness.page.availableSection.titlePlaque.title.text).toBe(
      'Quest Requests',
    );
    expect(harness.page.availableSection.titlePlaque.root.visible).toBe(
      true,
    );
    expect(harness.page.adventurersSection.titlePlaque.title.text).toBe(
      'Adventurers',
    );
    expect(harness.page.adventurersSection.countLabel.text).toBe('1/2');
    expect(harness.page.applicantsSection.titlePlaque.root.visible).toBe(
      true,
    );
    expect(harness.page.applicantsSection.titlePlaque.title.text).toBe(
      'Applicants',
    );
    expect(harness.page.applicantsSection.countLabel.text).toBe('Next 5h');
    expect(
      harness.page.applicantsSection.root.y -
        harness.page.adventurersSection.root.y,
    ).toBe(
      harness.page.adventurersSection.getPreferredHeight() + 18,
    );
    expect(
      harness.page.applicantsSection.people.get('applicant-1').statusLabel
        .text,
    ).toBe('Applicant · Next 5h');
    const rosterPerson =
      harness.page.adventurersSection.people.get('adventurer-1');
    expect(rosterPerson.paper.root.frameHeight).toBe(80);
    expect(rosterPerson.root.hitArea.height).toBe(80);
    expect(rosterPerson.nameLabel.position).toMatchObject({ x: 74, y: 15 });
    expect(rosterPerson.levelLabel.position).toMatchObject({ x: 74, y: 45 });
    expect(rosterPerson.statusLabel.position).toMatchObject({ x: 348, y: 45 });
    expect(harness.page.logSection.titlePlaque.title.text).toBe('Chronicle');

    pages.deactivate();
    expect(root).toMatchObject({
      eventMode: 'none',
      renderable: false,
      visible: false,
    });
    pages.destroy();
    harness.dispose();
  });

  it('contain-fits non-square Guild portraits inside Research-height person rows', () => {
    const portraitTexture = new Texture({
      source: Texture.EMPTY.source,
      frame: new Rectangle(0, 0, 1, 1),
      orig: new Rectangle(0, 0, 87, 108),
    });
    const row = new GuildPersonRow({
      assetManager: {
        loaded: true,
        getTexture: (id) =>
          id.includes('/characters/') ? portraitTexture : Texture.EMPTY,
      },
      inputRouter: null,
      semanticPrefix: 'guild.adventurer',
      semanticRegistry: null,
      label: 'guild:test-person',
    });

    row.bind('mira', {
      displayName: 'Mira Ashveil',
      iconKey: 'adventurer_cleric',
      level: 7,
      status: 'idle',
    });
    row.setBounds(0, 0, 358, 80);

    expect(row.icon.width).toBeCloseTo(87 * (68 / 108), 5);
    expect(row.icon.height).toBeCloseTo(68, 5);
    expect(row.icon.width / row.icon.height).toBeCloseTo(87 / 108, 5);
    expect(row.icon.x).toBeGreaterThanOrEqual(10);
    expect(row.icon.y).toBeGreaterThanOrEqual(6);
    expect(row.icon.x + row.icon.width).toBeLessThanOrEqual(67);
    expect(row.icon.y + row.icon.height).toBeLessThanOrEqual(74);

    row.destroy();
    portraitTexture.destroy();
  });

  it('keeps branch navigation in the external HUD and Adventurer sections in a local button panel', () => {
    const harness = createHarness();
    harness.page.layout({ sourceWidth: 390, sourceHeight: 844 });
    harness.page.bind({
      ...createGuildViewModel(),
      chrome: { worldChatVisible: false },
      navigationPlacement: 'hud',
      selectedBranchId: 'adventurers',
      selectedAdventurerTabId: 'board',
    });
    harness.page.activate();

    expect(harness.page.tabLayer.visible).toBe(true);
    expect(harness.page.tabLayer.renderable).toBe(true);
    expect(harness.page.tabScrolls.get('board').visible).toBe(true);
    expect(harness.page.tabScrolls.get('hall').visible).toBe(false);
    expect(harness.page.tabScrolls.get('board').viewportHeight).toBe(
      844 - 92 - 104 - 6 - 28 - 6,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('retains every Guild dialog after its lazy first open', () => {
    const harness = createHarness();
    harness.page.bind(createGuildViewModel());
    harness.page.activate();

    for (const dialogId of Object.values(GUILD_DIALOG_IDS)) {
      expect(harness.dialogs.hasInstance(dialogId)).toBe(false);
    }

    const retainedDialogs = new Map();
    for (const dialogId of Object.values(GUILD_DIALOG_IDS)) {
      harness.page.openDialog(
        dialogId,
        createGuildDialogPayload(dialogId),
      );
      retainedDialogs.set(dialogId, harness.dialogs.get(dialogId));
      expect(harness.dialogs.get(dialogId).panel).toBeInstanceOf(
        PixiDialogFrame,
      );
      if (dialogId === GUILD_DIALOG_IDS.CHARTER) {
        expect(harness.dialogs.get(dialogId).panel.outerWidth).toBe(
          324,
        );
      }
      if (dialogId === GUILD_DIALOG_IDS.SETTINGS) {
        expect(harness.dialogs.get(dialogId).panel.outerWidth).toBe(
          304,
        );
      }
      if (dialogId === GUILD_DIALOG_IDS.REQUEST) {
        const dialog = harness.dialogs.get(dialogId);
        expect(dialog.requestDetail.lore.text).toBe(
          'A courier left it near the old road.',
        );
        expect(dialog.requestAction.textLabel.text).toBe('Remove');
      }
      if (dialogId === GUILD_DIALOG_IDS.ADVENTURER) {
        const dialog = harness.dialogs.get(dialogId);
        const [statsTab, lifeTab] = dialog.cardTabs;
        const shellBottom =
          dialog.panel.coreHeight +
          PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
        const paperBottom =
          dialog.panel.paperFrame.y +
          dialog.panel.paperFrame.frameHeight;

        expect(dialog.panel.outerHeight).toBe(364);
        expect(dialog.cardTabsLayer.parent).toBe(dialog.panel);
        expect(dialog.cardTabsLayer.x).toBe(9);
        expect(
          shellBottom -
            (dialog.cardTabsLayer.y + statsTab.height),
        ).toBe(PIXI_DIALOG_FOOTER_TABS_GEOMETRY.bottomInset);
        expect(dialog.cardTabsLayer.y - paperBottom).toBe(
          PIXI_DIALOG_FOOTER_TABS_GEOMETRY.paperGap,
        );
        expect(
          lifeTab.root.x -
            (statsTab.root.x + statsTab.width),
        ).toBe(8);
        expect(dialog.cardName.text).toBe('Mira');
        expect(dialog.cardStatus.text).toBe('Idle');
        expect(dialog.cardAction.textLabel.text).toBe('Fire');
      }
      harness.dialogs.close(dialogId);
    }
    for (const dialogId of Object.values(GUILD_DIALOG_IDS)) {
      harness.page.openDialog(
        dialogId,
        createGuildDialogPayload(dialogId),
      );
      expect(harness.dialogs.get(dialogId)).toBe(
        retainedDialogs.get(dialogId),
      );
      harness.dialogs.close(dialogId);
    }
    expect(harness.dialogs.getStats().constructed).toBe(
      Object.values(GUILD_DIALOG_IDS).length,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('expands scrollable Guild cards on tall devices but keeps fixed forms authored', () => {
    const harness = createHarness();
    harness.page.bind(createGuildViewModel());
    harness.page.activate();
    harness.page.openDialog(
      GUILD_DIALOG_IDS.ADVENTURER,
      createGuildDialogPayload(GUILD_DIALOG_IDS.ADVENTURER),
    );
    harness.page.openDialog(
      GUILD_DIALOG_IDS.CHARTER,
      createGuildDialogPayload(GUILD_DIALOG_IDS.CHARTER),
    );
    const card = harness.dialogs.get(GUILD_DIALOG_IDS.ADVENTURER);
    const charter = harness.dialogs.get(GUILD_DIALOG_IDS.CHARTER);

    card.layout({ sourceWidth: 390, sourceHeight: 944 });
    charter.layout({ sourceWidth: 390, sourceHeight: 944 });

    expect(card.panel.coreHeight).toBe(464);
    expect(card.detailScroll.viewportHeight).toBeGreaterThan(200);
    expect(charter.panel.coreHeight).toBe(230);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses Player Info paper hierarchy and semantic Hire/Fire action colors', () => {
    const harness = createHarness();
    harness.page.bind(createGuildViewModel());
    harness.page.activate();

    harness.page.openDialog(
      GUILD_DIALOG_IDS.APPLICANT,
      createGuildDialogPayload(GUILD_DIALOG_IDS.APPLICANT),
    );
    const applicant = harness.dialogs.get(GUILD_DIALOG_IDS.APPLICANT);
    const applicantRows = applicant.detailRows.getWidgets();

    expect(applicant.panel.paperFrame.visible).toBe(false);
    expect(applicant.summaryFrame.visible).toBe(true);
    expect(applicant.detailsFrame.visible).toBe(true);
    expect(applicant.cardLevelLabel.text).toBe('Level');
    expect(applicant.cardLevel.text).toBe('2');
    expect(applicant.cardStatusLabel.text).toBe('Status');
    expect(applicant.cardStatus.text).toBe('Idle');
    expect(applicant.cardAction.color).toBe('green');
    expect(applicant.cardAction.x).toBeGreaterThan(applicant.detailsFrame.x);
    expect(applicant.cardAction.y).toBeGreaterThan(applicant.detailsFrame.y);
    expect(
      applicant.cardAction.x + applicant.cardAction.buttonWidth,
    ).toBeLessThan(
      applicant.detailsFrame.x + applicant.detailsFrame.frameWidth,
    );
    expect(
      applicant.cardAction.y + applicant.cardAction.buttonHeight,
    ).toBeLessThan(
      applicant.detailsFrame.y + applicant.detailsFrame.frameHeight,
    );
    expect(applicantRows[0].keyLabel.textObject.style.fill).toBe(
      PIXI_DIALOG_PALETTE.ink,
    );
    expect(applicantRows[0].valueLabel.textObject.style.fill).toBe(
      PIXI_DIALOG_PALETTE.ink,
    );
    harness.dialogs.close(GUILD_DIALOG_IDS.APPLICANT);

    harness.page.openDialog(
      GUILD_DIALOG_IDS.ADVENTURER,
      createGuildDialogPayload(GUILD_DIALOG_IDS.ADVENTURER),
    );
    const adventurer = harness.dialogs.get(GUILD_DIALOG_IDS.ADVENTURER);
    expect(adventurer.cardAction.color).toBe('red');

    harness.page.destroy();
    harness.dispose();
  });

  it('contain-fits non-square portraits in Guild person dialogs', () => {
    const portraitTexture = new Texture({
      source: Texture.EMPTY.source,
      frame: new Rectangle(0, 0, 1, 1),
      orig: new Rectangle(0, 0, 87, 108),
    });
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.loaded = true;
    const getFallbackTexture = assetManager.getTexture.bind(assetManager);
    assetManager.getTexture = (id) =>
      id.includes('/characters/')
        ? portraitTexture
        : getFallbackTexture(id);
    const harness = createHarness({ assetManager });
    harness.page.bind(createGuildViewModel());
    harness.page.activate();
    const payload = createGuildDialogPayload(GUILD_DIALOG_IDS.APPLICANT);
    payload.card.iconKey = 'adventurer_packscout';

    harness.page.openDialog(GUILD_DIALOG_IDS.APPLICANT, payload);
    const dialog = harness.dialogs.get(GUILD_DIALOG_IDS.APPLICANT);

    expect(dialog.cardIcon.texture.orig.width).toBe(87);
    expect(dialog.cardIcon.texture.orig.height).toBe(108);
    expect(dialog.cardIcon.width / dialog.cardIcon.height).toBeCloseTo(
      87 / 108,
      5,
    );
    expect(dialog.cardIcon.width).toBeLessThanOrEqual(72);
    expect(dialog.cardIcon.height).toBeLessThanOrEqual(72);
    expect(dialog.cardIcon.x).toBeGreaterThanOrEqual(0);
    expect(dialog.cardIcon.y).toBeGreaterThanOrEqual(7);

    harness.page.destroy();
    harness.dispose();
    portraitTexture.destroy();
  });

  it('routes semantic quest/person actions and keeps source anchors', () => {
    const harness = createHarness();
    harness.page.bind(createGuildViewModel());
    harness.page.activate();

    for (const [tabId, button] of harness.page.tabButtons) {
      expect(button.variant, tabId).toBe('tab');
      expect(button.buttonHeight, tabId).toBe(28);
      expect(button.rootRunFrame.compatibilityError, tabId).toBeNull();
    }
    for (const button of harness.page.tabButtons.values()) {
      expect(button.rootRunFrame.borderInsets).toEqual(
        getPixiButtonSkin({
          color: button.resolveRootRunVariant(),
          height: button.buttonHeight,
          sizeTier: button.sizeTier,
          width: button.buttonWidth,
        }).borderInsets,
      );
    }
    expect(harness.page.secretarySection.button).toMatchObject({
      buttonHeight: 42,
      research: true,
      showLabel: true,
    });
    expect(harness.page.secretarySection.button.actionTextLabel.text).toBe(
      'Upgrade',
    );
    expect(harness.page.secretarySection.titlePlaque.root.visible).toBe(
      true,
    );
    expect(harness.page.secretarySection.paper.root.frameHeight).toBe(116);
    expect(harness.page.secretarySection.icon.width).toBeGreaterThan(90);
    expect(harness.page.secretarySection.icon.height).toBeGreaterThan(80);
    expect(
      harness.page.secretarySection.icon.width /
        harness.page.secretarySection.icon.height,
    ).toBeCloseTo(
      harness.page.secretarySection.icon.texture.orig.width /
        harness.page.secretarySection.icon.texture.orig.height,
    );
    expect(
      harness.page.secretarySection.rows.map((row) => row.key.y),
    ).toEqual([18, 47, 76]);
    expect(
      harness.page.secretarySection.button.rootRunFrame.compatibilityError,
    ).toBeNull();

    expect(
      harness.semanticRegistry.activate('guild.request.quest-1'),
    ).toBe(true);
    expect(
      harness.dialogs.isOpen(GUILD_DIALOG_IDS.REQUEST),
    ).toBe(true);
    harness.dialogs.close(GUILD_DIALOG_IDS.REQUEST);

    expect(
      harness.semanticRegistry.activate(
        'guild.adventurer.adventurer-1',
      ),
    ).toBe(true);
    expect(
      harness.dialogs.isOpen(GUILD_DIALOG_IDS.ADVENTURER),
    ).toBe(true);

    expect(
      harness.page.tabScrolls.get('hall').position,
    ).toMatchObject({ x: 0, y: 104 });
    expect(
      harness.page.tabScrolls.get('hall').viewportWidth,
    ).toBe(374);
    expect(harness.page.tabLayer.position).toMatchObject({
      x: 16,
      y: 657,
    });
    expect(
      harness.page.tabScrolls.get('hall').viewportHeight,
    ).toBeCloseTo(587, 10);

    harness.page.destroy();
    harness.dispose();
  });

  it('lets projected visibility suppress person dots without disabling the row action', () => {
    const harness = createHarness();
    const suppressed = createGuildViewModel();
    suppressed.guild.adventurers[0] = {
      ...suppressed.guild.adventurers[0],
      status: 'hospital',
      notification: true,
      notificationVisible: false,
    };
    harness.page.bind(suppressed);
    harness.page.activate();

    const person =
      harness.page.adventurersSection.people.get('adventurer-1');
    expect(person.notification.visible).toBe(false);
    expect(person.notification.renderable).toBe(false);
    expect(person.notificationBadge.sprite.width).toBe(12);
    expect(person.root.eventMode).toBe('static');
    expect(
      harness.semanticRegistry.activate(
        'guild.adventurer.adventurer-1',
      ),
    ).toBe(true);
    expect(
      harness.dialogs.isOpen(GUILD_DIALOG_IDS.ADVENTURER),
    ).toBe(true);
    harness.dialogs.close(GUILD_DIALOG_IDS.ADVENTURER);

    const visible = createGuildViewModel();
    visible.guild.adventurers[0] = {
      ...visible.guild.adventurers[0],
      status: 'hospital',
      notification: true,
      notificationVisible: true,
    };
    harness.page.bind(visible);

    expect(
      harness.page.adventurersSection.people.get('adventurer-1'),
    ).toBe(person);
    expect(person.notification.visible).toBe(true);
    expect(person.notification.renderable).toBe(true);
    expect(person.notificationBadge.sprite.width).toBe(12);
    expect(person.root.eventMode).toBe('static');

    harness.page.destroy();
    harness.dispose();
  });

  it('routes back through the special retained request-stack modal', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    harness.page.bind(createGuildViewModel());
    harness.page.activate();
    harness.page.openDialog(
      GUILD_DIALOG_IDS.REQUEST_STACK,
      createGuildDialogPayload(GUILD_DIALOG_IDS.REQUEST_STACK),
    );
    const requestStack = harness.dialogs.get(
      GUILD_DIALOG_IDS.REQUEST_STACK,
    );
    expect(inputRouter.getTopModal()?.id).toBe(
      GUILD_DIALOG_IDS.REQUEST_STACK,
    );
    expect(requestStack.panel).toBeInstanceOf(PixiDialogFrame);
    expect(requestStack.detail.title.text).toBe('Smuggler Tunnel');
    expect(requestStack.detail.lore.text).toBe(
      'A narrow road under the hill.',
    );
    expect(requestStack.detail.rows[0].value.text).toBe('Easy');
    expect(requestStack.postButton.textLabel.text).toBe('Post');
    expect(requestStack.nextButton.textLabel.text).toBe('Only Page');
    expect(inputRouter.handleBack({ source: 'native' })).toBe(true);
    expect(
      harness.dialogs.isOpen(GUILD_DIALOG_IDS.REQUEST_STACK),
    ).toBe(false);
    expect(inputRouter.getTopModal()).toBeNull();

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });

  it('shows every current adventurer life above the longer Guild chronicle', () => {
    const harness = createHarness();
    const model = createGuildViewModel();
    model.selectedBranchId = 'adventurers';
    model.selectedAdventurerTabId = 'log';
    model.guild.adventurers = [
      {
        ...model.guild.adventurers[0],
        activityLabel: 'At The Tavern',
        activityText: 'Trades road stories with Orin Moss.',
      },
      {
        id: 'adventurer-2',
        displayName: 'orin moss',
        level: 3,
        status: 'idle',
        activityLabel: 'With Mira',
        activityText: 'Repairs travelling gear with Mira.',
      },
    ];
    model.guild.logs = Array.from({ length: 6 }, (_, index) => ({
      id: `log-${index + 1}`,
      text: `guild story ${index + 1}.`,
      timeLabel: index === 0 ? 'Now' : `${index * 10}m ago`,
    }));

    harness.page.bind(model);
    harness.page.activate();

    expect(harness.page.activitySection.titlePlaque.title.text).toBe(
      'Right Now',
    );
    expect(harness.page.activitySection.people.getWidgets()).toHaveLength(2);
    expect(
      harness.page.activitySection.people.get('adventurer-1').levelLabel.text,
    ).toBe('Trades road stories with Orin Moss.');
    expect(harness.page.logSection.titlePlaque.title.text).toBe('Chronicle');
    expect(harness.page.logSection.rows.getWidgets()).toHaveLength(6);
    expect(harness.page.logSection.rows.get('log-1').paragraph.text).toBe(
      'Now · guild story 1.',
    );
    expect(
      harness.semanticRegistry.activate('guild.activity.adventurer-1'),
    ).toBe(true);
    expect(
      harness.dialogs.isOpen(GUILD_DIALOG_IDS.ADVENTURER),
    ).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });
});

function createHarness({
  inputRouter = null,
  assetManager = createPixiAssetManagerFake(Texture),
} = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const semanticRegistry = new SemanticTargetRegistry();
  const page = new GuildPixiPage({
    assetManager,
    dialogLayer,
    dialogRegistry: dialogs,
    semanticRegistry,
    inputRouter,
  });
  return {
    dialogLayer,
    dialogs,
    page,
    semanticRegistry,
    dispose() {
      dialogs.destroy();
      dialogLayer.destroy({ children: true });
    },
  };
}

function createGuildViewModel({
  rewardText = '20 coin',
  statusLabel = 'idle',
} = {}) {
  return {
    guild: {
      unlocked: true,
      created: true,
      profile: {
        name: 'Moss Hall',
        tag: 'MOSS',
        color: 'green',
      },
      secretary: {
        level: 1,
        hiredCap: 2,
        boardSlots: 3,
        canUpgrade: true,
        next: {
          level: 2,
          hiredCap: 3,
          boardSlots: 4,
          costCoin: 100,
        },
      },
      board: [
        {
          id: 'quest-1',
          title: 'lost satchel',
          lore: 'a courier left it near the old road.',
          difficulty: 'easy',
          rewardText,
          expiresLabel: '2h',
        },
      ],
      normalBoard: [
        {
          id: 'quest-1',
          title: 'lost satchel',
          lore: 'a courier left it near the old road.',
          difficulty: 'easy',
          rewardText,
          expiresLabel: '2h',
        },
      ],
      availableRequests: [
        {
          id: 'quest-2',
          title: 'smuggler tunnel',
          lore: 'a narrow road under the hill.',
          difficulty: 'medium',
          rewardText: '30 coin',
          expiresLabel: '3h',
        },
      ],
      adventurers: [
        {
          id: 'adventurer-1',
          displayName: 'mira',
          level: 2,
          status: 'idle',
          statusLabel,
          personalityLabel: 'loyal',
          stats: {
            strength: 2,
          },
        },
      ],
      applicants: [
        {
          id: 'applicant-1',
          displayName: 'orin',
          level: 1,
          status: 'waiting',
          personalityLabel: 'scholar',
        },
      ],
      logs: [
        {
          id: 'log-1',
          text: 'a request reaches the board.',
        },
      ],
      applicantResetLabel: '5h',
      boardWaveLabel: '2h',
    },
    actions: {
      fireAdventurer: vi.fn(() => ({ ok: true })),
      hireApplicant: vi.fn(() => ({ ok: true })),
      postRequest: vi.fn(() => ({ ok: true })),
      removeRequest: vi.fn(() => ({ ok: true })),
      upgradeSecretary: vi.fn(() => ({ ok: true })),
      updateGuildProfile: vi.fn(() => ({ ok: true })),
    },
  };
}

function createGuildDialogPayload(dialogId) {
  if (
    dialogId === GUILD_DIALOG_IDS.CHARTER ||
    dialogId === GUILD_DIALOG_IDS.SETTINGS
  ) {
    return {
      profile: {
        name: 'Moss Hall',
        tag: 'MOSS',
        color: 'green',
      },
      onSubmit: vi.fn(),
    };
  }
  if (dialogId === GUILD_DIALOG_IDS.REQUEST_STACK) {
    return {
      requests: [
        {
          id: 'quest-2',
          title: 'smuggler tunnel',
          lore: 'a narrow road under the hill.',
          difficulty: 'easy',
          rewardText: '10 coin',
        },
      ],
      onPost: vi.fn(),
    };
  }
  if (dialogId === GUILD_DIALOG_IDS.REQUEST) {
    return {
      request: {
        id: 'quest-1',
        title: 'lost satchel',
        lore: 'a courier left it near the old road.',
        difficulty: 'easy',
        rewardText: '20 coin',
      },
      actionLabel: 'remove',
      action: vi.fn(),
    };
  }
  return {
    card: {
      id: 'person-1',
      displayName: 'mira',
      level: 2,
      status: 'idle',
      stats: {
        strength: 2,
      },
    },
    actionLabel:
      dialogId === GUILD_DIALOG_IDS.APPLICANT ? 'hire' : 'fire',
    action: vi.fn(),
  };
}
