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
    const normalizedMatch =
      dialogIds.find(
        (knownDialogId) =>
          normalizeCatalogId(knownDialogId) === normalizedRequested,
      ) ?? null;
    if (normalizedMatch) {
      return normalizedMatch;
    }

    if (normalizedRequested === 'worldchat') {
      return (
        dialogIds.find(
          (knownDialogId) =>
            normalizeCatalogId(knownDialogId) === 'workshopworldchat',
        ) ?? null
      );
    }

    return null;
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
      title: 'Cancel Progress?',
      message: 'Return This Plot To Empty?',
      cancelLabel: 'Keep',
      confirmLabel: 'Empty',
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

  if (dialogId === 'workshop.worldChat') {
    return {
      title: 'World Chat',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: true,
      },
      rows: [
        {
          id: 'preview-mira',
          type: 'player',
          username: 'Mira',
          body: 'The moon garden is glowing tonight.',
          allianceTag: 'MOSS',
          allianceTagColor: 'green',
          character: 'mira',
          ageLabel: 'now',
        },
        {
          id: 'preview-rowan',
          type: 'player',
          username: 'Rowan',
          body: 'Anyone found the crystal mushroom recipe?',
          allianceTag: 'ARC',
          allianceTagColor: 'violet',
          character: 'rowan',
          ageLabel: '3m ago',
        },
        {
          id: 'preview-system',
          type: 'system',
          username: 'System',
          body: 'The weekly world event has begun.',
          ageLabel: '8m ago',
        },
        {
          id: 'preview-juniper',
          type: 'player',
          username: 'Juniper',
          body: 'Meet by the old cauldron after dusk.',
          allianceTag: 'EMBER',
          allianceTagColor: 'amber',
          character: 'juniper',
          ageLabel: '12m ago',
        },
      ],
      onSubmit: async () => ({ ok: false, reason: 'offline' }),
    };
  }

  if (dialogId === 'shop.ledger') {
    return {
      title: 'Market Ledger',
      selectedTabId: 'seed',
      tabs: [
        { id: 'seed', label: 'Seeds', selected: true },
        { id: 'herb', label: 'Herbs', selected: false },
        { id: 'potion', label: 'Potions', selected: false },
      ],
      items: [
        createLedgerPreviewItem('sageSeed', 'Sage Seed', 2_897, 1_294, 8),
        createLedgerPreviewItem('mintSeed', 'Mint Seed', 4_194, 1_293, 8),
        createLedgerPreviewItem('nettleSeed', 'Nettle Seed', 3_992, 1_294, 8),
        createLedgerPreviewItem('lavenderSeed', 'Lavender Seed', 5_400, 1_500, 10),
        createLedgerPreviewItem('briarSeed', 'Briar Seed', 4_515, 1_500, 11),
        createLedgerPreviewItem('glowcapSeed', 'Glowcap Seed', 3_519, 1_500, 14),
        createLedgerPreviewItem('mandrakeSeed', 'Mandrake Seed', 3_004, 1_500, 15),
        createLedgerPreviewItem('sunrootSeed', 'Sunroot Seed', 2_745, 1_420, 16),
        createLedgerPreviewItem('moonflowerSeed', 'Moonflower Seed', 2_412, 1_360, 18),
        createLedgerPreviewItem('frostmossSeed', 'Frostmoss Seed', 2_106, 1_280, 20),
        createLedgerPreviewItem('dreambellSeed', 'Dreambell Seed', 1_944, 1_220, 22),
        createLedgerPreviewItem('starAniseSeed', 'Star Anise Seed', 1_788, 1_180, 24),
      ],
    };
  }

  return {};
}

function createLedgerPreviewItem(itemKey, label, stock, buyers, coin) {
  return {
    id: itemKey,
    label,
    detail: `stock ${stock} · buyers ${buyers}`,
    value: `${coin} coin`,
    valueResourceKey: 'coin',
    itemKey,
    itemKind: 'seed',
    resourceKey: 'seed',
    enabled: true,
    semanticId: `shop.ledger.item.${itemKey}`,
  };
}
