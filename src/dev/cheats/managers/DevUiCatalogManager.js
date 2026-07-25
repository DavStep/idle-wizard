const WIDGET_DEFINITIONS = Object.freeze([
  defineWidget('PixiButton', 'button', 'workshop'),
  defineWidget('PixiCostButton', 'button', 'research'),
  defineWidget('PixiDialogFrame', 'dialog', 'settings'),
  defineWidget('PixiFrame', 'container', 'workshop'),
  defineWidget('PixiInfoButton', 'button', 'summonInfo'),
  defineWidget('PixiPanel', 'container', 'workshop'),
  defineWidget('PixiProgressBar', 'status', 'topPanelQuestProgress'),
  defineWidget('PixiResourceLabel', 'label', 'bag'),
  defineWidget('PixiRow', 'row', 'bag'),
  defineWidget('PixiScrollView', 'container', 'bag'),
  defineWidget('PixiStarLevelLabel', 'label', 'research'),
  defineWidget('PixiTextField', 'input', 'settings'),
  defineWidget('PixiTextLabel', 'label', 'workshop'),
  defineWidget('BottomRoomTabs', 'navigation', 'bottomRoomTabs'),
  defineWidget('FeatureUnlockAnnouncement', 'announcement', 'featureUnlockAnnouncement'),
]);

const BUTTON_DEFINITIONS = Object.freeze([
  defineButton('regular', 'PixiButton', 'workshop'),
  defineButton('control', 'PixiButton', 'settings'),
  defineButton('button', 'PixiButton', 'worldChat'),
  defineButton('yellow', 'PixiButton', 'firstRunIntro'),
  defineButton('brown-dark', 'PixiButton', 'bag'),
  defineButton('brown-light', 'PixiButton', 'bag'),
  defineButton('tab', 'PixiButton', 'bag'),
  defineButton('inline', 'PixiButton', 'market'),
  defineButton('border-label', 'PixiButton', 'workshop'),
  defineButton('cost', 'PixiCostButton', 'research'),
  defineButton('info', 'PixiInfoButton', 'summonInfo'),
]);

export class DevUiCatalogManager {
  listDialogs(runtime) {
    const dialogIds = runtime?.getDialogIds?.() ?? [];

    return {
      ok: true,
      dialogs: dialogIds.map((id) => ({
        id,
        owner: readOwner(id),
        command: `cheats.openDialog("${id}")`,
      })),
    };
  }

  listWidgets() {
    return {
      ok: true,
      widgets: WIDGET_DEFINITIONS.map(cloneDefinition),
    };
  }

  listButtons() {
    return {
      ok: true,
      buttons: BUTTON_DEFINITIONS.map(cloneDefinition),
    };
  }

  resolveWidget(widgetId) {
    const normalizedId = normalizeCatalogId(widgetId);
    return (
      WIDGET_DEFINITIONS.find(
        (definition) => normalizeCatalogId(definition.id) === normalizedId,
      ) ??
      BUTTON_DEFINITIONS.find(
        (definition) =>
          normalizeCatalogId(`button.${definition.id}`) === normalizedId ||
          normalizeCatalogId(definition.id) === normalizedId,
      ) ??
      null
    );
  }

  openRegisteredDialog(runtime, dialogId, options = {}) {
    const knownDialogId = this.resolveDialogId(runtime, dialogId);

    if (!knownDialogId) {
      return {
        ok: false,
        reason: 'unknown_dialog',
        dialogId,
        knownDialogs: runtime?.getDialogIds?.() ?? [],
      };
    }

    if (runtime?.initialized !== true) {
      return { ok: false, reason: 'ui_runtime_not_ready', dialogId: knownDialogId };
    }

    const {
      isolated = true,
      ...viewModel
    } = options ?? {};

    if (isolated) {
      runtime.closeAllDialogs?.();
    }

    runtime.openDialog(knownDialogId, {
      ...createPreviewModel(knownDialogId),
      ...viewModel,
    });

    return {
      ok: true,
      dialogId: knownDialogId,
      isolated: Boolean(isolated),
    };
  }

  resolveDialogId(runtime, dialogId) {
    const requested = String(dialogId ?? '').trim();
    const dialogIds = runtime?.getDialogIds?.() ?? [];

    if (dialogIds.includes(requested)) {
      return requested;
    }

    const normalizedRequested = normalizeCatalogId(requested);
    return (
      dialogIds.find(
        (knownDialogId) =>
          normalizeCatalogId(knownDialogId) === normalizedRequested,
      ) ?? null
    );
  }
}

function defineWidget(id, kind, previewSurface) {
  return Object.freeze({
    id,
    kind,
    previewSurface,
    command: `cheats.openWidget("${id}")`,
  });
}

function defineButton(id, widget, previewSurface) {
  return Object.freeze({
    id,
    widget,
    previewSurface,
    command: `cheats.openWidget("button.${id}")`,
  });
}

function cloneDefinition(definition) {
  return { ...definition };
}

function normalizeCatalogId(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\s_.-]/g, '')
    .toLowerCase();
}

function readOwner(dialogId) {
  return String(dialogId).split('.')[0] || 'global';
}

function createPreviewModel(dialogId) {
  if (dialogId === 'global.confirmation') {
    return {
      title: 'confirmation',
      message: 'preview confirmation dialog',
      cancelLabel: 'cancel',
      confirmLabel: 'confirm',
    };
  }

  if (dialogId === 'global.announcement') {
    return {
      title: 'announcement',
      message: 'preview announcement',
      variant: 'report',
    };
  }

  if (dialogId === 'garden.cancel') {
    return {
      title: 'cancel growing?',
      message: 'the current seed will be returned.',
      cancelLabel: 'keep growing',
      confirmLabel: 'cancel',
    };
  }

  if (dialogId === 'garden.swap') {
    return {
      title: 'swap seed?',
      message: 'replace the growing seed with this one?',
      cancelLabel: 'keep seed',
      confirmLabel: 'swap',
    };
  }

  return {};
}
