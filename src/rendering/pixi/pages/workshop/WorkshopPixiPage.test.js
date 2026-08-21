// @vitest-environment jsdom

import { createPixiAssetManagerFake } from './PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import {
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  PixiDialogFrame,
} from '../../primitives/PixiDialogFrame.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { getPixiButtonAssetId } from '../../primitives/PixiButtonStyle.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  createPixiThemeSnapshot,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_TEXT_STROKE_COLOR,
  PIXI_UI_GEOMETRY,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';
import { RootRunInventoryChoiceRowPixi, ShopDialogPixi } from '../shop/ShopDialogPixi.js';
import { LeaderboardRowPixi, WorldChatMessageRowPixi } from './WorkshopDialogPixi.js';
import {
  RETAINED_DIALOG_LIST_GEOMETRY,
  RETAINED_DIALOG_SCROLL_GEOMETRY,
} from './RetainedPageKit.js';
import { QuestCompletionMotionCoordinator } from '../../managers/QuestCompletionMotionCoordinator.js';
import {
  ROOT_RUN_SIDE_ACTION_GEOMETRY,
  WORKSHOP_FIREFLY_COUNT,
  WORKSHOP_WINDOW_ASSET_ID,
  WORKSHOP_WINDOW_GEOMETRY,
  WorkshopPixiPage,
} from './WorkshopPixiPage.js';

