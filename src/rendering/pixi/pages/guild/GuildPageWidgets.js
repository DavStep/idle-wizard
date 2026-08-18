import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import { getPixiButtonSkin } from '../../primitives/PixiButtonStyle.js';
import { PixiFrame } from '../../primitives/PixiFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PixiNotificationBadge } from '../../global/transient/PixiNotificationBadges.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RESEARCH_PAPER_INK,
  RESEARCH_PIXI_GEOMETRY,
  RESEARCH_PROGRESS_INK,
  RESEARCH_ROW_TEXT,
  ResearchStationTitlePlaque,
} from '../research/ResearchPixiPage.js';

const PAPER_TEXT = RESEARCH_PAPER_INK;
const PAPER_MUTED = RESEARCH_PROGRESS_INK;
const ALLIANCE_TAG_COLORS = Object.freeze({
  red: '#e88b7e',
  amber: '#e4c774',
  green: '#78cf93',
  teal: '#76c8c8',
  blue: '#89afe0',
  violet: '#bd9ae1',
  magenta: '#db91bf',
  brown: '#c6a17d',
  slate: '#b5bac4',
});
const CARD_HEIGHT = RESEARCH_PIXI_GEOMETRY.rowHeight;
const CARD_GAP = RESEARCH_PIXI_GEOMETRY.rowGap;
const PERSON_HEIGHT = 54;
const ROW_HEIGHT = PERSON_HEIGHT;
const SECTION_CONTENT_GAP = 5;

export function capitalizeGuildText(value) {
  return String(value ?? '').replace(/[A-Za-z]/, (letter) =>
    letter.toUpperCase(),
  );
}

export class GuildRowsSection {
  constructor({
    title,
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    counters = null,
    label = 'guild:section',
    showTitle = true,
  } = {}) {
    this.title = title;
    this.showTitle = showTitle !== false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: `${label}:section` });
    this.titlePlaque = new ResearchStationTitlePlaque({ assetManager });
    this.titlePlaque.root.label = `${label}:titlePlaque`;
    this.titlePlaque.bind(title, 'regular');
    this.contentLayer = new Container({ label: `${label}:content` });
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${label}:rows`;
    this.countLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:count`,
    });
    this.contentLayer.addChild(this.rowsLayer);
    this.root.addChild(
      this.titlePlaque.root,
      this.contentLayer,
      this.countLabel,
    );
    this.titlePlaque.root.visible = this.showTitle;
    this.titlePlaque.root.renderable = this.showTitle;
    this.rowPool = new WidgetPool({
      name: `${label} row pool`,
      counters,
      create: () =>
        new GuildSectionRow({
          assetManager,
          inputRouter,
          semanticRegistry,
          semanticPrefix: label.replaceAll(':', '.'),
          label: `${label}:row`,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 24,
    });
    this.rows = new PooledCollection({
      name: `${label} rows`,
      pool: this.rowPool,
      counters,
      keyOf: (row, index) => row.id ?? row.key ?? index,
      bind: (widget, row, key) => widget.bind(key, row),
      afterReconcile: (widgets) => orderChildren(this.rowsLayer, widgets),
    });
    this.model = {};
    this.width = 0;
  }

  bind(model = {}) {
    this.model = model;
    const rows = safeArray(model.rows);
    this.rows.reconcile(
      rows.length > 0
        ? rows
        : [
            {
              id: 'empty',
              kind: 'empty',
              text: model.emptyLabel ?? 'Quiet',
            },
          ],
    );
    this.countLabel.setText(capitalizeGuildText(model.countLabel));
    this.countLabel.visible =
      this.showTitle && Boolean(model.countLabel);
    this.countLabel.renderable = this.countLabel.visible;
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  getPreferredHeight(width) {
    const contentWidth = Math.max(
      0,
      width - PIXI_UI_GEOMETRY.roomContentEdge,
    );
    let rowsHeight = 0;
    const widgets = this.rows.getWidgets();
    for (const row of widgets) {
      rowsHeight += row.getPreferredHeight(contentWidth);
    }
    rowsHeight += Math.max(0, widgets.length - 1) *
      RESEARCH_PIXI_GEOMETRY.rowGap;
    return (
      (this.showTitle
        ? RESEARCH_PIXI_GEOMETRY.categoryTitleHeight + SECTION_CONTENT_GAP
        : 0) +
      rowsHeight
    );
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.width = width;
    this.titlePlaque.setMaxWidth(width);
    const contentX = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = Math.max(0, width - contentX);
    const titleOffset = this.showTitle
      ? RESEARCH_PIXI_GEOMETRY.categoryTitleHeight + SECTION_CONTENT_GAP
      : 0;
    this.contentLayer.position.set(contentX, titleOffset);
    let rowY = 0;
    for (const row of this.rows.getWidgets()) {
      const rowHeight = row.getPreferredHeight(contentWidth);
      row.setBounds(0, rowY, contentWidth, rowHeight);
      rowY += rowHeight + RESEARCH_PIXI_GEOMETRY.rowGap;
    }
    this.countLabel.position.set(
      width - this.countLabel.measuredWidth - 8,
      Math.max(
        0,
        (RESEARCH_PIXI_GEOMETRY.categoryTitleHeight -
          this.countLabel.measuredHeight) /
          2,
      ),
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.countLabel.applyTheme(this.theme);
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  getStats() {
    return {
      rows: this.rows.getStats(),
      pool: this.rowPool.getStats(),
    };
  }

  destroy() {
    this.rows.destroy();
    this.rowPool.destroy();
    this.root.destroy({ children: true });
  }
}

export class GuildCharterPanel {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
  } = {}) {
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: 'guild:charter:section' });
    this.titlePlaque = new ResearchStationTitlePlaque({ assetManager });
    this.titlePlaque.root.label = 'guild:charter:titlePlaque';
    this.titlePlaque.bind('Guild Charter', 'regular');
    this.contentLayer = new Container({ label: 'guild:charter:content' });
    this.paper = new GuildPaperFrame({ assetManager });
    this.paragraph = new PixiTextLabel({
      text:
        "Establish your Guild Hall and open its first Adventurers' Lodge.",
      wordWrap: true,
      label: 'guild:charter:paragraph',
    });
    this.button = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.charter.open',
      text: 'Start Guild',
      label: 'guild:charter:button',
    });
    this.costLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 0.5, y: 0 },
      color: resolveThemeColor('coin'),
      label: 'guild:charter:cost',
    });
    this.contentLayer.addChild(
      this.paper.root,
      this.paragraph,
      this.button,
      this.costLabel,
    );
    this.root.addChild(this.titlePlaque.root, this.contentLayer);
  }

  bind(model = {}) {
    this.paragraph.setText(
      model.description ??
        "Establish your Guild Hall and open its first Adventurers' Lodge.",
    );
    this.button
      .setText(capitalizeGuildText(model.actionLabel ?? 'Start Guild'))
      .setAction(model.action)
      .setEnabled(model.enabled !== false);
    this.costLabel.setText(capitalizeGuildText(model.costLabel));
  }

  getPreferredHeight() {
    return RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
      SECTION_CONTENT_GAP + 124;
  }

  setBounds(x, y, width, height = this.getPreferredHeight()) {
    this.root.position.set(x, y);
    this.titlePlaque.setMaxWidth(width);
    const contentX = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = Math.max(0, width - contentX);
    const contentHeight = Math.max(
      0,
      height - RESEARCH_PIXI_GEOMETRY.categoryTitleHeight -
        SECTION_CONTENT_GAP,
    );
    this.contentLayer.position.set(
      contentX,
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight + SECTION_CONTENT_GAP,
    );
    this.paper.setBounds(0, 0, contentWidth, contentHeight);
    this.paragraph.position.set(8, 8);
    this.paragraph.setWrapWidth(Math.max(0, contentWidth - 16));
    const buttonWidth = Math.min(220, contentWidth - 16);
    const buttonX = (contentWidth - buttonWidth) / 2;
    this.button.position.set(buttonX, 58);
    this.button.setSize(buttonWidth, 40);
    this.costLabel.position.set(contentWidth / 2, 84);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.paragraph.applyTheme(this.theme);
    this.paragraph.setColor(PAPER_TEXT);
    this.button.applyTheme(this.theme);
    this.costLabel.applyTheme(this.theme);
    this.costLabel.setColor(resolveThemeColor('coin'));
  }

  destroy() {
    this.button.destroy();
    this.root.destroy({ children: true });
  }
}

