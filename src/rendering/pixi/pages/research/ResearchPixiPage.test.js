// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  RESEARCH_PIXI_GEOMETRY,
  RESEARCH_WIDGET_BOUNCE_DURATION_MS,
  ResearchPixiPage,
  ResearchStationTitlePlaque,
  getResearchShineLayout,
  getResearchWidgetBounceScale,
} from './ResearchPixiPage.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_SCROLLBAR_GEOMETRY,
  RETAINED_SCROLLBAR_VISUALS,
} from '../workshop/RetainedPageKit.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';

describe('ResearchPixiPage', () => {
  it('keeps the empty title plaque inside its nine-slice minimum before binding', () => {
    const plaque = new ResearchStationTitlePlaque();

    expect(plaque.width).toBeGreaterThanOrEqual(62);
    expect(plaque.frame).toMatchObject({
      compatibilityError: null,
      frameHeight: 42,
      frameWidth: plaque.width,
    });

    plaque.root.destroy({ children: true });
  });

  it('matches the Root Run upgrade bounce and masked shine geometry', () => {
    expect(getResearchWidgetBounceScale(0)).toBe(1);
    expect(getResearchWidgetBounceScale(0.28)).toBeCloseTo(1.035);
    expect(getResearchWidgetBounceScale(0.62)).toBeCloseTo(0.992);
    expect(getResearchWidgetBounceScale(1)).toBe(1);
    const layout = getResearchShineLayout(
      { x: 10, y: 20, width: 80, height: 40 },
      43,
      81,
      { heightScale: 1.05, cornerRadiusScale: 0.28 },
    );
    expect(layout).toMatchObject({
      x: 10,
      y: 20,
      width: 80,
      height: 40,
      centerY: 40,
    });
    expect(layout.cornerRadius).toBeCloseTo(11.2);
  });

  it('runs the retained shine and whole-row bounce only after a successful upgrade', () => {
    let now = 1_000;
    const buyResearch = vi.fn(() => ({ ok: true, cost: 25 }));
    const harness = createHarness({ timeSource: () => now });
    const row = harness.page.rowPool.acquire();
    const research = createAvailableResearch();
    row.bind(
      research,
      { buy: () => buyResearch(research.id) },
      'herbs',
    );

    expect(harness.semanticTargets.activate('research.mint')).toEqual({
      ok: true,
      cost: 25,
    });
    expect(row.purchaseEffect).not.toBeNull();
    expect(row.widgetShine.root.visible).toBe(true);
    expect(row.buttonShine.root.visible).toBe(true);

    now += 100;
    row.updateTime(now);
    expect(row.root.scale.x).toBeGreaterThan(1);
    expect(row.widgetShine.sprite.x).toBeGreaterThan(
      row.widgetShine.layout.startX,
    );

    now += RESEARCH_WIDGET_BOUNCE_DURATION_MS;
    row.updateTime(now);
    expect(row.purchaseEffect).toBeNull();
    expect(row.root.scale.x).toBe(1);
    expect(row.widgetShine.root.visible).toBe(false);
    expect(row.buttonShine.root.visible).toBe(false);

    harness.page.rowPool.release(row);
    harness.page.destroy();
    harness.dispose();
  });

  it('suppresses upgrade motion for failed purchases and reduced-motion players', () => {
    const failed = createHarness();
    const failedRow = failed.page.rowPool.acquire();
    const failedResearch = createAvailableResearch();
    failedRow.bind(
      failedResearch,
      { buy: () => ({ ok: false }) },
      'herbs',
    );
    failed.semanticTargets.activate('research.mint');
    expect(failedRow.purchaseEffect).toBeNull();
    failed.page.rowPool.release(failedRow);
    failed.page.destroy();
    failed.dispose();

    const reduced = createHarness({ prefersReducedMotion: () => true });
    const reducedRow = reduced.page.rowPool.acquire();
    const reducedResearch = createAvailableResearch();
    reducedRow.bind(
      reducedResearch,
      { buy: () => ({ ok: true }) },
      'herbs',
    );
    reduced.semanticTargets.activate('research.mint');
    expect(reducedRow.purchaseEffect).toBeNull();
    expect(reducedRow.widgetShine.root.visible).toBe(false);
    reduced.page.rowPool.release(reducedRow);
    reduced.page.destroy();
    reduced.dispose();
  });

  it('builds once and keeps keyed boxes and research rows across updates', () => {
    const harness = createHarness();
    const pages = new PageRegistry({
      pages: [['research', harness.page]],
    });
    pages.bind('research', createResearchViewModel({ value: '100 mana' }));
    pages.activate('research');
    const root = harness.page.getDisplayObject();
    const box = harness.page.boxes.get('herbs');
    const row = box.rows.get('mint');

    expect(row.costButton.background.visible).toBe(true);
    expect(row.costButton.background.renderable).toBe(true);

    pages.bind('research', createResearchViewModel({ value: '80 mana' }));

    expect(harness.page.getDisplayObject()).toBe(root);
    expect(harness.page.boxes.get('herbs')).toBe(box);
    expect(harness.page.boxes.get('herbs').rows.get('mint')).toBe(row);
    expect(harness.page.boxPool.getStats().allocated).toBe(1);
    expect(box.rowsPool.getStats().allocated).toBe(1);
    expect(row.valueButton.text.text).toBe('80 mana');

    pages.destroy();
    harness.dispose();
  });

  it('keeps unlocked labels passive and routes locked rows to a requirement tooltip', () => {
    const buyResearch = vi.fn();
    const showLockedReason = vi.fn();
    const harness = createHarness();
    harness.page.bind(
      createResearchViewModel({
        buyResearch,
        showLockedReason,
      }),
    );
    harness.page.activate();

    expect(harness.semanticTargets.activate('research.mint')).toBe(true);
    expect(buyResearch).toHaveBeenCalledWith('mint');
    expect(harness.dialogs.hasInstance('research.info')).toBe(false);

    const row = harness.page.boxes.get('herbs').rows.get('mint');
    row.labelHit.emit('pointertap', {});

    expect(row.labelHit.eventMode).toBe('none');
    expect(harness.dialogs.getStats().constructed).toBe(0);

    harness.page.bind(
      createResearchViewModel({
        canResearch: false,
        locked: true,
        showLockedReason,
      }),
    );
    const lockedRow = harness.page.boxes.get('herbs').rows.get('mint');

    expect(lockedRow.rank).toBeUndefined();
    expect(lockedRow.rankLabel).toBeUndefined();
    expect(lockedRow.costButton.lockReason).toBe('');
    expect(lockedRow.costButton.lockReasonLabel.visible).toBe(false);
    expect(harness.semanticTargets.activate('research.mint')).toBe(true);
    expect(showLockedReason).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mint', locked: true }),
    );
    expect(harness.page.lockTooltip.root.visible).toBe(true);
    expect(harness.page.lockTooltip.copy.text).toBe(
      'Complete prior research',
    );
    harness.page.hideLockTooltip();
    lockedRow.labelHit.emit('pointertap', {});
    expect(showLockedReason).toHaveBeenCalledTimes(2);
    expect(harness.page.lockTooltip.root.visible).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('reuses the normal row visuals beneath a translucent locked overlay', () => {
    const normalTexture = Texture.WHITE;
    const lockedTexture = Texture.EMPTY;
    const assetManager = {
      getAtlasTexture() {
        return Texture.EMPTY;
      },
      getTexture(assetId) {
        if (
          assetId === PIXI_ROOT_RUN_ASSETS.researchCardLocked
        ) {
          return lockedTexture;
        }
        return normalTexture;
      },
      has() {
        return true;
      },
    };
    const harness = createHarness({ assetManager });
    harness.page.bind(
      createResearchViewModel({
        canResearch: false,
        locked: true,
      }),
    );

    const row = harness.page.boxes.get('herbs').rows.get('mint');
    expect(row.card.texture).toBe(normalTexture);
    expect(row.artWell.texture).toBe(normalTexture);
    expect(row.artWell.tint).toBe(0xdbc19f);
    expect(row.art.filters).toBeNull();
    expect(row.name.style.fill).toBe('#634934');
    expect(row.description.style.fill).toBe('#634934');
    expect(row.lockedOverlay).toMatchObject({
      visible: true,
      renderable: true,
      alpha: 0.3,
      tint: 0x000000,
      texture: normalTexture,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('renders exact seed-pack and potion artwork for item unlock research', () => {
    const genericTexture = Texture.WHITE;
    const seedPackTexture = new Texture();
    const silverleafTexture = new Texture();
    const potionTexture = new Texture();
    const atlasTextures = new Map([
      ['seed:pack', seedPackTexture],
      ['herb:silverleafHerb', silverleafTexture],
      ['potion:minorHealingPotion', potionTexture],
    ]);
    const assetManager = {
      getAtlasTexture(frameName) {
        return atlasTextures.get(frameName) ?? Texture.EMPTY;
      },
      getTexture() {
        return genericTexture;
      },
      has() {
        return true;
      },
    };
    const harness = createHarness({ assetManager });
    const model = createResearchViewModel();
    const research = model.research.tabs[0].boxes[0].researches[0];
    Object.assign(research, {
      id: 'unlockSeed:silverleafSeed',
      displayName: 'silverleaf seed',
      itemKind: 'seed',
      itemKey: 'silverleafSeed',
    });

    harness.page.bind(model);

    const seedRow = harness.page.rows.get('unlockSeed:silverleafSeed');
    expect(seedRow.art.texture).toBe(seedPackTexture);
    expect(seedRow.artOverlay.texture).toBe(silverleafTexture);
    expect(seedRow.artOverlay.visible).toBe(true);
    expect(seedRow.art.height).toBe(46);
    expect(seedRow.art.width).toBeLessThanOrEqual(46);

    Object.assign(research, {
      id: 'unlockRecipe:minorHealingPotion',
      displayName: 'minor healing potion',
      itemKind: 'potion',
      itemKey: 'minorHealingPotion',
    });
    harness.page.bind(model);

    const potionRow = harness.page.rows.get(
      'unlockRecipe:minorHealingPotion',
    );
    expect(potionRow.art.texture).toBe(potionTexture);
    expect(potionRow.artOverlay.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('lays out the full-page scroll and fixed tabs in frozen source space', () => {
    const harness = createHarness();
    const model = createResearchViewModel();
    model.research.tabs.push(
      {
        id: 'emerald',
        label: 'crystal research',
        boxes: [],
      },
      {
        id: 'automation',
        label: 'automation',
        boxes: [],
      },
      {
        id: 'advanced',
        label: 'advanced research',
        boxes: [],
      },
    );
    harness.page.bind(model);

    expect(harness.page.scroll.root.position).toMatchObject({ x: 0, y: 104 });
    expect(harness.page.scroll).toMatchObject({
      width: 374,
      height: 530,
    });
    const box = harness.page.boxes.get('herbs');
    expect(box.root.position.x).toBe(0);
    expect(box.titlePlaque.root.position.x).toBe(0);
    expect(box.rowsLayer.position.x).toBe(16);
    expect(box.rows.get('mint').root.position.x).toBe(0);
    expect(box.rows.get('mint').card.position.x).toBe(-2);
    expect(harness.page.tabsLayer.position).toMatchObject({
      x: 16,
      y: 640,
    });
    const tabs = harness.page.tabs.getWidgets();
    expect(tabs.map((tab) => tab.control.textLabel.text)).toEqual([
      'Regular Research',
      'Crystal Research',
      'Automation',
      'Advanced Research',
    ]);
    const expectedWrapWidth =
      (358 - 3 * (tabs.length - 1)) / tabs.length - 6;
    expect(expectedWrapWidth).toBe(81.25);
    for (const tab of tabs) {
      expect(tab.height).toBe(PIXI_UI_GEOMETRY.roomControlHeight);
      expect(tab.control.sizeTier).toBe(30);
      expect(tab.control.rootRunFrame.sourceInsets).toEqual({
        top: 60,
        right: 32,
        bottom: 41,
        left: 52,
      });
      const cornerScales = Object.fromEntries(
        Object.entries(tab.control.rootRunFrame.sourceInsets).map(
          ([side, inset]) => [
            side,
            tab.control.rootRunFrame.borderInsets[side] / inset,
          ],
        ),
      );
      expect(cornerScales.left).toBeCloseTo(cornerScales.right);
      expect(cornerScales.left).toBeCloseTo(cornerScales.top);
      expect(cornerScales.left).toBeCloseTo(cornerScales.bottom);
      expect(tab.control.textLabel.fontSize).toBe(10);
      expect(tab.control.textLabel.lineHeight).toBe(12);
      expect(tab.control.textLabel.align).toBe('center');
      expect(tab.control.textLabel.wordWrap).toBe(true);
      expect(tab.control.textLabel.wrapWidth).toBeCloseTo(
        expectedWrapWidth,
      );
    }

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps locked research tabs explainable without allowing selection', () => {
    const selectTab = vi.fn();
    const harness = createHarness();
    const model = createResearchViewModel();
    model.actions.selectTab = selectTab;
    model.research.tabs.push({
      id: 'emerald',
      label: 'crystal research',
      boxes: [],
      locked: true,
      unlocked: false,
      requiredLevel: 4,
      lockPrompt: 'Unlocks at level 4',
    });
    harness.page.bind(model);

    const lockedTab = harness.page.tabs.get('emerald');
    expect(lockedTab).toMatchObject({ locked: true, selected: false });
    expect(lockedTab.control).toMatchObject({
      enabled: true,
      locked: true,
      eventMode: 'static',
    });
    expect(lockedTab.control.activeSkin.assetId).toBe(
      'source:assets/ui/regular-button/gray-button-30.9.png',
    );
    expect(lockedTab.control.textLabel.visible).toBe(false);
    expect(lockedTab.lockIcon).toMatchObject({
      visible: true,
      renderable: true,
      x: lockedTab.width / 2,
      y: RETAINED_PAGE_GEOMETRY.tabHeight / 2,
    });

    expect(harness.semanticTargets.getState('research.tab.emerald')).toMatchObject({
      enabled: true,
      interactive: true,
      locked: true,
    });
    expect(harness.semanticTargets.activate('research.tab.emerald')).toBe(true);
    expect(selectTab).not.toHaveBeenCalled();
    expect(harness.page.selectedTabId).toBe('regular');
    expect(harness.page.lockTooltip.root.visible).toBe(true);
    expect(harness.page.lockTooltip.copy.text).toBe('Unlocks at level 4');

    harness.page.destroy();
    harness.dispose();
  });

  it('extends the research list and lowers its tabs while world chat is hidden', () => {
    const harness = createHarness();
    const model = createResearchViewModel();
    model.chrome = { worldChatVisible: false };

    harness.page.bind(model);

    const releasedClearance =
      RETAINED_PAGE_GEOMETRY.chatClearance -
      PIXI_UI_GEOMETRY.roomChatBottom;
    expect(harness.page.scroll.height).toBeCloseTo(
      530 + releasedClearance,
    );
    expect(harness.page.tabsLayer.position.y).toBeCloseTo(
      640 + releasedClearance,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('shows the shared right-edge station scrollbar only for overflowing research', () => {
    const harness = createHarness();
    const model = createResearchViewModel();
    const regularTab = model.research.tabs[0];
    regularTab.boxes = Array.from({ length: 5 }, (_, index) => ({
      id: `research-box-${index}`,
      label: `research box ${index + 1}`,
      researches: [
        {
          id: `research-${index}`,
          displayName: `research ${index + 1}`,
          effect: `effect ${index + 1}`,
          displayValue: '100 mana',
          canResearch: true,
          locked: false,
        },
      ],
    }));
    harness.page.bind(model);

    const scroll = harness.page.scroll;
    expect(scroll.contentHeight).toBeGreaterThan(scroll.height);
    expect(scroll.scrollbarTrack.visible).toBe(true);
    expect(scroll.scrollbarThumb.visible).toBe(true);
    const firstBox = harness.page.boxes.get('research-box-0');
    const firstRow = firstBox.rows.get('research-0');
    const cardRight =
      firstBox.rowsLayer.position.x +
      firstRow.root.position.x +
      firstRow.card.position.x +
      RESEARCH_PIXI_GEOMETRY.cardWidth;
    expect(cardRight).toBeLessThanOrEqual(scroll.width);
    const trackStrokeOutset =
      RETAINED_SCROLLBAR_GEOMETRY.trackBorderWidth / 2;
    expect(scroll.scrollbarTrack.getLocalBounds()).toMatchObject({
      x:
        scroll.width +
        RETAINED_SCROLLBAR_GEOMETRY.gap -
        trackStrokeOutset,
      y: RETAINED_SCROLLBAR_GEOMETRY.trackInset - trackStrokeOutset,
      width:
        RETAINED_SCROLLBAR_GEOMETRY.width + trackStrokeOutset * 2,
      height:
        scroll.height -
        RETAINED_SCROLLBAR_GEOMETRY.trackInset * 2 +
        trackStrokeOutset * 2,
    });
    expect(RETAINED_SCROLLBAR_VISUALS).toMatchObject({
      trackBackground: 0x17100c,
      trackBorder: 0x000000,
      thumbBackground: 0xf2ae54,
      thumbBorder: 0x5e321b,
    });

    const topThumbY = scroll.scrollbarThumb.getLocalBounds().y;
    expect(scroll.scrollTo(scroll.contentHeight - scroll.height)).toBe(true);
    expect(scroll.scrollbarThumb.getLocalBounds().y).toBeGreaterThan(
      topThumbY,
    );

    harness.page.bind(createResearchViewModel());
    expect(scroll.contentHeight).toBeLessThan(scroll.height);
    expect(scroll.scrollbarTrack.visible).toBe(false);
    expect(scroll.scrollbarThumb.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('can suppress a research notification without disabling its action', () => {
    const buyResearch = vi.fn();
    const harness = createHarness();
    harness.page.bind(
      createResearchViewModel({
        buyResearch,
        notification: false,
      }),
    );
    harness.page.activate();

    const row = harness.page.boxes.get('herbs').rows.get('mint');
    expect(row.valueButton.enabled).toBe(true);
    expect(row.valueButton.notification).toBe(false);
    expect(harness.semanticTargets.activate('research.mint')).toBe(true);
    expect(buyResearch).toHaveBeenCalledWith('mint');

    harness.page.destroy();
    harness.dispose();
  });

  it('shows affordable research notifications on the selected tab and its cost button', () => {
    const harness = createHarness();
    harness.page.bind(
      createResearchViewModel({
        notification: true,
      }),
    );

    const tab = harness.page.tabs.get('regular');
    const row = harness.page.boxes.get('herbs').rows.get('mint');

    expect(tab.selected).toBe(true);
    expect(tab.notificationDot.visible).toBe(true);
    expect(row.valueButton.notification).toBe(true);
    expect(row.valueButton.notificationBadge.root.visible).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses exact Root Run card geometry and one global high-water row pool', () => {
    const harness = createHarness();
    harness.page.bind(createResearchViewModel());
    const box = harness.page.boxes.get('herbs');
    const row = box.rows.get('mint');

    expect(row.card.position).toMatchObject({ x: -2, y: 0 });
    expect(row.card).toMatchObject({
      frameWidth: RESEARCH_PIXI_GEOMETRY.cardWidth,
      frameHeight: 80,
    });
    expect(RESEARCH_PIXI_GEOMETRY.contentOffsetY).toBe(3);
    expect(row.artWell.position).toMatchObject({ x: 13, y: 17 });
    expect(row.artWell).toMatchObject({ frameWidth: 52, frameHeight: 52 });
    expect(row.art).toMatchObject({ width: 57, height: 57 });
    expect(row.name.position.y).toBe(
      RESEARCH_PIXI_GEOMETRY.nameY +
        RESEARCH_PIXI_GEOMETRY.contentOffsetY,
    );
    expect(row.description.position.x).toBe(
      RESEARCH_PIXI_GEOMETRY.descriptionX,
    );
    expect(row.costButton.position.y).toBe(
      RESEARCH_PIXI_GEOMETRY.actionTop +
        RESEARCH_PIXI_GEOMETRY.contentOffsetY +
        (RESEARCH_PIXI_GEOMETRY.actionHeight -
          RESEARCH_PIXI_GEOMETRY.costHeight) /
          2,
    );
    expect(row.progress.root.position.x).toBe(252 / 3);
    expect(row.progress.width).toBe(422 / 3);
    expect(row.progress).toMatchObject({
      tone: 'yellow',
      height: 10,
    });
    expect(row.costButton).toMatchObject({
      buttonWidth: 72,
      buttonHeight: 42,
    });
    expect(row.costButton.amountLabel.fontSize).toBeCloseTo(17 * 0.88);
    expect(row.costButton.resourceIcon.width).toBeCloseTo(23 * 0.88);
    expect(row.researchedButton.amountLabel.fontSize).toBe(9);
    expect(row.researchedButton.amountLabel.textObject.style.fontSize).toBe(9);
    expect(box.title.text).toBe('Herbs');
    expect(box.title.style).toMatchObject({
      fontFamily: '"Lilita One", "Arial Black", Arial, sans-serif',
      fontSize: 18,
      fill: '#ffffff',
      lineHeight: 21,
      stroke: {
        color: '#0a0a0a',
        width: resolvePixiTextStrokeWidth(box.title.style.fontSize),
        join: 'round',
      },
    });
    expect(box.titlePlaque.frame).toMatchObject({
      frameHeight: 42,
      frameWidth: Math.ceil(box.title.width + 60),
    });
    expect(box.titlePlaque).toMatchObject({
      variant: 'regular',
      assetId:
        'source:assets/ui/banners/banner-yellow-right.9.png',
    });
    expect(box.title.position).toMatchObject({ x: 12, y: 21 });
    expect(box.titlePlaque.root.position).toMatchObject({ x: 0, y: 0 });
    expect(box.getPreferredHeight()).toBe(
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
        RESEARCH_PIXI_GEOMETRY.rowGap +
        RESEARCH_PIXI_GEOMETRY.rowHeight,
    );
    expect(harness.page.rowPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
      maxSize: 128,
    });

    const moved = createResearchViewModel();
    moved.research.tabs[0].boxes[0].id = 'automation';
    moved.research.tabs[0].boxes[0].label = 'automation';
    harness.page.bind(moved);

    expect(harness.page.rows.get('mint')).toBe(row);
    expect(harness.page.boxes.get('automation').rows.get('mint')).toBe(row);
    expect(harness.page.rowPool.getStats().allocated).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('colors station title plaques from the selected research tab', () => {
    const harness = createHarness();
    const variants = [
      {
        tabId: 'regular',
        variant: 'regular',
        asset: 'banner-yellow-right.9.png',
      },
      {
        tabId: 'automation',
        variant: 'automation',
        asset: 'banner-red-right.9.png',
      },
      {
        tabId: 'advanced',
        variant: 'advanced',
        asset: 'banner-green-right.9.png',
      },
      {
        tabId: 'emerald',
        variant: 'crystal',
        asset: 'banner-purple-right.9.png',
      },
    ];

    for (const { tabId, variant, asset } of variants) {
      const model = createResearchViewModel();
      model.research.selectedTabId = tabId;
      model.research.tabs[0].id = tabId;
      harness.page.bind(model);

      expect(harness.page.boxes.get('herbs').titlePlaque).toMatchObject({
        variant,
        assetId: `source:assets/ui/banners/${asset}`,
      });
    }

    harness.page.destroy();
    harness.dispose();
  });

  it('shows plot upgrade stars in the title and fits long descriptions inside the row', () => {
    const harness = createHarness();
    const model = createResearchViewModel();
    Object.assign(
      model.research.tabs[0].boxes[0].researches[0],
      {
        displayName: 'plot 1',
        starLevel: 1,
        starMaxLevel: 5,
        description:
          'levels plot 1 to lvl 2: it uses 2 seeds and harvests 2 herbs in one growth timer.',
      },
    );

    harness.page.bind(model);

    const row = harness.page.rows.get('mint');
    const descriptionBottom =
      row.description.position.y + row.description.height;
    expect(row.name.text).toBe('Plot 1');
    expect(row.nameStars).toMatchObject({
      visible: true,
      level: 1,
      starCount: 1,
      slotCount: 3,
    });
    expect(row.nameStars.slots.filter((slot) => slot.fill.visible)).toHaveLength(1);
    expect(row.nameStars.slots.filter((slot) => slot.root.visible)).toHaveLength(3);
    expect(row.description.style.fontSize).toBeLessThan(11);
    expect(row.description.style.fontSize).toBeGreaterThanOrEqual(8);
    expect(row.description.width).toBeLessThanOrEqual(
      RESEARCH_PIXI_GEOMETRY.descriptionWidth + 0.5,
    );
    expect(row.description.position.y).toBeGreaterThanOrEqual(
      RESEARCH_PIXI_GEOMETRY.descriptionY +
        RESEARCH_PIXI_GEOMETRY.descriptionOpticalOffsetY,
    );
    expect(row.description.position.y).toBeLessThan(
      RESEARCH_PIXI_GEOMETRY.descriptionY,
    );
    expect(descriptionBottom).toBeLessThanOrEqual(
      RESEARCH_PIXI_GEOMETRY.rowHeight -
        RESEARCH_PIXI_GEOMETRY.descriptionBottom +
        0.5,
    );

    model.research.tabs[0].boxes[0].researches[0].starMaxLevel = 2;
    harness.page.bind(model);

    expect(row.nameStars).toMatchObject({
      visible: true,
      level: 1,
      starCount: 1,
      slotCount: 2,
    });
    expect(row.nameStars.slots.filter((slot) => slot.root.visible)).toHaveLength(2);
    expect(row.nameStars.slots[2].root.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('presents completed research with corrected copy and yellow status chrome', () => {
    const harness = createHarness();
    const model = createResearchViewModel({
      value: 'researched',
      canResearch: false,
    });
    Object.assign(
      model.research.tabs[0].boxes[0].researches[0],
      {
        completed: true,
        displayName: 'sage seed',
        description: 'allows sage seed to drop from summon seed.',
        resourceKey: 'seed',
      },
    );

    harness.page.bind(model);

    const row = harness.page.rows.get('mint');
    expect(row.name.text).toBe('Sage Seed');
    expect(row.description.text).toBe(
      'Allows sage seed to drop from summon seed.',
    );
    expect(row.description.style.fontSize).toBe(11);
    expect(row.name.style.fill).toEqual(row.description.style.fill);
    expect(row.name.position.y).toBe(
      RESEARCH_PIXI_GEOMETRY.contentOffsetY,
    );
    expect(row.researchedButton.visible).toBe(true);
    expect(row.researchedButton.tone).toBe('yellow');
    expect(row.researchedButton.amountLabel.text).toBe('Researched');
    expect(row.researchedButton).toMatchObject({
      buttonWidth: 72,
      buttonHeight: 42,
    });
    expect(row.researchedButton.background.visible).toBe(true);
    expect(row.researchedButton.background.renderable).toBe(true);
    expect(row.readonlyValue.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('shows only the next locked preview row in a category', () => {
    const harness = createHarness();
    const model = createResearchViewModel({
      locked: true,
      canResearch: false,
    });
    model.research.tabs[0].boxes[0].researches = Array.from(
      { length: 6 },
      (_, index) => ({
        id: `locked-${index}`,
        displayName: `locked ${index}`,
        displayValue: 'Locked',
        locked: true,
        canResearch: false,
        lockReason: 'requires prior research.',
      }),
    );

    harness.page.bind(model);

    expect(harness.page.boxes.get('herbs').rowWidgets).toHaveLength(1);
    expect(harness.page.rows.getStats().size).toBe(1);
    expect(harness.page.rowPool.getStats().active).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('starts timer work only while active and closes info on deactivation', () => {
    let now = 1_000;
    const ticker = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    const harness = createHarness({
      ticker,
      timeSource: () => now,
    });
    const model = createResearchViewModel();
    const research =
      model.research.tabs[0].boxes[0].researches[0];
    Object.assign(research, {
      canResearch: false,
      inProgress: true,
      displayValue: 'researching',
      timer: {
        active: true,
        totalMs: 10_000,
        remainingMs: 5_000,
        progress: 0.5,
      },
    });
    harness.page.bind(model);
    harness.page.activate();
    const row = harness.page.rows.get('mint');
    row.labelHit.emit('pointertap', {});

    expect(ticker.add).toHaveBeenCalledWith(harness.page.tickHandler);
    expect(harness.dialogs.getStats().constructed).toBe(0);

    now = 3_000;
    harness.page.tick();
    expect(row.researchedButton.visible).toBe(true);
    expect(row.researchedButton.tone).toBe('yellow');
    expect(row.researchedButton.amountLabel.text).toBe('Researching');
    expect(row.researchingTimerLabel.text).toBe('3s');
    expect(row.progress.progress).toBeCloseTo(0.7);
    expect(row.researchingTimerLabel.colorToken).toBe('#d4d4d4');
    expect(row.researchingTimerLabel.x).toBe(
      row.researchedButton.buttonWidth / 2,
    );
    expect(row.readonlyValue.visible).toBe(false);

    harness.page.deactivate();
    expect(ticker.remove).toHaveBeenCalledWith(harness.page.tickHandler);

    harness.page.destroy();
    harness.dispose();
  });

  it('retains main resource-icon values for completed research and uses the timed status button', () => {
    const harness = createHarness();
    const completed = createResearchViewModel({
      value: '2 crystals',
      canResearch: false,
    });
    Object.assign(
      completed.research.tabs[0].boxes[0].researches[0],
      { completed: true },
    );
    harness.page.bind(completed);

    const row = harness.page.rows.get('mint');
    const value = row.readonlyValue;
    expect(value.text).toBe('2 crystals');
    expect(value.plain.visible).toBe(false);
    expect(value.resourceLabel.resource).toBe('crystal');
    expect(value.resourceLabel.amountLabel.text).toBe('2');
    expect(value.resourceLabel.icon.visible).toBe(true);
    expect(value.resourceLabel.icon.x).toBeGreaterThan(
      value.resourceLabel.amountLabel.x,
    );

    const timed = createResearchViewModel({
      value: '20 mana',
      canResearch: false,
    });
    Object.assign(timed.research.tabs[0].boxes[0].researches[0], {
      inProgress: true,
      timer: {
        active: true,
        totalMs: 10_000,
        remainingMs: 5_000,
        remainingLabel: '5s',
        progress: 0.5,
      },
    });
    harness.page.bind(timed);

    expect(harness.page.rows.get('mint')).toBe(row);
    expect(value.visible).toBe(false);
    expect(row.researchedButton.visible).toBe(true);
    expect(row.researchedButton.tone).toBe('yellow');
    expect(row.researchedButton.amountLabel.text).toBe('Researching');
    expect(row.researchingTimerLabel.text).toBe('5s');
    expect(row.researchingTimerLabel.colorToken).toBe('#d4d4d4');
    expect(row.researchingTimerLabel.x).toBe(
      row.researchedButton.buttonWidth / 2,
    );

    harness.page.destroy();
    harness.dispose();
  });
});

function createHarness({
  ticker = null,
  timeSource = undefined,
  prefersReducedMotion = undefined,
  assetManager = createPixiAssetManagerFake(Texture),
} = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const semanticTargets = new SemanticTargetRegistry();
  const page = new ResearchPixiPage({
    assetManager,
    dialogLayer,
    dialogRegistry: dialogs,
    semanticTargets,
    ticker,
    ...(timeSource ? { timeSource } : {}),
    ...(prefersReducedMotion ? { prefersReducedMotion } : {}),
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

function createResearchViewModel({
  value = '100 mana',
  locked = false,
  canResearch = true,
  notification,
  buyResearch = vi.fn(),
  showLockedReason = vi.fn(),
} = {}) {
  return {
    research: {
      selectedTabId: 'regular',
      tabs: [
        {
          id: 'regular',
          label: 'regular research',
          boxes: [
            {
              id: 'herbs',
              label: 'herbs',
              researches: [
                {
                  id: 'mint',
                  displayName: 'mint',
                  effect: '+1 mint',
                  displayValue: value,
                  canResearch,
                  ...(notification === undefined ? {} : { notification }),
                  locked,
                  info: {
                    title: 'mint',
                    copy: 'learn to grow mint.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    actions: {
      buyResearch,
      showLockedReason,
    },
  };
}

function createAvailableResearch() {
  return {
    id: 'mint',
    displayName: 'mint',
    effect: '+1 mint',
    displayValue: '25 coin',
    canResearch: true,
    state: 'available',
    cost: {
      amountLabel: '25',
      resource: 'coin',
    },
  };
}