describe('WorkshopPixiPage', () => {
  it('selects an eligible World Chat row only after the movement-safe hold threshold', () => {
    vi.useFakeTimers();
    const registrations = [];
    const inputRouter = {
      registerPressTarget: vi.fn((displayObject, descriptor) => {
        registrations.push({ displayObject, descriptor });
        return { unregister: vi.fn() };
      }),
    };
    const dialog = {
      assetManager: createPixiAssetManagerFake(Texture),
      contentTheme: createPixiThemeSnapshot({ theme: 'night' }),
      theme: createPixiThemeSnapshot({ theme: 'night' }),
      dialogId: 'workshop.worldChat',
      inputRouter,
      registerTarget: vi.fn(),
      unregisterTarget: vi.fn(),
    };
    const select = vi.fn(() => true);
    const row = new WorldChatMessageRowPixi({ dialog });
    const model = {
      id: 'message-one',
      username: 'Mira',
      body: 'Hello',
      canReport: true,
      onLongPress: select,
      reportHighlightId: 'world-chat-report:message-one',
    };
    row.bind(model);
    row.setBounds(0, 0, 288, row.getPreferredHeight());
    const rowPress = registrations.find(
      ({ displayObject }) => displayObject === row.root,
    ).descriptor;

    rowPress.onPressChange(true, { pointerId: 7 });
    vi.advanceTimersByTime(529);
    expect(select).not.toHaveBeenCalled();
    rowPress.onPressChange(false, { pointerId: 7, cancelled: true });
    vi.advanceTimersByTime(1);
    expect(select).not.toHaveBeenCalled();

    rowPress.onPressChange(true, { pointerId: 8 });
    vi.advanceTimersByTime(530);
    expect(select).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledWith(model);
    rowPress.onPressChange(false, { pointerId: 8, confirmed: true });
    expect(rowPress.onActivate()).toBe(false);

    row.bind({ ...model, selectedForReport: true });
    row.setBounds(0, 0, 288, row.getPreferredHeight());
    expect(row.getPreferredHeight()).toBeGreaterThan(52);
    expect(dialog.registerTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        semanticId: 'world-chat-report:message-one',
        displayObject: row.root,
      }),
    );

    row.bind({ ...model, isOwn: true, selectedForReport: true });
    expect(row.canReport()).toBe(false);
    row.destroy();
    vi.useRealTimers();
  });

  it('shows green or gray player presence beside chat usernames and omits it for System', () => {
    const dialog = {
      assetManager: createPixiAssetManagerFake(Texture),
      contentTheme: createPixiThemeSnapshot({ theme: 'night' }),
      theme: createPixiThemeSnapshot({ theme: 'night' }),
      dialogId: 'workshop.worldChat',
      inputRouter: null,
      registerTarget: vi.fn(),
      unregisterTarget: vi.fn(),
    };
    const row = new WorldChatMessageRowPixi({ dialog });

    row.bind({ username: 'Mira', body: 'Hello', connected: true });
    row.setBounds(0, 0, 288, row.getPreferredHeight());
    expect(row.presenceDot.visible).toBe(true);
    expect(row.presenceDot.x).toBeGreaterThan(row.username.x + row.username.width);
    expect(row.presenceDot.context.instructions[0].data.style.color).toBe(
      Number.parseInt('5f9f3f', 16),
    );

    row.bind({ username: 'Ada', body: 'Away', connected: false });
    row.setBounds(0, 0, 288, row.getPreferredHeight());
    expect(row.presenceDot.visible).toBe(true);
    expect(row.presenceDot.context.instructions[0].data.style.color).toBe(
      Number.parseInt('8d8172', 16),
    );

    row.bind({ type: 'system', username: 'System', body: 'News' });
    row.setBounds(0, 0, 288, row.getPreferredHeight());
    expect(row.presenceDot.visible).toBe(false);

    row.destroy();
  });

  it('uses the full Browse Alliance content hierarchy in leaderboard alliance rows', () => {
    const dialog = {
      assetManager: createPixiAssetManagerFake(Texture),
      contentTheme: createPixiThemeSnapshot({ theme: 'night' }),
      theme: createPixiThemeSnapshot({ theme: 'night' }),
      dialogId: 'workshop.leaderboard',
      inputRouter: null,
      registerTarget: vi.fn(),
      unregisterTarget: vi.fn(),
    };
    const row = new LeaderboardRowPixi({ dialog });

    row.bind({
      id: 'night-owls',
      type: 'leaderboardAlliance',
      rank: 2,
      name: 'Night Owls',
      allianceTag: 'OWL',
      allianceTagColor: 'violet',
      bannerColor: 'violet',
      emblemColor: 'white',
      emblemId: 'sunburst',
      leaderName: 'Elara',
      leaderCharacter: 'elara',
      leaderFrame: 'violet',
      memberCount: 34,
      memberCapacity: 50,
      current: true,
      totalCoinLabel: '707k',
      totalSuffix: 'weekly',
    });
    row.setBounds(0, 0, 258, row.getPreferredHeight());

    expect(row.getPreferredHeight()).toBe(78);
    expect(row.allianceFlag.flagWidth).toBe(56);
    expect(
      row.allianceFlag.x - (row.rank.x + row.rank.width / 2),
    ).toBe(3);
    expect(row.tag.style.fontSize).toBe(row.name.style.fontSize);
    expect(row.memberCount.text).toBe('34/50');
    expect(row.leaderName.text).toBe('Elara');
    expect(row.leaderRole.text).toBe('Leader');
    expect(row.leaderAvatarWidget.visible).toBe(true);
    expect(row.totalSuffix.text).toBe('weekly');
    expect(row.total.x).toBeGreaterThan(row.leaderName.x + row.leaderName.width);
    expect(row.total.y).toBeGreaterThan(row.leaderName.y);
    expect(row.total.y).toBeLessThan(row.leaderRole.y);
    expect(row.totalSuffix.x + row.totalSuffix.width).toBeLessThanOrEqual(
      row.background.frameWidth - 8,
    );
    expect(row.detail.visible).toBe(false);
    expect(row.currentOutline.context.instructions.at(-1)?.data?.style).toMatchObject({
      alpha: 0.9,
      width: 1.5,
    });

    row.bind({
      id: 'patient-night-traders',
      type: 'leaderboardAlliance',
      rank: 18,
      name: 'The Fellowship of Patient Night Traders Beyond The Moon',
      allianceTag: 'ROOT',
      leaderName: 'ArchwizardLongnameBeyondTheMoon',
      memberCount: 18,
      totalCoinLabel: '987.6m',
    });
    row.setBounds(0, 0, 258, row.getPreferredHeight());

    expect(row.memberCount.text).toBe('18/50');
    expect(
      row.allianceFlag.x - (row.rank.x + row.rank.width / 2),
    ).toBe(3);
    expect(row.name.text.endsWith('…')).toBe(true);
    expect(row.name.scale.x).toBeGreaterThanOrEqual(0.72);
    expect(row.name.x + row.name.width).toBeLessThan(row.memberCount.x - row.memberCount.width);
    expect(row.leaderName.text.endsWith('…')).toBe(true);
    expect(row.leaderName.x + row.leaderName.width).toBeLessThanOrEqual(
      row.total.x - 6,
    );

    row.destroy();
  });

  it('grounds the Workshop with passive window art behind the summon control', () => {
    const windowTexture = new Texture();
    const dayWindowTexture = new Texture();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn((assetId) => {
      if (assetId === WORKSHOP_WINDOW_ASSET_ID) {
        return windowTexture;
      }
      if (assetId === PIXI_ROOT_RUN_ASSETS.workshopWindowDay) {
        return dayWindowTexture;
      }
      return Texture.EMPTY;
    });
    const harness = createHarness({ assetManager });

    harness.page.bind(createWorkshopViewModel());

    expect(assetManager.getTexture).toHaveBeenCalledWith(WORKSHOP_WINDOW_ASSET_ID);
    expect(harness.page.workshopWindow.texture).toBe(windowTexture);
    expect(harness.page.workshopWindow.eventMode).toBe('none');
    expect(harness.page.workshopWindow.position).toMatchObject({
      x: PIXI_UI_GEOMETRY.sourceWidth / 2,
      y: WORKSHOP_WINDOW_GEOMETRY.top,
    });
    expect(harness.page.workshopWindow).toMatchObject({
      width: WORKSHOP_WINDOW_GEOMETRY.width,
      height: WORKSHOP_WINDOW_GEOMETRY.height,
      alpha: WORKSHOP_WINDOW_GEOMETRY.alpha,
    });
    expect(harness.page.content.getChildIndex(harness.page.workshopWindow)).toBeLessThan(
      harness.page.content.getChildIndex(harness.page.fireflies.root),
    );
    expect(harness.page.content.getChildIndex(harness.page.fireflies.root)).toBeLessThan(
      harness.page.content.getChildIndex(harness.page.summon.root),
    );
    expect(harness.page.fireflies.root.eventMode).toBe('none');
    expect(harness.page.fireflies.root.children).toHaveLength(WORKSHOP_FIREFLY_COUNT);

    harness.page.applyTheme(createPixiThemeSnapshot({ theme: 'day' }));
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.workshopWindowDay);
    expect(harness.page.workshopWindow.texture).toBe(dayWindowTexture);

    harness.page.destroy();
    harness.dispose();
  });

  it('flies ambient fireflies only while Workshop is active', () => {
    const motion = createAmbientMotionHarness();
    const harness = createHarness({
      ambientRequestFrame: motion.requestFrame,
      ambientCancelFrame: motion.cancelFrame,
      ambientTimeSource: motion.timeSource,
    });
    const firstFirefly = harness.page.fireflies.root.children[0];
    const restingPosition = { x: firstFirefly.x, y: firstFirefly.y };

    harness.page.activate();
    expect(motion.requestFrame).toHaveBeenCalledOnce();

    motion.runAt(1000);
    expect({ x: firstFirefly.x, y: firstFirefly.y }).not.toEqual(restingPosition);
    expect(motion.requestFrame).toHaveBeenCalledTimes(2);

    harness.page.deactivate();
    expect(motion.cancelFrame).toHaveBeenCalledOnce();

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps fireflies still when reduced motion is requested', () => {
    const motion = createAmbientMotionHarness();
    const harness = createHarness({
      ambientRequestFrame: motion.requestFrame,
      ambientCancelFrame: motion.cancelFrame,
      ambientTimeSource: motion.timeSource,
      reducedMotion: true,
    });
    const firstFirefly = harness.page.fireflies.root.children[0];
    const restingPosition = { x: firstFirefly.x, y: firstFirefly.y };

    harness.page.activate();

    expect(motion.requestFrame).not.toHaveBeenCalled();
    expect({ x: firstFirefly.x, y: firstFirefly.y }).toEqual(restingPosition);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps adjacent side-control hit areas from stealing leaderboard taps', () => {
    const harness = createHarness();

    harness.page.bind(createWorkshopViewModel());

    const leaderboard = harness.page.features.get('leaderboard');
    const tasks = harness.page.features.get('personalTasks');
    const leaderboardHitBottom =
      leaderboard.root.y + leaderboard.root.hitArea.y + leaderboard.root.hitArea.height;
    const tasksHitTop = tasks.root.y + tasks.root.hitArea.y;

    expect(leaderboardHitBottom).toBeLessThanOrEqual(tasksHitTop);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders World Event donation with the retained icon, slider, and green confirm flow', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => Texture.EMPTY);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const onChange = vi.fn();
    const donate = vi.fn();
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldEventDonate = {
      title: 'Post Road Bounties',
      featuredItem: {
        id: 'giving',
        label: 'Coin',
        detail: 'Owned',
        value: '100',
        resourceKey: 'coin',
        iconSize: 36,
      },
      summaryRows: [
        {
          id: 'total',
          label: 'Already Donated',
          value: '25 points',
        },
        {
          id: 'amount',
          label: 'Amount',
          value: '25 / 100',
        },
        {
          id: 'points',
          label: 'Earn',
          value: '+25 points',
          valueTone: 'root',
        },
      ],
      range: {
        enabled: true,
        tone: 'root',
        min: 1,
        max: 100,
        step: 1,
        value: 25,
        onChange,
      },
      actions: [
        {
          id: 'confirm',
          label: 'Donate x25',
          variant: 'green',
          enabled: true,
          action: donate,
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('worldEventDonate');

    const dialog = harness.dialogs.get('workshop.worldEventDonate');
    expect(dialog).toBeInstanceOf(ShopDialogPixi);
    expect(dialog.panel.titleLabel.textObject.text).toBe('Post Road Bounties');
    expect(dialog.model.items).toEqual([]);
    expect(dialog.rangeControl).toMatchObject({
      visible: true,
      enabled: true,
      min: 1,
      max: 100,
      value: 25,
      tone: 'root',
    });
    expect(dialog.featuredItemRow.background.visible).toBe(true);
    expect(dialog.featuredItemRow.detail.text).toBe('Owned');
    expect(dialog.featuredItemRow.value.text).toBe('100');
    expect(dialog.featuredItemRow.itemIcon.width).toBe(36);
    expect(dialog.featuredItemRow.root.hitArea.height).toBe(50);
    expect(dialog.summaryRows.get('total').root.x).toBe(0);
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.settingsRow);
    expect(dialog.summaryRows.get('amount').root.y).toBeLessThan(dialog.rangeControl.y);
    expect(dialog.rangeControl.y).toBeLessThan(dialog.summaryRows.get('points').root.y);
    expect(dialog.rangeControl.x).toBe(-12);
    expect(dialog.rangeControl.controlWidth).toBeGreaterThan(dialog.panel.contentBoxWidth);
    const confirm = dialog.actions.get('confirm');
    expect(confirm.variant).toBe('green');
    expect(confirm.control.textLabel.y).toBeCloseTo(
      confirm.height / 2 + confirm.control.activeSkin.contentOffsetY + 1,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(getPixiButtonAssetId('green', 30));

    dialog.rangeControl.commitRange(30);
    confirm.control.activate();
    expect(onChange).toHaveBeenCalledWith(30);
    expect(donate).toHaveBeenCalledOnce();

    harness.page.destroy();
    harness.dispose();
  });

  it("keeps the Elara's Request title passive and does not register an info dialog", () => {
    const harness = createHarness();

    harness.page.bind(createWorkshopViewModel());

    expect(harness.dialogs.has('workshop.tasksInfo')).toBe(false);
    expect(harness.page.tasks.panel.title.eventMode).toBe('none');
    expect(harness.page.tasks.panel.title.visible).toBe(false);
    expect(harness.page.tasks.titleRibbon.root.eventMode).toBe('none');
    expect(harness.page.tasks.titleRibbon.title.text).toBe("Elara's Request");
    expect(harness.page.tasks.titleRibbon.stars.visible).toBe(false);

    harness.page.tasks.panel.title.emit('pointertap');

    expect(harness.dialogs.isOpen('workshop.tasksInfo')).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the Research row paper typography throughout the request panel', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.tasks.nextText = 'next request';
    model.workshop.tasks.rewards = ['1 crystal'];

    harness.page.bind(model);

    const row = harness.page.tasks.rows.get('request-1');
    const title = harness.page.tasks.panel.title;
    expect(title.style.fontFamily).toBe(harness.page.theme.fontFamily);
    expect(title.style.fontWeight).toBe('400');
    expect(title.style.fill).toBe('#ffffff');
    expect(title.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(title.style.fontSize),
      join: 'round',
    });
    for (const text of [
      harness.page.tasks.next,
      harness.page.tasks.rewardsTitle,
      harness.page.tasks.rewards,
      row.label,
      row.value,
    ]) {
      expect(text.style.fontFamily).toBe(harness.page.theme.fontFamily);
      expect(text.style.fontWeight).toBe('400');
      expect(text.style.fill).toBe('#634934');
      expect(text.style.stroke?.width ?? 0).toBe(0);
    }

    harness.page.destroy();
    harness.dispose();
  });

  it('gives the active request stronger icon, text, and vertical priority', () => {
    const harness = createHarness();

    harness.page.bind(createWorkshopViewModel());

    const row = harness.page.tasks.rows.get('request-1');
    expect(row.icon.width).toBe(32);
    expect(row.icon.height).toBe(32);
    expect(row.label.style.fontSize).toBe(16);
    expect(row.value.style.fontSize).toBe(16);
    expect(row.progress.root.y).toBe(38);
    expect(row.getPreferredHeight()).toBe(48);
    expect(harness.page.tasks.height).toBe(77);

    const ribbon = harness.page.tasks.titleRibbon;
    expect(ribbon.assetId).toBe(PIXI_ROOT_RUN_ASSETS.workshopRequestTitleRibbon);
    expect(ribbon.geometry).toBe(PIXI_ROOT_RUN_GEOMETRY.workshopRequestTitleRibbon);
    expect(ribbon.height).toBe(38);
    expect(ribbon.frame.sourceInsets).toEqual({
      top: 14,
      right: 34,
      bottom: 14,
      left: 34,
    });
    expect(ribbon.frame.borderInsets).toEqual({
      top: 18,
      right: 34,
      bottom: 18,
      left: 34,
    });
    expect(ribbon.root.scale.x).toBe(0.8855);
    expect(ribbon.root.scale.y).toBe(0.8855);
    expect(ribbon.root.y).toBe(-17);
    expect(ribbon.geometry.contentOffsetY).toBe(-2);
    expect(ribbon.title.y).toBe(17);
    const renderedRibbonHeight = ribbon.height * ribbon.root.scale.y;
    const renderedTitleLineHeight = ribbon.geometry.titleLineHeight * ribbon.root.scale.y;
    expect(renderedRibbonHeight - renderedTitleLineHeight).toBeGreaterThanOrEqual(11);
    expect(ribbon.root.x + ribbon.contentGroupCenterX * ribbon.root.scale.x).toBeCloseTo(
      harness.page.tasks.width / 2,
    );
    expect(ribbon.title.fontSize).toBe(20);
    expect(row.root.y).toBe(16);
    expect(row.root.y - (ribbon.root.y + renderedRibbonHeight)).toBeCloseTo(-0.649);
    expect(row.root.y + row.label.y - (ribbon.root.y + renderedRibbonHeight)).toBeCloseTo(4.351);

    harness.page.destroy();
    harness.dispose();
  });

  it('shows active research as a live blue request timer even with reduced motion', () => {
    const motion = createWorkshopMotionHarness();
    const harness = createHarness({
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      reducedMotion: () => true,
    });
    const model = createWorkshopViewModel({
      taskLabel: 'Researching Mint Seed',
    });
    model.workshop.tasks.rows[0] = {
      ...model.workshop.tasks.rows[0],
      current: 0,
      required: 1,
      value: '8s',
      researchTimer: {
        active: true,
        totalMs: 10_000,
        remainingMs: 8_000,
      },
    };

    harness.page.bind(model);

    const row = harness.page.tasks.rows.get('request-1');
    expect(row.progress.root.visible).toBe(false);
    expect(row.researchProgress.root.visible).toBe(true);
    expect(row.researchProgress.tone).toBe('blue');
    expect(row.researchProgress.progress).toBeCloseTo(0.2);
    expect(row.value.text).toBe('8s');

    row.updateMotion(1_000);

    expect(row.researchProgress.progress).toBeCloseTo(0.3);
    expect(row.value.text).toBe('7s');
    expect(row.progressShineRoot.visible).toBe(false);

    row.startCompletionFill(260);

    expect(row.researchTimer).toBeNull();
    expect(row.researchProgress.root.visible).toBe(false);
    expect(row.progress.root.visible).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the priority card height fixed and fits long request labels', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.tasks.rows[0].label = 'Research Mana Tonic Brewing Speed Improvement Upgrade II';

    harness.page.bind(model);

    const row = harness.page.tasks.rows.get('request-1');
    expect(row.label.style.wordWrap).toBe(false);
    expect(row.label.style.fontSize).toBeLessThan(16);
    expect(row.label.style.fontSize).toBeGreaterThanOrEqual(13);
    expect(row.label.y + row.label.height / 2).toBeCloseTo(14.5);
    expect(row.progress.root.y).toBe(38);
    expect(row.getPreferredHeight()).toBe(48);
    expect(harness.page.tasks.height).toBe(77);

    harness.page.destroy();
    harness.dispose();
  });

  it('backs the entire Elara request widget with the shared Research row skin', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({ assetManager });

    harness.page.bind(createWorkshopViewModel());

    const row = harness.page.tasks.rows.get('request-1');
    expect(harness.page.tasks.background).toBeInstanceOf(PixiNineSliceFrame);
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.researchCard);
    expect(harness.page.tasks.root.getChildIndex(harness.page.tasks.background)).toBe(0);
    expect(harness.page.tasks.background.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
    );
    expect(harness.page.tasks.background.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    expect(harness.page.tasks.background.frameWidth).toBe(harness.page.tasks.width);
    expect(harness.page.tasks.background.frameHeight).toBe(harness.page.tasks.height);
    expect(harness.page.tasks.panel.frame.visible).toBe(false);
    expect(harness.page.tasks.panel.fallback.visible).toBe(false);
    expect(row.background).toBeUndefined();

    harness.page.destroy();
    harness.dispose();
  });

  it('lands the white shine before filling to the reached point without boinking the rail', () => {
    const motion = createWorkshopMotionHarness();
    const questCompletionMotionCoordinator = new QuestCompletionMotionCoordinator();
    const harness = createHarness({
      questCompletionMotionCoordinator,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      reducedMotion: () => false,
    });
    harness.page.activate();
    harness.page.bind(createWorkshopViewModel());

    const outgoingRow = harness.page.tasks.rows.get('request-1');
    expect(outgoingRow.displayedProgress).toBe(0.5);
    expect(outgoingRow.progressShineRoot.visible).toBe(false);

    const progressedModel = createWorkshopViewModel();
    progressedModel.workshop.tasks.rows[0].current = 2;
    progressedModel.workshop.tasks.rows[0].required = 3;
    harness.page.bind(progressedModel);

    expect(outgoingRow.progressShineRoot.visible).toBe(true);
    const initialShineX = outgoingRow.progressShine.x;

    motion.runAt(150);
    expect(outgoingRow.displayedProgress).toBe(0.5);
    expect(outgoingRow.progressShine.x).toBeGreaterThan(initialShineX);
    expect(outgoingRow.progress.root.scale.x).toBe(1);

    motion.runAt(299);
    expect(outgoingRow.displayedProgress).toBe(0.5);
    expect(outgoingRow.progressShineRoot.visible).toBe(true);

    motion.runAt(300);
    expect(outgoingRow.displayedProgress).toBe(0.5);
    expect(outgoingRow.progressShineRoot.visible).toBe(false);

    motion.runAt(410);
    expect(outgoingRow.displayedProgress).toBeGreaterThan(0.5);
    expect(outgoingRow.displayedProgress).toBeLessThan(2 / 3);
    expect(outgoingRow.progress.root.scale.x).toBe(1);

    motion.runAt(520);
    expect(outgoingRow.displayedProgress).toBeCloseTo(2 / 3);
    expect(outgoingRow.progressShineRoot.visible).toBe(false);
    expect(outgoingRow.progress.root.scale.x).toBe(1);
  });

  it('queues newer request progress without restarting the in-flight shine', () => {
    const motion = createWorkshopMotionHarness();
    const harness = createHarness({
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      reducedMotion: () => false,
    });
    harness.page.activate();
    harness.page.bind(createWorkshopViewModel());

    const row = harness.page.tasks.rows.get('request-1');
    const firstProgressModel = createWorkshopViewModel();
    firstProgressModel.workshop.tasks.rows[0].current = 2;
    firstProgressModel.workshop.tasks.rows[0].required = 3;
    harness.page.bind(firstProgressModel);

    motion.runAt(150);
    const secondProgressModel = createWorkshopViewModel();
    secondProgressModel.workshop.tasks.rows[0].current = 5;
    secondProgressModel.workshop.tasks.rows[0].required = 6;
    harness.page.bind(secondProgressModel);

    expect(row.progressFeedback.startedAtMs).toBe(0);
    expect(row.progressMotion.end).toBeCloseTo(2 / 3);
    expect(row.queuedProgress.progress).toBeCloseTo(5 / 6);

    motion.runAt(300);
    expect(row.displayedProgress).toBe(0.5);
    expect(row.progressShineRoot.visible).toBe(false);

    motion.runAt(520);
    expect(row.displayedProgress).toBeCloseTo(2 / 3);
    expect(row.progressFeedback.startedAtMs).toBe(520);
    expect(row.progressShineRoot.visible).toBe(true);

    motion.runAt(820);
    expect(row.displayedProgress).toBeCloseTo(2 / 3);
    expect(row.progressShineRoot.visible).toBe(false);

    motion.runAt(1040);
    expect(row.displayedProgress).toBeCloseTo(5 / 6);
    expect(row.progressMotion).toBeNull();
    expect(row.queuedProgress).toBeNull();

    harness.page.destroy();
    harness.dispose();
  });

  it('lets request completion supersede queued progress motion', () => {
    const motion = createWorkshopMotionHarness();
    const questCompletionMotionCoordinator = new QuestCompletionMotionCoordinator();
    const harness = createHarness({
      questCompletionMotionCoordinator,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      reducedMotion: () => false,
    });
    harness.page.activate();
    harness.page.bind(createWorkshopViewModel());

    const row = harness.page.tasks.rows.get('request-1');
    const firstProgressModel = createWorkshopViewModel();
    firstProgressModel.workshop.tasks.rows[0].current = 2;
    firstProgressModel.workshop.tasks.rows[0].required = 3;
    harness.page.bind(firstProgressModel);

    motion.runAt(150);
    const secondProgressModel = createWorkshopViewModel();
    secondProgressModel.workshop.tasks.rows[0].current = 5;
    secondProgressModel.workshop.tasks.rows[0].required = 6;
    harness.page.bind(secondProgressModel);
    expect(row.queuedProgress.progress).toBeCloseTo(5 / 6);

    questCompletionMotionCoordinator.begin({
      previousTaskId: 'request-1',
      nextTaskId: 'request-2',
      fillDurationMs: 260,
    });

    expect(row.queuedProgress).toBeNull();
    expect(row.progressFeedback.startedAtMs).toBe(150);
    expect(row.progressMotion).toMatchObject({
      end: 1,
      completion: true,
      startedAtMs: 450,
    });

    motion.runAt(450);
    expect(row.displayedProgress).toBe(0.5);
    motion.runAt(710);
    expect(row.displayedProgress).toBe(1);

    harness.page.destroy();
    questCompletionMotionCoordinator.destroy();
    harness.dispose();
  });

  it('reveals the next request with the restrained request-card completion snap', () => {
    const motion = createWorkshopMotionHarness();
    const questCompletionMotionCoordinator = new QuestCompletionMotionCoordinator();
    const harness = createHarness({
      questCompletionMotionCoordinator,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      reducedMotion: () => false,
    });
    harness.page.activate();
    harness.page.bind(createWorkshopViewModel());

    const outgoingRow = harness.page.tasks.rows.get('request-1');

    const transitionId = questCompletionMotionCoordinator.begin({
      previousTaskId: 'request-1',
      nextTaskId: 'request-2',
      fillDurationMs: 260,
    });
    const nextModel = createWorkshopViewModel();
    nextModel.workshop.tasks.rows = [
      {
        id: 'request-2',
        label: 'brew mana tonic',
        current: 0,
        required: 1,
      },
    ];
    harness.page.bind(nextModel);

    expect(harness.page.tasks.rows.get('request-1')).toBe(outgoingRow);
    expect(harness.page.tasks.rows.get('request-2')).toBeNull();

    motion.runAt(260);
    expect(outgoingRow.displayedProgress).toBe(0.5);
    expect(outgoingRow.progressShineRoot.visible).toBe(true);

    motion.runAt(300);
    expect(outgoingRow.displayedProgress).toBe(0.5);
    expect(outgoingRow.progressShineRoot.visible).toBe(false);

    motion.runAt(560);
    expect(outgoingRow.displayedProgress).toBe(1);
    expect(outgoingRow.progressShineRoot.visible).toBe(false);
    expect(outgoingRow.progress.root.scale.x).toBe(1);

    questCompletionMotionCoordinator.startFlight(transitionId);
    expect(harness.page.tasks.rows.get('request-1')).toBe(outgoingRow);

    questCompletionMotionCoordinator.complete(transitionId);
    expect(harness.page.tasks.rows.get('request-1')).toBeNull();
    const incomingRow = harness.page.tasks.rows.get('request-2');
    expect(incomingRow).toBeDefined();
    expect(incomingRow.root.hitArea?.width).toBe(harness.page.tasks.width - 20);
    expect(incomingRow.icon.width).toBe(32);
    expect(incomingRow.label.y).toBe(5);
    expect(harness.page.tasks.root.scale.x).toBe(1);
    expect(incomingRow.progress.root.scale.x).toBe(1);

    const requestCard = harness.page.tasks;
    const anchorX = requestCard.width - 10;
    const anchorY = requestCard.height / 2;
    expect(requestCard.root.pivot.x).toBeCloseTo(anchorX);
    expect(requestCard.root.pivot.y).toBeCloseTo(anchorY);

    motion.runAt(663.5);
    expect(requestCard.root.scale.x).toBeCloseTo(1.018, 3);
    expect(requestCard.root.position.x).toBeCloseTo(requestCard.x + anchorX);
    expect(requestCard.root.position.y).toBeCloseTo(requestCard.y + anchorY - 2, 3);
    expect(incomingRow.progress.root.scale.x).toBe(1);

    motion.runAt(730.2);
    expect(requestCard.root.scale.x).toBeCloseTo(0.996, 3);
    expect(requestCard.root.position.y).toBeCloseTo(requestCard.y + anchorY + 1, 3);

    motion.runAt(790);
    expect(requestCard.root.scale.x).toBe(1);
    expect(requestCard.root.position.x).toBeCloseTo(requestCard.x + anchorX);
    expect(requestCard.root.position.y).toBeCloseTo(requestCard.y + anchorY);
    expect(requestCard.completionBoink).toBeNull();

    harness.page.destroy();
    questCompletionMotionCoordinator.destroy();
    harness.dispose();
  });

  it('reveals the next request without a box boink for reduced motion', () => {
    const questCompletionMotionCoordinator = new QuestCompletionMotionCoordinator();
    const harness = createHarness({
      questCompletionMotionCoordinator,
      reducedMotion: () => true,
    });
    harness.page.activate();
    harness.page.bind(createWorkshopViewModel());

    const transitionId = questCompletionMotionCoordinator.begin({
      previousTaskId: 'request-1',
      nextTaskId: 'request-2',
    });
    const nextModel = createWorkshopViewModel();
    nextModel.workshop.tasks.rows = [
      {
        id: 'request-2',
        label: 'brew mana tonic',
        current: 0,
        required: 1,
      },
    ];
    harness.page.bind(nextModel);

    questCompletionMotionCoordinator.complete(transitionId);

    expect(harness.page.tasks.rows.get('request-1')).toBeNull();
    expect(harness.page.tasks.rows.get('request-2')).toBeDefined();
    expect(harness.page.tasks.completionBoink).toBeNull();
    expect(harness.page.tasks.root.scale.x).toBe(1);

    harness.page.destroy();
    questCompletionMotionCoordinator.destroy();
    harness.dispose();
  });

  it('renders Workshop side controls with capitalized labels and optically normalized art', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.features = [{ id: 'prestige', visible: true }];
    harness.page.bind(model);

    const sideControls = [
      harness.page.bagButton,
      harness.page.statsButton,
      harness.page.inboxButton,
      harness.page.features.get('alliance'),
      harness.page.features.get('leaderboard'),
      harness.page.features.get('discoveries'),
      harness.page.features.get('personalTasks'),
      harness.page.features.get('worldEvent'),
      harness.page.features.get('prestige'),
    ];

    expect(sideControls.map((control) => control.label.text)).toEqual([
      'Bag',
      'Stats',
      'Inbox',
      'Alliance',
      'Leaderboard',
      'Discoveries',
      'Tasks',
      'Event',
      'Prestige',
    ]);
    for (const control of sideControls) {
      expect(control.label.style.fill).toBe('#ffffff');
      expect(control.label.style.stroke).toMatchObject({
        color: '#0a0a0a',
        width: resolvePixiTextStrokeWidth(control.label.style.fontSize),
        join: 'round',
      });
      expect(control.icon.x).toBe(
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width / 2 +
          (control.side === 'right' ? 1 : -1) * ROOT_RUN_SIDE_ACTION_GEOMETRY.iconEdgeNudge,
      );
    }
    expect(harness.page.statsButton.textureId).toBe(PIXI_ROOT_RUN_ASSETS.workshopStats);
    expect(harness.page.bagButton.iconScale).toBe(0.72);
    expect(harness.page.statsButton.iconScale).toBe(0.72);
    expect(harness.page.inboxButton.iconScale).toBe(0.72);
    expect(harness.page.features.get('alliance').presentation.scale).toBeUndefined();
    expect(harness.page.features.get('leaderboard').presentation.scale).toBeUndefined();
    expect(harness.page.features.get('discoveries').presentation.scale).toBeUndefined();
    expect(harness.page.features.get('personalTasks').presentation.scale).toBeUndefined();
    expect(harness.page.features.get('worldEvent').presentation.scale).toBeUndefined();
    expect(harness.page.features.get('prestige').presentation).toMatchObject({
      assetId: PIXI_ROOT_RUN_ASSETS.workshopPrestige,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('centers side-control copy under the shifted art and attaches badges to the art frame', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.inbox = {
      notification: true,
    };
    model.workshop.features = [
      {
        id: 'worldEvent',
        notification: true,
      },
    ];

    harness.page.bind(model);

    const sideControls = [
      harness.page.bagButton,
      harness.page.statsButton,
      harness.page.inboxButton,
      harness.page.features.get('alliance'),
      harness.page.features.get('leaderboard'),
      harness.page.features.get('discoveries'),
      harness.page.features.get('personalTasks'),
      harness.page.features.get('worldEvent'),
    ];
    for (const control of sideControls) {
      expect(control.label.anchor.x).toBe(0.5);
      expect(control.label.x).toBe(control.iconFrame.x);
    }

    const event = harness.page.features.get('worldEvent');
    expect(event.timer.anchor.x).toBe(0.5);
    expect(event.timer.x).toBe(event.iconFrame.x);

    const badgeX =
      ROOT_RUN_SIDE_ACTION_GEOMETRY.width +
      PIXI_UI_GEOMETRY.notificationOutset -
      PIXI_UI_GEOMETRY.notificationSize / 2;
    const badgeY = -PIXI_UI_GEOMETRY.notificationOutset + PIXI_UI_GEOMETRY.notificationSize / 2;
    expect(harness.page.inboxButton.notification.root.position).toMatchObject({
      x: badgeX,
      y: badgeY,
    });
    expect(event.notification.root.position).toMatchObject({
      x: badgeX,
      y: badgeY,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('packs visible side controls from the top by side and weight', () => {
    const harness = createHarness({ reducedMotion: true });
    const model = createWorkshopViewModel();
    model.workshop.stats = {
      side: 'right',
      weight: 0,
    };
    model.workshop.inbox = {
      side: 'left',
      weight: 5,
    };
    model.workshop.bag = {
      side: 'right',
      weight: 25,
    };
    model.workshop.features = [
      {
        id: 'alliance',
        side: 'left',
        weight: 20,
        visible: true,
      },
      {
        id: 'leaderboard',
        side: 'left',
        weight: 10,
        visible: true,
      },
      {
        id: 'discoveries',
        side: 'right',
        weight: 30,
        visible: true,
      },
      {
        id: 'personalTasks',
        visible: false,
      },
      {
        id: 'worldEvent',
        visible: false,
      },
    ];

    harness.page.bind(model);

    expect(harness.page.inboxButton.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page),
    });
    expect(harness.page.features.get('leaderboard').root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page) + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch,
    });
    expect(harness.page.features.get('alliance').root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page) + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch * 2,
    });
    expect(harness.page.statsButton.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: getExpectedSideControlsTop(harness.page),
    });
    expect(harness.page.bagButton.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: getExpectedSideControlsTop(harness.page) + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch,
    });
    expect(harness.page.features.get('discoveries').root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: getExpectedSideControlsTop(harness.page) + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch * 2,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('animates side-control appearance and removal without reserving a hidden slot', () => {
    const frames = [];
    let frameId = 0;
    const requestFrame = vi.fn((callback) => {
      frames.push(callback);
      frameId += 1;
      return frameId;
    });
    const harness = createHarness({
      requestFrame,
      cancelFrame: vi.fn(),
      reducedMotion: false,
    });
    const model = createWorkshopViewModel();
    model.workshop.stats = { visible: false };
    model.workshop.inbox = { visible: false };
    model.workshop.bag = { visible: false };
    model.workshop.features = [
      { id: 'alliance', visible: false },
      { id: 'leaderboard', visible: false },
      { id: 'discoveries', visible: false },
      { id: 'personalTasks', visible: false },
      { id: 'worldEvent', visible: false },
    ];
    harness.page.bind(model);

    const alliance = harness.page.features.get('alliance');
    expect(alliance.root.visible).toBe(false);

    model.workshop.features[0] = {
      id: 'alliance',
      side: 'left',
      weight: 10,
      visible: true,
    };
    harness.page.bind(model);

    expect(alliance.root.visible).toBe(true);
    expect(alliance.root.position).toMatchObject({
      x: 0,
      y: getExpectedSideControlsTop(harness.page) + 3,
    });
    expect(alliance.root.alpha).toBe(0);
    expect(alliance.root.scale.x).toBe(0.96);

    frames.shift()(0);
    frames.shift()(100);
    expect(alliance.root.position.x).toBeGreaterThan(0);
    expect(alliance.root.position.x).toBeLessThan(ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge);
    expect(alliance.root.alpha).toBeGreaterThan(0);
    expect(alliance.root.alpha).toBeLessThan(1);

    frames.shift()(200);
    expect(alliance.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page),
    });
    expect(alliance.root.alpha).toBe(1);
    expect(alliance.root.scale.x).toBe(1);

    model.workshop.features[0] = {
      ...model.workshop.features[0],
      visible: false,
    };
    harness.page.bind(model);
    expect(alliance.root.visible).toBe(true);
    expect(alliance.root.eventMode).toBe('none');

    frames.shift()(0);
    frames.shift()(75);
    expect(alliance.root.alpha).toBeGreaterThan(0);
    expect(alliance.root.alpha).toBeLessThan(1);

    frames.shift()(150);
    expect(alliance.root.visible).toBe(false);
    expect(alliance.root.renderable).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps newly unlocked side controls hidden until the unlock announcement clears', () => {
    const frames = [];
    let frameId = 0;
    let unlockAnimationBlocked = true;
    const requestFrame = vi.fn((callback) => {
      frames.push(callback);
      frameId += 1;
      return frameId;
    });
    const harness = createHarness({
      requestFrame,
      cancelFrame: vi.fn(),
      reducedMotion: false,
    });
    vi.spyOn(harness.dialogs, 'isOpen').mockImplementation(
      (dialogId) => dialogId === 'global.announcement' && unlockAnimationBlocked,
    );
    const model = createWorkshopViewModel();
    model.workshop.stats = { visible: false };
    model.workshop.inbox = { visible: false };
    model.workshop.bag = { visible: false };
    model.workshop.features = [
      { id: 'alliance', visible: false },
      { id: 'leaderboard', visible: false },
      { id: 'discoveries', visible: false },
      { id: 'personalTasks', visible: false },
      { id: 'worldEvent', visible: false },
    ];
    harness.page.bind(model);

    model.workshop.features[0] = {
      id: 'alliance',
      side: 'left',
      weight: 10,
      visible: true,
    };
    harness.page.bind(model);

    const alliance = harness.page.features.get('alliance');
    expect(alliance.root.alpha).toBe(0);
    expect(alliance.root.renderable).toBe(false);

    frames.shift()(0);
    frames.shift()(1000);
    expect(alliance.root.alpha).toBe(0);
    expect(alliance.root.renderable).toBe(false);

    unlockAnimationBlocked = false;
    frames.shift()(1016);
    expect(alliance.root.alpha).toBe(0);
    expect(alliance.root.renderable).toBe(true);

    frames.shift()(1116);
    expect(alliance.root.alpha).toBeGreaterThan(0);
    expect(alliance.root.alpha).toBeLessThan(1);

    frames.shift()(1216);
    expect(alliance.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page),
    });
    expect(alliance.root.alpha).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('snaps a reduced-motion side control only after the unlock announcement clears', () => {
    const frames = [];
    let unlockAnimationBlocked = true;
    const requestFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const harness = createHarness({
      requestFrame,
      cancelFrame: vi.fn(),
      reducedMotion: true,
      isUnlockAnimationBlocked: () => unlockAnimationBlocked,
    });
    const model = createWorkshopViewModel();
    model.workshop.stats = { visible: false };
    model.workshop.inbox = { visible: false };
    model.workshop.bag = { visible: false };
    model.workshop.features = [
      { id: 'alliance', visible: false },
      { id: 'leaderboard', visible: false },
      { id: 'discoveries', visible: false },
      { id: 'personalTasks', visible: false },
      { id: 'worldEvent', visible: false },
    ];
    harness.page.bind(model);

    model.workshop.features[0] = {
      id: 'alliance',
      side: 'left',
      weight: 10,
      visible: true,
    };
    harness.page.bind(model);

    const alliance = harness.page.features.get('alliance');
    expect(alliance.root.alpha).toBe(0);
    expect(alliance.root.renderable).toBe(false);

    frames.shift()(0);
    expect(alliance.root.renderable).toBe(false);

    unlockAnimationBlocked = false;
    frames.shift()(16);
    expect(alliance.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page),
    });
    expect(alliance.root.alpha).toBe(1);
    expect(alliance.root.renderable).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('snaps side-control visibility changes when reduced motion is requested', () => {
    const requestFrame = vi.fn();
    const harness = createHarness({
      requestFrame,
      reducedMotion: true,
    });
    const model = createWorkshopViewModel();
    model.workshop.features = [
      { id: 'alliance', visible: false },
      { id: 'leaderboard', visible: false },
      { id: 'discoveries', visible: false },
      { id: 'personalTasks', visible: false },
      { id: 'worldEvent', visible: false },
    ];
    harness.page.bind(model);

    model.workshop.features[0] = {
      id: 'alliance',
      side: 'left',
      weight: 10,
      visible: true,
    };
    harness.page.bind(model);

    const alliance = harness.page.features.get('alliance');
    expect(requestFrame).not.toHaveBeenCalled();
    expect(alliance.root.visible).toBe(true);
    expect(alliance.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page),
    });
    expect(alliance.root.alpha).toBe(1);
    expect(alliance.root.scale.x).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the compact shared yellow button for request actions', () => {
    const harness = createHarness();
    const turnIn = vi.fn(() => ({ ok: true }));
    const model = createWorkshopViewModel();
    model.workshop.tasks.rows[0].actionLabel = 'Turn In';
    model.workshop.tasks.rows[0].enabled = true;
    model.workshop.tasks.rows[0].onActivate = turnIn;

    harness.page.bind(model);

    const row = harness.page.tasks.rows.get('request-1');
    const action = row.action;
    expect(action.variant).toBe('yellow');
    expect(action.control.variant).toBe('yellow');
    expect(action.nineSlice.visible).toBe(true);
    expect(action.root.visible).toBe(true);
    expect(action).toMatchObject({
      width: 64,
      height: 24,
    });
    expect(action.root.y).toBe(4);
    expect(action.root.x + action.width).toBe(row.root.hitArea.width);
    expect(action.root.x - row.value.x).toBe(4);
    expect(row.progress.root.y).toBe(38);
    expect(row.getPreferredHeight()).toBe(48);
    expect(action.handleTap()).toEqual({ ok: true });
    expect(turnIn).toHaveBeenCalledWith(model.workshop.tasks.rows[0]);

    harness.page.destroy();
    harness.dispose();
  });

  it('routes automatic request row presses through the shared whole-row control', () => {
    const inputRouter = new PixiInputRouter();
    const navigate = vi.fn(() => true);
    const harness = createHarness({ inputRouter });
    const model = createWorkshopViewModel();
    model.workshop.tasks.rows[0].rowEnabled = true;
    model.workshop.tasks.rows[0].onRowActivate = navigate;

    harness.page.bind(model);

    const row = harness.page.tasks.rows.get('request-1');
    const registration = inputRouter.store
      .getRegistrations('press')
      .find((candidate) => candidate.displayObject === row.root);

    expect(registration).toMatchObject({
      excludePageSwipe: true,
      fallbackHitTest: true,
      haptic: 'light',
      hitTest: expect.any(Function),
    });
    expect(row.root.hitArea).toMatchObject({ width: 338, height: 48 });
    registration.onPressChange(true, { confirmed: false });
    expect(row.visual.scale.x).toBeCloseTo(0.97);
    registration.onPressChange(false, { confirmed: true });
    expect(registration.onActivate()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(model.workshop.tasks.rows[0]);

    harness.page.destroy();
    harness.dispose();
  });

  it('routes a retargeted tutorial-overlay press to the request action', () => {
    const inputRouter = new PixiInputRouter();
    const turnIn = vi.fn(() => ({ ok: true }));
    const harness = createHarness({ inputRouter });
    const model = createWorkshopViewModel();
    model.workshop.tasks.rows[0].actionLabel = 'turn in';
    model.workshop.tasks.rows[0].enabled = true;
    model.workshop.tasks.rows[0].onActivate = turnIn;
    harness.page.bind(model);
    harness.page.activate();

    const action = harness.page.tasks.rows.get('request-1').action;
    const registration = inputRouter.store
      .getRegistrations('press')
      .find((candidate) => candidate.displayObject === action.root);
    const actionBounds = action.root.getBounds();
    const actionPoint = {
      x: actionBounds.x + actionBounds.width / 2,
      y: actionBounds.y + actionBounds.height / 2,
    };
    const overlayTarget = new Container({ label: 'tutorial-overlay-hit' });

    expect(registration?.fallbackHitTest).toBe(true);

    inputRouter.onPointerDown(createPointerEvent(overlayTarget, 'pointerdown', actionPoint));
    inputRouter.onPointerUp(createPointerEvent(overlayTarget, 'pointerup', actionPoint));

    expect(turnIn).toHaveBeenCalledWith(model.workshop.tasks.rows[0]);

    overlayTarget.destroy();
    harness.page.destroy();
    harness.dispose();
  });

  it('retains its page tree and keyed repeated widgets across snapshot updates', () => {
    const harness = createHarness();
    const registry = new PageRegistry({
      pages: [['workshop', harness.page]],
    });
    const first = createWorkshopViewModel({
      taskLabel: 'gather 2 sage',
      flyoutText: '+1 seed',
    });

    registry.bind('workshop', first);
    registry.activate('workshop');
    const root = harness.page.getDisplayObject();
    const task = harness.page.tasks.rows.get('request-1');
    const feature = harness.page.features.get('alliance');
    const flyout = harness.page.flyouts.get('reward-1');
    const bagAction = harness.page.bagButton;
    const inboxAction = harness.page.inboxButton;

    registry.bind(
      'workshop',
      createWorkshopViewModel({
        taskLabel: 'gather 1 sage',
        flyoutText: '+2 seeds',
      }),
    );

    expect(harness.page.getDisplayObject()).toBe(root);
    expect(harness.page.tasks.rows.get('request-1')).toBe(task);
    expect(harness.page.features.get('alliance')).toBe(feature);
    expect(harness.page.flyouts.get('reward-1')).toBe(flyout);
    expect(harness.page.bagButton).toBe(bagAction);
    expect(harness.page.inboxButton).toBe(inboxAction);
    expect(harness.page.tasks.rowPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
    });
    expect(task.label.text).toBe('gather 1 sage');
    expect(flyout.text.text).toBe('+2 seeds');
    expect(flyout.text.style.fill).toBe('#ffffff');
    expect(flyout.text.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(flyout.text.style.fontSize),
      join: 'round',
    });
    expect(flyout.background.width).toBeGreaterThan(flyout.text.width);
    expect(flyout.background.height).toBe(24);

    registry.deactivate();
    expect(root).toMatchObject({
      eventMode: 'none',
      renderable: false,
      visible: false,
    });
    registry.destroy();
    harness.dispose();
  });

  it('routes semantic actions and retains lazy-once Workshop dialogs', () => {
    const summonSeed = vi.fn();
    const harness = createHarness();
    harness.page.bind(
      createWorkshopViewModel({
        summonSeed,
      }),
    );
    harness.page.activate();

    expect(harness.semanticTargets.activate('workshop.summon')).toBe(true);
    expect(summonSeed).toHaveBeenCalledTimes(1);
    expect(harness.dialogs.hasInstance('workshop.bag')).toBe(false);

    expect(harness.page.openDialog('bag')).toBe(true);
    const dialog = harness.dialogs.get('workshop.bag');
    expect(dialog).not.toBeNull();
    expect(dialog.modal).toBeInstanceOf(PixiOwnedDialogSurface);
    expect(dialog.panel).toBeInstanceOf(PixiDialogFrame);
    expect(dialog.modal.openMotion).toBe('center');
    expect(harness.dialogs.hasInstance('workshop.bag')).toBe(true);
    expect(harness.dialogs.getOpenDialogIds()).toEqual(['workshop.bag']);

    harness.dialogs.close('workshop.bag');
    harness.page.openDialog('bag', {
      title: 'bag',
      rows: [{ id: 'sage', label: 'sage seed', value: '2' }],
    });

    expect(harness.dialogs.get('workshop.bag')).toBe(dialog);
    expect(dialog.rows.get('sage').label.text).toBe('sage seed');
    expect(harness.dialogs.getStats().constructed).toBe(1);
    harness.page.destroy();
    harness.dispose();
  });

  it('uses extra portrait height for primary-scroll Workshop dialogs', () => {
    const harness = createHarness();
    harness.page.bind(createWorkshopViewModel());
    harness.page.activate();
    harness.page.openDialog('bag', {
      title: 'Bag',
      rows: Array.from({ length: 12 }, (_, index) => ({
        id: `item-${index}`,
        label: `Item ${index + 1}`,
        value: String(index + 1),
      })),
    });
    const dialog = harness.dialogs.get('workshop.bag');

    dialog.layout({ sourceWidth: 390, sourceHeight: 944 });

    expect(dialog.modal.fixedBounds.height).toBe(482);
    expect(dialog.scroll.height).toBeGreaterThan(300);

    harness.page.destroy();
    harness.dispose();
  });

  it('rebinds open tabbed dialogs without reconstructing their retained instances', () => {
    const harness = createHarness();
    let selectedTabId = 'currencies';
    const createModel = () => {
      const model = createWorkshopViewModel();
      model.workshop.dialogs.bag = {
        title: 'bag',
        selectedTabId,
        onSelectTab: (nextTabId) => {
          selectedTabId = nextTabId;
          harness.page.bind(createModel());
          return true;
        },
        tabs: [
          {
            id: 'currencies',
            label: 'currencies',
            selected: selectedTabId === 'currencies',
          },
          {
            id: 'seeds',
            label: 'seeds',
            selected: selectedTabId === 'seeds',
          },
        ],
        rows: [
          {
            id: selectedTabId,
            label: `${selectedTabId} row`,
            value: '1',
          },
        ],
      };
      return model;
    };

    harness.page.bind(createModel());
    harness.page.openDialog('bag');
    const dialog = harness.dialogs.get('workshop.bag');
    const retainedRoot = dialog.root;

    expect(dialog.tabs.get('currencies').selected).toBe(true);
    expect(dialog.tabs.get('seeds').handleTap()).toBe(true);

    expect(harness.dialogs.get('workshop.bag')).toBe(dialog);
    expect(dialog.root).toBe(retainedRoot);
    expect(harness.dialogs.getStats().constructed).toBe(1);
    expect(dialog.viewModel.selectedTabId).toBe('seeds');
    expect(dialog.tabs.get('seeds').selected).toBe(true);
    expect(dialog.rows.get('seeds').label.text).toBe('seeds row');

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps compact Bag tabs fully inside the brown shell footer', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.bag = {
      title: 'Bag',
      selectedTabId: 'currencies',
      tabs: [
        { id: 'currencies', label: 'Currencies', selected: true },
        { id: 'seeds', label: 'Seeds', selected: false },
        { id: 'herbs', label: 'Herbs', selected: false },
        { id: 'potions', label: 'Potions', selected: false },
        { id: 'ingredients', label: 'Ingredients', selected: false },
      ],
      rows: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('bag');

    const dialog = harness.dialogs.get('workshop.bag');
    const tabs = dialog.tabs.getWidgets();
    const expectedTabGap = 8;
    const expectedTabWidth = (286 - expectedTabGap * 2) / 3;
    const shellBottom = dialog.panel.coreHeight + PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
    const tabsBottom = dialog.tabsLayer.position.y + tabs[3].root.y + tabs[3].height;
    const paperBottom = dialog.panel.paperFrame.position.y + dialog.panel.paperFrame.frameHeight;

    expect(dialog.panel.titleLabel.textObject.text).toBe('Bag');
    expect(dialog.tabsLayer.position.x).toBe(9);
    expect(shellBottom - tabsBottom).toBeCloseTo(10);
    expect(dialog.tabsLayer.position.y - paperBottom).toBeCloseTo(6);
    expect(tabs).toHaveLength(5);
    expect(tabs[1].root.x - (tabs[0].root.x + tabs[0].width)).toBeCloseTo(expectedTabGap);
    expect(tabs[3].root.y).toBe(32);
    expect(tabs[3].root.x).toBeCloseTo(49);
    expect(tabs[4].root.x).toBeCloseTo(147);
    for (const tab of tabs) {
      expect(tab.control.textLabel.fontSize).toBe(11);
      expect(tab.width).toBeCloseTo(expectedTabWidth);
    }

    harness.page.destroy();
    harness.dispose();
  });

  it.each([
    ['personalTasks', 2, 10],
    ['worldEvent', 3, 8],
    ['stats', 4, 6],
  ])('uses the shared in-shell footer geometry for %s', (dialogId, tabCount, expectedGap) => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    const tabs = Array.from({ length: tabCount }, (_, index) => ({
      id: `tab-${index}`,
      label: `Tab ${index + 1}`,
      selected: index === 0,
    }));
    model.workshop.dialogs[dialogId] = {
      title: dialogId,
      selectedTabId: tabs[0].id,
      tabs,
      rows: [],
    };

    harness.page.bind(model);
    harness.page.openDialog(dialogId);

    const dialog = harness.dialogs.get(`workshop.${dialogId}`);
    const buttons = dialog.tabs.getWidgets();
    const shellBottom = dialog.panel.coreHeight + PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
    const tabsBottom = dialog.tabsLayer.y + buttons[0].height;
    const paperBottom =
      dialogId === 'worldEvent'
        ? dialog.worldEventListPaper.y + dialog.worldEventListPaper.frameHeight
        : dialogId === 'personalTasks'
          ? dialog.scroll.root.y + dialog.scroll.height
          : dialog.panel.paperFrame.y + dialog.panel.paperFrame.frameHeight;

    expect(dialog.tabsLayer.parent).toBe(dialog.panel);
    expect(dialog.tabsLayer.x).toBe(9);
    expect(shellBottom - tabsBottom).toBeCloseTo(10);
    expect(dialog.tabsLayer.y - paperBottom).toBeCloseTo(6);
    expect(buttons[1].root.x - (buttons[0].root.x + buttons[0].width)).toBeCloseTo(expectedGap);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders World Event requests directly below the header with backed donation rows and visible actions', () => {
    const donate = vi.fn();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.has = vi.fn(() => true);
    assetManager.getTexture = vi.fn(() => Texture.EMPTY);
    assetManager.getAtlasTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldEvent = {
      title: 'World Event',
      selectedTabId: 'tasks',
      rowWidget: 'worldEventQuest',
      header: {
        artAssetId: 'source:assets/world-events/political-change.png',
        headline: 'New King Crowned',
        body: 'Bells ring from towers that disagreed yesterday.\nNew clerks ask every workshop to prove the town still moves and read the new edicts.',
        meta: '0 points · 4d 2h',
      },
      tabs: [
        { id: 'tasks', label: 'Quests', selected: true },
        { id: 'leaderboard', label: 'Leaderboard', selected: false },
        { id: 'rewards', label: 'Rewards', selected: false },
      ],
      rows: [
        {
          id: 'quest:crowd',
          title: 'Quiet The Crowd',
          pointsLabel: '0 Points',
          description:
            'The coronation bells have people cheering, arguing, and fainting in the same street.',
          progressLabel: '0 / 120',
          statusLabel: 'Active',
          donationOptions: [
            {
              id: 'calming',
              label: 'Calming Draught',
              pointsEachLabel: '120 Points Each',
              totalLabel: '0 Points Total',
              actionLabel: 'Unavailable',
              enabled: false,
            },
            {
              id: 'valerian',
              label: 'Valerian Rest',
              pointsEachLabel: '320 Points Each',
              totalLabel: '0 Points Total',
              actionLabel: 'Donate',
              enabled: true,
              notification: true,
              onActivate: donate,
            },
          ],
        },
      ],
    };
    const [firstQuest] = model.workshop.dialogs.worldEvent.rows;
    model.workshop.dialogs.worldEvent.rows.push(
      {
        ...firstQuest,
        id: 'quest:seal',
        title: 'Protect The Seal',
        completed: true,
        donationOptions: firstQuest.donationOptions.slice(0, 1).map((option) => ({
          ...option,
          id: `${option.id}:seal`,
        })),
      },
      {
        ...firstQuest,
        id: 'quest:hidden-third',
        title: 'Hidden Third Quest',
      },
    );

    harness.page.bind(model);
    harness.page.openDialog('worldEvent');

    const dialog = harness.dialogs.get('workshop.worldEvent');
    const row = dialog.rows.get('quest:crowd');
    const secondRow = dialog.rows.get('quest:seal');
    const headerFrameBottom =
      dialog.worldEventHeaderPaper.y + dialog.worldEventHeaderPaper.frameHeight;

    expect(dialog.panel.titleLabel.textObject.text).toBe('World Event');
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(dialog.worldEventHeaderPaper.visible).toBe(true);
    expect(dialog.worldEventListPaper.visible).toBe(false);
    expect(dialog.worldEventHeaderArt.visible).toBe(true);
    expect(dialog.worldEventHeaderArt.width).toBe(294);
    expect(dialog.worldEventHeaderArt.height).toBe(98);
    expect(dialog.worldEventHeaderArt.mask).toBe(dialog.worldEventHeaderArtMask);
    expect(dialog.headerHeadline.x).toBe(dialog.worldEventHeaderArt.x);
    expect(dialog.headerBody.x).toBe(dialog.worldEventHeaderArt.x);
    expect(dialog.headerMeta.x).toBe(dialog.worldEventHeaderArt.x);
    expect(dialog.headerHeadline.style.wordWrapWidth).toBe(dialog.worldEventHeaderArt.width);
    expect(dialog.headerBody.style.wordWrapWidth).toBe(dialog.worldEventHeaderArt.width);
    expect(dialog.headerMeta.style.wordWrapWidth).toBe(dialog.worldEventHeaderArt.width);
    expect(dialog.rows.getWidgets()).toHaveLength(2);
    expect(row.card.alpha).toBe(1);
    expect(secondRow.card.alpha).toBe(1);
    expect(dialog.scroll.width).toBe(314);
    expect(row.width).toBe(314);
    expect(secondRow.width).toBe(314);
    expect(dialog.scroll.physics.maxOffset).toBe(0);
    expect(dialog.scroll.scrollbarTrack.visible).toBe(false);
    expect(dialog.scroll.root.position.y - headerFrameBottom).toBeCloseTo(4);
    expect(secondRow.root.position.y - (row.root.position.y + row.height)).toBeCloseTo(4);
    expect(row.title.text).toBe('Quiet The Crowd');
    expect(row.description.text).toBe(
      'The coronation bells have people cheering, arguing, and fainting in the same street.',
    );
    expect(row.options[0].backing.visible).toBe(true);
    expect(row.options[0].backing.frameWidth).toBeGreaterThan(0);
    expect(row.options[0].icon.width).toBe(36);
    expect(row.options[0].icon.height).toBe(36);
    expect(row.options[0].action).toBeInstanceOf(PixiTextButton);
    expect(row.options[0].action.textLabel.textObject.text).toBe('Unavailable');
    expect(row.options[0].action.sizeTier).toBe(30);
    expect(row.options[0].action.enabled).toBe(false);
    expect(row.options[1].action.textLabel.textObject.text).toBe('Donate');
    expect(row.options[1].action.enabled).toBe(true);
    expect(row.options[1].action.notification).toBe(true);
    expect(row.options[1].action.notificationBadge.root.visible).toBe(true);
    expect(row.options[1].action.visible).toBe(true);
    expect(row.options[1].action.renderable).toBe(true);
    expect(row.options[1].action.x + row.options[1].action.buttonWidth).toBeLessThanOrEqual(
      row.options[1].width,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.dialogPaper);
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      'source:assets/world-events/political-change.png',
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.settingsRow);
    expect(assetManager.getTexture).toHaveBeenCalledWith(getPixiButtonAssetId('gray', 30));
    expect(assetManager.getTexture).toHaveBeenCalledWith(getPixiButtonAssetId('green', 30));

    row.options[1].action.activate();
    expect(donate).toHaveBeenCalledOnce();

    const questsViewModel = model.workshop.dialogs.worldEvent;
    model.workshop.dialogs.worldEvent = {
      ...questsViewModel,
      selectedTabId: 'leaderboard',
      rowWidget: 'leaderboard',
      rows: [
        {
          id: 'leaderboard:1',
          type: 'leaderboardPlayer',
          rank: 1,
          username: 'Wizard',
          character: 'elara',
          frame: 'classic',
          playerLevel: 12,
          prestigeCount: 2,
          totalMetric: 'points',
          totalLabel: '320',
        },
      ],
    };
    harness.page.bind(model);
    const [leaderboardRow] = dialog.rows.getWidgets();
    expect(dialog.rows).toBe(dialog.worldEventLeaderboardRows);
    expect(leaderboardRow.name.text).toBe('Wizard');
    expect(leaderboardRow.pointsTotal.text).toBe('320');
    expect(leaderboardRow.total.visible).toBe(false);
    expect(leaderboardRow.background.visible).toBe(true);
    expect(leaderboardRow.root.hitArea.width).toBe(
      dialog.leaderboardRowWidth - PIXI_ROOT_RUN_GEOMETRY.settings.rowGap,
    );
    model.workshop.dialogs.worldEvent = {
      ...questsViewModel,
      selectedTabId: 'rewards',
      rowWidget: 'worldEventReward',
      header: {
        ...questsViewModel.header,
        meta: '0 points · 4d 2h',
      },
      status: 'Leaderboard Rewards: 2k points to qualify',
      rows: [
        {
          id: 'reward:1',
          type: 'worldEventReward',
          current: true,
          rankLabel: 'Rank 1',
          rewards: [
            { resourceKey: 'emerald', amountLabel: '5' },
            { resourceKey: 'crystal', amountLabel: '10' },
          ],
        },
      ],
    };
    harness.page.bind(model);
    const [rewardRow] = dialog.rows.getWidgets();
    expect(dialog.rows).toBe(dialog.worldEventRewardRows);
    expect(dialog.headerMeta.text).toBe('0 points · 4d 2h');
    expect(dialog.status.text).toBe('Leaderboard Rewards: 2k points to qualify');
    expect(dialog.status.parent).toBe(dialog.panel.content);
    expect(dialog.status.parent).not.toBe(dialog.scroll.content);
    expect(dialog.status.y).toBe(dialog.scroll.root.y + dialog.scroll.height);
    expect(rewardRow.rank.text).toBe('Rank 1');
    expect(rewardRow.background.visible).toBe(true);
    expect(rewardRow.currentOutline.context.instructions.at(-1)?.data?.style).toMatchObject({
      alpha: 0.9,
      width: 1.5,
    });
    expect(rewardRow.rewardBadges.map(({ amount }) => amount.text)).toEqual(['5', '10']);
    expect(
      rewardRow.rewardBadges.every(({ icon }) => icon.width === 28 && icon.height === 28),
    ).toBe(true);
    expect(
      rewardRow.rewardBadges.every(({ amount, icon }) => amount.y === icon.y + icon.height / 2 - 1),
    ).toBe(true);
    model.workshop.dialogs.worldEvent = questsViewModel;
    harness.page.bind(model);

    const reboundRow = dialog.rows.get('quest:crowd');
    expect(reboundRow.options[1].action.visible).toBe(true);
    expect(reboundRow.options[1].action.renderable).toBe(true);
    expect(reboundRow.options[1].action.enabled).toBe(true);
    reboundRow.options[1].action.activate();
    expect(donate).toHaveBeenCalledTimes(2);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps World Event quest heights stable after a leaderboard round trip', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    const questsViewModel = {
      title: 'World Event',
      selectedTabId: 'tasks',
      rowWidget: 'worldEventQuest',
      header: {
        headline: 'Fever In The Lower Quarter',
        body: 'Lanterns stay lit past midnight.',
        meta: '0 points · 4d 2h',
      },
      tabs: [
        { id: 'tasks', label: 'Quests', selected: true },
        { id: 'leaderboard', label: 'Leaderboard', selected: false },
        { id: 'rewards', label: 'Rewards', selected: false },
      ],
      rows: [
        {
          id: 'quest:cool-the-fever',
          title: 'Cool The Fever',
          pointsLabel: '0 Points',
          description:
            'Families are sleeping beside buckets because the lower quarter cannot keep water cool. Donate tonics that steady breath and bring fever down before the sick lose another night.',
          donationOptions: [
            {
              id: 'mana-tonic',
              label: 'Mana Tonic',
              pointsEachLabel: '80 Points Each',
              totalLabel: '0 Points Total',
              actionLabel: 'Donate',
              enabled: true,
            },
          ],
        },
        {
          id: 'quest:quiet-rooms',
          title: 'Quiet Rooms For The Sick',
          pointsLabel: '0 Points',
          description:
            'Crowded houses keep the fever moving after sunset. Donate coin so families can rent spare rooms until the quarter is clean again.',
          donationOptions: [
            {
              id: 'coin',
              label: 'Coin',
              pointsEachLabel: '1 Point Each',
              totalLabel: '0 Points Total',
              actionLabel: 'Donate',
              enabled: true,
            },
          ],
        },
      ],
    };
    model.workshop.dialogs.worldEvent = questsViewModel;

    harness.page.bind(model);
    harness.page.openDialog('worldEvent');

    const dialog = harness.dialogs.get('workshop.worldEvent');
    const initialHeights = dialog.rows.getWidgets().map((questRow) => questRow.height);

    model.workshop.dialogs.worldEvent = {
      ...questsViewModel,
      selectedTabId: 'leaderboard',
      rowWidget: 'leaderboard',
      rows: [],
    };
    harness.page.bind(model);
    model.workshop.dialogs.worldEvent = questsViewModel;
    harness.page.bind(model);

    expect(dialog.rows.getWidgets().map((questRow) => questRow.height)).toEqual(initialHeights);

    harness.page.destroy();
    harness.dispose();
  });

  it('places the first Bag row near the paper top and moves its scrollbar toward the paper edge', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.bag = {
      title: 'Bag',
      selectedTabId: 'seeds',
      tabs: [
        { id: 'currencies', label: 'Currencies', selected: false },
        { id: 'seeds', label: 'Seeds', selected: true },
        { id: 'herbs', label: 'Herbs', selected: false },
      ],
      rows: Array.from({ length: 20 }, (_, index) => ({
        id: `seed-${index}`,
        label: `Seed ${index + 1}`,
        value: '0',
      })),
    };

    harness.page.bind(model);
    harness.page.openDialog('bag');

    const dialog = harness.dialogs.get('workshop.bag');
    const paperTop = dialog.panel.paperFrame.position.y;
    const paperBottom = paperTop + dialog.panel.paperFrame.frameHeight;
    const viewportTop = dialog.scroll.root.position.y;
    const viewportBottom = viewportTop + dialog.scroll.height;
    const firstRow = dialog.rows.getWidgets()[0];
    const firstRowFrameTop = viewportTop + firstRow.root.y + firstRow.background.y;

    expect(dialog.scroll.width).toBe(
      RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth +
        RETAINED_DIALOG_LIST_GEOMETRY.scrollbarViewportOutset,
    );
    expect(dialog.scroll.scrollbarTrack.visible).toBe(true);
    expect(dialog.scroll.scrollbarTrack.getLocalBounds().x).toBeGreaterThan(dialog.scroll.width);
    expect(viewportTop - paperTop).toBeGreaterThan(0);
    expect(firstRowFrameTop - paperTop).toBeCloseTo(20 / 3);
    expect(paperBottom - viewportBottom).toBeGreaterThan(0);

    harness.page.destroy();
    harness.dispose();
  });

  it('reveals the shared drop slider inside the tapped seed row without selection styling', () => {
    const harness = createHarness({ reducedMotion: true });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.summonInfo = {
      title: 'Summoning Seeds',
      autoSummonUnlocked: true,
      summaryRows: [
        { id: 'auto', label: 'Auto Summon', value: 'Locked' },
        {
          id: 'reserve',
          label: 'Keep Mana Above',
          value: '0',
          valueIconResourceKey: 'mana',
        },
      ],
      settingsToggle: null,
      manaSlider: {
        mode: 'range',
        min: 0,
        max: 5_000,
        step: 1,
        value: 0,
        tone: 'blue',
        enabled: false,
      },
      actions: [],
      items: [
        {
          id: 'sageSeed',
          label: 'Sage Seed',
          detail: '100% Chance',
          value: 'Medium',
          valueTone: 'yellow',
          itemKind: 'seed',
          itemKey: 'sageSeed',
          dropSlider: {
            mode: 'milestones',
            value: 'medium',
            options: [
              { value: 'none', tone: 'root' },
              { value: 'low', tone: 'red' },
              { value: 'medium', tone: 'yellow' },
              { value: 'high', tone: 'green' },
            ],
          },
        },
        {
          id: 'mintSeed',
          label: 'Mint Seed',
          detail: '0% Chance',
          value: 'None',
          valueTone: 'text',
          itemKind: 'seed',
          itemKey: 'mintSeed',
          dropSlider: {
            mode: 'milestones',
            value: 'none',
            options: [
              { value: 'none', tone: 'root' },
              { value: 'low', tone: 'red' },
              { value: 'medium', tone: 'yellow' },
              { value: 'high', tone: 'green' },
            ],
          },
        },
        {
          id: 'briarSeed',
          label: 'Briar Seed',
          detail: '0% Chance',
          value: 'Low',
          valueTone: 'red',
          itemKind: 'seed',
          itemKey: 'briarSeed',
          dropSlider: {
            mode: 'milestones',
            value: 'low',
            options: [
              { value: 'none', tone: 'root' },
              { value: 'low', tone: 'red' },
              { value: 'medium', tone: 'yellow' },
              { value: 'high', tone: 'green' },
            ],
          },
        },
        {
          id: 'lavenderSeed',
          label: 'Lavender Seed',
          detail: '0% Chance',
          value: 'High',
          valueTone: 'green',
          itemKind: 'seed',
          itemKey: 'lavenderSeed',
          dropSlider: {
            mode: 'milestones',
            value: 'high',
            options: [
              { value: 'none', tone: 'root' },
              { value: 'low', tone: 'red' },
              { value: 'medium', tone: 'yellow' },
              { value: 'high', tone: 'green' },
            ],
          },
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    expect(dialog).toBeInstanceOf(ShopDialogPixi);
    expect(dialog.selectionSection.visible).toBe(true);
    expect(dialog.itemSection.visible).toBe(true);
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(dialog.settingsToggle.visible).toBe(false);
    expect(dialog.manaSettingsSlider).toMatchObject({
      visible: true,
      enabled: false,
      value: 0,
    });
    expect(dialog.dropSettingsSlider.visible).toBe(false);
    const reserveRow = dialog.summaryRows.getWidgets().find((row) => row.key === 'reserve');
    let seedRows = dialog.list.rows.getWidgets();
    expect(seedRows.map((row) => Math.max(row.itemIcon.width, row.itemIcon.height))).toEqual(
      seedRows.map(() => 32),
    );
    expect(reserveRow.valueLabel.visible).toBe(false);
    expect(reserveRow.valueResource).toMatchObject({
      visible: true,
      resource: 'mana',
      amount: '0',
    });
    expect(reserveRow.valueResource.icon.visible).toBe(true);
    expect(reserveRow.valueResource.x + reserveRow.valueResource.measuredWidth).toBe(
      dialog.panel.contentBoxWidth,
    );
    expect(reserveRow.valueResource.amountLabel.x).toBeGreaterThan(reserveRow.valueResource.icon.x);
    expect(seedRows.map((row) => row.preferenceButton.color)).toEqual([
      'yellow',
      'brown',
      'red',
      'green',
    ]);
    expect(seedRows.map((row) => row.preferenceButton.textLabel.textObject.style.fill)).toEqual([
      '#ffffff',
      '#ffffff',
      '#ffffff',
      '#ffffff',
    ]);
    expect(seedRows.map((row) => row.preferenceButton.textLabel.textObject.style.stroke)).toEqual([
      expect.objectContaining({ color: PIXI_TEXT_STROKE_COLOR }),
      expect.objectContaining({ color: PIXI_TEXT_STROKE_COLOR }),
      expect.objectContaining({ color: PIXI_TEXT_STROKE_COLOR }),
      expect.objectContaining({ color: PIXI_TEXT_STROKE_COLOR }),
    ]);
    expect(seedRows.every((row) => row.value.visible === false)).toBe(true);
    expect(seedRows.every((row) => row.selectedIndicator.visible === false)).toBe(true);
    const expectedListFrameWidth =
      PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth -
      RETAINED_DIALOG_LIST_GEOMETRY.rowSideInset * 2;
    expect(seedRows[0].background.frameWidth).toBe(expectedListFrameWidth);
    expect(dialog.list.width).toBe(
      expectedListFrameWidth + RETAINED_DIALOG_LIST_GEOMETRY.scrollbarViewportOutset,
    );
    expect(dialog.list.root.position.x).toBe(
      (dialog.panel.contentBoxWidth - expectedListFrameWidth) / 2,
    );

    const collapsedHeight = seedRows[0].height;
    const secondRowY = seedRows[1].root.position.y;
    seedRows[0].action();
    seedRows = dialog.list.rows.getWidgets();

    expect(seedRows[0].height).toBeGreaterThan(collapsedHeight);
    expect(seedRows[1].root.position.y).toBeGreaterThan(secondRowY);
    expect(dialog.dropSettingsSlider).toMatchObject({
      visible: true,
      enabled: true,
      value: 'medium',
      tone: 'yellow',
    });
    expect(
      dialog.dropSettingsSlider.position.y -
        dialog.dropSettingsSlider.pivot.y -
        seedRows[0].root.position.y,
    ).toBe(dialog.list.rowHeight + 1);
    expect(seedRows.every((row) => row.selectedIndicator.visible === false)).toBe(true);
    seedRows[0].action();
    seedRows = dialog.list.rows.getWidgets();
    expect(seedRows[0].height).toBe(collapsedHeight);
    expect(dialog.dropSettingsSlider.visible).toBe(false);
    expect(dialog.list.expandedKey).toBeNull();
    expect(dialog.actions.getWidgets()).toHaveLength(0);
    expect(dialog.list.items[0]).not.toHaveProperty('selected');
    expect(dialog.itemSectionBounds.y).toBeGreaterThan(dialog.selectionSectionBounds.height);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the Summoning Seeds scrollbar inside the lower paper section', () => {
    const harness = createHarness({ reducedMotion: true });
    const model = createWorkshopViewModel();
    const summonInfo = createSummonInfoDialogModel({ unlocked: true });
    summonInfo.items = Array.from({ length: 20 }, (_, index) => ({
      ...summonInfo.items[0],
      id: `seed-${index}`,
      label: `Seed ${index + 1}`,
    }));
    model.workshop.dialogs.summonInfo = summonInfo;

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    const seedPaperRight = dialog.itemSection.position.x + dialog.itemSection.frameWidth;
    const firstRowRight =
      dialog.list.root.position.x + dialog.list.rows.getWidgets()[0].background.frameWidth;
    const scrollbarBounds = dialog.list.scroll.scrollbarTrack.getLocalBounds();
    const scrollbarLeft = dialog.list.root.position.x + scrollbarBounds.x;
    const scrollbarRight = scrollbarLeft + scrollbarBounds.width;

    expect(dialog.list.scroll.scrollbarTrack.visible).toBe(true);
    expect(scrollbarLeft - firstRowRight).toBeGreaterThan(2.5);
    expect(seedPaperRight - scrollbarRight).toBeGreaterThan(2.5);

    harness.page.destroy();
    harness.dispose();
  });

  it('scrolls a partially visible selected seed row fully into view', () => {
    const harness = createHarness({ reducedMotion: true });
    const model = createWorkshopViewModel();
    const summonInfo = createSummonInfoDialogModel({ unlocked: true });
    summonInfo.items = Array.from({ length: 20 }, (_, index) => ({
      ...summonInfo.items[0],
      id: `seed-${index}`,
      label: `Seed ${index + 1}`,
    }));
    model.workshop.dialogs.summonInfo = summonInfo;

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    const targetKey = 'seed-8';
    const targetLayout = dialog.list
      .createLayout()
      .find((entry) => entry.item.__virtualKey === targetKey);
    dialog.list.scroll.scrollTo(targetLayout.top + targetLayout.height - dialog.list.height - 10);

    const targetRow = dialog.list.rows.getWidgets().find((row) => row.key === targetKey);
    expect(targetLayout.top).toBeGreaterThanOrEqual(dialog.list.scroll.offsetY);
    expect(targetLayout.top + targetLayout.height).toBeGreaterThan(
      dialog.list.scroll.offsetY + dialog.list.height,
    );

    targetRow.action();

    const expandedLayout = dialog.list
      .createLayout()
      .find((entry) => entry.item.__virtualKey === targetKey);
    expect(dialog.list.scroll.offsetY).toBeGreaterThan(0);
    expect(expandedLayout.top).toBeGreaterThanOrEqual(dialog.list.scroll.offsetY);
    expect(expandedLayout.top + expandedLayout.height).toBeLessThanOrEqual(
      dialog.list.scroll.offsetY + dialog.list.height,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the seed row passive and routes press feedback through only its preference button', () => {
    const hapticsFacade = { playUiTap: vi.fn() };
    const uiClickSoundFacade = {
      playClick: vi.fn(),
      unlock: vi.fn(),
    };
    const inputRouter = new PixiInputRouter({
      hapticsFacade,
      uiClickSoundFacade,
    });
    const harness = createHarness({
      inputRouter,
    });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.summonInfo = createSummonInfoDialogModel({
      unlocked: true,
    });
    model.workshop.dialogs.summonInfo.items[0].semanticId = 'workshop.summonInfo.seed.sageSeed';

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    const row = dialog.list.rows.getWidgets()[0];
    const rowRegistration = inputRouter.store
      .getRegistrations('press')
      .find((candidate) => candidate.displayObject === row.root);
    const buttonRegistration = inputRouter.store
      .getRegistrations('press')
      .find((candidate) => candidate.displayObject === row.preferenceButton);

    expect(rowRegistration).toBeUndefined();
    expect(row.root.cursor).toBe('default');
    expect(harness.semanticTargets.get('workshop.summonInfo.seed.sageSeed')?.displayObject).toBe(
      row.preferenceButton,
    );
    expect(row.background.alpha).toBe(1);
    expect(row.visual.scale.x).toBe(1);

    const rowBounds = row.root.getBounds();
    const rowBodyPoint = {
      x: rowBounds.x + 20,
      y: rowBounds.y + rowBounds.height / 2,
    };
    inputRouter.onPointerDown(createPointerEvent(row.root, 'pointerdown', rowBodyPoint));
    inputRouter.onPointerUp(createPointerEvent(row.root, 'pointerup', rowBodyPoint));
    expect(hapticsFacade.playUiTap).not.toHaveBeenCalled();
    expect(uiClickSoundFacade.playClick).not.toHaveBeenCalled();
    expect(dialog.list.expandedKey).toBeNull();

    expect(buttonRegistration?.haptic()).toBe('light');
    buttonRegistration.onPressChange(true, { confirmed: false });
    expect(row.preferenceButton.visual.scale.x).toBe(0.94);
    expect(row.visual.scale.x).toBe(1);
    buttonRegistration.onPressChange(false, { confirmed: false });
    expect(row.preferenceButton.visual.scale.x).toBe(1);
    expect(dialog.list.expandedKey).toBeNull();
    expect(buttonRegistration.onActivate()).toBe(true);
    expect(dialog.list.expandedKey).toBe('sageSeed');

    harness.page.destroy();
    harness.dispose();
  });

  it('fills the dialog with the seed section while Auto Summon is locked', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.summonInfo = createSummonInfoDialogModel({
      unlocked: false,
    });

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    expect(dialog.selectionSection).toMatchObject({
      visible: false,
      renderable: false,
    });
    expect(dialog.summaryLayer).toMatchObject({
      visible: false,
      renderable: false,
    });
    expect(dialog.settingsToggle.visible).toBe(false);
    expect(dialog.manaSettingsSlider.visible).toBe(false);
    expect(dialog.selectionSectionBounds.height).toBe(0);
    expect(dialog.itemSectionBounds).toMatchObject({
      y: 0,
      height: dialog.panel.contentBoxHeight,
    });
    expect(dialog.list.root.position.y).toBe(0);
    expect(dialog.list.height).toBe(dialog.panel.contentBoxHeight);

    harness.page.destroy();
    harness.dispose();
  });

  it('shrinks the seed section and pops in Auto Summon on its first post-unlock open without alpha motion', () => {
    const frames = [];
    let frameId = 0;
    const requestFrame = vi.fn((callback) => {
      frames.push(callback);
      frameId += 1;
      return frameId;
    });
    const harness = createHarness({
      requestFrame,
      cancelFrame: vi.fn(),
      reducedMotion: false,
    });
    const lockedModel = createWorkshopViewModel();
    lockedModel.workshop.dialogs.summonInfo = createSummonInfoDialogModel({
      unlocked: false,
    });
    harness.page.bind(lockedModel);

    const unlockedModel = createWorkshopViewModel();
    unlockedModel.workshop.dialogs.summonInfo = createSummonInfoDialogModel({
      unlocked: true,
    });
    harness.page.bind(unlockedModel);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    expect(dialog.autoSummonRevealProgress).toBe(0);
    expect(dialog.itemSectionBounds).toMatchObject({
      y: 0,
      height: dialog.panel.contentBoxHeight,
    });
    expect(dialog.selectionSection.scale.x).toBeCloseTo(0.8);
    for (const target of [
      dialog.selectionSection,
      dialog.summaryLayer,
      dialog.settingsToggle,
      dialog.manaSettingsSlider,
    ]) {
      expect(target.alpha).toBe(1);
    }

    frames.shift()(0);
    frames.shift()(120);

    expect(dialog.itemSectionBounds.y).toBeGreaterThan(0);
    expect(dialog.itemSectionBounds.y).toBeLessThan(dialog.selectionSectionBounds.height + 40);
    expect(dialog.itemSectionBounds.height).toBeLessThan(dialog.panel.contentBoxHeight);
    expect(dialog.selectionSection.scale.x).toBeGreaterThan(0.8);
    expect(dialog.selectionSection.scale.x).toBeLessThanOrEqual(1.02);
    for (const target of [
      dialog.selectionSection,
      dialog.summaryLayer,
      dialog.settingsToggle,
      dialog.manaSettingsSlider,
    ]) {
      expect(target.alpha).toBe(1);
    }

    frames.shift()(240);

    expect(dialog.autoSummonRevealProgress).toBeNull();
    expect(dialog.itemSectionBounds.y).toBeGreaterThan(dialog.selectionSectionBounds.height);
    expect(dialog.selectionSection.scale.x).toBe(1);

    harness.dialogs.close('workshop.summonInfo');
    harness.page.openDialog('summonInfo');
    expect(dialog.autoSummonRevealProgress).toBeNull();
    expect(dialog.selectionSection.scale.x).toBe(1);
    expect(frames).toHaveLength(0);

    harness.page.destroy();
    harness.dispose();
  });

  it('snaps the first post-unlock dialog open to its final layout for reduced motion', () => {
    const requestFrame = vi.fn();
    const harness = createHarness({
      requestFrame,
      reducedMotion: true,
    });
    const lockedModel = createWorkshopViewModel();
    lockedModel.workshop.dialogs.summonInfo = createSummonInfoDialogModel({
      unlocked: false,
    });
    harness.page.bind(lockedModel);

    const unlockedModel = createWorkshopViewModel();
    unlockedModel.workshop.dialogs.summonInfo = createSummonInfoDialogModel({
      unlocked: true,
    });
    harness.page.bind(unlockedModel);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    expect(requestFrame).not.toHaveBeenCalled();
    expect(dialog.autoSummonRevealProgress).toBeNull();
    expect(dialog.selectionSection.scale.x).toBe(1);
    expect(dialog.itemSectionBounds.y).toBeGreaterThan(dialog.selectionSectionBounds.height);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps Auto Summon and Keep Mana Above on one text-size contract', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({
      assetManager,
      reducedMotion: true,
    });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.summonInfo = {
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
          value: '0',
          valueIconResourceKey: 'mana',
        },
      ],
      settingsToggle: {
        value: false,
        enabled: true,
        onChange: vi.fn(),
      },
      manaSlider: {
        mode: 'range',
        min: 0,
        max: 5_000,
        step: 1,
        value: 0,
        tone: 'blue',
        enabled: true,
        onChange: vi.fn(),
      },
      actions: [],
      items: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    const rows = dialog.summaryRows.getWidgets();
    const autoRow = rows.find((row) => row.key === 'auto');
    const reserveRow = rows.find((row) => row.key === 'reserve');
    const autoStyle = autoRow.keyLabel.textObject.style;
    const reserveStyle = reserveRow.keyLabel.textObject.style;

    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.settingsGear);
    expect(autoRow.itemIcon.visible).toBe(true);
    expect(autoRow.itemIcon.x).toBeLessThan(autoRow.keyLabel.x);
    expect(autoRow.itemIcon.width).toBe(26 * PIXI_ROOT_RUN_GEOMETRY.settings.gearAspectRatio);
    expect(autoRow.itemIcon.height).toBe(26);
    expect(
      autoRow.root.position.y + autoRow.itemIcon.position.y - autoRow.itemIcon.height / 2,
    ).toBeGreaterThanOrEqual(7);
    expect(dialog.settingsToggle.controlWidth).toBe(60);
    expect(reserveRow.root.position.x).toBe(dialog.manaSettingsSlider.position.x);
    expect(reserveRow.root.position.x + reserveRow.root.hitArea.width).toBe(
      dialog.panel.contentBoxWidth,
    );
    expect(dialog.settingsToggle.position.x + dialog.settingsToggle.controlWidth).toBe(
      dialog.panel.contentBoxWidth,
    );
    expect(
      dialog.manaSettingsSlider.position.x +
        dialog.manaSettingsSlider.controlWidth -
        PIXI_ROOT_RUN_GEOMETRY.settings.knobSize / 2,
    ).toBe(reserveRow.root.position.x + reserveRow.root.hitArea.width);
    expect(autoRow.root.position.y + autoRow.itemIcon.position.y).toBe(
      dialog.settingsToggle.position.y + dialog.settingsToggle.controlHeight / 2,
    );
    expect(
      dialog.manaSettingsSlider.position.y -
        (reserveRow.root.position.y + reserveRow.keyLabel.position.y + reserveStyle.fontSize),
    ).toBeGreaterThanOrEqual(2);
    expect(reserveRow.root.position.y).toBe(43);
    expect(autoStyle).toMatchObject({
      fontSize: 15,
      fontWeight: 'normal',
      lineHeight: 15,
    });
    expect(reserveStyle).toMatchObject({
      fontSize: 15,
      fontWeight: 'normal',
      lineHeight: 15,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('animates seed-row disclosure with a full-alpha monotonic settle over 240ms', () => {
    const frames = [];
    let frameId = 0;
    const requestFrame = vi.fn((callback) => {
      frames.push(callback);
      frameId += 1;
      return frameId;
    });
    const harness = createHarness({
      requestFrame,
      cancelFrame: vi.fn(),
      reducedMotion: false,
    });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.summonInfo = {
      title: 'Summoning Seeds',
      autoSummonUnlocked: true,
      summaryRows: [
        { id: 'auto', label: 'Auto Summon', value: 'Locked' },
        {
          id: 'reserve',
          label: 'Keep Mana Above',
          value: '0',
          valueIconResourceKey: 'mana',
        },
      ],
      manaSlider: {
        mode: 'range',
        min: 0,
        max: 5_000,
        step: 1,
        value: 0,
        tone: 'blue',
        enabled: false,
      },
      items: [
        {
          id: 'sageSeed',
          label: 'Sage Seed',
          detail: '100% Chance',
          value: 'Medium',
          valueTone: 'yellow',
          itemKind: 'seed',
          itemKey: 'sageSeed',
          dropSlider: {
            mode: 'milestones',
            value: 'medium',
            options: [
              { value: 'none', tone: 'root' },
              { value: 'low', tone: 'red' },
              { value: 'medium', tone: 'yellow' },
              { value: 'high', tone: 'green' },
            ],
          },
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');
    const dialog = harness.dialogs.get('workshop.summonInfo');
    const collapsedHeight = dialog.list.rows.getWidgets()[0].height;

    dialog.list.rows.getWidgets()[0].action();
    frames.shift()(0);
    frames.shift()(120);

    const midHeight = dialog.list.rows.getWidgets()[0].height;
    expect(midHeight).toBeGreaterThan(collapsedHeight);
    expect(midHeight).toBeLessThan(collapsedHeight + 31);
    expect(dialog.dropSettingsSlider.alpha).toBe(1);
    expect(dialog.dropSettingsSlider.scale.x).toBeGreaterThan(0.985);
    expect(dialog.dropSettingsSlider.scale.x).toBeLessThan(1);

    frames.shift()(240);
    expect(dialog.list.rows.getWidgets()[0].height).toBe(collapsedHeight + 31);
    expect(dialog.dropSettingsSlider.alpha).toBe(1);
    expect(dialog.dropSettingsSlider.scale.x).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('hides the seed slider before shrinking its row on collapse', () => {
    const frames = [];
    let frameId = 0;
    const requestFrame = vi.fn((callback) => {
      frames.push(callback);
      frameId += 1;
      return frameId;
    });
    const harness = createHarness({
      requestFrame,
      cancelFrame: vi.fn(),
      reducedMotion: false,
    });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.summonInfo = createSummonInfoDialogModel({
      unlocked: true,
    });

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');
    const dialog = harness.dialogs.get('workshop.summonInfo');
    const collapsedHeight = dialog.list.rows.getWidgets()[0].height;

    dialog.list.rows.getWidgets()[0].action();
    frames.shift()(0);
    frames.shift()(240);
    expect(dialog.list.rows.getWidgets()[0].height).toBe(collapsedHeight + 31);

    dialog.list.rows.getWidgets()[0].action();
    frames.shift()(240);
    frames.shift()(300);

    expect(dialog.dropSettingsSlider.alpha).toBeGreaterThan(0);
    expect(dialog.dropSettingsSlider.alpha).toBeLessThan(1);
    expect(dialog.list.rows.getWidgets()[0].height).toBe(collapsedHeight + 31);

    frames.shift()(320);
    expect(dialog.dropSettingsSlider.visible).toBe(false);
    expect(dialog.list.rows.getWidgets()[0].height).toBe(collapsedHeight + 31);

    frames.shift()(400);
    expect(dialog.dropSettingsSlider.visible).toBe(false);
    expect(dialog.list.rows.getWidgets()[0].height).toBeGreaterThan(collapsedHeight);
    expect(dialog.list.rows.getWidgets()[0].height).toBeLessThan(collapsedHeight + 31);

    frames.shift()(480);
    expect(dialog.dropSettingsSlider.visible).toBe(false);
    expect(dialog.list.rows.getWidgets()[0].height).toBe(collapsedHeight);
    expect(dialog.list.expandedKey).toBeNull();

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps a rapid seed preference-button tap valid while the previous disclosure settles', () => {
    const frames = [];
    let frameId = 0;
    const requestFrame = vi.fn((callback) => {
      frames.push(callback);
      frameId += 1;
      return frameId;
    });
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({
      inputRouter,
      requestFrame,
      cancelFrame: vi.fn(),
      reducedMotion: false,
    });
    const model = createWorkshopViewModel();
    const summonInfo = createSummonInfoDialogModel({ unlocked: true });
    summonInfo.items = [
      summonInfo.items[0],
      {
        ...summonInfo.items[0],
        id: 'mintSeed',
        label: 'Mint Seed',
      },
    ];
    model.workshop.dialogs.summonInfo = summonInfo;

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    const [sageRow, mintRow] = dialog.list.rows.getWidgets();
    sageRow.action();
    frames.shift()(0);

    const mintBounds = mintRow.preferenceButton.getBounds();
    const mintPoint = {
      x: mintBounds.x + mintBounds.width / 2,
      y: mintBounds.y + mintBounds.height / 2,
    };
    inputRouter.onPointerDown(
      createPointerEvent(mintRow.preferenceButton, 'pointerdown', mintPoint),
    );

    frames.shift()(240);
    inputRouter.onPointerUp(createPointerEvent(mintRow.preferenceButton, 'pointerup', mintPoint));

    expect(dialog.list.expandedKey).toBe('mintSeed');

    harness.page.destroy();
    harness.dispose();
  });

  it('renders each stats item icon immediately before its retained count', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.stats = {
      title: 'stats',
      rows: [
        {
          id: 'briarSeed',
          label: 'briar seed',
          value: '12',
          itemKind: 'seed',
          itemKey: 'briarSeed',
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('stats');

    const row = harness.dialogs.get('workshop.stats').rows.get('briarSeed');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('seed:pack');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('herb:briarHerb');
    expect(row.valueIcon.visible).toBe(true);
    expect(row.valueIconOverlay.visible).toBe(true);
    expect(row.valueIcon.x).toBeLessThan(row.value.x);
    expect(row.valueIcon.x + row.valueIcon.width / 2 + 3).toBe(row.value.x - row.value.width);
    expect(row.valueIcon.y).toBe(9);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders keyed leaderboard-style alliance rows with leader, totals, and inline action', () => {
    const openAlliance = vi.fn();
    const join = vi.fn();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => new Texture());
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'trade alliance',
      directory: true,
      status: '',
      rows: [
        {
          id: 'dbp',
          type: 'allianceDirectory',
          name: 'Dominion of Bug Players',
          tag: 'DBP',
          tagColor: 'violet',
          leaderName: 'Wizard 0',
          totalIncomeLabel: '12.4k',
          memberCount: 6,
          memberCapacity: 50,
          onActivate: openAlliance,
          action: {
            label: 'Join',
            variant: 'green',
            enabled: true,
            onActivate: join,
          },
        },
        {
          id: 'solo',
          type: 'allianceDirectory',
          name: 'Solo Warriors',
          tag: 'SW',
          tagColor: 'teal',
          leaderName: 'Solo',
          totalIncomeLabel: '8.15k',
          memberCount: 1,
          memberCapacity: 50,
          onActivate: vi.fn(),
          action: {
            label: 'Apply',
            variant: 'green',
            enabled: true,
            onActivate: vi.fn(),
          },
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const dialog = harness.dialogs.get('workshop.alliance');
    const row = dialog.rows.get('dbp');
    const applyRow = dialog.rows.get('solo');
    expect(dialog.status.text).toBe('');
    expect(row.tag.text).toBe('[DBP]');
    expect(row.tag.style.stroke?.width ?? 0).toBe(0);
    expect(row.name.text).toBe('Dominion of Bug Players');
    expect(row.tag.style.fontSize).toBe(row.name.style.fontSize);
    expect(row.leaderName.text).toBe('Wizard 0');
    expect(row.leaderRole.text).toBe('Leader');
    expect(row.leaderAvatarWidget.visible).toBe(true);
    expect(row.leaderAvatarWidget.width).toBe(28);
    expect(row.leaderAvatarWidget.x).toBeLessThan(row.leaderName.x);
    expect(row.leaderName.y).toBeLessThan(row.leaderRole.y);
    expect(row.memberCount.text).toBe('6/50');
    expect(row.memberCount.anchor.x).toBe(1);
    expect(row.memberCount.y).toBe(8);
    expect(row.memberCount.y).toBeLessThan(row.leaderName.y);
    expect(row.total.amountLabel.textObject.text).toBe('12.4k');
    expect(row.totalSuffix.text).toBe('total');
    expect(row.total.x).toBeLessThan(row.totalSuffix.x);
    expect(row.total.icon.visible).toBe(true);
    expect(row.banner.visible).toBe(true);
    expect(row.banner.flagHeight).toBe(56);
    expect(row.banner.flagWidth).toBe(56);
    expect(row.banner.y).toBe(7);
    expect(row.banner.bannerColor).toBe('blue');
    expect(row.banner.emblemColor).toBe('gold');
    expect(row.getPreferredHeight()).toBe(78);
    expect(applyRow.getPreferredHeight()).toBe(78);
    const expectedDirectoryPaperWidth = PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth + 16;
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(row.background).toBeInstanceOf(PixiNineSliceFrame);
    expect(row.background.texture).toBe(dialog.panel.paperFrame.texture);
    expect(row.background.frameWidth).toBe(expectedDirectoryPaperWidth);
    expect(row.background.frameHeight).toBe(78);
    expect(row.sectionRule).toBeUndefined();
    expect(applyRow.root.y - row.root.y).toBe(83);
    expect(dialog.scroll.width).toBe(
      expectedDirectoryPaperWidth + RETAINED_DIALOG_LIST_GEOMETRY.scrollbarViewportOutset,
    );
    expect(dialog.scroll.root.x).toBeCloseTo(
      (dialog.panel.coreWidth - expectedDirectoryPaperWidth) / 2,
    );
    expect(row.leaderName.y).toBeLessThan(row.totalSuffix.y);
    expect(row.action.root.y + 14).toBeCloseTo(
      (row.leaderName.y + row.total.y + row.total.fontSize) / 2,
    );
    expect(row.action.text.text).toBe('Join');
    expect(row.action.control.variant).toBe('green');

    row.summaryHit.handleTap();
    row.action.handleTap();
    expect(openAlliance).toHaveBeenCalledTimes(1);
    expect(join).toHaveBeenCalledTimes(1);

    model.workshop.dialogs.alliance.rows[0] = {
      ...model.workshop.dialogs.alliance.rows[0],
      memberCount: 7,
    };
    harness.page.bind(model);
    expect(dialog.rows.get('dbp')).toBe(row);
    expect(row.memberCount.text).toBe('7/50');

    harness.page.destroy();
    harness.dispose();
  });

  it('renders owned alliance trade info and portrait member rows in separate papers', () => {
    const miraTexture = new Texture();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn((assetId) =>
      assetId === 'source:assets/avatars/mira.png' ? miraTexture : new Texture(),
    );
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'Trade Alliance',
      ownedAlliance: true,
      ownedAllianceHome: true,
      selectedTabId: 'home',
      tabs: ['home', 'quests', 'requests', 'settings'].map((id) => ({
        id,
        label: id[0].toUpperCase() + id.slice(1),
        selected: id === 'home',
        onSelect: vi.fn(),
      })),
      tradeInfo: {
        identityLabel: '[MOSS] Moss Hall',
        description: 'A quiet hall for patient traders.',
        memberCountLabel: '1/50',
      },
      tradeInfoRows: [
        { id: 'members', label: 'Members', value: '1/50' },
        { id: 'join-mode', label: 'Join Mode', value: 'Open' },
        {
          id: 'season-income',
          label: 'Season Income',
          value: '84.5k',
          itemKind: 'resource',
          itemKey: 'coin',
          resourceKey: 'coin',
        },
      ],
      members: [
        {
          id: 'member-1',
          username: 'Mira',
          character: 'mira',
          roleLabel: 'Trade Master',
          levelLabel: 'Lv 12',
          prestigeCount: 2,
          totalContributionLabel: '12.5k',
          showRankHeader: true,
          onActivate: vi.fn(),
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const dialog = harness.dialogs.get('workshop.alliance');
    const member = dialog.allianceMemberRows.get('member-1');
    expect(dialog.panel.titleLabel.text).toBe('Trade Alliance');
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(dialog.allianceTradeSection.root.visible).toBe(true);
    expect(dialog.allianceMembersSection.root.visible).toBe(true);
    expect(dialog.allianceTradeSection.title.visible).toBe(false);
    expect(dialog.allianceTradeSection.paper.y).toBeCloseTo(
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperInsetTop - PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset,
    );
    expect(dialog.allianceTradeSection.identity.y).toBe(PIXI_UI_GEOMETRY.dialogPadding + 5);
    expect(dialog.allianceTradeSection.identity.text).toBe('[MOSS] Moss Hall');
    expect(dialog.allianceMembersSection.title.visible).toBe(false);
    expect(dialog.allianceMembersSection.count.visible).toBe(false);
    expect(dialog.allianceMembersSection.scroll.root.y).toBe(PIXI_UI_GEOMETRY.dialogPadding + 5);
    const tradePaperBottom =
      dialog.allianceTradeSection.paper.y + dialog.allianceTradeSection.paper.frameHeight;
    const membersPaperTop =
      dialog.allianceMembersSection.root.y + dialog.allianceMembersSection.paper.y;
    expect(membersPaperTop - tradePaperBottom).toBe(8);
    expect(member.avatar.texture).toBe(miraTexture);
    expect(member.role.text).toBe('Trade Master');
    expect(member.role.visible).toBe(true);
    expect(member.level.text).toBe('Lv 12');
    expect(member.prestigeStars.level).toBe(2);
    expect(member.contribution.amount).toBe('12.5k');
    expect(member.getPreferredHeight()).toBe(74);
    expect(member.background.frameHeight).toBe(44);
    expect(member.root.parent).toBe(dialog.allianceMembersSection.scroll.content);
    expect(dialog.tabs.getWidgets()).toHaveLength(4);
    expect(dialog.tabsLayer.visible).toBe(true);
    expect(dialog.tabsLayer.y).toBeLessThan(dialog.panel.coreHeight);

    harness.page.destroy();
    harness.dispose();
    miraTexture.destroy();
  });

  it('renders owned alliance quests with large item art, contained coin art, and icon-backed rewards', () => {
    const crystalTexture = new Texture();
    const coinTexture = new Texture();
    const potionTexture = new Texture();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn((frame) => {
      if (frame === 'resource:crystal') {
        return crystalTexture;
      }
      if (frame === 'resource:coin') {
        return coinTexture;
      }
      if (frame === 'potion:manaTonic') {
        return potionTexture;
      }
      return Texture.EMPTY;
    });
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'Trade Alliance',
      ownedAlliance: true,
      rowWidget: 'allianceQuest',
      selectedTabId: 'quests',
      tabs: ['home', 'quests', 'requests', 'settings'].map((id) => ({
        id,
        label: id[0].toUpperCase() + id.slice(1),
        selected: id === 'quests',
        onSelect: vi.fn(),
      })),
      rows: [
        {
          id: 'fill-mana-tonic',
          title: 'Fill Mana Tonic',
          itemKind: 'potion',
          itemKey: 'manaTonic',
          objectiveLabel: 'Donate 40 Mana Tonics',
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
        {
          id: 'grand-route',
          title: 'Grand Route',
          itemKind: 'resource',
          itemKey: 'coin',
          objectiveLabel: 'Collect 250,000 Gold Coins',
          contributionLabel: 'Your contribution 12,500/12,500',
          progressLabel: '86,027/250,000',
          progress: 86_027 / 250_000,
          rewardAmountLabel: '12',
          rewardResource: 'crystal',
          actionLabel: 'Claim',
          actionVariant: 'gray',
          actionWidth: 72,
          actionHeight: 42,
          enabled: false,
        },
        {
          id: 'claimed-route',
          title: 'Hard Route',
          objectiveLabel: 'Collect 10,000 Gold Coins',
          itemKind: 'resource',
          itemKey: 'coin',
          contributionLabel: 'Your contribution 500/500',
          progressLabel: '10,000/10,000',
          progress: 1,
          rewardAmountLabel: '2',
          rewardResource: 'crystal',
          actionLabel: 'Claimed',
          actionVariant: 'gray',
          actionWidth: 72,
          actionHeight: 42,
          claimed: true,
          enabled: false,
        },
      ],
      members: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const dialog = harness.dialogs.get('workshop.alliance');
    const quest = dialog.allianceQuestRows.get('fill-mana-tonic');
    const routeQuest = dialog.allianceQuestRows.get('grand-route');
    const claimedQuest = dialog.allianceQuestRows.get('claimed-route');
    const tabs = dialog.tabs.getWidgets();
    expect(dialog.rows).toBe(dialog.allianceQuestRows);
    expect(quest.background.frameHeight).toBeCloseTo(quest.getPreferredHeight());
    expect(quest.background.texture).toBe(
      assetManager.getTexture(PIXI_ROOT_RUN_ASSETS.researchCard),
    );
    expect(quest.artWell).toMatchObject({
      frameWidth: 52,
      frameHeight: 52,
      tint: 0xdbc19f,
    });
    expect(quest.title.text).toBe('Fill Mana Tonic');
    expect(quest.description.text).toBe('Donate 40 Mana Tonics');
    expect(quest.itemIcon.texture).toBe(potionTexture);
    expect(quest.itemIcon.width).toBe(57);
    expect(quest.itemIcon.height).toBe(57);
    expect(quest.progress.text).toBe('18/40');
    expect(quest.progress.position.x).toBeCloseTo(
      quest.progressBar.root.x + quest.progressBar.width / 2,
    );
    expect(quest.progress.position.y).toBeCloseTo(
      quest.progressBar.root.y + quest.progressBar.height / 2,
    );
    expect(quest.progressBar.progress).toBeCloseTo(0.45);
    expect(quest.contribution.text).toBe('Your contribution 8/10');
    expect(quest.reward.icon.texture).toBe(crystalTexture);
    expect(quest.reward.amountLabel.textObject.text).toBe('3');
    expect(quest.reward.fontSize).toBe(13);
    expect(quest.action.text.text).toBe('Fill');
    expect(routeQuest.itemIcon.texture).toBe(coinTexture);
    expect(routeQuest.itemIcon.width).toBe(32);
    expect(routeQuest.itemIcon.height).toBe(32);
    expect(routeQuest.progressBar.progress).toBeCloseTo(86_027 / 250_000);
    expect(claimedQuest.action.root.visible).toBe(false);
    expect(claimedQuest.claimedStatus.visible).toBe(true);
    expect(claimedQuest.claimedLabel.text).toBe('Claimed');
    expect(claimedQuest.claimedCheckmark.visible).toBe(true);
    expect(claimedQuest.claimedStatus.eventMode).toBe('none');
    expect(quest.root.y).toBe(dialog.scrollContentPaddingTop);
    expect(
      dialog.panel.paperFrame.y +
        dialog.panel.paperFrame.frameHeight -
        (dialog.scroll.root.y + dialog.scroll.height),
    ).toBe(dialog.scrollContentPaddingTop);
    expect(tabs[1].root.x - (tabs[0].root.x + tabs[0].width)).toBe(6);
    expect(
      dialog.tabsLayer.y - (dialog.panel.paperFrame.y + dialog.panel.paperFrame.frameHeight),
    ).toBe(6);

    harness.page.destroy();
    harness.dispose();
    crystalTexture.destroy();
    coinTexture.destroy();
    potionTexture.destroy();
  });

  it('grows alliance quest rows to clear wrapped titles', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'Trade Alliance',
      ownedAlliance: true,
      rowWidget: 'allianceQuest',
      selectedTabId: 'quests',
      tabs: [],
      rows: [
        {
          id: 'fill-moonflower',
          title: 'Fill 5000 Moonflower Seeds Before The Eclipse Ends',
          objectiveLabel: 'Donate 5,000 Moonflower Seeds',
          contributionLabel: 'Your contribution 0/250',
          progressLabel: '1,358/5,000',
          progress: 1_358 / 5_000,
          rewardAmountLabel: '5',
          rewardResource: 'crystal',
          actionLabel: 'Locked',
          actionVariant: 'gray',
          actionWidth: 72,
          actionHeight: 42,
          enabled: false,
          lockReason: 'Quest progress belongs to another alliance.',
          onActivate: vi.fn(),
        },
      ],
      members: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const dialog = harness.dialogs.get('workshop.alliance');
    const quest = dialog.allianceQuestRows.get('fill-moonflower');
    const preferredHeight = quest.getPreferredHeight();
    expect(quest.title.style.whiteSpace).toBe('normal');
    expect(quest.title.height).toBeGreaterThan(16);
    expect(preferredHeight).toBeGreaterThanOrEqual(96);
    expect(quest.contribution.y).toBeGreaterThan(57);
    expect(quest.contribution.y).toBeGreaterThanOrEqual(quest.title.y + quest.title.height + 5);
    expect(quest.progressBar.root.x).toBeGreaterThan(quest.artWell.x + quest.artWell.frameWidth);
    expect(quest.background.frameHeight).toBeCloseTo(preferredHeight);
    expect(quest.action.width).toBe(72);
    expect(quest.action.height).toBe(42);
    expect(quest.action.control.enabled).toBe(true);
    expect(quest.action.handleTap()).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the larger adaptive Trade Alliance height stable across tabs', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    const tabIds = ['home', 'quests', 'requests', 'settings'];
    const createAllianceModel = (selectedTabId) => ({
      title: 'Trade Alliance',
      ownedAlliance: true,
      ownedAllianceHome: selectedTabId === 'home',
      selectedTabId,
      tabs: tabIds.map((id) => ({
        id,
        label: id[0].toUpperCase() + id.slice(1),
        selected: id === selectedTabId,
        onSelect: vi.fn(),
      })),
      tradeInfo: {
        identityLabel: '[MOSS] Moss Hall',
        memberCountLabel: '1/50',
      },
      tradeInfoRows: [
        { id: 'members', label: 'Members', value: '1/50' },
        { id: 'join-mode', label: 'Join Mode', value: 'Apply' },
        { id: 'season-income', label: 'Season Income', value: '84.5k' },
        {
          id: 'membership',
          label: 'Membership',
          actionLabel: 'Leave',
          enabled: true,
        },
      ],
      members: [],
      rows:
        selectedTabId === 'quests'
          ? [{ id: 'quest', label: 'Supply The Market', value: '4/10' }]
          : [],
      settings:
        selectedTabId === 'settings'
          ? {
              allianceId: 'moss',
              mode: 'settings',
              name: 'Moss Hall',
              tag: 'MOSS',
              bannerColor: 'blue',
              emblemColor: 'gold',
              joinMode: 'apply',
              editable: true,
              canDisband: false,
            }
          : null,
    });

    model.workshop.dialogs.alliance = createAllianceModel('home');
    harness.page.bind(model);
    harness.page.openDialog('alliance');
    const dialog = harness.dialogs.get('workshop.alliance');

    const heightsAt = (sourceHeight) =>
      tabIds.map((tabId) => {
        model.workshop.dialogs.alliance = createAllianceModel(tabId);
        harness.page.bind(model);
        dialog.layout({ sourceWidth: 390, sourceHeight });
        return dialog.modal.fixedBounds.height;
      });

    expect(heightsAt(844)).toEqual([470, 470, 470, 470]);
    expect(heightsAt(944)).toEqual([570, 570, 570, 570]);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders retained alliance settings fields inside the shared footer tabs', async () => {
    const onSave = vi.fn(async () => ({ ok: true }));
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'Trade Alliance',
      ownedAlliance: true,
      selectedTabId: 'settings',
      tabs: ['home', 'quests', 'requests', 'settings'].map((id) => ({
        id,
        label: id[0].toUpperCase() + id.slice(1),
        selected: id === 'settings',
        onSelect: vi.fn(),
      })),
      settings: {
        allianceId: 'moss',
        mode: 'settings',
        name: 'Moss Hall',
        tag: 'MOSS',
        tagColor: 'green',
        description: 'Patient traders.',
        notice: 'Help one another.',
        joinMode: 'apply',
        editable: true,
        canDisband: true,
        onSave,
        onDisband: vi.fn(),
      },
      rows: [],
      members: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const dialog = harness.dialogs.get('workshop.alliance');
    const pane = dialog.allianceSettingsPane;
    expect(pane.root.visible).toBe(true);
    expect(pane.fields.get('name').value).toBe('Moss Hall');
    expect(pane.fields.get('notice').value).toBe('Help one another.');
    expect(pane.swatches).toHaveLength(10);
    expect(pane.swatches.find((swatch) => swatch.selected)?.colorId).toBe('green');
    expect(pane.sectionTabs).toHaveLength(2);
    expect(pane.bannerPreview.visible).toBe(false);
    expect(pane.scroll.scrollbarThumb.visible).toBe(false);
    expect(pane.joinModeLabel.visible).toBe(false);
    expect(pane.saveButton.text.text).toBe('Save Profile');
    expect(dialog.tabs.getWidgets()).toHaveLength(4);
    expect(dialog.panel.paperFrame.visible).toBe(true);
    expect(pane.root.y).toBe(
      dialog.panel.paperFrame.y + RETAINED_DIALOG_SCROLL_GEOMETRY.contentPaddingTop,
    );

    pane.selectTagColor('violet');
    expect(pane.fields.get('tag').textLabel.colorToken).toBe('#bd9ae1');
    await pane.save();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Moss Hall',
        tag: 'MOSS',
        tagColor: 'violet',
        joinMode: 'apply',
      }),
    );

    pane.selectSection('banner');
    expect(pane.fields.get('name').visible).toBe(false);
    expect(pane.bannerPreview.visible).toBe(true);
    expect(pane.bannerPreview.flagWidth).toBe(160);
    expect(pane.bannerPreview.x).toBe((pane.lastBounds.width - 160) / 2);
    expect(pane.emblemOptions[0].size).toBe(40);
    expect(pane.emblemOptions).toHaveLength(16);
    expect(pane.emblemOptions[12].root.x).toBe(46);
    expect(pane.emblemOptionLayer.y).toBeGreaterThan(
      pane.bannerPreview.y + pane.bannerPreview.flagHeight,
    );
    expect(pane.saveButton.text.text).toBe('Save Banner');

    harness.page.destroy();
    harness.dispose();
  });

  it('renders alliance requests as player rows with accept and deny actions', () => {
    const accept = vi.fn();
    const deny = vi.fn();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'Trade Alliance',
      ownedAlliance: true,
      selectedTabId: 'requests',
      rowWidget: 'playerRelationship',
      tabs: ['home', 'quests', 'requests', 'settings'].map((id) => ({
        id,
        label: id[0].toUpperCase() + id.slice(1),
        selected: id === 'requests',
        onSelect: vi.fn(),
      })),
      rows: [
        {
          id: 'request-luna',
          identity: 'luna',
          username: 'Luna',
          character: 'mira',
          frame: 'violet',
          detail: 'Level 14',
          primaryAction: { label: 'Accept', onActivate: accept },
          secondaryAction: { label: 'Deny', onActivate: deny },
        },
      ],
      members: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const dialog = harness.dialogs.get('workshop.alliance');
    const request = dialog.allianceRequestRows.get('request-luna');
    expect(dialog.rows).toBe(dialog.allianceRequestRows);
    expect(request.name.text).toBe('Luna');
    expect(request.detail.text).toBe('Level 14');
    expect(request.primary.textLabel.textObject.text).toBe('Accept');
    expect(request.secondary.textLabel.textObject.text).toBe('Deny');
    expect(request.primary.visible).toBe(true);
    expect(request.secondary.visible).toBe(true);
    expect(request.root.parent).toBe(dialog.scroll.content);

    request.activateAction('primary');
    request.activateAction('secondary');
    expect(accept).toHaveBeenCalledOnce();
    expect(deny).toHaveBeenCalledOnce();

    harness.page.destroy();
    harness.dispose();
  });

  it('configures alliance banner and emblem colors inside the Banner tab', async () => {
    const onSave = vi.fn(async () => ({ ok: true }));
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'Trade Alliance',
      ownedAlliance: true,
      selectedTabId: 'settings',
      tabs: ['home', 'quests', 'requests', 'settings'].map((id) => ({
        id,
        label: id[0].toUpperCase() + id.slice(1),
        selected: id === 'settings',
        onSelect: vi.fn(),
      })),
      settings: {
        allianceId: 'moss',
        mode: 'settings',
        name: 'Moss Hall',
        tag: 'MOSS',
        tagColor: 'green',
        bannerColor: 'blue',
        emblemColor: 'gold',
        emblemId: 'owl',
        description: 'Patient traders.',
        notice: 'Help one another.',
        joinMode: 'apply',
        editable: true,
        onSave,
      },
      rows: [],
      members: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const pane = harness.dialogs.get('workshop.alliance').allianceSettingsPane;
    pane.selectSection('banner');
    expect(pane.bannerPreview.visible).toBe(true);
    expect(pane.bannerPreview.bannerColor).toBe('blue');
    expect(pane.bannerPreview.emblemColor).toBe('gold');
    expect(pane.bannerPreview.emblemId).toBe('owl');
    expect(pane.emblemOptions).toHaveLength(16);
    expect(pane.emblemOptions.find((option) => option.emblemId === 'owl').checkmark.visible).toBe(
      true,
    );
    expect(pane.emblemOptions.find((option) => option.emblemId === 'flame').checkmark.visible).toBe(
      false,
    );
    expect(pane.bannerColorSwatches).toHaveLength(10);
    expect(pane.emblemColorSwatches).toHaveLength(10);
    expect(pane.bannerColorSwatches[0].root.eventMode).toBe('static');
    expect(pane.emblemColorSwatches[0].root.eventMode).toBe('static');
    expect(pane.fields.get('name').visible).toBe(false);
    expect(pane.saveButton.text.text).toBe('Save Banner');

    pane.selectBannerColor('red');
    pane.selectEmblemColor('white');
    pane.selectEmblem('flame');
    expect(pane.bannerPreview.bannerColor).toBe('red');
    expect(pane.bannerPreview.emblemColor).toBe('white');
    expect(pane.bannerPreview.emblemId).toBe('flame');
    expect(pane.emblemOptions.find((option) => option.emblemId === 'owl').checkmark.visible).toBe(
      false,
    );
    expect(pane.emblemOptions.find((option) => option.emblemId === 'flame').checkmark.visible).toBe(
      true,
    );
    await pane.save();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        bannerColor: 'red',
        emblemColor: 'white',
        emblemId: 'flame',
      }),
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('renders the unaffiliated Create tab with the retained alliance form', async () => {
    const onSave = vi.fn(async () => ({ ok: true }));
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'Trade Alliance',
      directory: false,
      selectedTabId: 'create',
      tabs: ['browse', 'create'].map((id) => ({
        id,
        label: id[0].toUpperCase() + id.slice(1),
        selected: id === 'create',
        onSelect: vi.fn(),
      })),
      settings: {
        allianceId: 'new-alliance',
        mode: 'create',
        name: '',
        tag: '',
        tagColor: 'ink',
        description: '',
        joinMode: 'apply',
        editable: true,
        onSave,
      },
      rows: [],
      members: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const dialog = harness.dialogs.get('workshop.alliance');
    const pane = dialog.allianceSettingsPane;
    expect(pane.root.visible).toBe(true);
    expect(pane.fields.get('notice').visible).toBe(false);
    expect(pane.fields.get('description').visible).toBe(false);
    expect(pane.saveButton.text.text).toBe('Create Alliance');
    expect(pane.disbandButton.root.visible).toBe(false);
    expect(dialog.tabs.getWidgets()).toHaveLength(2);
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(pane.createSections).toHaveLength(2);
    expect(pane.createSections.every((section) => section.visible)).toBe(true);
    expect(
      pane.createAccessSection.y -
        (pane.createIdentitySection.y + pane.createIdentitySection.frameHeight),
    ).toBe(PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap);
    expect(pane.root.x).toBe(0);
    expect(pane.root.y).toBe(0);
    expect(pane.createIdentitySection.x).toBeCloseTo(dialog.panel.paperFrame.x);
    expect(pane.createIdentitySection.frameWidth).toBeCloseTo(dialog.panel.paperFrame.frameWidth);
    expect(pane.bannerPreview.flagWidth).toBe(88);
    expect(pane.bannerPreview.flagHeight).toBe(88);
    expect(pane.bannerPreview.x).toBe(pane.emblemLabel.x - 13);
    expect(pane.labels.get('name').y).toBe(pane.bannerPreview.y);
    expect(pane.labels.get('name').x - (pane.bannerPreview.x + pane.bannerPreview.flagWidth)).toBe(
      8,
    );
    expect(pane.fields.get('name').fieldWidth).toBe(181);
    expect(pane.fields.get('tag').fieldWidth).toBe(pane.fields.get('name').fieldWidth);
    expect(pane.emblemLabel.y).toBeGreaterThan(
      pane.bannerPreview.y + pane.bannerPreview.flagHeight,
    );
    expect(pane.emblemColorLabel.y).toBeGreaterThan(pane.emblemLabel.y);
    expect(pane.emblemOptions[0].size).toBe(24);
    expect(pane.emblemOptions[0].icon.width).toBe(19);
    expect(pane.emblemOptions[9].root.y).toBe(0);
    expect(pane.emblemOptions[10].root.x).toBe(0);
    expect(pane.emblemOptions[10].root.y).toBe(26);
    expect(pane.emblemColorLabel.y).toBeGreaterThan(
      pane.emblemOptionLayer.y + pane.emblemOptions[10].root.y + 24,
    );
    expect(pane.bannerColorLabel.y).toBeGreaterThan(pane.emblemColorLabel.y);
    expect(pane.tagColorLabel.y).toBeGreaterThan(pane.bannerColorLabel.y);
    expect(pane.saveButton.root.y).toBeGreaterThan(
      pane.joinModeButtons[0].root.y + pane.joinModeButtons[0].height,
    );
    expect(
      pane.createAccessSection.y +
        pane.createAccessSection.frameHeight -
        (pane.saveButton.root.y + pane.saveButton.height),
    ).toBeLessThanOrEqual(16);
    expect(pane.createAccessSection.y + pane.createAccessSection.frameHeight).toBeLessThan(
      dialog.tabsLayer.y,
    );

    pane.fields.get('name').setValue('Moon Traders', { notify: true });
    pane.fields.get('tag').setValue('MOON', { notify: true });
    await pane.save();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Moon Traders',
        tag: 'MOON',
        joinMode: 'apply',
      }),
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('renders potion discoveries as Recipe-style paper pages', () => {
    const openDiscoverer = vi.fn();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => new Texture());
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.discoveries = {
      title: 'Discoveries',
      rows: [
        {
          id: 'potion:silverleafQuiet',
          type: 'potionDiscovery',
          discovered: true,
          potionKey: 'silverleafQuiet',
          label: 'Silverleaf Quiet',
          discovererUsername: 'Ada',
          discovererIdentity: 'identity-ada',
          discoveredAtLabel: 'Jan 2, 2026',
          ingredients: [
            {
              key: 'mintHerb',
              label: 'Mint',
              quantity: 1,
            },
            {
              key: 'silverleafHerb',
              label: 'Silverleaf',
              quantity: 2,
            },
          ],
          manaLabel: '34 Mana',
          durationLabel: '75s Brew',
          royaltyLabel: '12.5 Coin Royalty',
          onDiscovererActivate: openDiscoverer,
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('discoveries');

    const dialog = harness.dialogs.get('workshop.discoveries');
    const row = dialog.rows.get('potion:silverleafQuiet');
    expect(dialog.panel.titleLabel.text).toBe('Discoveries');
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(dialog.modal.fixedBounds).toMatchObject({
      width: 304,
      height: 404,
    });
    expect(dialog.discoveryBook.children).toEqual([row.root]);
    expect(dialog.discoveryPageLabel.text).toBe('1 / 1');
    expect(row).toMatchObject({ width: 155, height: 341 });
    expect(row.name.text).toBe('Silverleaf Quiet');
    expect(row.discovererName.text).toBe('Ada');
    expect(row.date.text).toBe('Jan 2, 2026');
    expect(row.mana.text).toBe('34');
    expect(row.duration.text).toBe('75s');
    expect(row.royalty.text).toBe('12.5');
    expect(row.ingredientRows[0].label.text).toBe('Mint');
    expect(row.ingredientRows[0].quantity.text).toBe('×1');
    expect(row.ingredientRows[1].label.text).toBe('Silverleaf');
    expect(row.ingredientRows[1].quantity.text).toBe('×2');
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.dialogPaper);
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('potion:silverleafQuiet');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('herb:mintHerb');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('herb:silverleafHerb');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('resource:mana');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('resource:coin');
    expect(row.activateDiscoverer()).toBe(true);
    expect(openDiscoverer).toHaveBeenCalledWith(model.workshop.dialogs.discoveries.rows[0]);

    harness.page.destroy();
    harness.dispose();
  });

  it('pages potion discoveries two at a time like the Recipes book', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.discoveries = {
      title: 'Discoveries',
      rows: [0, 1, 2].map((index) => ({
        id: `potion:${index}`,
        discovered: false,
        potionKey: `unknown-${index}`,
      })),
    };

    harness.page.bind(model);
    harness.page.openDialog('discoveries');

    const dialog = harness.dialogs.get('workshop.discoveries');
    expect(dialog.discoveryBook.children).toHaveLength(2);
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('status:lockDefault');
    expect(dialog.rows.get('potion:0').potionIcon.alpha).toBe(1);
    expect(
      dialog.rows.get('potion:0').potionIcon.width / dialog.rows.get('potion:0').potionIcon.height,
    ).toBeCloseTo(53 / 60);
    const unknownPage = dialog.rows.get('potion:0');
    expect(unknownPage.potionIcon.x + unknownPage.potionIcon.width / 2).toBeCloseTo(
      unknownPage.width / 2,
    );
    expect(unknownPage.potionIcon.y + unknownPage.potionIcon.height / 2).toBeLessThan(
      unknownPage.height / 2,
    );
    expect(unknownPage.unknownStatus.visible).toBe(true);
    expect(unknownPage.unknownStatus.eventMode).toBe('none');
    expect(unknownPage.unknownStatusLabel.text).toBe('Recipe not yet discovered');
    expect(unknownPage.unknownStatus.y + unknownPage.unknownStatusBackground.frameHeight).toBe(
      unknownPage.height - 8,
    );
    expect(unknownPage.unknownOverlay.visible).toBe(true);
    expect(unknownPage.unknownOverlay.eventMode).toBe('none');
    expect(unknownPage.unknownOverlay.tint).toBe(0x000000);
    expect(unknownPage.unknownOverlay.alpha).toBe(0.18);
    expect(unknownPage.unknownOverlay.frameWidth).toBe(unknownPage.width);
    expect(unknownPage.unknownOverlay.frameHeight).toBe(unknownPage.height);
    expect(unknownPage.root.getChildIndex(unknownPage.unknownStatus)).toBeGreaterThan(
      unknownPage.root.getChildIndex(unknownPage.unknownOverlay),
    );
    expect(unknownPage.name.visible).toBe(false);
    expect(unknownPage.discovererPrefix.visible).toBe(false);
    expect(unknownPage.recipeLabel.visible).toBe(false);
    expect(unknownPage.visibleIngredientCount).toBe(0);
    expect(unknownPage.activateDiscoverer()).toBe(false);
    expect(dialog.discoveryPageLabel.text).toBe('1-2 / 3');
    expect(dialog.discoveryPrevious.enabled).toBe(false);
    expect(dialog.discoveryNext.enabled).toBe(true);

    expect(dialog.showNextDiscoverySpread()).toBe(true);
    expect(dialog.discoveryBook.children).toHaveLength(1);
    expect(dialog.discoveryPageLabel.text).toBe('3-3 / 3');
    expect(dialog.discoveryPrevious.enabled).toBe(true);
    expect(dialog.discoveryNext.enabled).toBe(false);
    expect(dialog.showNextDiscoverySpread()).toBe(false);

    expect(dialog.showPreviousDiscoverySpread()).toBe(true);
    expect(dialog.discoveryPageLabel.text).toBe('1-2 / 3');

    dialog.bind({ title: 'Discoveries', rows: [] });
    expect(dialog.discoveryBook.children).toHaveLength(3);
    expect(dialog.discoveryEmptyText.text).toBe('No potion discoveries yet.');
    expect(dialog.discoveryPageLabel.text).toBe('1 / 1');
    expect(dialog.discoveryPrevious.enabled).toBe(false);
    expect(dialog.discoveryNext.enabled).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('reuses framed inventory rows with larger art across every Bag row kind', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.bag = {
      title: 'Bag',
      selectedTabId: 'currencies',
      tabs: [{ id: 'currencies', label: 'Currencies', selected: true }],
      rows: [
        {
          id: 'mana',
          label: 'Mana',
          value: '4/10',
          resourceKey: 'mana',
          itemKind: 'resource',
          itemKey: 'mana',
        },
        {
          id: 'sageSeed',
          label: 'Sage',
          value: '2',
          resourceKey: 'seed',
          itemKind: 'seed',
          itemKey: 'sageSeed',
        },
        {
          id: 'sageHerb',
          label: 'Sage',
          value: '1',
          resourceKey: 'herb',
          itemKind: 'herb',
          itemKey: 'sageHerb',
        },
        {
          id: 'manaTonic',
          label: 'Mana Tonic',
          value: '5',
          resourceKey: 'potion',
          itemKind: 'potion',
          itemKey: 'manaTonic',
        },
        {
          id: 'cyclopsEye',
          label: 'Cyclops Eye',
          value: '6',
          resourceKey: 'ingredient',
          itemKind: 'ingredient',
          itemKey: 'cyclopsEye',
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('bag');

    const dialog = harness.dialogs.get('workshop.bag');
    const rows = dialog.rows.getWidgets();
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('resource:mana');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('seed:pack');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('herb:sageHerb');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('potion:manaTonic');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('ingredient:cyclopsEye');
    expect(rows.every((row) => row instanceof RootRunInventoryChoiceRowPixi)).toBe(true);
    expect(rows.every((row) => row.background instanceof PixiNineSliceFrame)).toBe(true);
    expect(
      rows.every(
        (row) => row.background.frameWidth === RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
      ),
    ).toBe(true);
    expect(dialog.scroll.root.x).toBeCloseTo(
      (dialog.panel.coreWidth - RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth) / 2,
    );
    expect(dialog.scroll.width).toBe(
      RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth +
        RETAINED_DIALOG_LIST_GEOMETRY.scrollbarViewportOutset,
    );
    expect(rows.every((row) => row.background.frameHeight === 44)).toBe(true);
    expect(rows.every((row) => row.itemIcon.visible)).toBe(true);
    expect(rows.map((row) => Math.max(row.itemIcon.width, row.itemIcon.height))).toEqual([
      32, 32, 32, 36, 32,
    ]);
    expect(
      rows.every((row) => row.value.textObject.style.fill === row.label.textObject.style.fill),
    ).toBe(true);
    expect(
      rows.every(
        (row) =>
          row.value.x ===
          RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth - PIXI_ROOT_RUN_GEOMETRY.settings.rowPadding,
      ),
    ).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('insets the stats scroll crop and moves its scrollbar toward the paper edge', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.stats = {
      title: 'stats',
      selectedTabId: 'seeds',
      tabs: [
        { id: 'seeds', label: 'seeds', selected: true },
        { id: 'herbs', label: 'herbs', selected: false },
        { id: 'potions', label: 'potions', selected: false },
        { id: 'coin', label: 'coin', selected: false },
      ],
      rows: Array.from({ length: 20 }, (_, index) => ({
        id: `row-${index}`,
        label: `row ${index}`,
        value: String(index),
      })),
    };

    harness.page.bind(model);
    harness.page.openDialog('stats');

    const dialog = harness.dialogs.get('workshop.stats');
    const firstRow = dialog.rows.get('row-0');
    const secondRow = dialog.rows.get('row-1');
    const tabs = dialog.tabs.getWidgets();
    const shellBottom = dialog.panel.coreHeight + PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
    const tabsBottom = dialog.tabsLayer.position.y + tabs[0].height;
    const paperBottom = dialog.panel.paperFrame.position.y + dialog.panel.paperFrame.frameHeight;
    expect(dialog.scroll.root.y).toBe(24);
    expect(firstRow.root.y).toBe(12);
    expect(secondRow.root.y).toBe(12 + firstRow.getPreferredHeight() + 4);
    expect(dialog.scroll.width).toBe(268);
    expect(dialog.scroll.scrollbarTrack.visible).toBe(true);
    expect(dialog.scroll.scrollbarTrack.getLocalBounds().x).toBeGreaterThan(268);
    expect(dialog.tabsLayer.position.x).toBe(9);
    expect(tabs).toHaveLength(4);
    expect(shellBottom - tabsBottom).toBeCloseTo(10);
    expect(dialog.tabsLayer.position.y - paperBottom).toBeCloseTo(6);
    expect(tabs[1].root.x - (tabs[0].root.x + tabs[0].width)).toBeCloseTo(6);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders only the visible Leaderboard row window while scrolling', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.leaderboard = {
      title: 'Leaderboard',
      selectedTabId: 'singlePlayer',
      selectedPeriodId: 'allTime',
      tabs: [
        { id: 'singlePlayer', label: 'Players', selected: true },
        { id: 'alliance', label: 'Alliances', selected: false },
      ],
      periodTabs: [
        { id: 'daily', label: 'Daily', selected: false },
        { id: 'weekly', label: 'Weekly', selected: false },
        { id: 'monthly', label: 'Monthly', selected: false },
        { id: 'allTime', label: 'All Time', selected: true },
      ],
      rowWidget: 'leaderboard',
      rows: Array.from({ length: 100 }, (_, index) => ({
        id: `player-${index}`,
        type: 'leaderboardPlayer',
        rank: index + 1,
        username: `Wizard ${index + 1}`,
        character: 'elara',
        frame: 'classic',
        playerLevel: index + 1,
        prestigeCount: index % 4,
        totalCoinLabel: `${1000 - index}`,
      })),
    };

    harness.page.bind(model);
    harness.page.openDialog('leaderboard');
    const dialog = harness.dialogs.get('workshop.leaderboard');
    const rows = dialog.rows.getWidgets();

    expect(rows).toHaveLength(100);
    expect(rows.filter((row) => row.root.renderable)).not.toHaveLength(100);
    expect(rows.filter((row) => row.root.renderable).length).toBeGreaterThan(0);
    expect(rows[0].root.renderable).toBe(true);
    expect(rows.at(-1).root.renderable).toBe(false);

    dialog.scroll.scrollTo(dialog.scroll.contentHeight - dialog.scroll.height);

    expect(rows[0].root.renderable).toBe(false);
    expect(rows.at(-1).root.renderable).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders only the visible World Chat row window while scrolling', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: Array.from({ length: 40 }, (_, index) => ({
        id: `system-${index}`,
        type: 'system',
        username: 'System',
        body: `Message ${index}`,
        ageLabel: `${40 - index}m ago`,
      })),
      onSubmit: vi.fn(),
    };

    harness.page.bind(model);
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');
    const rows = dialog.rows.getWidgets();

    expect(rows).toHaveLength(40);
    expect(rows.filter((row) => row.root.renderable)).not.toHaveLength(40);
    expect(rows.filter((row) => row.root.renderable).length).toBeGreaterThan(0);
    expect(rows[0].root.renderable).toBe(false);
    expect(rows.at(-1).root.renderable).toBe(true);

    dialog.scroll.scrollTo(0);

    expect(rows[0].root.renderable).toBe(true);
    expect(rows.at(-1).root.renderable).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('skips unchanged World Chat rows and binds only newly appended messages', () => {
    const harness = createHarness();
    const createModel = (rows) => {
      const model = createWorkshopViewModel();
      model.workshop.dialogs.worldChat = {
        title: 'World Chat',
        composer: {
          placeholder: 'Message',
          maxLength: 160,
          enabled: true,
        },
        rows: rows.map((row) => ({ ...row })),
        onSubmit: vi.fn(),
      };
      return model;
    };
    const rows = [
      {
        id: 'message-1',
        type: 'player',
        username: 'Mira',
        body: 'The garden is ready.',
        ageLabel: 'now',
      },
    ];

    harness.page.bind(createModel(rows));
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');
    const firstRow = dialog.rows.get('message-1');
    const firstRowBind = vi.spyOn(firstRow, 'bind');

    harness.page.bind(createModel(rows));
    expect(firstRowBind).not.toHaveBeenCalled();

    rows.push({
      id: 'message-2',
      type: 'player',
      username: 'Rowan',
      body: 'The cauldron is bubbling.',
      ageLabel: 'now',
    });
    harness.page.bind(createModel(rows));

    expect(firstRowBind).not.toHaveBeenCalled();
    expect(dialog.rows.get('message-2').body.text).toContain('The cauldron is bubbling.');

    harness.page.destroy();
    harness.dispose();
  });

  it('clears submitted chat drafts immediately and restores only an untouched failed draft', async () => {
    let resolveSend;
    const send = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    );
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'message',
        maxLength: 160,
        enabled: true,
      },
      rows: [],
      onSubmit: send,
    };
    harness.page.bind(model);
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');

    expect(dialog.composerSubmit.enabled).toBe(true);
    await expect(dialog.submitComposer()).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();

    dialog.composerField.setValue('hello', { notify: true });
    const failedSubmission = dialog.submitComposer();
    expect(send).toHaveBeenCalledWith('hello');
    expect(dialog.composerField.value).toBe('');

    resolveSend({ ok: false, reason: 'global_rate_limited' });
    await expect(failedSubmission).resolves.toBe(false);
    expect(dialog.composerField.value).toBe('hello');
    expect(dialog.status.text).toBe('');

    const successfulSubmission = dialog.submitComposer();
    expect(dialog.composerField.value).toBe('');
    dialog.composerField.setValue('next message', { notify: true });

    resolveSend({ ok: true, body: 'hello' });
    await expect(successfulSubmission).resolves.toBe(true);
    expect(dialog.composerField.value).toBe('next message');
    expect(dialog.status.text).toBe('');
    expect(dialog.composerSubmit.enabled).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);

    harness.dialogs.close('workshop.worldChat');
    expect(dialog.composerField.focused).toBe(false);
    expect(dialog.status.text).toBe('');

    harness.page.destroy();
    harness.dispose();
  });

  it('opens World Chat at the newest message', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: Array.from({ length: 20 }, (_, index) => ({
        id: `system-${index}`,
        type: 'system',
        username: 'System',
        body: `Message ${index}`,
        ageLabel: `${20 - index}m ago`,
      })),
      onSubmit: vi.fn(),
    };
    harness.page.bind(model);
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');
    const paperTop = dialog.panel.paperFrame.y;

    expect(dialog.scroll.offsetY).toBeGreaterThan(0);
    expect(dialog.scroll.offsetY).toBeCloseTo(dialog.scroll.contentHeight - dialog.scroll.height);
    expect(dialog.scroll.root.y - paperTop).toBeGreaterThanOrEqual(7);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps World Chat pinned to the newest message when a wrapped row arrives', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    const rows = Array.from({ length: 20 }, (_, index) => ({
      id: `system-${index}`,
      type: 'system',
      username: 'System',
      body: `Message ${index}`,
      ageLabel: `${20 - index}m ago`,
    }));
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows,
      onSubmit: vi.fn(),
    };
    harness.page.bind(model);
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');
    const previousBottom = dialog.scroll.offsetY;

    rows.push({
      id: 'player-wrapped',
      type: 'player',
      username: 'Mira',
      body: 'This newly arrived message wraps onto multiple lines and must remain completely visible.',
      ageLabel: 'now',
    });
    harness.page.bind(model);

    const wrappedRow = dialog.rows.get('player-wrapped');
    expect(wrappedRow.getPreferredHeight()).toBeGreaterThan(52.65);
    expect(dialog.scroll.contentHeight - dialog.scroll.height).toBeGreaterThan(previousBottom);
    expect(dialog.scroll.offsetY).toBeCloseTo(dialog.scroll.contentHeight - dialog.scroll.height);

    dialog.scroll.scrollTo(dialog.scroll.offsetY - 80);
    const readingOffset = dialog.scroll.offsetY;
    rows.push({
      id: 'player-newer',
      type: 'player',
      username: 'Rowan',
      body: 'This newer message should not pull a reader away from older chat.',
      ageLabel: 'now',
    });
    harness.page.bind(model);
    expect(dialog.scroll.offsetY).toBeCloseTo(readingOffset);

    harness.page.destroy();
    harness.dispose();
  });

  it('anchors World Chat to the stage edges and keeps its composer above the keyboard', () => {
    const harness = createHarness({ reducedMotion: true });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: [],
      onSubmit: vi.fn(),
    };
    harness.page.bind(model);
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');
    const geometry = PIXI_ROOT_RUN_GEOMETRY.dialog;
    expect(dialog.modal.fixedBounds.x - geometry.frameOutset).toBe(0);
    expect(dialog.modal.fixedBounds.x + dialog.modal.fixedBounds.width + geometry.frameOutset).toBe(
      dialog.sourceWidth,
    );
    expect(
      dialog.modal.fixedBounds.y + dialog.modal.fixedBounds.height + geometry.frameOutset,
    ).toBeCloseTo(dialog.sourceHeight);
    expect(dialog.modal.fixedBounds.height).toBeCloseTo(dialog.sourceHeight * 0.8);
    expect(dialog.panel.headerLayout).toBe('edge');
    expect(dialog.panel.titleFrame.x).toBe(-geometry.frameOutset);
    expect(dialog.panel.closeControl.x + geometry.closeSize / 2).toBe(
      dialog.panel.coreWidth + geometry.frameOutset,
    );
    expect(dialog.panel.closeControl.y).toBeCloseTo(
      dialog.panel.titleFrame.y + dialog.panel.titleFrame.frameHeight / 2,
    );
    expect(dialog.panel.titleFrame.y + dialog.panel.titleFrame.frameHeight).toBeCloseTo(
      -geometry.frameOutset - 4,
    );

    dialog.layout({
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
      worldChatShift: 0,
    });
    const restingPanelY = dialog.modal.fixedBounds.y;
    const restingPanelHeight = dialog.modal.fixedBounds.height;
    const restingScrollHeight = dialog.scroll.height;
    const restingComposerWidth = dialog.composerField.fieldWidth;
    expect(restingPanelHeight).toBeCloseTo((2170 / 3) * 0.8);
    dialog.layout({
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
      worldChatShift: -290,
    });

    expect(dialog.modal.fixedBounds.y + dialog.panel.titleFrame.y).toBeCloseTo(18);
    expect(
      dialog.modal.fixedBounds.y + dialog.panel.closeControl.y - geometry.closeSize / 2,
    ).toBeGreaterThanOrEqual(18);
    expect(dialog.modal.fixedBounds.y).toBeGreaterThan(restingPanelY - 290);
    expect(dialog.modal.fixedBounds.height).toBeLessThan(restingPanelHeight);
    expect(dialog.scroll.height).toBeLessThan(restingScrollHeight);
    expect(dialog.composerField.fieldWidth).toBe(restingComposerWidth);
    expect(dialog.composerField.fieldHeight).toBe(29);
    expect(
      dialog.modal.fixedBounds.y + dialog.modal.fixedBounds.height + geometry.frameOutset,
    ).toBeCloseTo(dialog.sourceHeight - 290);
    expect(
      dialog.modal.fixedBounds.y + dialog.composerField.y + dialog.composerField.fieldHeight,
    ).toBeLessThan(1300 / 3);

    const keyboardPanelHeight = dialog.modal.fixedBounds.height;
    harness.page.bind(model);
    expect(dialog.modal.fixedBounds.y + dialog.panel.titleFrame.y).toBeCloseTo(18);
    expect(dialog.modal.fixedBounds.height).toBeCloseTo(keyboardPanelHeight);
    expect(
      dialog.modal.fixedBounds.y + dialog.modal.fixedBounds.height + geometry.frameOutset,
    ).toBeCloseTo(dialog.sourceHeight - 290);

    harness.page.destroy();
    harness.dispose();
  });

  it('extends World Chat from a compact sheet and follows keyboard height changes without scaling content', () => {
    const motion = createWorkshopMotionHarness();
    const harness = createHarness({
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      reducedMotion: false,
    });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: [
        {
          id: 'player-1',
          type: 'player',
          username: 'Rowan',
          body: 'The sheet should move, while this row keeps its size.',
          ageLabel: 'now',
        },
      ],
      onSubmit: vi.fn(),
    };
    harness.page.bind(model);
    harness.page.openDialog('worldChat');

    const dialog = harness.dialogs.get('workshop.worldChat');
    const geometry = PIXI_ROOT_RUN_GEOMETRY.dialog;
    const row = dialog.rows.get('player-1');
    const restingBottom = dialog.sourceHeight - geometry.frameOutset;
    const restingHeight = dialog.sourceHeight * 0.8;
    const rowHeight = row.getPreferredHeight();
    const composerSize = {
      width: dialog.composerField.fieldWidth,
      height: dialog.composerField.fieldHeight,
    };

    expect(dialog.modal.fixedBounds.height).toBeCloseTo(190);
    expect(dialog.modal.fixedBounds.y + dialog.modal.fixedBounds.height).toBeCloseTo(restingBottom);

    motion.runAt(140);
    expect(dialog.modal.fixedBounds.height).toBeGreaterThan(190);
    expect(dialog.modal.fixedBounds.height).toBeLessThan(restingHeight);
    expect(dialog.panel.scale.x).toBe(1);
    expect(row.root.scale.x).toBe(1);
    expect(dialog.modal.fixedBounds.y + dialog.modal.fixedBounds.height).toBeCloseTo(restingBottom);

    motion.runAt(280);
    expect(dialog.modal.fixedBounds.height).toBeCloseTo(restingHeight);
    expect(row.getPreferredHeight()).toBeCloseTo(rowHeight);
    expect(dialog.composerField.fieldWidth).toBeCloseTo(composerSize.width);
    expect(dialog.composerField.fieldHeight).toBeCloseTo(composerSize.height);

    const keyboardProjection = {
      sourceWidth: dialog.sourceWidth,
      sourceHeight: dialog.sourceHeight,
      worldChatShift: -290,
    };
    dialog.layout(keyboardProjection);
    const fullHeight = dialog.modal.fixedBounds.height;
    motion.runAt(400);
    expect(dialog.modal.fixedBounds.height).toBeLessThan(fullHeight);
    expect(dialog.panel.scale.x).toBe(1);
    expect(row.root.scale.x).toBe(1);
    const contractingHeight = dialog.modal.fixedBounds.height;
    motion.runAt(520);
    const keyboardHeight = dialog.modal.fixedBounds.height;
    expect(keyboardHeight).toBeLessThan(contractingHeight);
    expect(dialog.modal.fixedBounds.y + dialog.panel.titleFrame.y).toBeCloseTo(18);

    dialog.layout({
      ...keyboardProjection,
      worldChatShift: 0,
    });
    motion.runAt(640);
    expect(dialog.modal.fixedBounds.height).toBeGreaterThan(keyboardHeight);
    expect(dialog.modal.fixedBounds.height).toBeLessThan(restingHeight);
    motion.runAt(760);
    expect(dialog.modal.fixedBounds.height).toBeCloseTo(restingHeight);
    expect(row.getPreferredHeight()).toBeCloseTo(rowHeight);
    expect(dialog.composerField.fieldWidth).toBeCloseTo(composerSize.width);
    expect(dialog.composerField.fieldHeight).toBeCloseTo(composerSize.height);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders compact World Chat rows without action chrome and keeps player links on the avatar and username', () => {
    const openPlayer = vi.fn();
    const pressRegistrations = [];
    const inputRouter = {
      registerPressTarget: vi.fn((displayObject, descriptor) => {
        pressRegistrations.push({ displayObject, descriptor });
        const unregister = vi.fn();
        unregister.unregister = unregister;
        return unregister;
      }),
      pushModal: vi.fn(() => ({ unregister: vi.fn() })),
    };
    const harness = createHarness({ inputRouter, reducedMotion: true });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: [
        {
          id: 'player-1',
          type: 'player',
          username: 'Mira',
          body: 'The moon garden is glowing.',
          allianceTag: 'MOSS',
          allianceTagColor: 'green',
          character: 'mira',
          frame: 'emerald',
          ageLabel: '3m ago',
          onActivate: openPlayer,
        },
        {
          id: 'system-1',
          type: 'system',
          username: 'System',
          body: 'The weekly world event has begun.',
          ageLabel: '8m ago',
        },
      ],
      onSubmit: vi.fn(),
    };
    harness.page.bind(model);
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');
    const playerRow = dialog.rows.get('player-1');
    const systemRow = dialog.rows.get('system-1');

    expect(playerRow.avatarWidget.avatarFrame.tint).toBe(0xa3f6b2);

    expect(dialog.composerField.variant).toBe('clean-inset');
    expect(dialog.composerField.placeholder).toBe('Message');
    expect(dialog.composerField.retainOnSubmit).toBe(true);
    expect(dialog.composerSubmit.control.variant).toBe('yellow');
    expect(dialog.composerSubmit.text.text).toBe('Send');
    expect(dialog.composerSubmit.enabled).toBe(true);
    const composerSubmitRegistration = pressRegistrations.find(
      ({ displayObject }) => displayObject === dialog.composerSubmit.root,
    );
    expect(composerSubmitRegistration?.descriptor.preserveFocus).toBe(true);
    expect(dialog.composerField.y).toBeCloseTo(dialog.modal.fixedBounds.height - 40);
    expect(dialog.composerField.x).toBeCloseTo(dialog.panel.paperFrame.x);
    expect(dialog.composerField.fieldWidth).toBeCloseTo(295 + 1 / 3);
    expect(dialog.composerField.fieldHeight).toBe(29);
    const longDraft =
      'The latest part of this long World Chat draft must remain visible while the player keeps typing.';
    dialog.composerField.applySessionSnapshot({
      active: true,
      selectionEnd: longDraft.length,
      selectionStart: longDraft.length,
      value: longDraft,
    });
    const composerCaretBounds = dialog.composerField.caretGraphic.getLocalBounds();
    expect(composerCaretBounds.x).toBeGreaterThanOrEqual(0);
    expect(composerCaretBounds.x + composerCaretBounds.width).toBeLessThanOrEqual(
      dialog.composerField.textAreaWidth,
    );
    expect(dialog.composerField.textLabel.x).toBeLessThan(0);
    expect(dialog.composerSubmit.root.x).toBeCloseTo(296 + 2 / 3);
    expect(dialog.composerSubmit.width).toBe(74);
    expect(dialog.composerSubmit.height).toBe(29);
    expect(
      dialog.composerSubmit.root.x - (dialog.composerField.x + dialog.composerField.fieldWidth),
    ).toBe(6);
    expect(dialog.composerSubmit.root.x + dialog.composerSubmit.width).toBeCloseTo(
      dialog.panel.paperFrame.x + dialog.panel.paperFrame.frameWidth - 4,
    );
    expect(dialog.scroll.width - playerRow.width).toBe(3);
    expect(dialog.panel.paperFrame.y + dialog.panel.paperFrame.frameHeight).toBeLessThan(
      dialog.composerField.y,
    );

    expect(playerRow.tag.text).toBe('[MOSS]');
    expect(playerRow.tag.style.stroke?.width ?? 0).toBe(0);
    expect(playerRow.username.text).toBe('Mira');
    expect(playerRow.username.style.fill).toBe('#634934');
    expect(playerRow.username.style.stroke?.width ?? 0).toBe(0);
    expect(playerRow.body.x).toBe(playerRow.tag.x);
    expect(playerRow.body.x).toBeCloseTo(48.75);
    expect(playerRow.body.y).toBeCloseTo(17.55);
    expect(playerRow.body.y - playerRow.username.y).toBeCloseTo(18.55);
    expect(playerRow.tag.y).toBe(-1);
    expect(playerRow.username.y).toBe(-1);
    expect(playerRow.avatar.width).toBeCloseTo(42.9);
    expect(playerRow.tag.style.fontSize).toBeCloseTo(14.85);
    expect(playerRow.username.style.fontSize).toBeCloseTo(14.85);
    expect(playerRow.body.style.fontSize).toBeCloseTo(14.85);
    expect(playerRow.body.style.lineHeight).toBeCloseTo(17.55);
    expect(playerRow.timestamp.style.fontSize).toBeCloseTo(11.475);
    expect(playerRow.getPreferredHeight()).toBeCloseTo(52.65);
    expect(dialog.scroll.root.x).toBe(8);
    expect(dialog.scroll.width).toBe(354);
    expect(playerRow.root.hitArea.width).toBe(351);
    expect(playerRow.username.x - (playerRow.tag.x + playerRow.tag.width)).toBe(2);
    expect(playerRow.avatar.eventMode).toBe('static');
    expect(playerRow.username.eventMode).toBe('static');
    expect(playerRow.action).toBeUndefined();
    expect(systemRow.root.y + systemRow.getPreferredHeight()).toBeCloseTo(dialog.scroll.height);
    expect(playerRow.root.y).toBeCloseTo(
      dialog.scroll.height - playerRow.getPreferredHeight() - 3 - systemRow.getPreferredHeight(),
    );
    const avatarPress = pressRegistrations.find(
      ({ displayObject }) => displayObject === playerRow.avatar,
    );
    const usernamePress = pressRegistrations.find(
      ({ displayObject }) => displayObject === playerRow.username,
    );
    expect(avatarPress?.descriptor.excludePageSwipe).toBe(true);
    expect(usernamePress?.descriptor.excludePageSwipe).toBe(true);
    expect(avatarPress?.descriptor.onActivate()).toBe(true);
    expect(usernamePress?.descriptor.onActivate()).toBe(true);
    expect(openPlayer).toHaveBeenCalledTimes(2);
    expect(openPlayer).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'player-1' }));
    expect(openPlayer).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'player-1' }));

    expect(systemRow.systemBackground.visible).toBe(true);
    expect(systemRow.avatar.visible).toBe(false);
    expect(systemRow.avatar.eventMode).toBe('none');
    expect(systemRow.username.eventMode).toBe('none');
    expect(systemRow.action).toBeUndefined();
    expect(systemRow.getPreferredHeight()).toBeCloseTo(43.875);
    expect(systemRow.root.y - playerRow.root.y).toBeCloseTo(playerRow.getPreferredHeight() + 3);

    harness.page.destroy();
    harness.dispose();
  });

  it("mirrors the connected player's World Chat row to the right", () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: [
        {
          id: 'own-player-1',
          type: 'player',
          isOwn: true,
          connected: true,
          username: 'Mira',
          body: 'I will join the next expedition from the moon garden.',
          allianceTag: 'MOSS',
          allianceTagColor: 'green',
          character: 'mira',
          ageLabel: 'now',
        },
      ],
      onSubmit: vi.fn(),
    };

    harness.page.bind(model);
    harness.page.openDialog('worldChat');

    const dialog = harness.dialogs.get('workshop.worldChat');
    const row = dialog.rows.get('own-player-1');
    const textRight = row.width - 48.75;

    expect(row.isOwn).toBe(true);
    expect(row.avatar.x).toBeCloseTo(row.width - row.avatar.width / 2);
    expect(row.presenceDot.x + 7).toBeCloseTo(textRight);
    expect(row.body.x + row.body.layoutWidth).toBeCloseTo(textRight);
    expect(row.username.style.fontSize).toBeCloseTo(14.85);
    expect(row.body.style.fontSize).toBeCloseTo(14.1075);
    expect(row.body.style.lineHeight).toBeCloseTo(16.6725);
    expect(row.body.y).toBeCloseTo(19.305);
    expect(row.body.y - row.username.y).toBeCloseTo(20.305);
    expect(row.body.layoutHeight).toBeGreaterThan(row.body.style.lineHeight);
    expect(row.timestamp.anchor.x).toBe(0);
    expect(row.timestamp.x).toBe(0);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders Alliance ranks and inline-highlighted system announcements with compact avatars', () => {
    const openPlayer = vi.fn();
    const pressRegistrations = [];
    const inputRouter = {
      registerPressTarget: vi.fn((displayObject, descriptor) => {
        pressRegistrations.push({ displayObject, descriptor });
        const unregister = vi.fn();
        unregister.unregister = unregister;
        return unregister;
      }),
      pushModal: vi.fn(() => ({ unregister: vi.fn() })),
    };
    const harness = createHarness({ inputRouter });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: [
        {
          id: 'alliance-player-1',
          type: 'player',
          username: 'Mira',
          rankLabel: 'Quartermaster',
          body: 'Welcome to the hall.',
          character: 'mira',
          ageLabel: 'now',
        },
        {
          id: 'system-level-1',
          type: 'system',
          username: 'System',
          systemPlayerUsername: 'Ada',
          systemPlayerDetail: 'reached level 14',
          body: 'Ada was approved by Luna and joined the alliance.',
          bodyRuns: [
            { kind: 'text', text: 'Ada', tone: 'systemPlayer' },
            { kind: 'text', text: ' was approved by ' },
            { kind: 'text', text: 'Luna', tone: 'systemPlayer' },
            { kind: 'text', text: ' and joined the alliance.' },
          ],
          character: 'rowan',
          frame: 'emerald',
          showSystemAvatar: true,
          ageLabel: 'now',
          semanticId: 'world-chat-system-player:system-level-1',
          onActivate: openPlayer,
        },
      ],
      onSubmit: vi.fn(),
    };

    harness.page.bind(model);
    harness.page.openDialog('worldChat');

    const dialog = harness.dialogs.get('workshop.worldChat');
    const playerRow = dialog.rows.get('alliance-player-1');
    const row = dialog.rows.get('system-level-1');
    const playerPress = pressRegistrations.find(
      ({ displayObject }) => displayObject === row.systemPlayerUsername,
    );
    const avatarPress = pressRegistrations.find(
      ({ displayObject }) => displayObject === row.avatar,
    );

    expect(playerRow.tag.text).toBe('Quartermaster');
    expect(playerRow.tag.text).not.toContain('[');
    expect(row.username.text).toBe('System');
    expect(row.username.style.fill).toBe('#432d20');
    expect(row.username.eventMode).toBe('none');
    expect(row.systemPlayerUsername.text).toBe('Ada');
    expect(row.systemPlayerUsername.style.fill).toBe('#72533a');
    expect(row.systemPlayerUsername.eventMode).toBe('static');
    expect(row.systemPlayerUsername.renderable).toBe(false);
    expect(row.body.text).toBe(
      'Ada was approved by Luna and joined the alliance.',
    );
    expect(
      row.body.textObjects
        .filter(
          (textObject) =>
            textObject.visible && textObject.style.fill === '#72533a',
        )
        .map((textObject) => textObject.text),
    ).toEqual(['Ada', 'Luna']);
    expect(row.body.x).toBe(row.systemPlayerUsername.x);
    expect(row.avatar.visible).toBe(true);
    expect(row.avatar.scale.x * 186).toBeCloseTo(20);
    expect(row.avatar.eventMode).toBe('static');
    expect(avatarPress?.descriptor.enabled()).toBe(true);
    expect(avatarPress?.descriptor.onActivate()).toBe(true);
    expect(playerPress?.descriptor.excludePageSwipe).toBe(true);
    expect(playerPress?.descriptor.onActivate()).toBe(true);
    expect(openPlayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'system-level-1' }));

    harness.page.destroy();
    harness.dispose();
  });

  it('lays out prestige text and the retained star as non-overlapping inline runs', () => {
    const prestigeAssetId = 'source:assets/icons/icon-prestige-star.png';
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.has = vi.fn((assetId) => assetId === prestigeAssetId);
    assetManager.getTexture = vi.fn((assetId) =>
      assetId === prestigeAssetId ? Texture.WHITE : Texture.EMPTY,
    );
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: [
        {
          id: 'system-prestige-1',
          type: 'system',
          username: 'System',
          body: 'Ada reached ⭐ 4, completing prestige level 40',
          systemPlayerUsername: 'Ada',
          systemPlayerDetail: 'reached ⭐ 4, completing prestige level 40',
          bodyRuns: [
            {
              kind: 'text',
              text: 'Ada',
              tone: 'systemPlayer',
            },
            {
              kind: 'text',
              text: ' reached ',
            },
            {
              kind: 'icon',
              assetId: prestigeAssetId,
              fallbackText: '⭐',
              label: 'Prestige star',
              size: 12,
            },
            {
              kind: 'text',
              text: ' 4, completing prestige level 40',
            },
          ],
          ageLabel: 'now',
        },
      ],
      onSubmit: vi.fn(),
    };

    harness.page.bind(model);
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');
    const systemRow = dialog.rows.get('system-prestige-1');

    expect(assetManager.getTexture).toHaveBeenCalledWith(prestigeAssetId);
    const bodyIcon = systemRow.body.iconObjects[0];
    const followingText = systemRow.body.textObjects.find(
      (textObject) => textObject.visible && textObject.text.startsWith('4,'),
    );
    expect(systemRow.body.text).toBe('Ada reached ⭐ 4, completing prestige level 40');
    expect(bodyIcon.texture).toBe(Texture.WHITE);
    expect(bodyIcon.visible).toBe(true);
    expect(bodyIcon.renderable).toBe(true);
    expect(bodyIcon.width).toBe(12);
    expect(bodyIcon.height).toBe(12);
    expect(followingText).toBeDefined();
    expect(bodyIcon.x + bodyIcon.width / 2).toBeLessThan(followingText.x);
    expect(bodyIcon.y).toBeGreaterThan(0);
    expect(bodyIcon.y).toBeLessThan(13);

    harness.page.destroy();
    harness.dispose();
  });

  it('shows and clears the retained inbox notification from its view model', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.inbox = {
      notification: true,
    };
    harness.page.bind(model);

    const retainedBadge = harness.page.inboxButton.notification.root;
    expect(retainedBadge.visible).toBe(true);
    expect(retainedBadge.renderable).toBe(true);

    model.workshop.inbox.notification = false;
    harness.page.bind(model);
    expect(harness.page.inboxButton.notification.root).toBe(retainedBadge);
    expect(retainedBadge.visible).toBe(false);
    expect(retainedBadge.renderable).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the frozen source-space visual anchors for Workshop controls', () => {
    const harness = createHarness();
    harness.page.bind(createWorkshopViewModel());

    expect(harness.page.summon.root.position).toMatchObject({
      x: PIXI_UI_GEOMETRY.sourceWidth / 2,
      y:
        PIXI_UI_GEOMETRY.sourceHeight -
        PIXI_UI_GEOMETRY.roomChatBottom -
        PIXI_UI_GEOMETRY.roomChatHeight -
        harness.page.summon.button.buttonHeight -
        128 +
        4 +
        16,
    });
    expect(harness.page.summon.button.position).toMatchObject({
      x: -60,
      y: -4,
    });
    const worldChatTop =
      PIXI_UI_GEOMETRY.sourceHeight -
      PIXI_UI_GEOMETRY.roomChatBottom -
      PIXI_UI_GEOMETRY.roomChatHeight;
    const summonButtonBottom =
      harness.page.summon.root.y +
      harness.page.summon.button.y +
      harness.page.summon.button.buttonHeight;
    expect(PIXI_UI_GEOMETRY.roomChatBottom - 82).toBe(10);
    expect(worldChatTop - summonButtonBottom).toBe(112);
    expect(harness.page.tasks.y).toBe(PIXI_UI_GEOMETRY.roomContentTop + 8);
    expect(harness.page.bagButton.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page) + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch * 3,
    });
    expect(harness.page.statsButton.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: getExpectedSideControlsTop(harness.page),
    });
    const alliance = harness.page.features.get('alliance');
    const inbox = harness.page.inboxButton;
    expect(alliance.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: getExpectedSideControlsTop(harness.page),
    });
    expect(inbox.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: getExpectedSideControlsTop(harness.page) + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch,
    });
    expect(alliance.panel).toBeUndefined();
    expect(alliance.root.hitArea).toMatchObject({
      x: 0,
      y: 0,
      width: 50,
      height: 60,
    });
    expect(alliance.iconFrame.position).toMatchObject({
      x: 25,
      y: 25,
    });
    expect(harness.page.features.has('inbox')).toBe(false);
    expect(harness.page.bagButton.button).toBeUndefined();
    expect(harness.page.inboxButton.button).toBeUndefined();
    expect(harness.page.statsButton.button).toBeUndefined();
    expect(harness.page.bagButton.root.hitArea).toMatchObject({
      x: 0,
      y: 0,
      width: 50,
      height: 60,
    });
    expect(harness.page.statsButton.root.hitArea).toMatchObject({
      x: 0,
      y: 0,
      width: 50,
      height: 60,
    });
    expect(harness.page.summon.info.icon.label).toBe('workshop-summon-info:icon');
    expect(harness.page.summon.info.textLabel).toBeUndefined();
    expect(harness.semanticTargets.get('workshop.summonArea')?.displayObject).toBe(
      harness.page.summon.circle,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the Workshop summon composition fixed while world chat is hidden', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.chrome = { worldChatVisible: false };

    harness.page.bind(model);

    expect(harness.page.summon.root.position).toMatchObject({
      x: PIXI_UI_GEOMETRY.sourceWidth / 2,
      y:
        PIXI_UI_GEOMETRY.sourceHeight -
        PIXI_UI_GEOMETRY.roomChatBottom -
        PIXI_UI_GEOMETRY.roomChatHeight -
        harness.page.summon.button.buttonHeight -
        128 +
        4 +
        16,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the main HUD art, event timer, and pooled feature notifications', () => {
    expect(PIXI_ROOT_RUN_ASSETS.workshopAlliance).toBe(
      'source:assets/icons/icon-side-alliance-root-run.png',
    );
    expect(PIXI_ROOT_RUN_ASSETS.workshopPersonalTasks).toBe(
      'source:assets/icons/icon-side-tasks-root-run.png',
    );
    expect(PIXI_ROOT_RUN_ASSETS.workshopWorldEvent).toBe(
      'source:assets/icons/icon-side-event-root-run.png',
    );

    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.features = [
      {
        id: 'alliance',
        notification: true,
      },
      {
        id: 'worldEvent',
        timer: '2d 4h',
        notification: true,
      },
    ];

    harness.page.bind(model);

    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.workshopAlliance);
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.workshopLeaderboard);
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.workshopDiscoveries);
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.workshopPersonalTasks,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.workshopWorldEvent);
    const alliance = harness.page.features.get('alliance');
    expect(alliance.allianceFlag.visible).toBe(false);
    model.workshop.features[0].allianceFlag = {
      bannerColor: 'violet',
      emblemColor: 'white',
    };
    harness.page.bind(model);
    expect(alliance.icon.visible).toBe(false);
    expect(alliance.allianceFlag.visible).toBe(true);
    expect(alliance.allianceFlag).toMatchObject({
      bannerColor: 'violet',
      emblemColor: 'white',
    });
    const event = harness.page.features.get('worldEvent');
    expect(event.timer.text).toBe('2d 4h');
    expect(event.notification.root.visible).toBe(true);
    expect(event.presentation.mirrorOnRight).toBeUndefined();

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps task item identity and resolves its retained atlas icon', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.tasks.rows[0].itemKind = 'potion';
    model.workshop.tasks.rows[0].itemKey = 'briarWard';

    harness.page.bind(model);

    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('potion:briarWard');
    const row = harness.page.tasks.rows.get('request-1');
    expect(row.icon.visible).toBe(true);
    expect(row.icon.width).toBe(32);
    expect(row.icon.height).toBe(32);
    expect(row.icon.x).toBe(16);
    expect(row.icon.y).toBe(16);
    expect(row.label.x).toBe(36);

    model.workshop.tasks.rows[0].itemKind = 'seed';
    model.workshop.tasks.rows[0].itemKey = 'sageSeed';
    harness.page.bind(model);
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('seed:pack');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('herb:sageHerb');
    expect(row.iconOverlay.visible).toBe(true);
    expect(row.icon.width).toBeGreaterThan(16);
    expect(row.icon.height).toBeGreaterThan(16);

    harness.page.destroy();
    harness.dispose();
  });

  it('plays and settles the exact 520ms summon-circle success glow', () => {
    let frameCallback = null;
    let now = 0;
    const requestFrame = vi.fn((callback) => {
      frameCallback = callback;
      return 1;
    });
    const harness = createHarness({
      requestFrame,
      cancelFrame: vi.fn(),
      timeSource: () => now,
      reducedMotion: false,
    });
    const model = createWorkshopViewModel({
      summonSeed: vi.fn(() => ({ ok: true })),
    });
    harness.page.bind(model);
    harness.page.activate();

    expect(harness.semanticTargets.activate('workshop.summon')).toBe(true);
    expect(harness.page.summon.circle.alpha).toBeCloseTo(0.84, 5);

    now = 520 * 0.32;
    frameCallback(now);
    expect(harness.page.summon.circle.alpha).toBeCloseTo(1, 5);
    expect(harness.page.summon.circle.width).toBeCloseTo(196 * 1.045, 5);

    now = 520;
    frameCallback(now);
    expect(harness.page.summon.circle.alpha).toBe(1);
    expect(harness.page.summon.circle.width).toBeCloseTo(196, 5);

    harness.page.destroy();
    harness.dispose();
  });

  it('primes summon feedback before the synchronous gameplay action publishes', () => {
    let summonAlphaDuringAction = null;
    const harness = createHarness({
      reducedMotion: false,
      timeSource: () => 100,
      requestFrame: vi.fn(() => 1),
      cancelFrame: vi.fn(),
    });
    const summonSeed = vi.fn(() => {
      summonAlphaDuringAction = harness.page.summon.circle.alpha;
      return { ok: true };
    });
    harness.page.bind(createWorkshopViewModel({ summonSeed }));
    harness.page.activate();

    expect(harness.semanticTargets.activate('workshop.summon')).toBe(true);
    expect(summonAlphaDuringAction).toBeCloseTo(0.84, 5);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders projected summon notifications on the retained cost button', () => {
    const harness = createHarness();
    const activeModel = createWorkshopViewModel();
    activeModel.workshop.summon.notification = 'orange';
    harness.page.bind(activeModel);

    const badge = harness.page.summon.notification;
    const retainedRoot = badge.root;
    expect(badge.root.parent).toBe(harness.page.summon.button);
    expect(badge.root.position.x).toBe(114);
    expect(badge.root.position.y).toBe(6);
    expect(badge.root.visible).toBe(true);
    expect(badge.root.renderable).toBe(true);
    expect(badge.model.tone).toBe('orange');
    expect(badge.sprite.width).toBe(12);

    const suppressedModel = createWorkshopViewModel();
    suppressedModel.workshop.summon.notification = false;
    harness.page.bind(suppressedModel);

    expect(harness.page.summon.notification.root).toBe(retainedRoot);
    expect(badge.root.visible).toBe(false);
    expect(badge.root.renderable).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the stacked purple cost button and mana icon for summon', () => {
    const summonTexture = new Texture();
    const disabledTexture = new Texture();
    const manaTexture = new Texture();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.has = vi.fn(
      (assetId) =>
        assetId === getPixiButtonAssetId('purple', 50) ||
        assetId === getPixiButtonAssetId('gray', 50),
    );
    assetManager.getTexture = vi.fn((assetId) =>
      assetId === getPixiButtonAssetId('purple', 50)
        ? summonTexture
        : assetId === getPixiButtonAssetId('gray', 50)
          ? disabledTexture
          : Texture.EMPTY,
    );
    assetManager.getAtlasTexture = vi.fn((frameName) =>
      frameName === 'resource:mana' ? manaTexture : Texture.EMPTY,
    );
    const harness = createHarness({ assetManager });
    const activeModel = createWorkshopViewModel();
    harness.page.bind(activeModel);

    expect(harness.page.summon.button).toMatchObject({
      stacked: true,
      tone: 'purple',
      sizeTier: 50,
      buttonWidth: 120,
      buttonHeight: 52,
    });
    expect(harness.page.summon.button.background.texture).toBe(summonTexture);
    expect(harness.page.summon.button.background.sourceInsets).toEqual({
      top: 100,
      right: 52,
      bottom: 68,
      left: 86,
    });
    const summonBackground = harness.page.summon.button.background;
    const cornerScales = {
      top: summonBackground.borderInsets.top / summonBackground.sourceInsets.top,
      right: summonBackground.borderInsets.right / summonBackground.sourceInsets.right,
      bottom: summonBackground.borderInsets.bottom / summonBackground.sourceInsets.bottom,
      left: summonBackground.borderInsets.left / summonBackground.sourceInsets.left,
    };
    expect(cornerScales.left).toBeCloseTo(cornerScales.right);
    expect(cornerScales.left).toBeCloseTo(cornerScales.top);
    expect(cornerScales.left).toBeCloseTo(cornerScales.bottom);
    expect(
      summonBackground.borderInsets.top + 1 + summonBackground.borderInsets.bottom,
    ).toBeCloseTo(52);
    expect(harness.page.summon.button.actionTextLabel.text).toBe('Summon Seed');
    expect(harness.page.summon.button.actionTextLabel.fontSize).toBe(11);
    expect(harness.page.summon.button.amountLabel.fontSize).toBe(13);
    expect(harness.page.summon.button.actionTextLabel.stroke.width).toBe(
      resolvePixiTextStrokeWidth(harness.page.summon.button.actionTextLabel.fontSize),
    );
    expect(harness.page.summon.button.amountLabel.stroke.width).toBe(
      resolvePixiTextStrokeWidth(harness.page.summon.button.amountLabel.fontSize),
    );
    expect(harness.page.summon.button.resource).toBe('mana');
    expect(harness.page.summon.button.amountLabel.text).toBe('10');
    expect(harness.page.summon.button.resourceIcon.texture).toBe(manaTexture);
    expect(harness.page.summon.button.resourceIcon.visible).toBe(true);

    const disabledModel = createWorkshopViewModel();
    disabledModel.workshop.summon.enabled = false;
    harness.page.bind(disabledModel);

    expect(harness.page.summon.button.background.texture).toBe(disabledTexture);
    expect(harness.page.summon.button.enabled).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('registers controls and modal blocking through the single input router', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    harness.page.bind(createWorkshopViewModel());

    expect(inputRouter.store.getRegistrations('press').length).toBeGreaterThan(8);
    expect(inputRouter.store.getRegistrations('scroll')).toHaveLength(0);
    expect(harness.page.summon.root.listenerCount('pointertap')).toBe(0);

    harness.page.openDialog('bag');
    expect(inputRouter.getTopModal()?.id).toBe('dialog:workshop.bag');
    expect(inputRouter.store.getRegistrations('scroll')).toHaveLength(1);
    const pressRegistrationsAfterFirstOpen = inputRouter.store.getRegistrations('press').length;
    harness.dialogs.close('workshop.bag');
    expect(inputRouter.getTopModal()).toBeNull();
    expect(inputRouter.store.getRegistrations('press')).toHaveLength(
      pressRegistrationsAfterFirstOpen,
    );

    harness.page.openDialog('bag');
    expect(inputRouter.getTopModal()?.id).toBe('dialog:workshop.bag');
    expect(inputRouter.store.getRegistrations('press')).toHaveLength(
      pressRegistrationsAfterFirstOpen,
    );

    harness.page.destroy();
    harness.dispose();
    expect(inputRouter.store.getRegistrations()).toHaveLength(0);
  });

  it('summons repeatedly while held through the tutorial overlay and stops on release', () => {
    vi.useFakeTimers();
    const inputRouter = new PixiInputRouter();
    const summonSeed = vi.fn(() => ({ ok: true }));
    const harness = createHarness({ inputRouter });
    harness.page.bind(createWorkshopViewModel({ summonSeed }));
    harness.page.activate();

    const summonRegistration = inputRouter.store
      .getRegistrations('press')
      .find((registration) => registration.id.startsWith('retained:workshop-summon:'));
    const tutorialTarget = harness.semanticTargets.getTutorialTarget('workshop:summonSeed');

    expect(summonRegistration?.displayObject).toBe(harness.page.summon.button);
    expect(summonRegistration?.fallbackHitTest).toBe(true);
    expect(tutorialTarget?.displayObject).toBe(harness.page.summon.button);
    expect(harness.page.summon.root.eventMode).toBe('passive');
    expect(harness.page.summon.root.hitArea).toBeUndefined();
    expect(harness.page.summon.button).toMatchObject({
      eventMode: 'static',
      hitArea: {
        x: 0,
        y: 0,
        width: 120,
        height: 52,
      },
    });

    expect(inputRouter.isRegistrationAllowed(summonRegistration)).toBe(true);

    const overlayTarget = new Container({ label: 'tutorial-overlay-hit' });
    const summonBounds = harness.page.summon.button.getBounds();
    const summonPoint = {
      x: summonBounds.x + summonBounds.width / 2,
      y: summonBounds.y + summonBounds.height / 2,
    };
    inputRouter.onPointerDown(createPointerEvent(overlayTarget, 'pointerdown', summonPoint));
    expect(harness.page.summon.button.pressed).toBe(true);
    vi.advanceTimersByTime(99);
    expect(summonSeed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(summonSeed).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(summonSeed).toHaveBeenCalledTimes(3);
    inputRouter.onPointerUp(createPointerEvent(overlayTarget, 'pointerup', summonPoint));
    expect(harness.page.summon.button.pressed).toBe(false);
    expect(summonSeed).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(300);
    expect(summonSeed).toHaveBeenCalledTimes(3);

    overlayTarget.destroy();
    harness.page.destroy();
    harness.dispose();
    vi.useRealTimers();
  });

  it('keeps a quick summon press release-confirmed through the tutorial overlay', () => {
    vi.useFakeTimers();
    const inputRouter = new PixiInputRouter();
    const summonSeed = vi.fn(() => ({ ok: true }));
    const harness = createHarness({ inputRouter });
    harness.page.bind(createWorkshopViewModel({ summonSeed }));
    harness.page.activate();

    const summonBounds = harness.page.summon.button.getBounds();
    const summonPoint = {
      x: summonBounds.x + summonBounds.width / 2,
      y: summonBounds.y + summonBounds.height / 2,
    };
    const overlayTarget = new Container({
      label: 'tutorial-overlay-quick-tap',
    });

    inputRouter.onPointerDown(createPointerEvent(overlayTarget, 'pointerdown', summonPoint));
    vi.advanceTimersByTime(50);
    expect(summonSeed).not.toHaveBeenCalled();
    inputRouter.onPointerUp(createPointerEvent(overlayTarget, 'pointerup', summonPoint));
    expect(summonSeed).toHaveBeenCalledTimes(1);

    overlayTarget.destroy();
    harness.page.destroy();
    harness.dispose();
    vi.useRealTimers();
  });

  it('stops held summoning when a summon attempt fails', () => {
    vi.useFakeTimers();
    const inputRouter = new PixiInputRouter();
    const summonSeed = vi
      .fn()
      .mockReturnValueOnce({ ok: true })
      .mockReturnValueOnce({ ok: false, reason: 'not_enough_mana' });
    const harness = createHarness({ inputRouter });
    harness.page.bind(createWorkshopViewModel({ summonSeed }));
    harness.page.activate();

    const summonBounds = harness.page.summon.button.getBounds();
    const summonPoint = {
      x: summonBounds.x + summonBounds.width / 2,
      y: summonBounds.y + summonBounds.height / 2,
    };
    const overlayTarget = new Container({
      label: 'tutorial-overlay-failed-hold',
    });

    inputRouter.onPointerDown(createPointerEvent(overlayTarget, 'pointerdown', summonPoint));
    vi.advanceTimersByTime(500);
    expect(summonSeed).toHaveBeenCalledTimes(2);
    inputRouter.onPointerUp(createPointerEvent(overlayTarget, 'pointerup', summonPoint));
    expect(summonSeed).toHaveBeenCalledTimes(2);

    overlayTarget.destroy();
    harness.page.destroy();
    harness.dispose();
    vi.useRealTimers();
  });

  it('cancels held summoning when the press leaves input slop', () => {
    vi.useFakeTimers();
    const inputRouter = new PixiInputRouter();
    const summonSeed = vi.fn(() => ({ ok: true }));
    const harness = createHarness({ inputRouter });
    harness.page.bind(createWorkshopViewModel({ summonSeed }));
    harness.page.activate();

    const summonBounds = harness.page.summon.button.getBounds();
    const summonPoint = {
      x: summonBounds.x + summonBounds.width / 2,
      y: summonBounds.y + summonBounds.height / 2,
    };
    const outsideSlopPoint = {
      x: summonPoint.x + 30,
      y: summonPoint.y,
    };
    const overlayTarget = new Container({
      label: 'tutorial-overlay-cancelled-hold',
    });

    inputRouter.onPointerDown(createPointerEvent(overlayTarget, 'pointerdown', summonPoint));
    vi.advanceTimersByTime(50);
    inputRouter.onPointerMove(createPointerEvent(overlayTarget, 'pointermove', outsideSlopPoint));
    vi.advanceTimersByTime(300);
    inputRouter.onPointerUp(createPointerEvent(overlayTarget, 'pointerup', outsideSlopPoint));
    expect(summonSeed).not.toHaveBeenCalled();

    overlayTarget.destroy();
    harness.page.destroy();
    harness.dispose();
    vi.useRealTimers();
  });

  it('opens adjacent summon info after a retargeted tap while summoning is unavailable', () => {
    const inputRouter = new PixiInputRouter();
    const summonSeed = vi.fn(() => ({ ok: true }));
    const harness = createHarness({ inputRouter });
    const model = createWorkshopViewModel({ summonSeed });
    model.workshop.summon.enabled = false;
    model.workshop.summon.canSummon = false;
    model.workshop.dialogs.summonInfo = {
      title: 'Summoning Seeds',
      summaryRows: [],
      actions: [],
      items: [],
    };
    harness.page.bind(model);
    harness.page.activate();

    const summonRegistration = inputRouter.store
      .getRegistrations('press')
      .find((registration) => registration.id.startsWith('retained:workshop-summon:'));

    expect(summonRegistration?.displayObject).toBe(harness.page.summon.button);
    expect(harness.page.summon.root.hitArea).toBeUndefined();
    expect(harness.page.summon.button.hitArea).toMatchObject({
      x: 0,
      y: 0,
      width: 120,
      height: 52,
    });
    expect(harness.page.summon.button.eventMode).toBe('none');
    expect(harness.page.summon.info.eventMode).toBe('static');
    expect(harness.page.summon.info.icon).toMatchObject({
      width: 18,
      height: 18,
    });
    expect(harness.page.summon.info.hitArea).toMatchObject({
      x: -13,
      y: -13,
      width: 44,
      height: 44,
    });

    const infoBounds = harness.page.summon.info.getBounds();
    const infoPoint = {
      x: infoBounds.x + 2,
      y: infoBounds.y + infoBounds.height / 2,
    };
    expect(infoBounds.width).toBe(44);
    expect(infoBounds.height).toBe(44);
    expect(infoPoint.x).toBeLessThan(infoBounds.x + 13);
    const summonBounds = harness.page.summon.button.getBounds();
    expect(infoBounds.y + infoBounds.height).toBeLessThan(summonBounds.y);
    const overlayTarget = new Container({ label: 'retargeted-overlay-hit' });
    inputRouter.onPointerDown(createPointerEvent(overlayTarget, 'pointerdown', infoPoint));
    inputRouter.onPointerUp(createPointerEvent(overlayTarget, 'pointerup', infoPoint));

    expect(harness.dialogs.isOpen('workshop.summonInfo')).toBe(true);
    expect(summonSeed).not.toHaveBeenCalled();

    overlayTarget.destroy();
    harness.page.destroy();
    harness.dispose();
  });

  it('routes a press on the gray summon button when seed drop weights need attention', () => {
    const inputRouter = new PixiInputRouter();
    const summonSeed = vi.fn(() => ({
      ok: false,
      reason: 'no_active_seed_weights',
    }));
    const harness = createHarness({ inputRouter });
    const model = createWorkshopViewModel({ summonSeed });
    model.workshop.summon.enabled = false;
    model.workshop.summon.canSummon = false;
    model.workshop.summon.pressEnabled = true;
    harness.page.bind(model);
    harness.page.activate();

    const summonRegistration = inputRouter.store
      .getRegistrations('press')
      .find((registration) => registration.id.startsWith('retained:workshop-summon:'));
    const summonBounds = harness.page.summon.button.getBounds();
    const summonPoint = {
      x: summonBounds.x + summonBounds.width / 2,
      y: summonBounds.y + summonBounds.height / 2,
    };
    const overlayTarget = new Container({ label: 'summon-disabled-hit' });

    expect(summonRegistration.enabled()).toBe(true);
    expect(harness.page.summon.button.enabled).toBe(false);

    inputRouter.onPointerDown(createPointerEvent(overlayTarget, 'pointerdown', summonPoint));
    inputRouter.onPointerUp(createPointerEvent(overlayTarget, 'pointerup', summonPoint));

    expect(summonSeed).toHaveBeenCalledTimes(1);

    overlayTarget.destroy();
    harness.page.destroy();
    harness.dispose();
  });
});