export class GuildSecretarySection {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    showTitle = true,
  } = {}) {
    this.assetManager = assetManager;
    this.showTitle = showTitle !== false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: 'guild:secretary:section' });
    this.titlePlaque = new ResearchStationTitlePlaque({ assetManager });
    this.titlePlaque.root.label = 'guild:secretary:titlePlaque';
    this.titlePlaque.bind('Secretary', 'regular');
    this.contentLayer = new Container({ label: 'guild:secretary:content' });
    this.paper = new GuildPaperFrame({ assetManager });
    this.iconFrame = new PixiFrame({
      assetManager,
      width: 56,
      height: 56,
      label: 'guild:secretary:iconFrame',
    });
    this.iconFrame.visible = false;
    this.iconFrame.renderable = false;
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = 'guild:secretary:icon';
    const texture = resolveTexture(
      assetManager,
      'source:assets/characters/guild_secretary.png',
    );
    if (texture) {
      this.icon.texture = texture;
      this.icon.visible = true;
    } else {
      this.icon.visible = false;
    }
    this.initial = new PixiTextLabel({
      text: 'S',
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: 'muted',
      label: 'guild:secretary:initial',
    });
    this.nameLabel = new PixiTextLabel({
      text: 'Secretary',
      fontWeight: 'bold',
      label: 'guild:secretary:name',
    });
    this.rows = [
      createFixedLabelPair('Level', 'guild:secretary:level'),
      createFixedLabelPair('Adventurers', 'guild:secretary:adventurers'),
      createFixedLabelPair('Board', 'guild:secretary:board'),
    ];
    this.button = new PixiCostButton({
      assetManager: assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.secretary.upgrade',
      research: true,
      showLabel: true,
      width: RESEARCH_PIXI_GEOMETRY.costWidth,
      height: RESEARCH_PIXI_GEOMETRY.costHeight,
      contentScale: RESEARCH_ROW_TEXT.costContentScale,
      label: 'guild:secretary:upgrade',
    });
    this.contentLayer.addChild(
      this.paper.root,
      this.iconFrame,
      this.icon,
      this.initial,
      this.nameLabel,
      ...this.rows.flatMap((row) => [row.key, row.value]),
      this.button,
    );
    this.root.addChild(this.titlePlaque.root, this.contentLayer);
    this.titlePlaque.root.visible = this.showTitle;
    this.titlePlaque.root.renderable = this.showTitle;
  }

  bind(model = {}) {
    const secretary = model.secretary ?? model;
    this.rows[0].value.setText(secretary.level ?? 1);
    this.rows[1].value.setText(
      previewValue(secretary.hiredCap ?? 1, secretary.next?.hiredCap),
    );
    this.rows[2].value.setText(
      previewValue(secretary.boardSlots ?? 3, secretary.next?.boardSlots),
    );
    const next = secretary.next;
    this.button.setModel({
      actionLabel: 'Upgrade',
      amountLabel: next ? `${next.costCoin ?? '?'} Coin` : 'Max',
      resource: next ? 'coin' : 'none',
      state:
        next && secretary.canUpgrade !== true
          ? 'unaffordable'
          : 'available',
      enabled: Boolean(next) && secretary.canUpgrade === true,
      action: model.action ?? secretary.action,
      tone: next ? 'green' : 'gray',
      showLabel: true,
    });
  }

  getPreferredHeight() {
    return (
      (this.showTitle
        ? RESEARCH_PIXI_GEOMETRY.categoryTitleHeight + SECTION_CONTENT_GAP
        : 0) + RESEARCH_PIXI_GEOMETRY.rowHeight
    );
  }

  setBounds(x, y, width, height = this.getPreferredHeight()) {
    this.root.position.set(x, y);
    this.titlePlaque.setMaxWidth(width);
    const contentX = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = Math.max(0, width - contentX);
    const titleOffset = this.showTitle
      ? RESEARCH_PIXI_GEOMETRY.categoryTitleHeight + SECTION_CONTENT_GAP
      : 0;
    const contentHeight = Math.max(0, height - titleOffset);
    this.contentLayer.position.set(
      contentX,
      titleOffset,
    );
    this.paper.setBounds(0, 0, contentWidth, contentHeight);
    this.iconFrame.position.set(8, 12);
    this.iconFrame.setSize(56, 56);
    this.icon.position.set(8, 12);
    this.icon.width = 56;
    this.icon.height = 56;
    this.initial.position.set(36, 40);
    this.initial.visible = !this.icon.visible;
    const detailsX = 72;
    const buttonWidth = RESEARCH_PIXI_GEOMETRY.costWidth;
    const buttonX = contentWidth - buttonWidth - 8;
    const detailsRight = buttonX - 7;
    this.nameLabel.position.set(detailsX, 8);
    this.nameLabel.setWrapWidth(Math.max(0, detailsRight - detailsX));
    const rowYs = [27, 44, 61];
    this.rows.forEach((row, index) => {
      row.key.position.set(detailsX, rowYs[index]);
      row.value.position.set(detailsRight, rowYs[index]);
    });
    this.button.position.set(
      buttonX,
      (contentHeight - RESEARCH_PIXI_GEOMETRY.costHeight) / 2,
    );
    this.button.setSize(
      buttonWidth,
      RESEARCH_PIXI_GEOMETRY.costHeight,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.iconFrame.applyTheme(this.theme);
    this.initial.applyTheme(this.theme);
    this.nameLabel.applyTheme(this.theme);
    this.initial.setColor(PAPER_MUTED);
    this.nameLabel.setColor(PAPER_TEXT);
    for (const row of this.rows) {
      row.key.applyTheme(this.theme);
      row.value.applyTheme(this.theme);
      row.key.setColor(PAPER_MUTED);
      row.value.setColor(PAPER_TEXT);
    }
    this.button.applyTheme(this.theme);
  }

  destroy() {
    this.button.destroy();
    this.root.destroy({ children: true });
  }
}

