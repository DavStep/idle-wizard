import { CanvasTextMetrics, Sprite, Texture } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiButton } from './PixiButton.js';
import { PixiNineSliceFrame } from './PixiNineSliceFrame.js';
import { PixiTextLabel } from './PixiTextLabel.js';

const COST_FONT_FAMILY =
  '"Lilita One", "Arial Black", Arial, sans-serif';
const COST_STROKE = Object.freeze({
  color: '#0a0a0a',
  width: 4,
  join: 'round',
});
const RESEARCH_LOCK_REASON_STROKE = Object.freeze({
  color: '#0a0a0a',
  width: 2,
  join: 'round',
});
const COST_RESOURCE_FRAMES = Object.freeze({
  mana: 'resource:mana',
  crystal: 'resource:crystal',
  emerald: 'resource:emerald',
  ruby: 'resource:ruby',
});

export const PIXI_COST_BUTTON_GEOMETRY = Object.freeze({
  width: 281 / 3,
  height: 169 / 3,
  researchWidth: 80,
  researchHeight: 48,
  iconSize: 23,
  contentGap: 7.081,
  contentOffsetY: -7 / 3,
  compactIconSize: 16.512,
  compactContentGap: 2.24,
  compactContentOffsetY: 0,
  stackedWidth: 92,
  stackedHeight: 52,
  stackedIconSize: 15,
  stackedContentGap: 4,
  stackedShortContentGap: 2,
  stackedShortContentOffsetX: -3,
  stackedActionFontSize: 14,
  stackedShortActionFontSize: 11,
  stackedAmountFontSize: 13,
  stackedActionY: 0.34,
  stackedCostY: 0.68,
  stackedShortCostY: 0.64,
  fontSize: 16,
  researchFontSize: 17,
  lockReasonFontSize: 10,
  lockReasonLineHeight: 10,
  researchLockReasonInset: 12,
  researchLockReasonMaxLines: 2,
});

/**
 * Root Run cost control composed on the same retained input/press primitive as
 * regular buttons. Economy rules stay outside this view.
 */
