import { Container } from 'pixi.js';

import {
  PixiButton,
  PixiModalSurface,
  PixiTextLabel,
} from '../../primitives/index.js';

export class PixiAccountLinkChoiceView extends PixiModalSurface {
  constructor({ assets, inputRouter } = {}) {
    super({
      assetManager: assets,
      title: 'account data',
      contentWidth: 260,
      contentHeight: 136,
      backdropAlpha: 0.68,
      inputRouter,
      modalId: 'gate.accountLinkChoice',
      label: 'accountLinkChoice',
    });
    this.preferredLayer = 'interactionLocks';
    this.message = new PixiTextLabel({
      text: 'select the save to keep',
      label: 'accountLinkChoice:message',
    });
    this.deviceRow = createChoiceRow({
      assets,
      inputRouter,
      label: 'this device',
      objectLabel: 'accountLinkChoice:device',
    });
    this.accountRow = createChoiceRow({
      assets,
      inputRouter,
      label: 'account',
      objectLabel: 'accountLinkChoice:account',
    });
    this.warning = new PixiTextLabel({
      text: 'the progress you do not select will be lost',
      color: 'disabled',
      wordWrap: true,
      wrapWidth: 260,
      label: 'accountLinkChoice:warning',
    });
    this.panel.content.addChild(
      this.message,
      this.deviceRow.root,
      this.accountRow.root,
      this.warning,
    );
    this.relayoutContent();
  }

  onBind(model = {}) {
    this.deviceRow.summary.setText(model.deviceSummary ?? 'new save');
    this.accountRow.summary.setText(model.accountSummary ?? 'new save');
    this.deviceRow.button
      .setEnabled(true)
      .setAction(model.onSelectDevice ?? null);
    this.accountRow.button
      .setEnabled(true)
      .setAction(model.onSelectAccount ?? null);
    this.show();
  }

  onApplyTheme(theme) {
    super.onApplyTheme(theme);
    const contentTheme =
      this.panel.getContentTheme?.() ?? theme;
    for (const item of [
      this.message,
      this.deviceRow.label,
      this.deviceRow.summary,
      this.deviceRow.button,
      this.accountRow.label,
      this.accountRow.summary,
      this.accountRow.button,
      this.warning,
    ]) {
      item.applyTheme(contentTheme);
    }
  }

  relayoutContent() {
    this.message.position.set(0, 0);
    layoutChoiceRow(this.deviceRow, 28);
    layoutChoiceRow(this.accountRow, 64);
    this.warning.position.set(0, 104);
    this.panel.setContentSize(
      260,
      104 + Math.max(32, this.warning.measuredHeight),
    );
    this.panel.pivot.set(this.panel.outerWidth / 2, this.panel.outerHeight / 2);
  }
}

function createChoiceRow({ assets, inputRouter, label, objectLabel }) {
  const root = new Container();
  root.label = objectLabel;
  const labelView = new PixiTextLabel({
    text: label,
    fontWeight: 'bold',
    label: `${objectLabel}:label`,
  });
  const summary = new PixiTextLabel({
    text: '',
    wordWrap: true,
    wrapWidth: 172,
    label: `${objectLabel}:summary`,
  });
  const button = new PixiButton({
    assetManager: assets,
    inputRouter,
    text: 'select',
    width: 72,
    label: `${objectLabel}:select`,
  });
  root.addChild(labelView, summary, button);
  return { root, label: labelView, summary, button };
}

function layoutChoiceRow(row, y) {
  row.root.position.set(0, y);
  row.label.position.set(0, 0);
  row.summary.position.set(0, 16);
  row.button.position.set(188, 1);
}