export class GuildQuestBoardSection {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    counters = null,
  } = {}) {
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: 'guild:board:section' });
    this.titlePlaque = new ResearchStationTitlePlaque({ assetManager });
    this.titlePlaque.root.label = 'guild:board:titlePlaque';
    this.titlePlaque.bind('Board', 'regular');
    this.contentLayer = new Container({ label: 'guild:board:content' });
    this.cardsLayer = new Container();
    this.cardsLayer.label = 'guild:board:cards';
    this.emptyPaper = new GuildPaperFrame({ assetManager });
    this.emptyLabel = new PixiTextLabel({
      text: 'No Requests',
      label: 'guild:board:empty',
    });
    this.countLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: 'guild:board:count',
    });
    this.contentLayer.addChild(
      this.emptyPaper.root,
      this.cardsLayer,
      this.emptyLabel,
    );
    this.root.addChild(
      this.titlePlaque.root,
      this.contentLayer,
      this.countLabel,
    );
    this.cardPool = new WidgetPool({
      name: 'guild board quest-card pool',
      counters,
      create: () =>
        new GuildQuestCard({
          assetManager,
          inputRouter,
          semanticRegistry,
        }),
      reset: (card) => card.reset(),
      dispose: (card) => card.destroy(),
      maxSize: 12,
    });
    this.cards = new PooledCollection({
      name: 'guild board quest cards',
      pool: this.cardPool,
      counters,
      keyOf: (request, index) => request.id ?? index,
      bind: (card, request, key, index) =>
        card.bind(key, request, {
          slot: index,
          open: request.openAction,
          remove: request.removeAction,
        }),
      afterReconcile: (widgets) => orderChildren(this.cardsLayer, widgets),
    });
  }

  bind(model = {}) {
    this.cards.reconcile(safeArray(model.requests));
    this.countLabel.setText(capitalizeGuildText(model.countLabel));
    this.countLabel.visible = Boolean(model.countLabel);
    this.countLabel.renderable = this.countLabel.visible;
    const empty = this.cards.getWidgets().length === 0;
    this.emptyPaper.root.visible = empty;
    this.emptyPaper.root.renderable = empty;
    this.emptyLabel.visible = empty;
    this.emptyLabel.renderable = empty;
    for (const card of this.cards.getWidgets()) {
      card.applyTheme(this.theme);
    }
  }

  getPreferredHeight() {
    const count = this.cards.getWidgets().length;
    const contentHeight =
      count === 0
        ? ROW_HEIGHT
        : count * CARD_HEIGHT + (count - 1) * CARD_GAP;
    return (
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
      SECTION_CONTENT_GAP +
      contentHeight
    );
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.titlePlaque.setMaxWidth(width);
    const contentX = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = Math.max(0, width - contentX);
    this.contentLayer.position.set(
      contentX,
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight + SECTION_CONTENT_GAP,
    );
    const cards = this.cards.getWidgets();
    cards.forEach((card, index) => {
      card.setBounds(
        0,
        index * (CARD_HEIGHT + CARD_GAP),
        contentWidth,
        CARD_HEIGHT,
      );
    });
    this.emptyPaper.setBounds(0, 0, contentWidth, ROW_HEIGHT);
    this.emptyLabel.position.set(
      8,
      Math.max(1, (ROW_HEIGHT - this.emptyLabel.measuredHeight) / 2),
    );
    this.countLabel.position.set(
      width - this.countLabel.measuredWidth - 8,
      Math.max(
        0,
        (RESEARCH_PIXI_GEOMETRY.categoryTitleHeight -
          this.countLabel.measuredHeight) /
          2,
      ),
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.countLabel.applyTheme(this.theme);
    this.emptyLabel.applyTheme(this.theme);
    this.emptyLabel.setColor(PAPER_TEXT);
    for (const card of this.cards.getWidgets()) {
      card.applyTheme(this.theme);
    }
  }

  getStats() {
    return {
      cards: this.cards.getStats(),
      pool: this.cardPool.getStats(),
    };
  }

  destroy() {
    this.cards.destroy();
    this.cardPool.destroy();
    this.root.destroy({ children: true });
  }
}

