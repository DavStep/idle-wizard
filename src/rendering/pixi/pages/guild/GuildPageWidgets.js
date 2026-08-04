import {
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { PixiButton } from '../../primitives/PixiButton.js';
import { getPixiButtonSkin } from '../../primitives/PixiButtonStyle.js';
import { PixiFrame } from '../../primitives/PixiFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiPanel } from '../../primitives/PixiPanel.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PixiNotificationBadge } from '../../global/transient/PixiNotificationBadges.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

const PAPER_TEXTURE_ID = 'public:ui/guild-quest/paper.9.png';
const PAPER_SOURCE_INSETS = Object.freeze({
  left: 41,
  top: 41,
  right: 42,
  bottom: 42,
});
const PAPER_OUTPUT_INSETS = Object.freeze({
  left: 5,
  top: 5,
  right: 5,
  bottom: 5,
});
const PAPER_SURFACE = '#f6f3ec';
const PAPER_TEXT = '#221d17';
const PAPER_MUTED = '#665e54';
const PAPER_STROKE = '#8c765c';
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
const CARD_HEIGHT = 106;
const CARD_GAP = 8;
const PERSON_HEIGHT = 54;
const ROW_HEIGHT = PIXI_UI_GEOMETRY.rowMinHeight;

export class GuildRowsSection {
  constructor({
    title,
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    counters = null,
    label = 'guild:section',
  } = {}) {
    this.title = title;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel = new PixiPanel({
      assetManager,
      title,
      label: `${label}:panel`,
    });
    this.root = this.panel;
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${label}:rows`;
    this.countLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:count`,
    });
    this.panel.content.addChild(this.rowsLayer);
    this.root.addChild(this.countLabel);
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
              text: model.emptyLabel ?? 'quiet',
            },
          ],
    );
    this.countLabel.setText(model.countLabel ?? '');
    this.countLabel.visible = Boolean(model.countLabel);
    this.countLabel.renderable = this.countLabel.visible;
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  getPreferredHeight(width) {
    const contentWidth = Math.max(
      0,
      width -
        (this.panel.paddingX + this.panel.borderWidth) * 2,
    );
    let rowsHeight = 0;
    for (const row of this.rows.getWidgets()) {
      rowsHeight += row.getPreferredHeight(contentWidth);
    }
    return (
      rowsHeight +
      (this.panel.paddingY + this.panel.borderWidth) * 2
    );
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.panel.setOuterSize(width, height);
    let rowY = 0;
    for (const row of this.rows.getWidgets()) {
      const rowHeight = row.getPreferredHeight(this.panel.contentWidth);
      row.setBounds(0, rowY, this.panel.contentWidth, rowHeight);
      rowY += rowHeight;
    }
    this.countLabel.position.set(
      width - this.countLabel.measuredWidth - 10,
      -PIXI_UI_GEOMETRY.borderLabelLineHeight + 2,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
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
    this.panel = new PixiPanel({
      assetManager,
      title: 'guild charter',
      label: 'guild:charter:panel',
    });
    this.root = this.panel;
    this.paragraph = new PixiTextLabel({
      text:
        'establish your guild to hire adventurers, take requests, and keep a hall of your own.',
      wordWrap: true,
      label: 'guild:charter:paragraph',
    });
    this.button = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.charter.open',
      text: 'start guild',
      label: 'guild:charter:button',
    });
    this.costLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 0.5, y: 0 },
      color: resolveThemeColor('coin'),
      label: 'guild:charter:cost',
    });
    this.panel.content.addChild(
      this.paragraph,
      this.button,
      this.costLabel,
    );
  }

  bind(model = {}) {
    this.paragraph.setText(
      model.description ??
        'establish your guild to hire adventurers, take requests, and keep a hall of your own.',
    );
    this.button
      .setText(model.actionLabel ?? 'start guild')
      .setAction(model.action)
      .setEnabled(model.enabled !== false);
    this.costLabel.setText(model.costLabel ?? '');
  }

  getPreferredHeight() {
    return 124;
  }

  setBounds(x, y, width, height = this.getPreferredHeight()) {
    this.root.position.set(x, y);
    this.panel.setOuterSize(width, height);
    const contentWidth = this.panel.contentWidth;
    this.paragraph.position.set(0, 5);
    this.paragraph.setWrapWidth(contentWidth);
    const buttonWidth = Math.min(220, contentWidth);
    const buttonX = (contentWidth - buttonWidth) / 2;
    this.button.position.set(buttonX, 51);
    this.button.setSize(buttonWidth, 40);
    this.costLabel.position.set(contentWidth / 2, 75);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    this.paragraph.applyTheme(this.theme);
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
  } = {}) {
    this.assetManager = assetManager;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel = new PixiPanel({
      assetManager,
      title: 'secretary',
      label: 'guild:secretary:panel',
    });
    this.root = this.panel;
    this.iconFrame = new PixiFrame({
      assetManager,
      width: 72,
      height: 72,
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
      text: 's',
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: 'muted',
      label: 'guild:secretary:initial',
    });
    this.rows = [
      createFixedLabelPair('level', 'guild:secretary:level'),
      createFixedLabelPair('adventurers', 'guild:secretary:adventurers'),
      createFixedLabelPair('board', 'guild:secretary:board'),
    ];
    this.button = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.secretary.upgrade',
      text: 'upgrade secretary',
      sizeTier: 30,
      label: 'guild:secretary:upgrade',
    });
    this.costLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 1, y: 0.5 },
      color: resolveThemeColor('coin'),
      label: 'guild:secretary:upgradeCost',
    });
    this.panel.content.addChild(
      this.iconFrame,
      this.icon,
      this.initial,
      ...this.rows.flatMap((row) => [row.key, row.value]),
      this.button,
      this.costLabel,
    );
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
    this.button
      .setText(next ? 'upgrade secretary' : 'secretary max')
      .setAction(model.action ?? secretary.action)
      .setEnabled(Boolean(next) && secretary.canUpgrade === true);
    this.costLabel.setText(next ? `${next.costCoin ?? '?'} coin` : '');
    this.costLabel.visible = Boolean(next);
    this.costLabel.renderable = this.costLabel.visible;
  }

  getPreferredHeight() {
    return 118;
  }

  setBounds(x, y, width, height = this.getPreferredHeight()) {
    this.root.position.set(x, y);
    this.panel.setOuterSize(width, height);
    const contentWidth = this.panel.contentWidth;
    this.iconFrame.position.set(0, 0);
    this.iconFrame.setSize(72, 72);
    this.icon.position.set(0, 0);
    this.icon.width = 72;
    this.icon.height = 72;
    this.initial.position.set(36, 36);
    this.initial.visible = !this.icon.visible;
    let rowY = 7;
    for (const row of this.rows) {
      row.key.position.set(80, rowY);
      row.value.position.set(contentWidth, rowY);
      rowY += ROW_HEIGHT;
    }
    this.button.position.set(0, 78);
    this.button.setSize(contentWidth, ROW_HEIGHT);
    this.costLabel.position.set(contentWidth - 6, 88);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    this.iconFrame.applyTheme(this.theme);
    this.initial.applyTheme(this.theme);
    for (const row of this.rows) {
      row.key.applyTheme(this.theme);
      row.value.applyTheme(this.theme);
    }
    this.button.applyTheme(this.theme);
    this.costLabel.applyTheme(this.theme);
    this.costLabel.setColor(resolveThemeColor('coin'));
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
    this.panel = new PixiPanel({
      assetManager,
      title: 'request board',
      label: 'guild:board:panel',
    });
    this.root = this.panel;
    this.cardsLayer = new Container();
    this.cardsLayer.label = 'guild:board:cards';
    this.emptyLabel = new PixiTextLabel({
      text: 'no requests',
      label: 'guild:board:empty',
    });
    this.countLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: 'guild:board:count',
    });
    this.panel.content.addChild(this.cardsLayer, this.emptyLabel);
    this.root.addChild(this.countLabel);
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
    this.countLabel.setText(model.countLabel ?? '');
    this.countLabel.visible = Boolean(model.countLabel);
    this.countLabel.renderable = this.countLabel.visible;
    const empty = this.cards.getWidgets().length === 0;
    this.emptyLabel.visible = empty;
    this.emptyLabel.renderable = empty;
    for (const card of this.cards.getWidgets()) {
      card.applyTheme(this.theme);
    }
  }

  getPreferredHeight() {
    const count = this.cards.getWidgets().length;
    const columns = Math.max(1, Math.min(2, count));
    const rowCount = Math.max(1, Math.ceil(count / columns));
    const contentHeight =
      count === 0
        ? ROW_HEIGHT
        : rowCount * CARD_HEIGHT + (rowCount - 1) * CARD_GAP;
    return (
      contentHeight +
      (this.panel.paddingY + this.panel.borderWidth) * 2
    );
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.panel.setOuterSize(width, height);
    const cards = this.cards.getWidgets();
    const cardWidth =
      (this.panel.contentWidth - CARD_GAP) / 2;
    cards.forEach((card, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      card.setBounds(
        column * (cardWidth + CARD_GAP),
        row * (CARD_HEIGHT + CARD_GAP),
        cardWidth,
        CARD_HEIGHT,
      );
    });
    this.emptyLabel.position.set(0, 0);
    this.countLabel.position.set(
      width - this.countLabel.measuredWidth - 10,
      -PIXI_UI_GEOMETRY.borderLabelLineHeight + 2,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    this.countLabel.applyTheme(this.theme);
    this.emptyLabel.applyTheme(this.theme);
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
  } = {}) {
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel = new PixiPanel({
      assetManager,
      title,
      label: `${label}:panel`,
    });
    this.root = this.panel;
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${label}:rows`;
    this.emptyLabel = new PixiTextLabel({
      label: `${label}:empty`,
    });
    this.countLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:count`,
    });
    this.panel.content.addChild(this.rowsLayer, this.emptyLabel);
    this.root.addChild(this.countLabel);
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
    this.emptyText = `no ${title}`;
  }

  bind(model = {}) {
    this.people.reconcile(safeArray(model.people));
    this.countLabel.setText(model.countLabel ?? '');
    this.countLabel.visible = Boolean(model.countLabel);
    this.countLabel.renderable = this.countLabel.visible;
    this.emptyLabel.setText(model.emptyLabel ?? this.emptyText);
    const empty = this.people.getWidgets().length === 0;
    this.emptyLabel.visible = empty;
    this.emptyLabel.renderable = empty;
    for (const row of this.people.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  getPreferredHeight() {
    const count = this.people.getWidgets().length;
    const contentHeight =
      count > 0 ? count * PERSON_HEIGHT : ROW_HEIGHT;
    return (
      contentHeight +
      (this.panel.paddingY + this.panel.borderWidth) * 2
    );
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.panel.setOuterSize(width, height);
    this.people.getWidgets().forEach((row, index) => {
      row.setBounds(
        0,
        index * PERSON_HEIGHT,
        this.panel.contentWidth,
        PERSON_HEIGHT,
      );
    });
    this.emptyLabel.position.set(0, 0);
    this.countLabel.position.set(
      width - this.countLabel.measuredWidth - 10,
      -PIXI_UI_GEOMETRY.borderLabelLineHeight + 2,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    this.countLabel.applyTheme(this.theme);
    this.emptyLabel.applyTheme(this.theme);
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

class GuildSectionRow {
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
      sizeTier: 15,
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
        isIdentity ? '' : model.text ?? model.value ?? '',
      );
      this.paragraph.setFontWeight(isIdentity ? 'bold' : 'normal');
      if (isIdentity) {
        this.identityTag.setText(
          model.tag ? `[${model.tag}]` : '',
        );
        this.identityName.setText(model.name ?? model.text ?? '');
      }
    } else {
      this.keyLabel.setText(model.label ?? '');
      this.valueLabel.setText(model.value ?? '');
    }
    if (isButton) {
      this.buttonLabel.setText(model.label ?? model.text ?? '');
      this.buttonValue.setText(model.value ?? '');
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
      this.paragraph.setWrapWidth(width);
      return Math.max(
        ROW_HEIGHT,
        this.paragraph.measuredHeight,
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
    const textY = Math.max(1, (height - 16) / 2);
    this.keyLabel.position.set(0, textY);
    this.valueLabel.position.set(width, textY);
    this.keyLabel.setWrapWidth(
      Math.max(
        0,
        width -
          this.valueLabel.measuredWidth -
          PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
    this.paragraph.position.set(0, 0);
    this.paragraph.setWrapWidth(width);
    this.identityTag.position.set(0, textY);
    this.identityName.position.set(
      this.identityTag.visible
        ? this.identityTag.measuredWidth + 5
        : 0,
      textY,
    );
    this.identityName.setWrapWidth(
      Math.max(
        0,
        width -
          (this.identityTag.visible
            ? this.identityTag.measuredWidth + 5
            : 0),
      ),
    );
    this.buttonFrame.setSize(
      width,
      height,
      getPixiButtonSkin({ color: 'brown-light', sizeTier: 15 }).borderInsets,
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
    this.valueLabel.setColor(
      resolveThemeColor(
        this.enabled
          ? this.model.valueResourceKey ?? 'text'
          : 'disabled',
      ),
    );
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
        ? ALLIANCE_TAG_COLORS[this.model.color] ?? 'text'
        : 'text',
    );
    this.identityName.setColor('text');
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

class GuildQuestCard {
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
      label: 'guild:board:questReward',
    });
    this.removeRoot = new Container();
    this.removeRoot.label = 'guild:board:questRemove';
    this.removeLabel = new PixiTextLabel({
      text: 'remove',
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
    this.title.setText(request.title ?? '');
    this.description.setText(request.lore ?? '');
    this.meta.setText(
      `${request.difficulty ?? ''}${
        request.expiresLabel
          ? `, expires ${request.expiresLabel}`
          : ''
      }`,
    );
    this.reward.setText(`reward: ${request.rewardText ?? ''}`);
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
      height - 28,
    );
    const wrapWidth = Math.max(0, width - 16);
    this.title.position.set(0, 0);
    this.title.setWrapWidth(wrapWidth);
    this.description.position.set(0, 20);
    this.description.setWrapWidth(wrapWidth);
    this.meta.position.set(0, 53);
    this.meta.setWrapWidth(wrapWidth);
    this.reward.position.set(0, 70);
    this.reward.setWrapWidth(wrapWidth);
    this.removeRoot.position.set(width - 7, height - 17);
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

class GuildPersonRow {
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
      person.displayName ?? person.name ?? 'nameless';
    this.nameLabel.setText(displayName);
    this.levelLabel.setText(
      person.levelLabel ?? `level ${person.level ?? 1}`,
    );
    this.statusLabel.setText(
      person.statusLabel ??
        person.personalityLabel ??
        person.status ??
        'idle',
    );
    this.initial.setText(
      displayName.trim().slice(0, 1).toLowerCase() || '?',
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
    this.iconFrame.position.set(0, 3);
    this.iconFrame.setSize(48, 48);
    this.icon.position.set(0, 3);
    this.icon.width = 48;
    this.icon.height = 48;
    this.initial.position.set(24, 27);
    const nameX = 48 + PIXI_UI_GEOMETRY.rowColumnGap;
    this.nameLabel.position.set(nameX, 7);
    this.nameLabel.setWrapWidth(
      Math.max(
        0,
        width -
          nameX -
          this.statusLabel.measuredWidth -
          PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
    this.levelLabel.position.set(nameX, 29);
    this.statusLabel.position.set(width, 19);
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
    this.assetManager = assetManager;
    this.root = new Container();
    this.root.label = 'guild:paperFrame';
    this.fallback = new Graphics();
    const texture = resolveTexture(assetManager, PAPER_TEXTURE_ID);
    this.sprite = new NineSliceSprite({
      texture: texture ?? Texture.EMPTY,
      leftWidth: PAPER_SOURCE_INSETS.left,
      topHeight: PAPER_SOURCE_INSETS.top,
      rightWidth: PAPER_SOURCE_INSETS.right,
      bottomHeight: PAPER_SOURCE_INSETS.bottom,
    });
    this.sprite.visible = Boolean(texture);
    this.root.addChild(this.fallback, this.sprite);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    const scaleX =
      PAPER_OUTPUT_INSETS.left / PAPER_SOURCE_INSETS.left;
    const scaleY =
      PAPER_OUTPUT_INSETS.top / PAPER_SOURCE_INSETS.top;
    this.sprite.scale.set(scaleX, scaleY);
    this.sprite.setSize(width / scaleX, height / scaleY);
    this.fallback
      .clear()
      .rect(0, 0, width, height)
      .fill(PAPER_SURFACE)
      .stroke({
        color: PAPER_STROKE,
        width: 1,
        alignment: 1,
      });
    this.fallback.visible = !this.sprite.visible;
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