export class PixiCostButton extends PixiButton {
  constructor({
    assetManager,
    inputRouter = null,
    semanticRegistry = null,
    semanticId = null,
    tutorialId = null,
    width = PIXI_COST_BUTTON_GEOMETRY.width,
    height = PIXI_COST_BUTTON_GEOMETRY.height,
    research = false,
    compact = false,
    stacked = false,
    tone = 'green',
    contentScale = 1,
    action = null,
    label = 'costButton',
  } = {}) {
    super({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId,
      tutorialId,
      width,
      height,
      action,
      variant: 'inline',
      label,
    });
    this.research = Boolean(research);
    this.compact = Boolean(compact);
    this.stacked = Boolean(stacked);
    this.tone = ['blue', 'purple', 'yellow'].includes(tone) ? tone : 'green';
    this.contentScale = Math.max(0.1, Number(contentScale) || 1);
    this.costState = 'available';
    this.resource = 'coin';
    this.amount = '';
    this.actionLabel = '';
    this.lockReason = '';
    this.modelEnabled = true;

    this.background = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets,
      borderInsets: this.compact
        ? PIXI_ROOT_RUN_GEOMETRY.compactButton.borderInsets
        : PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
      width,
      height,
      label: `${label}:background`,
    });
    this.resourceIcon = new Sprite({
      texture: Texture.EMPTY,
      label: `${label}:resourceIcon`,
      roundPixels: true,
    });
    this.resourceIcon.anchor.set(0.5);
    this.amountLabel = new PixiTextLabel({
      fontFamily: COST_FONT_FAMILY,
      fontSize: this.research
        ? PIXI_COST_BUTTON_GEOMETRY.researchFontSize
        : PIXI_COST_BUTTON_GEOMETRY.fontSize,
      color: '#ffffff',
      stroke: COST_STROKE,
      anchor: { x: 0.5, y: 0.5 },
      label: `${label}:amount`,
    });
    this.actionTextLabel = new PixiTextLabel({
      fontFamily: COST_FONT_FAMILY,
      fontSize: PIXI_COST_BUTTON_GEOMETRY.stackedActionFontSize,
      color: '#ffffff',
      stroke: COST_STROKE,
      anchor: { x: 0.5, y: 0.5 },
      label: `${label}:action`,
    });
    this.lockedLabel = new PixiTextLabel({
      fontFamily: COST_FONT_FAMILY,
      fontSize: this.research
        ? PIXI_COST_BUTTON_GEOMETRY.researchFontSize
        : PIXI_COST_BUTTON_GEOMETRY.fontSize,
      color: '#ffffff',
      stroke: COST_STROKE,
      anchor: { x: 0.5, y: 0.5 },
      label: `${label}:locked`,
    });
    this.lockReasonLabel = new PixiTextLabel({
      fontFamily: COST_FONT_FAMILY,
      fontSize: PIXI_COST_BUTTON_GEOMETRY.lockReasonFontSize,
      lineHeight: PIXI_COST_BUTTON_GEOMETRY.lockReasonLineHeight,
      align: 'center',
      color: '#ffffff',
      stroke: this.research
        ? RESEARCH_LOCK_REASON_STROKE
        : COST_STROKE,
      wordWrap: true,
      wrapWidth: this.resolveLockReasonWrapWidth(width),
      anchor: { x: 0.5, y: 0.5 },
      label: `${label}:lockReason`,
    });
    this.visual.addChildAt(this.background, 0);
    this.visual.addChild(
      this.resourceIcon,
      this.actionTextLabel,
      this.amountLabel,
      this.lockedLabel,
      this.lockReasonLabel,
    );
    this.textLabel.visible = false;
    this.textLabel.renderable = false;
    this.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
    this.syncCostAppearance();
  }

  bind(_key, data = {}, actions = null) {
    this.setModel({
      ...data,
      action:
        typeof actions === 'function'
          ? actions
          : actions?.activate ?? data.action,
    });
  }

  setModel({
    amount,
    amountLabel,
    actionLabel = '',
    label,
    resource,
    state = 'available',
    lockReason = '',
    enabled = true,
    action,
  } = {}) {
    const parsed = parseCostLabel(amountLabel ?? label ?? amount, resource);
    const nextState = normalizeCostState(state);
    if (nextState !== 'locked' && !parsed.amount) {
      throw new Error('PixiCostButton requires a non-empty amount label.');
    }
    if (this.stacked && nextState !== 'locked' && !String(actionLabel).trim()) {
      throw new Error('Stacked PixiCostButton requires a non-empty action label.');
    }

    this.amount = parsed.amount;
    this.actionLabel = String(actionLabel ?? '');
    this.resource = parsed.resource;
    this.costState = nextState;
    this.lockReason = String(lockReason ?? '');
    this.modelEnabled = enabled !== false;
    this.setAction(action);
    super.setEnabled(this.modelEnabled && this.costState === 'available');
    this.syncCostAppearance();
    return this;
  }

  setSize(width, height = this.buttonHeight) {
    super.setSize(width, height);
    this.layoutCostContent();
    return this;
  }

  setBounds(x, y, width, height = this.buttonHeight) {
    this.position.set(x, y);
    return this.setSize(width, height);
  }

  setEnabled(enabled) {
    this.modelEnabled = Boolean(enabled);
    super.setEnabled(this.modelEnabled && this.costState === 'available');
    this.syncCostAppearance();
    return this;
  }

  applyTheme(theme) {
    super.applyTheme(theme ?? DEFAULT_PIXI_THEME_SNAPSHOT);
    if (!this.amountLabel) {
      return;
    }
    this.amountLabel.applyTheme(this.theme);
    this.lockedLabel.applyTheme(this.theme);
    this.lockReasonLabel.applyTheme(this.theme);
    this.applyFixedTextStyle();
    this.syncCostAppearance();
  }

  reset() {
    this.amount = '';
    this.actionLabel = '';
    this.lockReason = '';
    this.costState = 'available';
    this.resource = 'coin';
    this.modelEnabled = false;
    super.reset();
    this.syncCostAppearance();
  }

  syncCostAppearance() {
    if (!this.background) {
      return;
    }

    const locked = this.costState === 'locked';
    const unaffordable = this.costState === 'unaffordable';
    const compactDisabled = this.compact && !this.modelEnabled;
    const shortToneDisabled = isShortStackedTone(this.tone) && !this.modelEnabled;
    const skinDisabled = locked || compactDisabled || shortToneDisabled;
    const backgroundAssetId = this.resolveBackgroundAsset({ skinDisabled });
    const backgroundTexture = this.resolveTexture(backgroundAssetId);
    this.background.setSkin({
      assetId: backgroundAssetId,
      borderInsets: this.compact
        ? PIXI_ROOT_RUN_GEOMETRY.compactButton.borderInsets
        : PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
      height: this.buttonHeight,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets,
      texture: backgroundTexture,
      width: this.buttonWidth,
    });
    this.background.visible = true;
    this.background.renderable = true;
    this.resourceIcon.texture = this.resolveResourceTexture(this.resource);
    this.amountLabel
      .setText(this.amount)
      .setColor(unaffordable ? '#c1121f' : '#ffffff');
    this.actionTextLabel.setText(this.actionLabel);
    this.lockedLabel.setText('Locked');
    this.resourceIcon.visible = !locked && this.resource !== 'none';
    this.resourceIcon.renderable = this.resourceIcon.visible;
    this.amountLabel.visible = !locked;
    this.amountLabel.renderable = !locked;
    this.actionTextLabel.visible = this.stacked && !locked;
    this.actionTextLabel.renderable = this.actionTextLabel.visible;
    this.lockedLabel.visible = locked;
    this.lockedLabel.renderable = locked;
    this.lockReasonLabel.visible = locked && Boolean(this.lockReason);
    this.lockReasonLabel.renderable = this.lockReasonLabel.visible;
    this.layoutCostContent();
  }

  resolveBackgroundAsset({ skinDisabled }) {
    if (this.compact) {
      return skinDisabled
        ? PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice
        : PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice;
    }
    if (this.stacked) {
      return skinDisabled
        ? PIXI_ROOT_RUN_ASSETS.buttonGrayStacked
        : this.tone === 'purple'
          ? PIXI_ROOT_RUN_ASSETS.buttonPurpleShort
          : this.tone === 'blue'
            ? PIXI_ROOT_RUN_ASSETS.buttonBlueShort
            : PIXI_ROOT_RUN_ASSETS.buttonGreenStacked;
    }
    if (skinDisabled) {
      return PIXI_ROOT_RUN_ASSETS.buttonGray;
    }
    return this.tone === 'yellow'
      ? PIXI_ROOT_RUN_ASSETS.buttonYellowShort
      : PIXI_ROOT_RUN_ASSETS.buttonGreen;
  }

  applyFixedTextStyle() {
    const contentScale = this.contentScale;
    const fontSize = (
      this.stacked
        ? PIXI_COST_BUTTON_GEOMETRY.stackedAmountFontSize
        : this.research
          ? PIXI_COST_BUTTON_GEOMETRY.researchFontSize
          : PIXI_COST_BUTTON_GEOMETRY.fontSize
    ) * contentScale;
    const contentStrokeScale =
      this.stacked && !isShortStackedTone(this.tone)
        ? contentScale * 0.75
        : contentScale;
    for (const label of [this.amountLabel, this.lockedLabel]) {
      label
        .setFontFamily(COST_FONT_FAMILY)
        .setFontSize(fontSize)
        .setStroke(scaleStroke(COST_STROKE, contentStrokeScale))
        .setColor('#ffffff');
    }
    this.actionTextLabel
      .setFontFamily(COST_FONT_FAMILY)
      .setFontSize(
        (this.stacked && isShortStackedTone(this.tone)
          ? PIXI_COST_BUTTON_GEOMETRY.stackedShortActionFontSize
          : PIXI_COST_BUTTON_GEOMETRY.stackedActionFontSize) * contentScale,
      )
      .setStroke(scaleStroke(COST_STROKE, contentStrokeScale))
      .setColor('#ffffff');
    this.lockReasonLabel
      .setFontFamily(COST_FONT_FAMILY)
      .setFontSize(
        PIXI_COST_BUTTON_GEOMETRY.lockReasonFontSize * contentScale,
      )
      .setLineHeight(
        PIXI_COST_BUTTON_GEOMETRY.lockReasonLineHeight * contentScale,
      )
      .setStroke(
        scaleStroke(
          this.research
            ? RESEARCH_LOCK_REASON_STROKE
            : COST_STROKE,
          contentScale,
        ),
      )
      .setColor('#ffffff');
  }

  layoutCostContent() {
    if (!this.background) {
      return;
    }

    this.background.setSize(
      this.buttonWidth,
      this.buttonHeight,
      this.compact
        ? PIXI_ROOT_RUN_GEOMETRY.compactButton.borderInsets
        : PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
    );
    const iconSize = (this.compact
      ? PIXI_COST_BUTTON_GEOMETRY.compactIconSize
      : this.stacked
        ? PIXI_COST_BUTTON_GEOMETRY.stackedIconSize
      : PIXI_COST_BUTTON_GEOMETRY.iconSize) * this.contentScale;
    const contentGap = (this.compact
      ? PIXI_COST_BUTTON_GEOMETRY.compactContentGap
      : this.stacked
        ? isShortStackedTone(this.tone)
          ? PIXI_COST_BUTTON_GEOMETRY.stackedShortContentGap
          : PIXI_COST_BUTTON_GEOMETRY.stackedContentGap
      : PIXI_COST_BUTTON_GEOMETRY.contentGap) * this.contentScale;
    const contentOffsetX =
      this.stacked && isShortStackedTone(this.tone)
        ? PIXI_COST_BUTTON_GEOMETRY.stackedShortContentOffsetX *
          this.contentScale
        : 0;
    const contentOffsetY = (this.compact
      ? PIXI_COST_BUTTON_GEOMETRY.compactContentOffsetY
      : PIXI_COST_BUTTON_GEOMETRY.contentOffsetY) * this.contentScale;
    this.resourceIcon.width = iconSize;
    this.resourceIcon.height = iconSize;
    const centerY = this.stacked
      ? this.buttonHeight *
        (isShortStackedTone(this.tone)
          ? PIXI_COST_BUTTON_GEOMETRY.stackedShortCostY
          : PIXI_COST_BUTTON_GEOMETRY.stackedCostY)
      : this.buttonHeight / 2 + contentOffsetY;
    const iconVisible = this.resourceIcon.visible;
    const contentWidth =
      this.amountLabel.measuredWidth +
      (iconVisible
        ? iconSize + contentGap
        : 0);
    const startX =
      (this.buttonWidth - contentWidth) / 2 + contentOffsetX;
    this.resourceIcon.position.set(
      startX + iconSize / 2,
      centerY,
    );
    this.amountLabel.position.set(
      iconVisible
        ? startX +
            iconSize +
            contentGap +
            this.amountLabel.measuredWidth / 2
        : this.buttonWidth / 2,
      centerY,
    );
    this.actionTextLabel.position.set(
      this.buttonWidth / 2,
      this.buttonHeight * PIXI_COST_BUTTON_GEOMETRY.stackedActionY,
    );
    const hasReason = Boolean(this.lockReason);
    this.lockedLabel.position.set(
      this.buttonWidth / 2,
      hasReason ? this.buttonHeight * 0.31 : centerY,
    );
    this.layoutLockReason();
  }

  layoutLockReason() {
    const label = this.lockReasonLabel;
    label.setWrapWidth(this.resolveLockReasonWrapWidth(this.buttonWidth));

    if (this.research) {
      label.textObject.style.whiteSpace = 'pre-line';
      label.setText(
        clampWrappedLines(
          this.lockReason,
          label.textObject.style,
          PIXI_COST_BUTTON_GEOMETRY.researchLockReasonMaxLines,
        ),
      );
    } else {
      label.setText(this.lockReason);
    }

    label.position.set(this.buttonWidth / 2, this.buttonHeight * 0.67);
  }

  resolveLockReasonWrapWidth(width) {
    const inset = this.research
      ? PIXI_COST_BUTTON_GEOMETRY.researchLockReasonInset
      : 8;
    return Math.max(0, width - inset * this.contentScale);
  }

  resolveTexture(assetId) {
    return this.assetManager?.has?.(assetId)
      ? this.assetManager.getTexture(assetId)
      : Texture.EMPTY;
  }

  resolveResourceTexture(resource) {
    if (resource === 'coin') {
      return this.resolveTexture(PIXI_ROOT_RUN_ASSETS.coin);
    }
    const frame = COST_RESOURCE_FRAMES[resource];
    if (!frame) {
      return Texture.EMPTY;
    }
    try {
      return this.assetManager?.getAtlasTexture?.(frame) ?? Texture.EMPTY;
    } catch {
      return Texture.EMPTY;
    }
  }
}