export class GuildPeopleSection {
  constructor({
    title,
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    counters = null,
    semanticPrefix,
    label,
    showTitle = true,
  } = {}) {
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.showTitle = showTitle !== false;
    this.root = new Container({ label: `${label}:section` });
    this.titlePlaque = new ResearchStationTitlePlaque({ assetManager });
    this.titlePlaque.root.label = `${label}:titlePlaque`;
    this.titlePlaque.bind(title, 'regular');
    this.contentLayer = new Container({ label: `${label}:content` });
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${label}:rows`;
    this.emptyPaper = new GuildPaperFrame({ assetManager });
    this.emptyLabel = new PixiTextLabel({
      label: `${label}:empty`,
    });
    this.countLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:count`,
    });
    this.contentLayer.addChild(
      this.emptyPaper.root,
      this.rowsLayer,
      this.emptyLabel,
    );
    this.root.addChild(
      this.titlePlaque.root,
      this.contentLayer,
      this.countLabel,
    );
    this.titlePlaque.root.visible = this.showTitle;
    this.titlePlaque.root.renderable = this.showTitle;
    this.personPool = new WidgetPool({
      name: `${label} person-row pool`,
      counters,
      create: () =>
        new GuildPersonRow({
          assetManager,
          inputRouter,
          semanticRegistry,
          semanticPrefix,
          label: `${label}:person`,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 24,
    });
    this.people = new PooledCollection({
      name: `${label} people`,
      pool: this.personPool,
      counters,
      keyOf: (person, index) => person.id ?? index,
      bind: (row, person, key) => row.bind(key, person),
      afterReconcile: (widgets) => orderChildren(this.rowsLayer, widgets),
    });
    this.emptyText = `No ${capitalizeGuildText(title)}`;
  }

  bind(model = {}) {
    this.people.reconcile(safeArray(model.people));
    this.countLabel.setText(capitalizeGuildText(model.countLabel));
    this.countLabel.visible =
      this.showTitle && Boolean(model.countLabel);
    this.countLabel.renderable = this.countLabel.visible;
    this.emptyLabel.setText(
      capitalizeGuildText(model.emptyLabel ?? this.emptyText),
    );
    const empty = this.people.getWidgets().length === 0;
    this.emptyPaper.root.visible = empty;
    this.emptyPaper.root.renderable = empty;
    this.emptyLabel.visible = empty;
    this.emptyLabel.renderable = empty;
    for (const row of this.people.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  getPreferredHeight() {
    const count = this.people.getWidgets().length;
    const contentHeight =
      count > 0
        ? count * PERSON_HEIGHT +
          (count - 1) * RESEARCH_PIXI_GEOMETRY.rowGap
        : ROW_HEIGHT;
    return (
      (this.showTitle
        ? RESEARCH_PIXI_GEOMETRY.categoryTitleHeight + SECTION_CONTENT_GAP
        : 0) +
      contentHeight
    );
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.titlePlaque.setMaxWidth(width);
    const contentX = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = Math.max(0, width - contentX);
    const titleOffset = this.showTitle
      ? RESEARCH_PIXI_GEOMETRY.categoryTitleHeight + SECTION_CONTENT_GAP
      : 0;
    this.contentLayer.position.set(contentX, titleOffset);
    this.people.getWidgets().forEach((row, index) => {
      row.setBounds(
        0,
        index * (PERSON_HEIGHT + RESEARCH_PIXI_GEOMETRY.rowGap),
        contentWidth,
        PERSON_HEIGHT,
      );
    });
    this.emptyPaper.setBounds(0, 0, contentWidth, ROW_HEIGHT);
    this.emptyLabel.position.set(
      8,
      Math.max(1, (ROW_HEIGHT - this.emptyLabel.measuredHeight) / 2),
    );
    this.countLabel.position.set(
      width - this.countLabel.measuredWidth - 8,
      Math.max(
        0,
        (RESEARCH_PIXI_GEOMETRY.categoryTitleHeight -
          this.countLabel.measuredHeight) /
          2,
      ),
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.countLabel.applyTheme(this.theme);
    this.emptyLabel.applyTheme(this.theme);
    this.emptyLabel.setColor(PAPER_TEXT);
    for (const row of this.people.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  getStats() {
    return {
      people: this.people.getStats(),
      pool: this.personPool.getStats(),
    };
  }

  destroy() {
    this.people.destroy();
    this.personPool.destroy();
    this.root.destroy({ children: true });
  }
}

export class GuildSectionRow {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    semanticPrefix,
    label,
  }) {
    this.assetManager = assetManager;
    this.root = new Container();
    this.root.label = label;
    this.paper = new GuildPaperFrame({ assetManager });
    this.background = new Graphics();
    this.keyLabel = new PixiTextLabel({
      label: `${label}:key`,
    });
    this.valueLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.paragraph = new PixiTextLabel({
      wordWrap: true,
      label: `${label}:paragraph`,
    });
    this.identityTag = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${label}:identityTag`,
    });
    this.identityName = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${label}:identityName`,
    });
    const buttonSkin = getPixiButtonSkin({
      color: 'brown-light',
      height: ROW_HEIGHT,
      sizeTier: 15,
      width: 100,
    });
    this.buttonFrame = new PixiNineSliceFrame({
      texture:
        assetManager?.getTexture?.(buttonSkin.assetId) ?? Texture.EMPTY,
      sourceInsets: buttonSkin.sourceInsets,
      borderInsets: buttonSkin.borderInsets,
      width: 100,
      height: ROW_HEIGHT,
      label: `${label}:buttonFrame`,
    });
    this.buttonLabel = new PixiTextLabel({
      anchor: { x: 0.5, y: 0.5 },
      label: `${label}:buttonLabel`,
    });
    this.buttonValue = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 0.5, y: 0.5 },
      color: resolveThemeColor('coin'),
      label: `${label}:buttonValue`,
    });
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label = `${label}:notification`;
    this.notification = this.notificationBadge.root;
    this.root.addChild(
      this.paper.root,
      this.background,
      this.keyLabel,
      this.valueLabel,
      this.paragraph,
      this.identityTag,
      this.identityName,
      this.buttonFrame,
      this.buttonLabel,
      this.buttonValue,
      this.notification,
    );
    this.semanticPrefix = semanticPrefix;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.model = {};
    this.action = null;
    this.enabled = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.enabled &&
          Boolean(this.action) &&
          this.root.visible &&
          this.root.renderable,
        onPressChange: (pressed) => {
          this.pressed = Boolean(pressed);
          this.redraw();
        },
        onActivate: (payload) => this.action?.(payload),
        haptic: 'light',
      }) ?? null;
  }

  bind(key, model = {}) {
    this.unregisterSemantic();
    this.key = key;
    this.model = model;
    this.action = model.action;
    this.enabled = model.enabled !== false && model.disabled !== true;
    const buttonSkin = getPixiButtonSkin({
      color: this.enabled ? 'brown-light' : 'gray',
      sizeTier: 15,
    });
    this.buttonFrame.setTexture(
      this.assetManager?.getTexture?.(buttonSkin.assetId) ?? Texture.EMPTY,
      buttonSkin.sourceInsets,
    );
    this.root.visible = true;
    this.root.renderable = true;
    const kind = model.kind ?? (model.action ? 'button' : 'row');
    const isButton = kind === 'button';
    const isParagraph = kind === 'paragraph';
    const isIdentity = kind === 'identity';
    const isEmpty = kind === 'empty';
    this.paper.root.visible = !isButton;
    this.paper.root.renderable = !isButton;
    this.keyLabel.visible = !isButton && !isParagraph && !isIdentity;
    this.valueLabel.visible = !isButton && !isParagraph && !isEmpty;
    this.paragraph.visible = isParagraph || isIdentity || isEmpty;
    this.identityTag.visible = isIdentity && Boolean(model.tag);
    this.identityName.visible = isIdentity;
    this.buttonFrame.visible = isButton;
    this.buttonLabel.visible = isButton;
    this.buttonValue.visible = isButton && Boolean(model.value);
    if (this.paragraph.visible) {
      this.paragraph.setText(
        isIdentity
          ? ''
          : capitalizeGuildText(model.text ?? model.value),
      );
      this.paragraph.setFontWeight(isIdentity ? 'bold' : 'normal');
      if (isIdentity) {
        this.identityTag.setText(
          model.tag ? `[${model.tag}]` : '',
        );
        this.identityName.setText(
          capitalizeGuildText(model.name ?? model.text),
        );
      }
    } else {
      this.keyLabel.setText(capitalizeGuildText(model.label));
      this.valueLabel.setText(capitalizeGuildText(model.value));
    }
    if (isButton) {
      this.buttonLabel.setText(
        capitalizeGuildText(model.label ?? model.text),
      );
      this.buttonValue.setText(capitalizeGuildText(model.value));
    }
    this.semanticId =
      model.semanticId ??
      (model.action ? `${this.semanticPrefix}.${String(key)}` : null);
    if (this.semanticRegistry && this.semanticId) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId: model.tutorialId ?? null,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) =>
          this.enabled ? this.action?.(payload) : false,
      });
    }
    this.applyTheme(this.theme);
  }

  getPreferredHeight(width) {
    if (this.model.kind === 'paragraph') {
      this.paragraph.setWrapWidth(Math.max(0, width - 16));
      return Math.max(
        ROW_HEIGHT,
        this.paragraph.measuredHeight + 12,
      );
    }
    if (this.model.kind === 'button' && this.model.tall) {
      return ROW_HEIGHT * 2;
    }
    return ROW_HEIGHT;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.paper.setBounds(0, 0, width, height);
    const inset = 8;
    const textY = Math.max(1, (height - 16) / 2);
    this.keyLabel.position.set(inset, textY);
    this.valueLabel.position.set(width - inset, textY);
    this.keyLabel.setWrapWidth(
      Math.max(
        0,
        width - inset * 2 -
          this.valueLabel.measuredWidth -
          PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
    this.paragraph.position.set(
      inset,
      Math.max(4, (height - this.paragraph.measuredHeight) / 2),
    );
    this.paragraph.setWrapWidth(Math.max(0, width - inset * 2));
    this.identityTag.position.set(inset, textY);
    this.identityName.position.set(
      this.identityTag.visible
        ? inset + this.identityTag.measuredWidth + 5
        : inset,
      textY,
    );
    this.identityName.setWrapWidth(
      Math.max(
        0,
        width - inset -
          (this.identityTag.visible
            ? inset + this.identityTag.measuredWidth + 5
            : inset),
      ),
    );
    this.buttonFrame.setSize(
      width,
      height,
      getPixiButtonSkin({
        color: 'brown-light',
        height,
        sizeTier: 15,
        width,
      }).borderInsets,
    );
    this.buttonLabel.position.set(
      width / 2,
      this.buttonValue.visible ? height / 2 - 6 : height / 2,
    );
    this.buttonValue.position.set(width / 2, height / 2 + 8);
    this.notificationBadge.placeAtTopRight({
      x: 0,
      y: 0,
      width,
      height,
    });
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.keyLabel.applyTheme(this.theme);
    this.valueLabel.applyTheme(this.theme);
    this.paragraph.applyTheme(this.theme);
    this.identityTag.applyTheme(this.theme);
    this.identityName.applyTheme(this.theme);
    this.buttonLabel.applyTheme(this.theme);
    this.buttonValue.applyTheme(this.theme);
    this.keyLabel.setColor(PAPER_TEXT);
    this.valueLabel.setColor(PAPER_TEXT);
    this.paragraph.setColor(PAPER_TEXT);
    this.buttonLabel.setColor(this.enabled ? 'text' : 'disabled');
    this.buttonValue.setColor(
      resolveThemeColor(
        this.enabled
          ? this.model.valueResourceKey ?? 'coin'
          : 'disabled',
      ),
    );
    this.identityTag.setColor(
      this.model.color && this.model.color !== 'ink'
        ? ALLIANCE_TAG_COLORS[this.model.color] ?? PAPER_TEXT
        : PAPER_TEXT,
    );
    this.identityName.setColor(PAPER_TEXT);
    this.redraw();
  }

  redraw() {
    this.background.clear();
    if (this.pressed && this.enabled) {
      this.background
        .rect(0, 0, this.width ?? 0, this.height ?? 0)
        .fill({ color: this.theme.stroke, alpha: 0.2 });
    }
    this.notificationBadge
      .setTone(this.model.notificationTone)
      .setActive(Boolean(this.model.notification));
  }

  reset() {
    this.unregisterSemantic();
    this.key = null;
    this.model = {};
    this.action = null;
    this.enabled = false;
    this.pressed = false;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
    }
    this.semanticDefinition = null;
    this.semanticId = null;
  }

  destroy() {
    this.unregisterSemantic();
    this.registration?.();
    this.registration = null;
    this.root.destroy({ children: true });
  }
}