function getExpectedSideControlsTop(page) {
  return (
    PIXI_UI_GEOMETRY.roomContentTop + 8 + page.tasks.height + ROOT_RUN_SIDE_ACTION_GEOMETRY.taskGap
  );
}

function createPointerEvent(target, type, point = { x: 0, y: 0 }) {
  return {
    type,
    target,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    global: point,
    clientX: point.x,
    clientY: point.y,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  };
}

function createWorkshopMotionHarness() {
  let now = 0;
  let nextFrameId = 1;
  let pendingFrame = null;
  const requestFrame = vi.fn((callback) => {
    pendingFrame = callback;
    return nextFrameId++;
  });
  const cancelFrame = vi.fn(() => {
    pendingFrame = null;
  });
  return {
    requestFrame,
    cancelFrame,
    timeSource: () => now,
    runAt(timestamp) {
      now = timestamp;
      const callback = pendingFrame;
      pendingFrame = null;
      expect(callback).toEqual(expect.any(Function));
      callback(timestamp);
    },
  };
}

function createAmbientMotionHarness() {
  let now = 0;
  let nextFrameId = 1;
  let pendingFrame = null;
  const requestFrame = vi.fn((callback) => {
    pendingFrame = callback;
    return nextFrameId++;
  });
  const cancelFrame = vi.fn(() => {
    pendingFrame = null;
  });
  return {
    requestFrame,
    cancelFrame,
    timeSource: () => now,
    runAt(timestamp) {
      now = timestamp;
      const callback = pendingFrame;
      pendingFrame = null;
      expect(callback).toEqual(expect.any(Function));
      callback(timestamp);
    },
  };
}