function scaleStroke(stroke, scale) {
  return {
    ...stroke,
    width: stroke.width * scale,
  };
}

function isShortStackedTone(tone) {
  return tone === 'blue' || tone === 'purple';
}

function parseCostLabel(value, explicitResource) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(.+?)\s+(Coin|Crystal|Ruby|Emerald)s?$/i);
  const plainLabel = /^(?:free|locked)$/i.test(raw);
  const resource = plainLabel
    ? 'none'
    : normalizeResource(explicitResource ?? match?.[2]);
  return Object.freeze({
    amount: match?.[1]?.trim() ?? raw,
    resource,
  });
}

function normalizeResource(value) {
  const normalized = String(value ?? 'coin')
    .trim()
    .toLowerCase()
    .replace(/s$/, '');
  return ['coin', 'mana', 'crystal', 'ruby', 'emerald'].includes(normalized)
    ? normalized
    : 'none';
}

function normalizeCostState(value) {
  const normalized = String(value ?? 'available').toLowerCase();
  if (normalized === 'locked') return 'locked';
  if (
    normalized === 'unaffordable' ||
    normalized === 'insufficient' ||
    normalized === 'disabled'
  ) {
    return 'unaffordable';
  }
  return 'available';
}

function clampWrappedLines(value, style, maxLines) {
  const text = String(value ?? '');
  if (!text) {
    return '';
  }

  return CanvasTextMetrics.measureText(text, style).lines
    .slice(0, Math.max(1, Number(maxLines) || 1))
    .join('\n');
}
