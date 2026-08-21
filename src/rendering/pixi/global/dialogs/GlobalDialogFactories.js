import { Container } from 'pixi.js';

import { PixiAllianceInfoDialog } from './PixiAllianceInfoDialog.js';
import { PixiAllianceRankDialog } from './PixiAllianceRankDialog.js';
import { PixiChatReportDialog } from './PixiChatReportDialog.js';
import { PixiInboxDialog } from './PixiInboxDialog.js';
import { PixiLevelDialog } from './PixiLevelDialog.js';
import {
  PixiAnnouncementSurface,
  PixiConfirmationDialog,
} from './PixiMessageDialogs.js';
import { PixiPlayerInfoDialog } from './PixiPlayerInfoDialog.js';
import { PixiSettingsDialog } from './PixiSettingsDialog.js';
import { WorkshopDialogPixi } from '../../pages/workshop/WorkshopDialogPixi.js';

export const GLOBAL_DIALOG_IDS = Object.freeze({
  SETTINGS: 'global.settings',
  FEEDBACK: 'global.feedback',
  CHAT_REPORT: 'global.chatReport',
  BUG: 'global.feedback',
  FEATURE: 'global.feedback',
  LEVEL: 'global.level',
  INBOX: 'global.inbox',
  MAIL: 'global.inbox',
  PLAYER: 'global.player',
  FRIENDS: 'global.friends',
  DIRECT_MESSAGE: 'global.directMessage',
  ALLIANCE: 'global.alliance',
  ALLIANCE_RANK: 'global.allianceRank',
  ANNOUNCEMENT: 'global.announcement',
  CONFIRMATION: 'global.confirmation',
});

const GLOBAL_DIALOG_DEFINITIONS = Object.freeze([
  Object.freeze([
    GLOBAL_DIALOG_IDS.SETTINGS,
    (context) =>
      new PixiSettingsDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.SETTINGS,
        initialTab: 'configurations',
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.FEEDBACK,
    (context) =>
      new PixiSettingsDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.FEEDBACK,
        initialTab: 'report',
        initialFeedbackKind: 'feedback',
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.CHAT_REPORT,
    (context) =>
      new PixiChatReportDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.CHAT_REPORT,
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.LEVEL,
    (context) =>
      new PixiLevelDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.LEVEL,
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.INBOX,
    (context) =>
      new PixiInboxDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.INBOX,
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.PLAYER,
    (context) =>
      new PixiPlayerInfoDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.PLAYER,
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.FRIENDS,
    (context) => createWorkshopStyleGlobalDialog(context, GLOBAL_DIALOG_IDS.FRIENDS),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.DIRECT_MESSAGE,
    (context) => createWorkshopStyleGlobalDialog(context, GLOBAL_DIALOG_IDS.DIRECT_MESSAGE),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.ALLIANCE,
    (context) =>
      new PixiAllianceInfoDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.ALLIANCE,
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.ALLIANCE_RANK,
    (context) =>
      new PixiAllianceRankDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.ALLIANCE_RANK,
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
    (context) =>
      new PixiAnnouncementSurface({
        context,
        dialogId: GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      }),
  ]),
  Object.freeze([
    GLOBAL_DIALOG_IDS.CONFIRMATION,
    (context) =>
      new PixiConfirmationDialog({
        context,
        dialogId: GLOBAL_DIALOG_IDS.CONFIRMATION,
      }),
  ]),
]);

function createWorkshopStyleGlobalDialog(context, dialogId) {
  const registry =
    typeof context.dialogRegistry === 'function'
      ? context.dialogRegistry()
      : context.dialogRegistry;
  return new WorkshopDialogPixi({
    dialogId,
    parent: context.layers?.dialogs ?? new Container({ label: `${dialogId}:layer` }),
    assetManager: context.assets,
    inputRouter: context.inputRouter,
    textEntryService: context.textEntryService,
    semanticTargets: context.semanticRegistry,
    counters: context.counters,
    onClose: () => registry?.close?.(dialogId),
    theme: typeof context.theme === 'function' ? context.theme() : context.theme,
  });
}

/**
 * Returns stable dialog ids paired with runtime-context factories. A fresh
 * frozen entry list prevents callers from mutating the suite definition.
 */
export function createGlobalDialogFactories() {
  return Object.freeze(
    GLOBAL_DIALOG_DEFINITIONS.map(([dialogId, factory]) =>
      Object.freeze([dialogId, factory]),
    ),
  );
}

/**
 * Registers the complete suite before PixiUiRuntimeFacade.initialize().
 * RenderFacade exposes registerDialog(); DialogRegistry's register() is also
 * accepted for focused composition tests.
 */
export function registerGlobalDialogFactories(registrar) {
  const register =
    typeof registrar?.registerDialog === 'function'
      ? (dialogId, factory) =>
          registrar.registerDialog(dialogId, factory)
      : typeof registrar?.register === 'function'
        ? (dialogId, factory) =>
            registrar.register(dialogId, factory)
        : null;
  if (!register) {
    throw new TypeError(
      'Global dialog registration requires registerDialog(id, factory) or register(id, factory).',
    );
  }
  for (const [dialogId, factory] of GLOBAL_DIALOG_DEFINITIONS) {
    register(dialogId, factory);
  }
  return registrar;
}