function createHarness({
  inputRouter = null,
  assetManager = createPixiAssetManagerFake(Texture),
  ...pageOptions
} = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const semanticTargets = new SemanticTargetRegistry();
  const page = new WorkshopPixiPage({
    assetManager,
    dialogLayer,
    dialogRegistry: dialogs,
    inputRouter,
    semanticTargets,
    ...pageOptions,
  });

  return {
    dialogLayer,
    dialogs,
    page,
    semanticTargets,
    dispose() {
      dialogs.destroy();
      dialogLayer.destroy({ children: true });
    },
  };
}

function createWorkshopViewModel({
  taskLabel = 'gather 2 sage',
  flyoutText = '+1 seed',
  summonSeed = vi.fn(),
} = {}) {
  return {
    workshop: {
      tasks: {
        rows: [
          {
            id: 'request-1',
            label: taskLabel,
            current: 1,
            required: 2,
          },
        ],
      },
      summon: {
        cost: 10,
      },
      flyouts: [
        {
          id: 'reward-1',
          text: flyoutText,
        },
      ],
      dialogs: {
        bag: {
          title: 'bag',
          rows: [],
        },
      },
    },
    actions: {
      summonSeed,
    },
  };
}

function createSummonInfoDialogModel({ unlocked }) {
  return {
    title: 'Summoning Seeds',
    autoSummonUnlocked: unlocked,
    summaryRows: unlocked
      ? [
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
            value: '0',
            valueIconResourceKey: 'mana',
          },
        ]
      : [],
    settingsToggle: unlocked
      ? {
          value: false,
          enabled: true,
          onChange: vi.fn(),
        }
      : null,
    manaSlider: unlocked
      ? {
          mode: 'range',
          min: 0,
          max: 5_000,
          step: 1,
          value: 0,
          tone: 'blue',
          enabled: true,
          onChange: vi.fn(),
        }
      : null,
    actions: [],
    items: [
      {
        id: 'sageSeed',
        label: 'Sage Seed',
        detail: '100% Chance',
        value: 'Medium',
        valueTone: 'yellow',
        itemKind: 'seed',
        itemKey: 'sageSeed',
        dropSlider: {
          mode: 'milestones',
          value: 'medium',
          options: [
            { value: 'none', tone: 'root' },
            { value: 'low', tone: 'red' },
            { value: 'medium', tone: 'yellow' },
            { value: 'high', tone: 'green' },
          ],
        },
      },
    ],
  };
}
