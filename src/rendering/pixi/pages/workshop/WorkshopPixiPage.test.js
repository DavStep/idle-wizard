// @vitest-environment jsdom

import { createPixiAssetManagerFake } from './PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
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
import { ShopDialogPixi } from '../shop/ShopDialogPixi.js';
import { RETAINED_DIALOG_LIST_GEOMETRY } from './RetainedPageKit.js';
import { QuestCompletionMotionCoordinator } from '../../managers/QuestCompletionMotionCoordinator.js';
import {
  ROOT_RUN_SIDE_ACTION_GEOMETRY,
  WORKSHOP_WINDOW_ASSET_ID,
  WORKSHOP_WINDOW_GEOMETRY,
  WorkshopPixiPage,
} from './WorkshopPixiPage.js';

describe('WorkshopPixiPage', () => {
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
      harness.page.content.getChildIndex(harness.page.summon.root),
    );

    harness.page.applyTheme(
      createPixiThemeSnapshot({ theme: 'day' }),
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.workshopWindowDay,
    );
    expect(harness.page.workshopWindow.texture).toBe(dayWindowTexture);

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
      summaryRows: [
        {
          id: 'giving',
          label: 'Coin',
          value: '',
          leadingResourceKey: 'coin',
          iconLeading: true,
          fontSize: 14,
          layoutHeight: 34,
        },
        {
          id: 'owned',
          label: 'Owned',
          value: '100',
          layoutInset: 38,
        },
        {
          id: 'total',
          label: 'Already Donated',
          value: '25 points',
          layoutInset: 38,
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
    expect(dialog.summaryRows.get('giving').leadingResource.icon.visible).toBe(true);
    expect(dialog.summaryRows.get('giving').keyLabel.fontSize).toBe(14);
    expect(dialog.summaryRows.get('giving').root.hitArea.height).toBe(34);
    expect(dialog.summaryRows.get('owned').root.x).toBe(38);
    expect(dialog.summaryRows.get('amount').root.y).toBeLessThan(
      dialog.rangeControl.y,
    );
    expect(dialog.rangeControl.y).toBeLessThan(
      dialog.summaryRows.get('points').root.y,
    );
    expect(dialog.rangeControl.x).toBe(-9);
    expect(dialog.rangeControl.controlWidth).toBeGreaterThan(
      dialog.panel.contentBoxWidth,
    );
    const confirm = dialog.actions.get('confirm');
    expect(confirm.variant).toBe('green');
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      getPixiButtonAssetId('green', 30),
    );

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

  it('backs the entire Elara request widget with the shared Research row skin', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({ assetManager });

    harness.page.bind(createWorkshopViewModel());

    const row = harness.page.tasks.rows.get('request-1');
    expect(harness.page.tasks.background).toBeInstanceOf(PixiNineSliceFrame);
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.researchCard,
    );
    expect(
      harness.page.tasks.root.getChildIndex(harness.page.tasks.background),
    ).toBe(0);
    expect(harness.page.tasks.background.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
    );
    expect(harness.page.tasks.background.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    expect(harness.page.tasks.background.frameWidth).toBe(
      harness.page.tasks.width,
    );
    expect(harness.page.tasks.background.frameHeight).toBe(
      harness.page.tasks.height,
    );
    expect(harness.page.tasks.panel.frame.visible).toBe(false);
    expect(harness.page.tasks.panel.fallback.visible).toBe(false);
    expect(row.background).toBeUndefined();

    harness.page.destroy();
    harness.dispose();
  });

  it('fills to the reached point, then shines, then boinks', () => {
    const motion = createWorkshopMotionHarness();
    const questCompletionMotionCoordinator =
      new QuestCompletionMotionCoordinator();
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

    motion.runAt(110);
    expect(outgoingRow.displayedProgress).toBeGreaterThan(0.5);
    expect(outgoingRow.displayedProgress).toBeLessThan(2 / 3);
    expect(outgoingRow.progressShineRoot.visible).toBe(false);
    expect(outgoingRow.progress.root.scale.x).toBe(1);

    motion.runAt(220);
    expect(outgoingRow.displayedProgress).toBeCloseTo(2 / 3);
    expect(outgoingRow.progressShineRoot.visible).toBe(true);
    const initialShineX = outgoingRow.progressShine.x;

    motion.runAt(370);
    expect(outgoingRow.progressShine.x).toBeGreaterThan(initialShineX);
    expect(outgoingRow.progress.root.scale.x).toBe(1);

    motion.runAt(540);
    expect(outgoingRow.progressShineRoot.visible).toBe(false);
    expect(outgoingRow.progress.root.scale.x).toBeGreaterThan(1);

    motion.runAt(660);
    expect(outgoingRow.progress.root.scale.x).toBe(1);
  });

  it('holds the completed request until the star flight completes', () => {
    const motion = createWorkshopMotionHarness();
    const questCompletionMotionCoordinator =
      new QuestCompletionMotionCoordinator();
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
    nextModel.workshop.tasks.rows = [{
      id: 'request-2',
      label: 'brew mana tonic',
      current: 0,
      required: 1,
    }];
    harness.page.bind(nextModel);

    expect(harness.page.tasks.rows.get('request-1')).toBe(outgoingRow);
    expect(harness.page.tasks.rows.get('request-2')).toBeNull();

    motion.runAt(260);
    expect(outgoingRow.displayedProgress).toBe(1);
    expect(outgoingRow.progressShineRoot.visible).toBe(true);

    motion.runAt(560);
    expect(outgoingRow.progressShineRoot.visible).toBe(false);
    expect(outgoingRow.progress.root.scale.x).toBe(1);

    motion.runAt(600);
    expect(outgoingRow.progress.root.scale.x).toBeGreaterThan(1);

    motion.runAt(700);
    expect(outgoingRow.progress.root.scale.x).toBe(1);

    questCompletionMotionCoordinator.startFlight(transitionId);
    expect(harness.page.tasks.rows.get('request-1')).toBe(outgoingRow);

    questCompletionMotionCoordinator.complete(transitionId);
    expect(harness.page.tasks.rows.get('request-1')).toBeNull();
    expect(harness.page.tasks.rows.get('request-2')).toBeDefined();

    harness.page.destroy();
    questCompletionMotionCoordinator.destroy();
    harness.dispose();
  });

  it('renders Workshop side controls with capitalized labels and optically normalized art', () => {
    const harness = createHarness();
    harness.page.bind(createWorkshopViewModel());

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

    expect(sideControls.map((control) => control.label.text)).toEqual([
      'Bag',
      'Stats',
      'Inbox',
      'Alliance',
      'Leaderboard',
      'Discoveries',
      'Tasks',
      'Event',
    ]);
    for (const control of sideControls) {
      expect(control.label.style.fill).toBe('#ffffff');
      expect(control.label.style.stroke).toMatchObject({
        color: '#0a0a0a',
        width: resolvePixiTextStrokeWidth(
          control.label.style.fontSize,
        ),
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
      y: 175,
    });
    expect(harness.page.features.get('leaderboard').root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: 175 + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch,
    });
    expect(harness.page.features.get('alliance').root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: 175 + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch * 2,
    });
    expect(harness.page.statsButton.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: 175,
    });
    expect(harness.page.bagButton.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: 175 + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch,
    });
    expect(harness.page.features.get('discoveries').root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: 175 + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch * 2,
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
    expect(alliance.root.position).toMatchObject({ x: 0, y: 178 });
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
      y: 175,
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
      (dialogId) =>
        dialogId === 'global.announcement' && unlockAnimationBlocked,
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
      y: 175,
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
      y: 175,
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
      y: 175,
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
    model.workshop.tasks.rows[0].actionLabel = 'turn in';
    model.workshop.tasks.rows[0].enabled = true;
    model.workshop.tasks.rows[0].onActivate = turnIn;

    harness.page.bind(model);

    const action = harness.page.tasks.rows.get('request-1').action;
    expect(action.variant).toBe('yellow');
    expect(action.control.variant).toBe('yellow');
    expect(action.nineSlice.visible).toBe(true);
    expect(action.root.visible).toBe(true);
    expect(action).toMatchObject({
      width: 58,
      height: 20,
    });
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
    expect(row.root.hitArea).toMatchObject({ width: 338, height: 32 });
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
    const expectedTabGap = 4;
    const expectedTabWidth = (286 - expectedTabGap * (tabs.length - 1)) / tabs.length;
    const shellBottom = dialog.panel.coreHeight + PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
    const tabsBottom = dialog.tabsLayer.position.y + tabs[0].height;
    const paperBottom = dialog.panel.paperFrame.position.y + dialog.panel.paperFrame.frameHeight;

    expect(dialog.panel.titleLabel.textObject.text).toBe('Bag');
    expect(dialog.tabsLayer.position.x).toBe(9);
    expect(shellBottom - tabsBottom).toBeCloseTo(10);
    expect(dialog.tabsLayer.position.y - paperBottom).toBeCloseTo(6);
    expect(tabs).toHaveLength(5);
    expect(tabs[1].root.x - (tabs[0].root.x + tabs[0].width)).toBeCloseTo(expectedTabGap);
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
    ['bag', 5, 4],
  ])(
    'uses the shared in-shell footer geometry for %s',
    (dialogId, tabCount, expectedGap) => {
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
      const shellBottom =
        dialog.panel.coreHeight +
        PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
      const tabsBottom =
        dialog.tabsLayer.y + buttons[0].height;
      const paperBottom =
        dialogId === 'worldEvent'
          ? dialog.worldEventListPaper.y +
            dialog.worldEventListPaper.frameHeight
          : dialogId === 'personalTasks'
            ? dialog.scroll.root.y + dialog.scroll.height
          : dialog.panel.paperFrame.y +
            dialog.panel.paperFrame.frameHeight;

      expect(dialog.tabsLayer.parent).toBe(dialog.panel);
      expect(dialog.tabsLayer.x).toBe(9);
      expect(shellBottom - tabsBottom).toBeCloseTo(10);
      expect(dialog.tabsLayer.y - paperBottom).toBeCloseTo(6);
      expect(
        buttons[1].root.x -
          (buttons[0].root.x + buttons[0].width),
      ).toBeCloseTo(expectedGap);

      harness.page.destroy();
      harness.dispose();
    },
  );

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
        headline: 'New King Crowned',
        body:
          'Bells ring from towers that disagreed yesterday.\nNew clerks ask every workshop to prove the town still moves and read the new edicts.',
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
        donationOptions: firstQuest.donationOptions.slice(0, 1).map(
          (option) => ({
            ...option,
            id: `${option.id}:seal`,
          }),
        ),
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
      dialog.worldEventHeaderPaper.y +
      dialog.worldEventHeaderPaper.frameHeight;

    expect(dialog.panel.titleLabel.textObject.text).toBe('World Event');
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(dialog.worldEventHeaderPaper.visible).toBe(true);
    expect(dialog.worldEventListPaper.visible).toBe(false);
    expect(dialog.rows.getWidgets()).toHaveLength(2);
    expect(dialog.scroll.width).toBe(314);
    expect(row.width).toBe(314);
    expect(secondRow.width).toBe(314);
    expect(dialog.scroll.physics.maxOffset).toBe(0);
    expect(dialog.scroll.scrollbarTrack.visible).toBe(false);
    expect(
      dialog.scroll.root.position.y - headerFrameBottom,
    ).toBeCloseTo(4);
    expect(
      secondRow.root.position.y -
        (row.root.position.y + row.height),
    ).toBeCloseTo(4);
    expect(row.title.text).toBe('Quiet The Crowd');
    expect(row.description.text).toBe(
      'The coronation bells have people cheering, arguing, and fainting in the same street.',
    );
    expect(row.options[0].backing.visible).toBe(true);
    expect(row.options[0].backing.frameWidth).toBeGreaterThan(0);
    expect(row.options[0].icon.width).toBe(36);
    expect(row.options[0].icon.height).toBe(36);
    expect(row.options[0].action.sizeTier).toBe(30);
    expect(row.options[0].action.enabled).toBe(false);
    expect(row.options[1].action.enabled).toBe(true);
    expect(row.options[1].action.visible).toBe(true);
    expect(row.options[1].action.renderable).toBe(true);
    expect(
      row.options[1].action.x + row.options[1].action.buttonWidth,
    ).toBeLessThanOrEqual(row.options[1].width);
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.dialogPaper,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.settingsRow,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      getPixiButtonAssetId('gray', 30),
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      getPixiButtonAssetId('green', 30),
    );

    row.options[1].action.activate();
    expect(donate).toHaveBeenCalledOnce();

    const questsViewModel = model.workshop.dialogs.worldEvent;
    model.workshop.dialogs.worldEvent = {
      ...questsViewModel,
      selectedTabId: 'leaderboard',
      rowWidget: 'default',
      rows: [{ id: 'leaderboard:1', label: '1. Wizard', value: '320' }],
    };
    harness.page.bind(model);
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

  it('keeps the Bag scroll viewport inset and moves its scrollbar toward the paper edge', () => {
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

    expect(dialog.scroll.width).toBe(268);
    expect(dialog.scroll.scrollbarTrack.visible).toBe(true);
    expect(dialog.scroll.scrollbarTrack.getLocalBounds().x).toBeGreaterThan(268);
    expect(viewportTop - paperTop).toBeGreaterThan(0);
    expect(viewportTop - paperTop).toBeCloseTo(paperBottom - viewportBottom);

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
    expect(seedRows.map((row) => row.value.textObject.style.fill)).toEqual([
      '#d8ad32',
      dialog.contentTheme.text,
      '#be403b',
      '#4aa83f',
    ]);
    expect(seedRows.map((row) => row.value.textObject.style.stroke)).toEqual([
      expect.objectContaining({
        color: PIXI_TEXT_STROKE_COLOR,
        width: resolvePixiTextStrokeWidth(seedRows[0].value.fontSize),
      }),
      null,
      expect.objectContaining({
        color: PIXI_TEXT_STROKE_COLOR,
        width: resolvePixiTextStrokeWidth(seedRows[2].value.fontSize),
      }),
      expect.objectContaining({
        color: PIXI_TEXT_STROKE_COLOR,
        width: resolvePixiTextStrokeWidth(seedRows[3].value.fontSize),
      }),
    ]);
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
    const scrollbarBounds =
      dialog.list.scroll.scrollbarTrack.getLocalBounds();
    const scrollbarLeft =
      dialog.list.root.position.x + scrollbarBounds.x;
    const scrollbarRight =
      scrollbarLeft + scrollbarBounds.width;

    expect(dialog.list.scroll.scrollbarTrack.visible).toBe(true);
    expect(scrollbarLeft - firstRowRight).toBeGreaterThan(2.5);
    expect(seedPaperRight - scrollbarRight).toBeGreaterThan(2.5);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses full-alpha light-haptic row presses with the shared rubber release snap', () => {
    const frames = [];
    let now = 0;
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
      timeSource: () => now,
      reducedMotion: false,
    });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.summonInfo = createSummonInfoDialogModel({
      unlocked: true,
    });

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    const row = dialog.list.rows.getWidgets()[0];
    const registration = inputRouter.store
      .getRegistrations('press')
      .find((candidate) => candidate.displayObject === row.root);

    expect(registration?.haptic).toBe('light');
    registration.onPressChange(true, { confirmed: false });
    expect(row.visual.scale.x).toBeCloseTo(0.97);
    expect(row.background.alpha).toBe(1);

    registration.onPressChange(false, { confirmed: true });
    expect(frames).toHaveLength(1);
    now = 65;
    frames.shift()();
    expect(row.visual.scale.x).toBeGreaterThan(1);
    expect(row.visual.scale.x).toBeLessThanOrEqual(1.035);
    expect(row.background.alpha).toBe(1);

    now = 180;
    frames.shift()();
    expect(row.visual.scale.x).toBe(1);
    expect(row.background.alpha).toBe(1);

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

  it('animates seed-row disclosure with full-alpha rubber scale over 240ms', () => {
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
    expect(dialog.dropSettingsSlider.scale.x).toBeGreaterThan(1);
    expect(dialog.dropSettingsSlider.scale.x).toBeLessThanOrEqual(1.035);

    frames.shift()(240);
    expect(dialog.list.rows.getWidgets()[0].height).toBe(collapsedHeight + 31);
    expect(dialog.dropSettingsSlider.alpha).toBe(1);
    expect(dialog.dropSettingsSlider.scale.x).toBe(1);

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

  it('renders keyed expandable alliance rows with a 4.5-member nested viewport', () => {
    const toggle = vi.fn();
    const join = vi.fn();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'trade alliance',
      directory: true,
      status: 'not in an alliance',
      rows: [
        {
          id: 'dbp',
          type: 'allianceDirectory',
          name: 'Dominion of Bug Players',
          tag: 'DBP',
          tagColor: 'violet',
          totalIncomeLabel: '12.4k',
          memberCount: 6,
          memberCapacity: 50,
          expanded: true,
          onActivate: toggle,
          action: {
            label: 'Join Alliance',
            variant: 'green',
            enabled: true,
            onActivate: join,
          },
          members: Array.from({ length: 6 }, (_, index) => ({
            id: `member-${index}`,
            username: `Wizard ${index}`,
            roleLabel: index === 0 ? 'Trade Master' : 'Trader',
            levelLabel: `Lv ${18 - index}`,
          })),
        },
        {
          id: 'solo',
          type: 'allianceDirectory',
          name: 'Solo Warriors',
          tag: 'SW',
          tagColor: 'teal',
          totalIncomeLabel: '8.15k',
          memberCount: 1,
          memberCapacity: 50,
          expanded: false,
          onActivate: vi.fn(),
          action: {
            label: 'Apply',
            variant: 'green',
            enabled: true,
            onActivate: vi.fn(),
          },
          members: [],
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('alliance');

    const dialog = harness.dialogs.get('workshop.alliance');
    const row = dialog.rows.get('dbp');
    const collapsedRow = dialog.rows.get('solo');
    expect(row.tag.text).toBe('[DBP]');
    expect(row.tag.style.stroke?.width ?? 0).toBe(0);
    expect(row.name.text).toBe('Dominion of Bug Players');
    expect(row.total.text).toBe('12.4k');
    expect(row.coin.visible).toBe(true);
    expect(row.getPreferredHeight()).toBeGreaterThan(30);
    expect(collapsedRow.getPreferredHeight()).toBe(30);
    expect(row.memberWidgets.size).toBe(6);
    expect(row.memberViewport.height).toBe(40 * 4.5);
    expect(row.memberViewport.contentHeight).toBe(40 * 6);
    expect(row.memberViewport.scrollbarTrack.visible).toBe(true);
    expect(row.action.text.text).toBe('Join Alliance');
    expect(row.action.control.variant).toBe('green');

    row.summaryHit.handleTap();
    row.action.handleTap();
    expect(toggle).toHaveBeenCalledTimes(1);
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
      assetId === 'source:assets/avatars/mira.png'
        ? miraTexture
        : new Texture(),
    );
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.alliance = {
      title: 'Trade Alliance',
      ownedAlliance: true,
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
    expect(dialog.allianceTradeSection.title.text).toBe('Trade Info');
    expect(dialog.allianceTradeSection.identity.text).toBe('[MOSS] Moss Hall');
    expect(dialog.allianceMembersSection.title.text).toBe('Members');
    expect(member.avatar.texture).toBe(miraTexture);
    expect(member.role.text).toBe('Trade Master');
    expect(member.level.text).toBe('Lv 12');
    expect(member.root.parent).toBe(dialog.allianceMembersSection.scroll.content);

    harness.page.destroy();
    harness.dispose();
    miraTexture.destroy();
  });

  it('renders complete potion discovery rows with item art and recipe metadata', () => {
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
    expect(row.name.text).toBe('Silverleaf Quiet');
    expect(row.discovererName.text).toBe('Ada');
    expect(row.date.text).toBe('Jan 2, 2026');
    expect(row.mana.text).toBe('34 Mana');
    expect(row.duration.text).toBe('75s Brew');
    expect(row.royalty.text).toBe('12.5 Coin Royalty');
    expect(row.ingredientRows[0].label.text).toBe('×1 Mint');
    expect(row.ingredientRows[1].label.text).toBe('×2 Silverleaf');
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.settingsRow,
    );
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith(
      'potion:silverleafQuiet',
    );
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('herb:mintHerb');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith(
      'herb:silverleafHerb',
    );
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('resource:mana');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('resource:coin');

    harness.page.destroy();
    harness.dispose();
  });

  it('renders icons and one normal amount color across every Bag row kind', () => {
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
    expect(rows.every((row) => row.valueIcon.visible)).toBe(true);
    expect(rows.every((row) => row.value.style.fill === dialog.contentTheme.text)).toBe(true);
    expect(rows.every((row) => row.value.x === 262)).toBe(true);

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

  it('keeps failed chat drafts and clears them only after confirmed success', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: 'global_rate_limited' })
      .mockResolvedValueOnce({ ok: true, body: 'hello' });
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
    await expect(dialog.submitComposer()).resolves.toBe(false);
    expect(dialog.composerField.value).toBe('hello');
    expect(dialog.status.text).toBe('');

    await expect(dialog.submitComposer()).resolves.toBe(true);
    expect(dialog.composerField.value).toBe('');
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
    expect(dialog.scroll.offsetY).toBe(dialog.scroll.contentHeight - dialog.scroll.height);
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
      body:
        'This newly arrived message wraps onto multiple lines and must remain completely visible.',
      ageLabel: 'now',
    });
    harness.page.bind(model);

    const wrappedRow = dialog.rows.get('player-wrapped');
    expect(wrappedRow.getPreferredHeight()).toBeGreaterThan(35.1);
    expect(dialog.scroll.contentHeight - dialog.scroll.height).toBeGreaterThan(
      previousBottom,
    );
    expect(dialog.scroll.offsetY).toBeCloseTo(
      dialog.scroll.contentHeight - dialog.scroll.height,
    );

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
    const harness = createHarness();
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
    expect(
      dialog.modal.fixedBounds.x - geometry.frameOutset,
    ).toBe(0);
    expect(
      dialog.modal.fixedBounds.x +
        dialog.modal.fixedBounds.width +
        geometry.frameOutset,
    ).toBe(dialog.sourceWidth);
    expect(
      dialog.modal.fixedBounds.y +
        dialog.modal.fixedBounds.height +
        geometry.frameOutset,
    ).toBeCloseTo(dialog.sourceHeight);
    expect(dialog.modal.fixedBounds.height).toBe(573);
    expect(dialog.panel.headerLayout).toBe('edge');
    expect(dialog.panel.titleFrame.x).toBe(-geometry.frameOutset);
    expect(
      dialog.panel.closeControl.x + geometry.closeSize / 2,
    ).toBe(dialog.panel.coreWidth + geometry.frameOutset);
    expect(dialog.panel.closeControl.y).toBeCloseTo(
      dialog.panel.titleFrame.y +
        dialog.panel.titleFrame.frameHeight / 2,
    );
    expect(
      dialog.panel.titleFrame.y + dialog.panel.titleFrame.frameHeight,
    ).toBeCloseTo(-geometry.frameOutset - 4);

    dialog.layout({
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
      worldChatShift: 0,
    });
    const restingPanelY = dialog.modal.fixedBounds.y;
    dialog.layout({
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
      worldChatShift: -290,
    });

    expect(dialog.modal.fixedBounds.y).toBeCloseTo(restingPanelY - 290);
    expect(
      dialog.modal.fixedBounds.y +
        dialog.composerField.y +
        dialog.composerField.fieldHeight,
    ).toBeLessThan(1300 / 3);

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

    expect(dialog.composerField.variant).toBe('brown-inset');
    expect(dialog.composerField.placeholder).toBe('Message');
    expect(dialog.composerSubmit.control.variant).toBe('yellow');
    expect(dialog.composerSubmit.text.text).toBe('Send');
    expect(dialog.composerSubmit.enabled).toBe(true);
    expect(dialog.composerField.y).toBe(533);
    expect(dialog.composerField.x).toBeCloseTo(
      dialog.panel.paperFrame.x,
    );
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
    const composerCaretBounds =
      dialog.composerField.caretGraphic.getLocalBounds();
    expect(composerCaretBounds.x).toBeGreaterThanOrEqual(0);
    expect(
      composerCaretBounds.x + composerCaretBounds.width,
    ).toBeLessThanOrEqual(dialog.composerField.textAreaWidth);
    expect(dialog.composerField.textLabel.x).toBeLessThan(0);
    expect(dialog.composerSubmit.root.x).toBeCloseTo(296 + 2 / 3);
    expect(dialog.composerSubmit.width).toBe(74);
    expect(dialog.composerSubmit.height).toBe(29);
    expect(
      dialog.composerSubmit.root.x -
        (dialog.composerField.x + dialog.composerField.fieldWidth),
    ).toBe(6);
    expect(
      dialog.composerSubmit.root.x + dialog.composerSubmit.width,
    ).toBeCloseTo(
      dialog.panel.paperFrame.x +
        dialog.panel.paperFrame.frameWidth -
        4,
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
    expect(playerRow.body.x).toBeCloseTo(32.5);
    expect(playerRow.body.y).toBeGreaterThan(playerRow.username.y);
    expect(playerRow.tag.y).toBe(-1);
    expect(playerRow.username.y).toBe(-1);
    expect(playerRow.avatar.width).toBeCloseTo(28.6);
    expect(playerRow.getPreferredHeight()).toBeCloseTo(35.1);
    expect(dialog.scroll.root.x).toBe(8);
    expect(dialog.scroll.width).toBe(354);
    expect(playerRow.root.hitArea.width).toBe(351);
    expect(playerRow.username.x - (playerRow.tag.x + playerRow.tag.width)).toBe(2);
    expect(playerRow.avatar.eventMode).toBe('static');
    expect(playerRow.username.eventMode).toBe('static');
    expect(playerRow.action).toBeUndefined();
    expect(systemRow.root.y + systemRow.getPreferredHeight()).toBe(dialog.scroll.height);
    expect(playerRow.root.y).toBe(
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
    expect(systemRow.getPreferredHeight()).toBeCloseTo(36.5);
    expect(systemRow.root.y - playerRow.root.y).toBeCloseTo(
      playerRow.getPreferredHeight() + 3,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('mirrors the connected player\'s World Chat row to the right', () => {
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
          username: 'Mira',
          body: 'I will join the expedition.',
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
    const textRight = row.width - 32.5;

    expect(row.isOwn).toBe(true);
    expect(row.avatar.x).toBeCloseTo(row.width - row.avatar.width / 2);
    expect(row.username.x + row.username.width).toBeCloseTo(textRight);
    expect(row.body.x + row.body.layoutWidth).toBeCloseTo(textRight);
    expect(row.timestamp.anchor.x).toBe(0);
    expect(row.timestamp.x).toBe(0);

    harness.page.destroy();
    harness.dispose();
  });

  it('colors system announcements and opens Player Info from the announced username', () => {
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
          id: 'system-level-1',
          type: 'system',
          username: 'System',
          systemPlayerUsername: 'Ada',
          systemPlayerDetail: 'reached level 14',
          body: 'Ada reached level 14',
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
    const row = dialog.rows.get('system-level-1');
    const playerPress = pressRegistrations.find(
      ({ displayObject }) => displayObject === row.systemPlayerUsername,
    );
    const avatarPress = pressRegistrations.find(
      ({ displayObject }) => displayObject === row.avatar,
    );

    expect(row.username.text).toBe('System');
    expect(row.username.style.fill).toBe('#432d20');
    expect(row.username.eventMode).toBe('none');
    expect(row.systemPlayerUsername.text).toBe('Ada');
    expect(row.systemPlayerUsername.style.fill).toBe('#72533a');
    expect(row.systemPlayerUsername.eventMode).toBe('static');
    expect(row.body.text).toBe('reached level 14');
    expect(row.body.x).toBeGreaterThan(row.systemPlayerUsername.x);
    expect(avatarPress?.descriptor.enabled()).toBe(false);
    expect(playerPress?.descriptor.excludePageSwipe).toBe(true);
    expect(playerPress?.descriptor.onActivate()).toBe(true);
    expect(openPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'system-level-1' }),
    );

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
          systemPlayerDetail:
            'reached ⭐ 4, completing prestige level 40',
          bodyRuns: [
            {
              kind: 'text',
              text: 'reached ',
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
      (textObject) =>
        textObject.visible && textObject.text.startsWith('4,'),
    );
    expect(systemRow.body.text).toBe(
      'reached ⭐ 4, completing prestige level 40',
    );
    expect(bodyIcon.texture).toBe(Texture.WHITE);
    expect(bodyIcon.visible).toBe(true);
    expect(bodyIcon.renderable).toBe(true);
    expect(bodyIcon.width).toBe(12);
    expect(bodyIcon.height).toBe(12);
    expect(followingText).toBeDefined();
    expect(bodyIcon.x + bodyIcon.width / 2).toBeLessThan(
      followingText.x,
    );
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
        4,
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
    expect(worldChatTop - summonButtonBottom).toBe(128);
    expect(harness.page.bagButton.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: 175 + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch * 3,
    });
    expect(harness.page.statsButton.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: 175,
    });
    const alliance = harness.page.features.get('alliance');
    const inbox = harness.page.inboxButton;
    expect(alliance.root.position).toMatchObject({
      x: ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge,
      y: 175,
    });
    expect(inbox.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge -
        ROOT_RUN_SIDE_ACTION_GEOMETRY.width,
      y: 175 + ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch,
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
        4,
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
    expect(alliance.cloth.visible).toBe(false);
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
    expect(row.icon.width).toBe(24);
    expect(row.icon.height).toBe(24);
    expect(row.icon.x).toBe(12);
    expect(row.icon.y).toBe(9);
    expect(row.label.x).toBe(27);

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
      top:
        summonBackground.borderInsets.top
        / summonBackground.sourceInsets.top,
      right:
        summonBackground.borderInsets.right
        / summonBackground.sourceInsets.right,
      bottom:
        summonBackground.borderInsets.bottom
        / summonBackground.sourceInsets.bottom,
      left:
        summonBackground.borderInsets.left
        / summonBackground.sourceInsets.left,
    };
    expect(cornerScales.left).toBeCloseTo(cornerScales.right);
    expect(cornerScales.left).toBeCloseTo(cornerScales.top);
    expect(cornerScales.left).toBeCloseTo(cornerScales.bottom);
    expect(
      summonBackground.borderInsets.top
        + 1
        + summonBackground.borderInsets.bottom,
    ).toBeCloseTo(52);
    expect(harness.page.summon.button.actionTextLabel.text).toBe('Summon Seed');
    expect(harness.page.summon.button.actionTextLabel.fontSize).toBe(11);
    expect(harness.page.summon.button.amountLabel.fontSize).toBe(13);
    expect(
      harness.page.summon.button.actionTextLabel.stroke.width,
    ).toBe(
      resolvePixiTextStrokeWidth(
        harness.page.summon.button.actionTextLabel.fontSize,
      ),
    );
    expect(harness.page.summon.button.amountLabel.stroke.width).toBe(
      resolvePixiTextStrokeWidth(
        harness.page.summon.button.amountLabel.fontSize,
      ),
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

  it('keeps summon release-only when the tutorial overlay owns the event path', () => {
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
    vi.advanceTimersByTime(500);
    expect(summonSeed).not.toHaveBeenCalled();
    inputRouter.onPointerUp(createPointerEvent(overlayTarget, 'pointerup', summonPoint));
    expect(harness.page.summon.button.pressed).toBe(false);
    expect(summonSeed).toHaveBeenCalledTimes(1);

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

    const infoBounds = harness.page.summon.info.getBounds();
    const infoPoint = {
      x: infoBounds.x + infoBounds.width / 2,
      y: infoBounds.y + infoBounds.height / 2,
    };
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