export class GuildQuestCard {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
  }) {
    this.root = new Container();
    this.root.label = 'guild:board:questCard';
    this.paper = new GuildPaperFrame({ assetManager });
    this.main = new Container();
    this.main.label = 'guild:board:questMain';
    this.title = new PixiTextLabel({
      fontWeight: 'bold',
      color: PAPER_TEXT,
      wordWrap: true,
      label: 'guild:board:questTitle',
    });
    this.description = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: PAPER_TEXT,
      wordWrap: true,
      label: 'guild:board:questDescription',
    });
    this.meta = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: PAPER_MUTED,
      wordWrap: true,
      label: 'guild:board:questMeta',
    });
    this.reward = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: '#7a641d',
      wordWrap: true,
      anchor: { x: 1, y: 0 },
      label: 'guild:board:questReward',
    });
    this.removeRoot = new Container();
    this.removeRoot.label = 'guild:board:questRemove';
    this.removeLabel = new PixiTextLabel({
      text: 'Remove',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 1, y: 0 },
      color: PAPER_MUTED,
      label: 'guild:board:questRemoveLabel',
    });
    this.removeRoot.addChild(this.removeLabel);
    this.main.addChild(
      this.title,
      this.description,
      this.meta,
      this.reward,
    );
    this.root.addChild(
      this.paper.root,
      this.main,
      this.removeRoot,
    );
    this.semanticRegistry = semanticRegistry;
    this.mainSemanticId = null;
    this.removeSemanticId = null;
    this.mainSemanticDefinition = null;
    this.removeSemanticDefinition = null;
    this.openAction = null;
    this.removeAction = null;
    this.mainRegistration =
      inputRouter?.registerPressTarget?.(this.main, {
        enabled: () =>
          Boolean(this.openAction) &&
          this.root.visible &&
          this.root.renderable,
        onActivate: () => this.openAction?.(),
        haptic: 'light',
      }) ?? null;
    this.removeRegistration =
      inputRouter?.registerPressTarget?.(this.removeRoot, {
        enabled: () =>
          Boolean(this.removeAction) &&
          this.root.visible &&
          this.root.renderable,
        onActivate: () => this.removeAction?.(),
        haptic: 'light',
      }) ?? null;
  }

  bind(key, request = {}, { open, remove } = {}) {
    this.unregisterSemantics();
    this.key = key;
    this.request = request;
    this.openAction = open;
    this.removeAction = remove;
    this.root.visible = true;
    this.root.renderable = true;
    this.main.eventMode = open ? 'static' : 'none';
    this.removeRoot.eventMode = remove ? 'static' : 'none';
    this.title.setText(capitalizeGuildText(request.title));
    this.description.setText(capitalizeGuildText(request.lore));
    this.meta.setText(
      capitalizeGuildText(`${request.difficulty ?? ''}${
        request.expiresLabel
          ? `, Expires ${request.expiresLabel}`
          : ''
      }`),
    );
    this.reward.setText(`Reward: ${request.rewardText ?? ''}`);
    this.removeRoot.visible = Boolean(remove);
    this.removeRoot.renderable = this.removeRoot.visible;
    this.mainSemanticId =
      request.semanticId ?? `guild.request.${key}`;
    this.removeSemanticId = `guild.request.${key}.remove`;
    if (this.semanticRegistry) {
      this.mainSemanticDefinition = this.semanticRegistry.register({
        semanticId: this.mainSemanticId,
        tutorialId: request.tutorialId ?? null,
        displayObject: this.main,
        state: () => ({
          enabled: Boolean(this.openAction),
          interactive: Boolean(this.openAction),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: () => this.openAction?.(),
      });
      if (remove) {
        this.removeSemanticDefinition = this.semanticRegistry.register({
          semanticId: this.removeSemanticId,
          displayObject: this.removeRoot,
          state: () => ({
            enabled: true,
            interactive: true,
            visible:
              this.removeRoot.visible && this.removeRoot.renderable,
          }),
          activate: () => this.removeAction?.(),
        });
      }
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.paper.setBounds(0, 0, width, height);
    this.main.position.set(8, 7);
    this.main.hitArea = new Rectangle(
      0,
      0,
      width - 16,
      height,
    );
    const wrapWidth = Math.max(0, width - 16);
    this.title.position.set(0, 0);
    this.title.setWrapWidth(Math.max(0, wrapWidth - 50));
    this.description.position.set(0, 19);
    this.description.setWrapWidth(wrapWidth);
    this.meta.position.set(0, height - 27);
    this.meta.setWrapWidth(Math.max(0, wrapWidth * 0.55));
    this.reward.position.set(width - 16, height - 27);
    this.reward.setWrapWidth(Math.max(0, wrapWidth * 0.42));
    this.removeRoot.position.set(width - 7, 7);
    this.removeRoot.hitArea = new Rectangle(-52, -2, 52, 18);
    this.removeLabel.position.set(0, 0);
  }

  applyTheme(theme) {
    this.title.applyTheme(theme);
    this.description.applyTheme(theme);
    this.meta.applyTheme(theme);
    this.reward.applyTheme(theme);
    this.removeLabel.applyTheme(theme);
    this.title.setColor(PAPER_TEXT);
    this.description.setColor(PAPER_TEXT);
    this.meta.setColor(PAPER_MUTED);
    this.reward.setColor('#7a641d');
    this.removeLabel.setColor(PAPER_MUTED);
  }

  reset() {
    this.unregisterSemantics();
    this.key = null;
    this.request = null;
    this.openAction = null;
    this.removeAction = null;
    this.main.eventMode = 'none';
    this.removeRoot.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
  }

  unregisterSemantics() {
    if (this.mainSemanticDefinition && this.mainSemanticId) {
      this.semanticRegistry?.unregister?.(this.mainSemanticId, {
        displayObject: this.main,
      });
    }
    if (this.removeSemanticDefinition && this.removeSemanticId) {
      this.semanticRegistry?.unregister?.(this.removeSemanticId, {
        displayObject: this.removeRoot,
      });
    }
    this.mainSemanticDefinition = null;
    this.removeSemanticDefinition = null;
    this.mainSemanticId = null;
    this.removeSemanticId = null;
  }

  destroy() {
    this.unregisterSemantics();
    this.mainRegistration?.();
    this.mainRegistration = null;
    this.removeRegistration?.();
    this.removeRegistration = null;
    this.root.destroy({ children: true });
  }
}

export class GuildPersonRow {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    semanticPrefix,
    label,
  }) {
    this.assetManager = assetManager;
    this.root = new Container();
    this.root.label = label;
    this.paper = new GuildPaperFrame({ assetManager });
    this.iconFrame = new PixiFrame({
      assetManager,
      width: 48,
      height: 48,
      label: `${label}:iconFrame`,
    });
    this.iconFrame.visible = false;
    this.iconFrame.renderable = false;
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `${label}:icon`;
    this.initial = new PixiTextLabel({
      anchor: { x: 0.5, y: 0.5 },
      fontWeight: 'bold',
      color: 'muted',
      label: `${label}:initial`,
    });
    this.nameLabel = new PixiTextLabel({
      fontWeight: 'bold',
      wordWrap: true,
      label: `${label}:name`,
    });
    this.levelLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:level`,
    });
    this.statusLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 1, y: 0 },
      color: 'muted',
      label: `${label}:status`,
    });
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label = `${label}:notification`;
    this.notification = this.notificationBadge.root;
    this.root.addChild(
      this.paper.root,
      this.iconFrame,
      this.icon,
      this.initial,
      this.nameLabel,
      this.levelLabel,
      this.statusLabel,
      this.notification,
    );
    this.semanticPrefix = semanticPrefix;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.action = null;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          Boolean(this.action) &&
          this.root.visible &&
          this.root.renderable,
        onActivate: () => this.action?.(),
        haptic: 'light',
      }) ?? null;
  }

  bind(key, person = {}) {
    this.unregisterSemantic();
    this.key = key;
    this.person = person;
    this.action = person.action;
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = this.action ? 'static' : 'none';
    const displayName =
      person.displayName ?? person.name ?? 'Nameless';
    this.nameLabel.setText(capitalizeGuildText(displayName));
    this.levelLabel.setText(
      capitalizeGuildText(
        person.levelLabel ?? `Level ${person.level ?? 1}`,
      ),
    );
    this.statusLabel.setText(
      capitalizeGuildText(
        person.statusLabel ??
          person.personalityLabel ??
          person.status ??
          'Idle',
      ),
    );
    this.initial.setText(
      displayName.trim().slice(0, 1).toUpperCase() || '?',
    );
    const texture = resolveCharacterTexture(
      this.assetManager,
      person,
    );
    this.icon.visible = Boolean(texture);
    if (texture) {
      this.icon.texture = texture;
    }
    this.initial.visible = !this.icon.visible;
    this.semanticId =
      person.semanticId ?? `${this.semanticPrefix}.${key}`;
    if (this.semanticRegistry) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId: person.tutorialId ?? null,
        displayObject: this.root,
        state: () => ({
          enabled: Boolean(this.action),
          interactive: Boolean(this.action),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: () => this.action?.(),
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.paper.setBounds(0, 0, width, height);
    const inset = 6;
    this.iconFrame.position.set(inset, 3);
    this.iconFrame.setSize(48, 48);
    this.icon.position.set(inset, 3);
    this.icon.width = 48;
    this.icon.height = 48;
    this.initial.position.set(inset + 24, 27);
    const nameX = inset + 48 + PIXI_UI_GEOMETRY.rowColumnGap;
    this.nameLabel.position.set(nameX, 7);
    this.nameLabel.setWrapWidth(
      Math.max(
        0,
          width - inset -
          nameX -
          this.statusLabel.measuredWidth -
          PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
    this.levelLabel.position.set(nameX, 29);
    this.statusLabel.position.set(width - inset, 19);
    this.notificationBadge.placeAtTopRight({
      x: 0,
      y: 0,
      width,
      height,
    });
    this.redrawNotification();
  }

  applyTheme(theme) {
    this.iconFrame.applyTheme(theme);
    this.initial.applyTheme(theme);
    this.nameLabel.applyTheme(theme);
    this.levelLabel.applyTheme(theme);
    this.statusLabel.applyTheme(theme);
    this.initial.setColor(PAPER_MUTED);
    this.nameLabel.setColor(PAPER_TEXT);
    this.levelLabel.setColor(PAPER_MUTED);
    this.statusLabel.setColor(PAPER_MUTED);
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redrawNotification();
  }

  redrawNotification() {
    const active =
      this.person?.notificationVisible !== false &&
      (
      this.person?.notification === true ||
      this.person?.status === 'hospital' ||
      this.person?.status === 'dead'
      );
    this.notificationBadge
      .setTone(this.person?.notificationTone)
      .setActive(active);
  }

  reset() {
    this.unregisterSemantic();
    this.key = null;
    this.person = null;
    this.action = null;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
    }
    this.semanticDefinition = null;
    this.semanticId = null;
  }

  destroy() {
    this.unregisterSemantic();
    this.registration?.();
    this.registration = null;
    this.root.destroy({ children: true });
  }
}

class GuildPaperFrame {
  constructor({ assetManager }) {
    this.root = new PixiNineSliceFrame({
      texture:
        assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.researchCard) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
      label: 'guild:row:background',
    });
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.setSize(
      width,
      height,
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
  }
}

function createFixedLabelPair(label, id) {
  return {
    key: new PixiTextLabel({
      text: label,
      label: `${id}:key`,
    }),
    value: new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${id}:value`,
    }),
  };
}

function previewValue(current, next) {
  if (next == null || next === current) {
    return String(current);
  }
  return `${current} > ${next}`;
}

function resolveCharacterTexture(assetManager, person = {}) {
  if (!assetManager?.loaded) {
    return null;
  }
  if (person.textureId) {
    return assetManager.getTexture(person.textureId);
  }
  if (person.iconKey) {
    return assetManager.getTexture(
      `source:assets/characters/${person.iconKey}.png`,
    );
  }
  return null;
}

function resolveTexture(assetManager, textureId) {
  if (!assetManager?.loaded || !textureId) {
    return null;
  }
  return assetManager.getTexture(textureId);
}

function resolveThemeColor(token) {
  return (theme) =>
    theme?.[token] ??
    theme?.resourceColors?.[token] ??
    token ??
    theme?.text;
}

function orderChildren(container, widgets) {
  container.removeChildren();
  for (const widget of widgets) {
    container.addChild(widget.root ?? widget);
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
