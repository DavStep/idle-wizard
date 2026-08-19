// @vitest-environment jsdom

import { createPixiAssetManagerFake } from '../workshop/PixiPageTestHarness.js';
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
import { RETAINED_SCROLLBAR_GEOMETRY } from '../workshop/RetainedPageKit.js';
import { GUILD_DIALOG_IDS } from './GuildDialogPixi.js';
import { GuildChronicleEntryRow, GuildPersonRow } from './GuildPageWidgets.js';
import { GuildPixiPage } from './GuildPixiPage.js';

globalThis.CanvasRenderingContext2D.prototype.createLinearGradient = () => ({
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
    expect(harness.page.boardSection.cards.get('quest-1')).toBe(quest);
    expect(harness.page.adventurersSection.people.get('adventurer-1')).toBe(
      adventurer,
    );
    expect(harness.page.getPoolStats().board.pool.allocated).toBe(
      before.board.pool.allocated,
    );
    expect(harness.page.getPoolStats().adventurers.pool.allocated).toBe(
      before.adventurers.pool.allocated,
    );
    expect(quest.reward.text).toBe('Reward: 25 coin');
    expect(adventurer.statusLabel.text).toBe('Resting');
    expect(harness.page.hallSection.titlePlaque.title.text).toBe('Guild Hall');
    expect(
      harness.page.hallSection.rows.getWidgets().map((row) => row.key),
    ).toEqual(['identity', 'adventurers', 'board', 'settings']);
    expect(harness.page.hallSection.joined).toBe(true);
    expect(harness.page.hallSection.contentLayer.x).toBe(16);
    expect(harness.page.hallSection.joinedPaper.root.frameWidth).toBe(358);
    expect(harness.page.hallSection.joinedPaper.root.frameHeight).toBe(256);
    expect(
      harness.page.hallSection.rows.getWidgets().map((row) => row.root.y),
    ).toEqual([0, 64, 128, 192]);
    expect(
      harness.page.hallSection.rows
        .getWidgets()
        .slice(0, 3)
        .every((row) => row.paper.root.visible === false),
    ).toBe(true);
    const settingsRow = harness.page.hallSection.rows.get('settings');
    expect(settingsRow.buttonFrame.x).toBe(8);
    expect(settingsRow.buttonFrame.y).toBe(8);
    expect(settingsRow.buttonFrame.frameWidth).toBe(342);
    expect(settingsRow.buttonFrame.frameHeight).toBe(48);
    expect(harness.page.secretarySection.titlePlaque.title.text).toBe(
      'Secretary',
    );
    expect(harness.page.secretarySection.titlePlaque.root.visible).toBe(true);
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
    expect(harness.page.availableSection.titlePlaque.root.visible).toBe(false);
    expect(
      harness.page.availableSection.rows.getWidgets().map((row) => row.key),
    ).toEqual(['review']);
    expect(
      harness.page.availableSection.rows.get('review').buttonLabel.text,
    ).toBe('Quest Requests');
    expect(
      harness.page.availableSection.rows.get('review').buttonValue.text,
    ).toBe('1 Waiting · New in 2h');
    expect(harness.page.adventurersSection.titlePlaque.title.text).toBe(
      'Adventurers',
    );
    expect(harness.page.adventurersSection.countLabel.text).toBe('1/2');
    expect(harness.page.applicantsSection.titlePlaque.root.visible).toBe(true);
    expect(harness.page.applicantsSection.titlePlaque.title.text).toBe(
      'Applicants',
    );
    expect(harness.page.applicantsSection.countLabel.text).toBe('Next 5h');
    expect(
      harness.page.applicantsSection.root.y -
        harness.page.adventurersSection.root.y,
    ).toBe(harness.page.adventurersSection.getPreferredHeight() + 18);
    expect(
      harness.page.applicantsSection.people.get('applicant-1').statusLabel.text,
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
    expect(harness.page.tabScrolls.get('board').root.visible).toBe(true);
    expect(harness.page.tabScrolls.get('hall').root.visible).toBe(false);
    expect(harness.page.tabScrolls.get('board').height).toBe(
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
      harness.page.openDialog(dialogId, createGuildDialogPayload(dialogId));
      retainedDialogs.set(dialogId, harness.dialogs.get(dialogId));
      expect(harness.dialogs.get(dialogId).panel).toBeInstanceOf(
        PixiDialogFrame,
      );
      if (dialogId === GUILD_DIALOG_IDS.CHARTER) {
        expect(harness.dialogs.get(dialogId).panel.outerWidth).toBe(324);
      }
      if (dialogId === GUILD_DIALOG_IDS.SETTINGS) {
        expect(harness.dialogs.get(dialogId).panel.outerWidth).toBe(304);
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
          dialog.panel.coreHeight + PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
        const paperBottom =
          dialog.panel.paperFrame.y + dialog.panel.paperFrame.frameHeight;

        expect(dialog.panel.outerHeight).toBe(518);
        expect(dialog.cardTabsLayer.parent).toBe(dialog.panel);
        expect(dialog.cardTabsLayer.x).toBe(9);
        expect(shellBottom - (dialog.cardTabsLayer.y + statsTab.height)).toBe(
          PIXI_DIALOG_FOOTER_TABS_GEOMETRY.bottomInset,
        );
        expect(dialog.cardTabsLayer.y - paperBottom).toBe(
          PIXI_DIALOG_FOOTER_TABS_GEOMETRY.paperGap,
        );
        expect(lifeTab.root.x - (statsTab.root.x + statsTab.width)).toBe(8);
        expect(dialog.cardName.text).toBe('Mira');
        expect(dialog.cardStatus.text).toBe('Idle');
        expect(dialog.cardXp.text).toBe('14/40');
        expect(dialog.cardPersonality.text).toBe('Loyal');
        expect(dialog.detailRows.getWidgets().map((row) => row.key)).toEqual([
          'stat:strength',
        ]);
        expect(dialog.cardDetailsBoard.frameWidth).toBe(
          PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth,
        );
        expect(dialog.detailScroll.root.x - dialog.cardDetailsBoard.x).toBe(4);
        expect(dialog.detailScroll.root.y - dialog.cardDetailsBoard.y).toBe(8);
        expect(dialog.cardAction.textLabel.text).toBe('Fire');
        expect(dialog.cardAction.buttonWidth).toBeCloseTo(
          456 * (PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth / 925),
          10,
        );
        expect(dialog.cardAction.buttonHeight).toBe(52);
      }
      harness.dialogs.close(dialogId);
    }
    for (const dialogId of Object.values(GUILD_DIALOG_IDS)) {
      harness.page.openDialog(dialogId, createGuildDialogPayload(dialogId));
      expect(harness.dialogs.get(dialogId)).toBe(retainedDialogs.get(dialogId));
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

    expect(card.panel.coreHeight).toBe(618);
    expect(card.detailScroll.height).toBeGreaterThan(200);
    expect(charter.panel.coreHeight).toBe(230);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps overflowing adventurer stats inside the cosmetics-style board scrollbar', () => {
    const harness = createHarness();
    harness.page.bind(createGuildViewModel());
    harness.page.activate();
    const payload = createGuildDialogPayload(GUILD_DIALOG_IDS.ADVENTURER);
    payload.card.stats = Object.fromEntries(
      Array.from({ length: 14 }, (_, index) => [
        `stat ${index + 1}`,
        index + 1,
      ]),
    );

    harness.page.openDialog(GUILD_DIALOG_IDS.ADVENTURER, payload);
    const dialog = harness.dialogs.get(GUILD_DIALOG_IDS.ADVENTURER);

    expect(dialog.detailScroll.contentHeight).toBeGreaterThan(
      dialog.detailScroll.height,
    );
    expect(dialog.detailScroll.scrollbarTrack.visible).toBe(true);
    expect(dialog.detailScroll.scrollbarThumb.visible).toBe(true);
    expect(
      dialog.detailScroll.root.x +
        dialog.detailScroll.width +
        RETAINED_SCROLLBAR_GEOMETRY.gap +
        RETAINED_SCROLLBAR_GEOMETRY.width,
    ).toBe(dialog.cardDetailsBoard.x + dialog.cardDetailsBoard.frameWidth - 2);

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
      id.includes('/characters/') ? portraitTexture : getFallbackTexture(id);
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
    expect(dialog.cardIcon.width).toBeLessThanOrEqual(108);
    expect(dialog.cardIcon.height).toBeLessThanOrEqual(108);
    expect(dialog.cardIcon.x).toBeGreaterThanOrEqual(-14);
    expect(dialog.cardIcon.y).toBeGreaterThanOrEqual(0);

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
    expect(harness.page.secretarySection.titlePlaque.root.visible).toBe(true);
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
    expect(harness.page.secretarySection.rows.map((row) => row.key.y)).toEqual([
      18, 47, 76,
    ]);
    expect(
      harness.page.secretarySection.button.rootRunFrame.compatibilityError,
    ).toBeNull();

    expect(harness.semanticRegistry.activate('guild.settings.open')).toBe(true);
    expect(harness.dialogs.isOpen(GUILD_DIALOG_IDS.SETTINGS)).toBe(true);
    harness.dialogs.close(GUILD_DIALOG_IDS.SETTINGS);

    expect(harness.semanticRegistry.activate('guild.request.quest-1')).toBe(
      true,
    );
    expect(harness.dialogs.isOpen(GUILD_DIALOG_IDS.REQUEST)).toBe(true);
    harness.dialogs.close(GUILD_DIALOG_IDS.REQUEST);

    expect(harness.semanticRegistry.activate('guild.available.open')).toBe(
      true,
    );
    expect(harness.dialogs.isOpen(GUILD_DIALOG_IDS.REQUEST_STACK)).toBe(true);
    harness.dialogs.close(GUILD_DIALOG_IDS.REQUEST_STACK);

    expect(
      harness.semanticRegistry.activate('guild.adventurer.adventurer-1'),
    ).toBe(true);
    expect(harness.dialogs.isOpen(GUILD_DIALOG_IDS.ADVENTURER)).toBe(true);

    expect(harness.page.tabScrolls.get('hall').root.position).toMatchObject({
      x: 0,
      y: 104,
    });
    expect(harness.page.tabScrolls.get('hall').width).toBe(374);
    expect(harness.page.tabLayer.position).toMatchObject({
      x: 16,
      y: 657,
    });
    expect(harness.page.tabScrolls.get('hall').height).toBeCloseTo(587, 10);

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

    const person = harness.page.adventurersSection.people.get('adventurer-1');
    expect(person.notification.visible).toBe(false);
    expect(person.notification.renderable).toBe(false);
    expect(person.notificationBadge.sprite.width).toBe(12);
    expect(person.root.eventMode).toBe('static');
    expect(
      harness.semanticRegistry.activate('guild.adventurer.adventurer-1'),
    ).toBe(true);
    expect(harness.dialogs.isOpen(GUILD_DIALOG_IDS.ADVENTURER)).toBe(true);
    harness.dialogs.close(GUILD_DIALOG_IDS.ADVENTURER);

    const visible = createGuildViewModel();
    visible.guild.adventurers[0] = {
      ...visible.guild.adventurers[0],
      status: 'hospital',
      notification: true,
      notificationVisible: true,
    };
    harness.page.bind(visible);

    expect(harness.page.adventurersSection.people.get('adventurer-1')).toBe(
      person,
    );
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
    const requestStack = harness.dialogs.get(GUILD_DIALOG_IDS.REQUEST_STACK);
    expect(inputRouter.getTopModal()?.id).toBe(GUILD_DIALOG_IDS.REQUEST_STACK);
    expect(requestStack.panel).toBeInstanceOf(PixiDialogFrame);
    expect(requestStack.detail.title.text).toBe('Smuggler Tunnel');
    expect(requestStack.detail.lore.text).toBe(
      'Map the lantern-lit route beneath the fish market and return unseen.',
    );
    expect(requestStack.detail.rows[0].value.text).toBe('Easy');
    expect(requestStack.detail.rows[0].value.textObject.style.fill).toBe(
      '#4aa83f',
    );
    expect(requestStack.detail.art.visible).toBe(true);
    expect(requestStack.detail.art.width).toBe(298);
    expect(requestStack.detail.art.height).toBe(98);
    expect(requestStack.detail.art.mask).toBe(requestStack.detail.artMask);
    expect(requestStack.detail.artAssetId).toBe(
      'source:assets/guild/quest-requests-mine.png',
    );
    const rewardRow = requestStack.detail.rows[2];
    expect(rewardRow.label.text).toBe('Choose One Reward');
    expect(rewardRow.background).toBeDefined();
    expect(
      rewardRow.rewardBadges
        .filter(({ root }) => root.visible)
        .map(({ resourceKey, amount }) => [resourceKey, amount.text]),
    ).toEqual([
      ['coin', '120-180'],
      ['seed', '2-4'],
      ['herb', '1-3'],
    ]);
    expect(
      rewardRow.rewardBadges
        .filter(({ root }) => root.visible)
        .map(({ icon, resourceKey }) => [
          resourceKey,
          icon.width,
          icon.height,
          icon.y,
        ]),
    ).toEqual([
      ['coin', 26, 26, 25],
      ['seed', 29, 29, 25],
      ['herb', 31, 31, 22],
    ]);
    expect(
      rewardRow.rewardBadges
        .filter(({ root }) => root.visible)
        .map(({ amount }) => amount.y),
    ).toEqual([38, 38, 38]);
    expect(
      requestStack.detail.rows
        .filter(({ reward }) => !reward)
        .every(({ separator }) => separator === undefined),
    ).toBe(true);
    expect(requestStack.panel.titleLabel.text).toBe('Quest Requests');
    expect(requestStack.postButton.textLabel.text).toBe('Post Request');
    expect(requestStack.panel.paperFrame.visible).toBe(false);
    expect(requestStack.panel.contentInsets).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(requestStack.pageRoot.position).toMatchObject({
      x: -4,
      y: 22,
    });
    expect(requestStack.pageFrame.frameWidth).toBe(312);
    expect(requestStack.pageFrame.frameHeight).toBe(341);
    expect(requestStack.detail.root.position).toMatchObject({
      x: 7,
      y: 7,
    });
    expect(requestStack.postButton.buttonWidth).toBe(298);
    expect(requestStack.previousButton.position).toMatchObject({
      x: -4,
      y: 367,
    });
    expect(requestStack.nextButton.position).toMatchObject({
      x: 236,
      y: 367,
    });
    expect(
      requestStack.panel.coreHeight -
        requestStack.previousButton.y -
        requestStack.previousButton.buttonHeight,
    ).toBe(9);
    expect(requestStack.pageLabel.text).toBe('1 / 2');
    expect(requestStack.previousButton.textLabel.text).toBe('Prev');
    expect(requestStack.previousButton.enabled).toBe(false);
    expect(requestStack.nextButton.textLabel.text).toBe('Next');
    expect(requestStack.nextButton.enabled).toBe(true);
    const swipeRegistration = inputRouter.store
      .getRegistrations('swipe')
      .find((registration) => registration.id === 'guild.requestStack.swipe');
    expect(swipeRegistration).toBeDefined();
    expect(swipeRegistration.onSwipe({ direction: 'next' })).toBe(true);
    expect(requestStack.detail.title.text).toBe('Hilltop Watch');
    expect(requestStack.detail.artAssetId).toBe(
      'source:assets/guild/quest-requests-hillside.png',
    );
    expect(requestStack.pageLabel.text).toBe('2 / 2');
    expect(requestStack.previousButton.enabled).toBe(true);
    expect(requestStack.nextButton.enabled).toBe(false);
    expect(swipeRegistration.onSwipe({ direction: 'previous' })).toBe(true);
    expect(requestStack.detail.title.text).toBe('Smuggler Tunnel');
    expect(requestStack.pageLabel.text).toBe('1 / 2');
    requestStack.detail.bind({ id: 'quest-a', title: 'Forest Bridge' });
    expect(requestStack.detail.artAssetId).toBe(
      'source:assets/guild/quest-requests-bridge.png',
    );
    requestStack.detail.bind({ title: 'Fever Ward Run', tags: ['medical'] });
    expect(requestStack.detail.artAssetId).toBe(
      'source:assets/guild/quest-requests-village.png',
    );
    requestStack.detail.bind({ title: 'Old Road Escort', tags: ['road'] });
    expect(requestStack.detail.artAssetId).toBe(
      'source:assets/guild/quest-requests-road.png',
    );
    requestStack.detail.bind({ title: 'Charter Audit', tags: ['political'] });
    expect(requestStack.detail.artAssetId).toBe(
      'source:assets/guild/quest-requests-political.png',
    );
    requestStack.detail.bind({ title: 'Mirror Maze', tags: ['magic'] });
    expect(requestStack.detail.artAssetId).toBe(
      'source:assets/guild/quest-requests-magic.png',
    );
    requestStack.detail.bind({ title: 'Arena Challenge', tags: ['arena'] });
    expect(requestStack.detail.artAssetId).toBe(
      'source:assets/guild/quest-requests-military.png',
    );
    expect(inputRouter.handleBack({ source: 'native' })).toBe(true);
    expect(harness.dialogs.isOpen(GUILD_DIALOG_IDS.REQUEST_STACK)).toBe(false);
    expect(inputRouter.getTopModal()).toBeNull();

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });

  it('shows one newest-first Chronicle feed with compact character messages', () => {
    const harness = createHarness({
      assetManager: {
        ...createPixiAssetManagerFake(Texture),
        loaded: true,
      },
    });
    const model = createGuildViewModel();
    model.selectedBranchId = 'adventurers';
    model.selectedAdventurerTabId = 'log';
    model.guild.adventurers = [
      {
        ...model.guild.adventurers[0],
        activityLabel: 'At The Tavern',
        activityText: 'Trades road stories with Orin Moss.',
        iconKey: 'adventurer_cleric',
      },
      {
        id: 'adventurer-2',
        displayName: 'orin moss',
        iconKey: 'adventurer_shadowdagger',
        level: 3,
        status: 'idle',
        activityLabel: 'With Mira',
        activityText: 'Repairs travelling gear with Mira.',
      },
    ];
    model.guild.logs = [
      {
        actorId: 'adventurer-1',
        id: 'log-newest',
        text: 'mira reaches level 3.',
        timeLabel: 'Now',
      },
      {
        actorId: 'adventurer-1',
        id: 'log-paired',
        partnerId: 'adventurer-2',
        text: 'mira and orin moss share supper and trade stories.',
        timeLabel: '28m ago',
      },
      ...Array.from({ length: 83 }, (_, index) => ({
        id: `log-system-${index}`,
        text: `guild story ${index + 1}.`,
        timeLabel: `${index + 1}h ago`,
      })),
    ];

    harness.page.bind(model);
    harness.page.activate();

    expect(harness.page.activitySection).toBeUndefined();
    expect(harness.page.logSection.titlePlaque.title.text).toBe('Chronicle');
    expect(harness.page.logSection.entries.getWidgets()).toHaveLength(80);
    const newest = harness.page.logSection.entries.get('log-newest');
    const paired = harness.page.logSection.entries.get('log-paired');
    expect(newest.root.y).toBe(0);
    expect(newest.authorLabel.text).toBe('Mira');
    expect(newest.authorLabel.textObject.style.fontWeight).toBe('bold');
    expect(newest.timeLabel.text).toBe('Now');
    expect(newest.messageLabel.text).toBe('Reaches level 3.');
    expect(newest.avatars[0].icon.visible).toBe(true);
    expect(paired.root.y).toBeGreaterThan(newest.root.y);
    expect(paired.authorLabel.text).toBe('Mira & Orin Moss');
    expect(paired.timeLabel.text).toBe('28m ago');
    expect(paired.messageLabel.text).toBe('Share supper and trade stories.');
    expect(paired.avatars.filter(({ icon }) => icon.visible)).toHaveLength(2);
    expect(harness.page.logSection.countLabel.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('lays out a Chronicle entry like a chat message without lowercasing copy', () => {
    const row = new GuildChronicleEntryRow({
      assetManager: createPixiAssetManagerFake(Texture),
      label: 'guild:test-chronicle-entry',
    });
    row.bind('entry', {
      authorLabel: 'mira ashveil',
      message: 'returns with the moonstone ledger.',
      participants: [
        { displayName: 'mira ashveil', iconKey: 'adventurer_cleric' },
      ],
      timeLabel: '28m ago',
    });
    const height = row.getPreferredHeight(358);
    row.setBounds(0, 0, 358, height);

    expect(row.authorLabel.text).toBe('Mira Ashveil');
    expect(row.messageLabel.text).toBe('Returns with the moonstone ledger.');
    expect(row.authorLabel.x).toBe(54);
    expect(row.messageLabel.y).toBe(27);
    expect(row.timeLabel.x).toBe(350);
    expect(height).toBeGreaterThanOrEqual(58);

    row.destroy();
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
          lore: 'map the lantern-lit route beneath the fish market and return unseen.',
          difficulty: 'easy',
          statLabel: 'cunning / agility',
          rewardText: '120-180 coin, 2-4 seeds, or 1-3 herbs',
        },
        {
          id: 'quest-3',
          title: 'hilltop watch',
          lore: 'guard the old road until sunrise and report every passing cart.',
          difficulty: 'medium',
          statLabel: 'discipline / endurance',
          rewardText: '90-140 coin, 1-3 seeds, or 1-2 herbs',
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
      xp: 14,
      nextLevelXp: 40,
      status: 'idle',
      personalityLabel: 'loyal',
      stats: {
        strength: 2,
      },
    },
    actionLabel: dialogId === GUILD_DIALOG_IDS.APPLICANT ? 'hire' : 'fire',
    action: vi.fn(),
  };
}
