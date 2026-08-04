// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import {
  PIXI_DIALOG_FOOTER_TABS_GEOMETRY,
  PixiDialogFrame,
} from '../../primitives/PixiDialogFrame.js';
import { PIXI_ROOT_RUN_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import { GUILD_DIALOG_IDS } from './GuildDialogPixi.js';
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
    expect(quest.reward.text).toBe('reward: 25 coin');
    expect(adventurer.statusLabel.text).toBe('resting');

    pages.deactivate();
    expect(root).toMatchObject({
      eventMode: 'none',
      renderable: false,
      visible: false,
    });
    pages.destroy();
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

  it('routes semantic quest/person actions and keeps source anchors', () => {
    const harness = createHarness();
    harness.page.bind(createGuildViewModel());
    harness.page.activate();

    for (const [tabId, button] of harness.page.tabButtons) {
      expect(button.variant, tabId).toBe('tab');
      expect(button.buttonHeight, tabId).toBe(28);
      expect(button.rootRunFrame.compatibilityError, tabId).toBeNull();
    }
    expect(
      harness.page.tabButtons.get('hall').rootRunFrame.borderInsets,
    ).toMatchObject({ top: 13, bottom: 9 });
    expect(
      harness.page.tabButtons.get('board').rootRunFrame.borderInsets,
    ).toMatchObject({ top: 13, bottom: 9 });
    expect(harness.page.secretarySection.button).toMatchObject({
      buttonHeight: 20,
      sizeTier: 30,
    });
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
    ).toMatchObject({ x: 16, y: 104 });
    expect(harness.page.tabLayer.position).toMatchObject({
      x: 16,
      y: 527.3333333333334,
    });
    expect(
      harness.page.tabScrolls.get('hall').viewportHeight,
    ).toBeCloseTo(417.33333333333337, 10);

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
    const requestRow = requestStack.requestRows.getWidgets()[0];

    expect(inputRouter.getTopModal()?.id).toBe(
      GUILD_DIALOG_IDS.REQUEST_STACK,
    );
    expect(requestStack.panel).toBeInstanceOf(PixiDialogFrame);
    expect(requestRow.title.text).toBe('Smuggler Tunnel');
    expect(requestStack.detail.lore.text).toBe(
      'a narrow road under the hill.',
    );
    expect(requestStack.detail.rows[0].value.text).toBe('Easy');
    expect(requestStack.postButton.text.text).toBe('Post');
    expect(requestStack.nextButton.text.text).toBe('Only Page');
    expect(inputRouter.handleBack({ source: 'native' })).toBe(true);
    expect(
      harness.dialogs.isOpen(GUILD_DIALOG_IDS.REQUEST_STACK),
    ).toBe(false);
    expect(inputRouter.getTopModal()).toBeNull();

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });
});

function createHarness({ inputRouter = null } = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const semanticRegistry = new SemanticTargetRegistry();
  const page = new GuildPixiPage({
    assetManager: createPixiAssetManagerFake(Texture),
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
