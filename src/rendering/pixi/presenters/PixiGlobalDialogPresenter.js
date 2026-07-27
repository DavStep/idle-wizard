import { PAGE_UNLOCK_REQUIREMENTS } from '../../../pages/managers/PageUnlockManager.js';
import { getPlayerColorModeOptions } from '../../../player/playerColorModes.js';
import { getPlayerIconModeOptions } from '../../../player/playerIconModes.js';
import { getPlayerVisualSettingCategories } from '../../../player/playerVisualSettings.js';
import { getClientReleaseVersion } from '../../../shared/clientReleaseVersion.js';
import {
  GLOBAL_DIALOG_IDS,
  registerGlobalDialogFactories,
} from '../global/dialogs/index.js';

const SETTINGS_TABS = new Set([
  'account',
  'avatar',
  'report',
  'configurations',
]);
const FEEDBACK_KINDS = new Set(['feedback', 'bug', 'feature']);
const LIMIT_UNLOCK_PAGE_BY_KEY = Object.freeze({
  maxGardenTiles: 'garden',
  maxCauldrons: 'brewing',
});

/**
 * Projects authoritative facade snapshots into the retained global dialogs.
 * Subscriptions exist only while their owning dialog is open.
 */
export class PixiGlobalDialogPresenter {
  static explain =
    'Opens retained Pixi settings, level, inbox, player, and alliance dialogs without moving their rules into rendering.';

  constructor({
    renderFacade,
    gameplayFacade = null,
    playerFacade = null,
    authFacade = null,
    feedbackFacade = null,
    playerInboxFacade = null,
    playerInfoFacade = null,
    tradeAllianceFacade = null,
    hapticsFacade = null,
    soundSettingsFacade = null,
    reload = () => globalThis.location?.reload?.(),
  } = {}) {
    if (!renderFacade) {
      throw new Error(
        'PixiGlobalDialogPresenter requires the production RenderFacade.',
      );
    }
    this.renderFacade = renderFacade;
    this.gameplayFacade = gameplayFacade;
    this.playerFacade = playerFacade;
    this.authFacade = authFacade;
    this.feedbackFacade = feedbackFacade;
    this.playerInboxFacade = playerInboxFacade;
    this.playerInfoFacade = playerInfoFacade;
    this.tradeAllianceFacade = tradeAllianceFacade;
    this.hapticsFacade = hapticsFacade;
    this.soundSettingsFacade = soundSettingsFacade;
    this.reload = reload;
    this.mounted = false;
    this.openRequests = new Map();
    this.dialogCleanups = new Map();
    this.selectedLevel = null;
    this.settingsTabById = new Map();
    this.feedbackKindById = new Map();
    this.authBusy = false;
    this.authStatusOverride = '';
    this.pendingPlayerSurfaceOpen = null;
    registerGlobalDialogFactories(this.renderFacade);
  }

  mount() {
    if (this.mounted) {
      return false;
    }
    this.mounted = true;
    return true;
  }

  unmount() {
    if (!this.mounted && this.dialogCleanups.size === 0) {
      return false;
    }
    this.mounted = false;
    for (const dialogId of [...this.dialogCleanups.keys()]) {
      this.stopDialogSubscriptions(dialogId);
    }
    this.openRequests.clear();
    this.selectedLevel = null;
    this.authBusy = false;
    this.authStatusOverride = '';
    this.pendingPlayerSurfaceOpen = null;
    return true;
  }

  open(dialogId, options = {}) {
    if (!this.mounted) {
      return false;
    }
    const canonicalId = normalizeGlobalDialogId(dialogId);
    if (!canonicalId) {
      return false;
    }
    const request = {
      ...(this.openRequests.get(canonicalId) ?? {}),
      ...getGlobalDialogAliasOptions(dialogId),
      ...(options ?? {}),
    };
    if (
      isPlayerSurfaceDialogId(canonicalId) &&
      this.requiresPlayerSurfaceUsername()
    ) {
      return this.deferPlayerSurfaceOpen(canonicalId, request);
    }
    return this.openCanonicalDialog(canonicalId, request);
  }

  openCanonicalDialog(dialogId, request = {}) {
    this.openRequests.set(dialogId, request);
    if (dialogId === GLOBAL_DIALOG_IDS.LEVEL) {
      this.selectedLevel = positiveInteger(request.level);
    }
    return this.requireRuntime().openDialog(
      dialogId,
      this.createViewModel(dialogId, request),
    );
  }

  close(dialogId) {
    const canonicalId = normalizeGlobalDialogId(dialogId);
    if (canonicalId === GLOBAL_DIALOG_IDS.SETTINGS) {
      this.clearPendingPlayerSurfaceOpen();
    }
    return canonicalId
      ? this.requireRuntime().closeDialog(canonicalId)
      : false;
  }

  refreshOpenDialogs() {
    const runtime = this.requireRuntime();
    for (const dialogId of runtime.getOpenDialogIds()) {
      if (!this.openRequests.has(dialogId)) {
        continue;
      }
      runtime.openDialog(
        dialogId,
        this.createViewModel(
          dialogId,
          this.openRequests.get(dialogId),
        ),
      );
    }
  }

  createViewModel(dialogId, request = {}) {
    switch (dialogId) {
      case GLOBAL_DIALOG_IDS.SETTINGS:
      case GLOBAL_DIALOG_IDS.FEEDBACK:
        return this.createSettingsModel(dialogId, request);
      case GLOBAL_DIALOG_IDS.LEVEL:
        return this.createLevelModel();
      case GLOBAL_DIALOG_IDS.INBOX:
        return this.createInboxModel();
      case GLOBAL_DIALOG_IDS.PLAYER:
        return this.createPlayerModel(request.player ?? request);
      case GLOBAL_DIALOG_IDS.ALLIANCE:
        return this.createAllianceModel(request.alliance ?? request);
      case GLOBAL_DIALOG_IDS.CONFIRMATION:
      case GLOBAL_DIALOG_IDS.ANNOUNCEMENT:
        return request;
      default:
        throw new Error(`Unknown retained global dialog: ${dialogId}`);
    }
  }

  createSettingsModel(dialogId, request = {}) {
    const player = this.playerFacade?.getSnapshot?.() ?? {};
    const gameplay = this.gameplayFacade?.getSnapshot?.() ?? {};
    const auth = this.authFacade?.getSnapshot?.() ?? {};
    const haptics = this.hapticsFacade?.getSnapshot?.() ?? {};
    const sound = this.soundSettingsFacade?.getSnapshot?.() ?? {};
    const requestedTab = normalizeSettingsTab(
      request.tab ??
        request.tabId ??
        (dialogId === GLOBAL_DIALOG_IDS.FEEDBACK
          ? 'report'
          : this.settingsTabById.get(dialogId) ??
            'configurations'),
    );
    const feedbackKind = normalizeFeedbackKind(
      request.kind ??
        request.feedbackKind ??
        this.feedbackKindById.get(dialogId),
    );
    this.settingsTabById.set(dialogId, requestedTab);
    this.feedbackKindById.set(dialogId, feedbackKind);
    const oidc = auth.oidc ?? {};
    const authenticated = Boolean(
      oidc.authenticated || (auth.hasToken && oidc.remembered),
    );

    return {
      title:
        request.usernamePrompt === true
          ? 'username'
          : requestedTab === 'avatar'
            ? 'avatar'
            : 'settings',
      tabId: requestedTab,
      focusInput:
        request.focusInput === true ||
        dialogId === GLOBAL_DIALOG_IDS.FEEDBACK,
      account: {
        username:
          request.usernamePrompt === true &&
          String(player.username ?? '').toLowerCase() === 'wizard'
            ? ''
            : player.username ?? 'Wizard',
        usernameRequired: request.usernamePrompt === true,
        accountStatus:
          this.authStatusOverride || getAuthStatusText(auth),
        connectLabel: this.authBusy
          ? authenticated
            ? 'disconnecting'
            : 'connecting'
          : authenticated
            ? 'disconnect account'
            : 'connect account',
        connectEnabled: !this.authBusy && oidc.enabled !== false,
        version: getClientReleaseVersion(),
      },
      feedback: {
        kind: feedbackKind,
        value: '',
        status: '',
        pending: false,
      },
      preferences: {
        haptics: haptics.enabled !== false,
        music: sound.musicEnabled !== false,
        sfx: sound.sfxEnabled !== false,
      },
      categories: createSettingsCategories(),
      selections: {
        theme: player.theme,
        font: player.font,
        color: player.colorMode,
        icons: player.iconMode,
        character: player.character,
        progressBar: player.progressBar,
      },
      costsCrystal: gameplay.visualSettings?.costsCrystal ?? {},
      researched: gameplay.visualSettings?.researched ?? {},
      actions: {
        activate: () =>
          this.startSettingsSubscriptions(dialogId),
        deactivate: () =>
          this.stopDialogSubscriptions(dialogId),
        selectTab: (tabId) => {
          const normalizedTab = normalizeSettingsTab(tabId);
          this.settingsTabById.set(dialogId, normalizedTab);
          this.updateOpenRequest(dialogId, {
            tab: normalizedTab,
            tabId: normalizedTab,
          });
          return true;
        },
        selectFeedbackKind: (kind) => {
          const normalizedKind = normalizeFeedbackKind(kind);
          this.feedbackKindById.set(dialogId, normalizedKind);
          this.updateOpenRequest(dialogId, {
            kind: normalizedKind,
            feedbackKind: normalizedKind,
          });
          return true;
        },
        sendFeedback: (submission) =>
          this.submitFeedback(submission),
        saveUsername: (username) =>
          this.saveUsername(dialogId, username),
        ...(request.usernamePrompt === true
          ? {
              close: () => this.clearPendingPlayerSurfaceOpen(),
              later: () => this.clearPendingPlayerSurfaceOpen(),
            }
          : {}),
        connectAccount: () =>
          this.toggleAccountConnection(dialogId),
        togglePreference: (key, enabled) =>
          this.setPreference(key, enabled),
        selectVisualOption: (category, optionKey) =>
          this.selectVisualOption(category, optionKey),
        researchVisualOption: (category, optionKey) =>
          this.gameplayFacade?.buyVisualSettingOption?.(
            category,
            optionKey,
          ) ?? { ok: false, reason: 'gameplay_unavailable' },
      },
    };
  }

  createLevelModel() {
    const snapshot = this.gameplayFacade?.getSnapshot?.() ?? {};
    const playerLevel =
      snapshot.playerLevel ??
      createFallbackPlayerLevel(snapshot.tasks?.currentLevel);
    const currentLevel = positiveInteger(playerLevel.currentLevel) ?? 1;
    const maxLevel =
      positiveInteger(playerLevel.maxLevel) ?? currentLevel;
    this.selectedLevel = Math.max(
      1,
      Math.min(this.selectedLevel ?? currentLevel, maxLevel),
    );
    return {
      currentLevel,
      maxLevel,
      selectedLevel: this.selectedLevel,
      levels: createLevelRows(playerLevel),
      actions: {
        activate: () =>
          this.startDialogSubscriptions(
            GLOBAL_DIALOG_IDS.LEVEL,
            [this.gameplayFacade],
          ),
        deactivate: () =>
          this.stopDialogSubscriptions(GLOBAL_DIALOG_IDS.LEVEL),
        selectLevel: (level) => {
          this.selectedLevel = Math.max(
            1,
            Math.min(positiveInteger(level) ?? currentLevel, maxLevel),
          );
          this.refreshDialog(GLOBAL_DIALOG_IDS.LEVEL);
          return true;
        },
      },
    };
  }

  createInboxModel() {
    const snapshot = this.playerInboxFacade?.getSnapshot?.() ?? {};
    return {
      ...snapshot,
      actions: {
        activate: () =>
          this.startDialogSubscriptions(
            GLOBAL_DIALOG_IDS.INBOX,
            [this.playerInboxFacade],
          ),
        deactivate: () =>
          this.stopDialogSubscriptions(GLOBAL_DIALOG_IDS.INBOX),
        markVisibleRead: () =>
          this.playerInboxFacade?.markVisibleRead?.(),
        claimReward: (mailKey) =>
          this.playerInboxFacade?.claimReward?.(mailKey),
      },
    };
  }

  createPlayerModel(request = {}) {
    const snapshot = this.playerInfoFacade?.getSnapshot?.() ?? {};
    const normalizedRequest = normalizePlayerRequest(request);
    const livePlayer = findPlayer(snapshot.players, normalizedRequest);
    const player = {
      ...normalizedRequest,
      ...(livePlayer ?? {}),
    };
    return {
      connected: snapshot.connected !== false,
      loading: Boolean(
        this.playerInfoFacade &&
          normalizedRequest.username &&
          !livePlayer,
      ),
      player,
      actions: {
        activate: () =>
          this.startPlayerSubscriptions(),
        deactivate: () =>
          this.stopDialogSubscriptions(GLOBAL_DIALOG_IDS.PLAYER),
        openAlliance: (alliance) =>
          this.open(GLOBAL_DIALOG_IDS.ALLIANCE, { alliance }),
      },
    };
  }

  createAllianceModel(request = {}) {
    const snapshot = this.tradeAllianceFacade?.getSnapshot?.() ?? {};
    const normalizedRequest = normalizeAllianceRequest(request);
    const liveAlliance = findAlliance(
      snapshot.alliances,
      normalizedRequest,
    );
    const alliance = {
      ...normalizedRequest,
      ...(liveAlliance ?? {}),
    };
    const allianceId = normalizeId(alliance.allianceId);
    return {
      connected: snapshot.connected !== false,
      loading: Boolean(
        this.tradeAllianceFacade &&
          (allianceId || alliance.tag || alliance.name) &&
          !liveAlliance,
      ),
      alliance,
      members: (snapshot.members ?? []).filter(
        (member) =>
          normalizeId(member.allianceId) === allianceId,
      ),
      ownAlliance: snapshot.ownAlliance,
      actions: {
        activate: () =>
          this.startAllianceSubscriptions(),
        deactivate: () =>
          this.stopDialogSubscriptions(
            GLOBAL_DIALOG_IDS.ALLIANCE,
          ),
        openPlayer: (player) =>
          this.open(GLOBAL_DIALOG_IDS.PLAYER, { player }),
        joinAlliance: (id) =>
          this.tradeAllianceFacade?.joinAlliance?.(id),
        applyAlliance: (id) =>
          this.tradeAllianceFacade?.applyAlliance?.(id),
      },
    };
  }

  startSettingsSubscriptions(dialogId) {
    return this.startDialogSubscriptions(dialogId, [
      this.playerFacade,
      this.gameplayFacade,
      this.authFacade,
      this.hapticsFacade,
      this.soundSettingsFacade,
    ]);
  }

  startPlayerSubscriptions() {
    if (this.dialogCleanups.has(GLOBAL_DIALOG_IDS.PLAYER)) {
      return false;
    }
    const releases = [];
    const release = this.playerInfoFacade?.retainPublicData?.();
    if (typeof release === 'function') {
      releases.push(release);
    }
    const started = this.startDialogSubscriptions(
      GLOBAL_DIALOG_IDS.PLAYER,
      [this.playerInfoFacade],
      releases,
    );
    if (started) {
      this.refreshDialog(GLOBAL_DIALOG_IDS.PLAYER);
    }
    return started;
  }

  startAllianceSubscriptions() {
    if (this.dialogCleanups.has(GLOBAL_DIALOG_IDS.ALLIANCE)) {
      return false;
    }
    const releases = [];
    const release = this.tradeAllianceFacade?.retainPublicData?.();
    if (typeof release === 'function') {
      releases.push(release);
    }
    const started = this.startDialogSubscriptions(
      GLOBAL_DIALOG_IDS.ALLIANCE,
      [this.tradeAllianceFacade],
      releases,
    );
    if (started) {
      this.refreshDialog(GLOBAL_DIALOG_IDS.ALLIANCE);
    }
    return started;
  }

  startDialogSubscriptions(
    dialogId,
    sources,
    initialCleanups = [],
  ) {
    if (this.dialogCleanups.has(dialogId)) {
      return false;
    }
    const cleanups = [...initialCleanups];
    for (const source of sources) {
      const unsubscribe = source?.subscribe?.(() =>
        this.refreshDialog(dialogId),
      );
      if (typeof unsubscribe === 'function') {
        cleanups.push(unsubscribe);
      }
    }
    this.dialogCleanups.set(dialogId, cleanups);
    return true;
  }

  stopDialogSubscriptions(dialogId) {
    const cleanups = this.dialogCleanups.get(dialogId);
    if (!cleanups) {
      return false;
    }
    this.dialogCleanups.delete(dialogId);
    for (const cleanup of cleanups.reverse()) {
      cleanup?.();
    }
    return true;
  }

  refreshDialog(dialogId) {
    if (
      !this.mounted ||
      !this.requireRuntime().getOpenDialogIds().includes(dialogId)
    ) {
      return false;
    }
    const request = this.openRequests.get(dialogId) ?? {};
    this.requireRuntime().openDialog(
      dialogId,
      this.createViewModel(dialogId, request),
    );
    return true;
  }

  saveUsername(dialogId, username) {
    const result = this.playerFacade?.setUsername?.(username);
    if (result === false || result?.ok === false) {
      return result;
    }
    const pending =
      dialogId === GLOBAL_DIALOG_IDS.SETTINGS
        ? this.takePendingPlayerSurfaceOpen()
        : null;
    this.requireRuntime().closeDialog(dialogId);
    if (pending && this.mounted) {
      this.openCanonicalDialog(pending.dialogId, pending.request);
    }
    return result ?? true;
  }

  requiresPlayerSurfaceUsername() {
    const snapshot = this.playerFacade?.getSnapshot?.();
    return Boolean(
      snapshot &&
        Object.hasOwn(snapshot, 'hasExplicitUsername') &&
        snapshot.hasExplicitUsername === false,
    );
  }

  deferPlayerSurfaceOpen(dialogId, request) {
    const previousPending = this.pendingPlayerSurfaceOpen;
    this.pendingPlayerSurfaceOpen = {
      dialogId,
      request: { ...request },
      previousSettingsRequest:
        previousPending
          ? previousPending.previousSettingsRequest
          : this.openRequests.has(GLOBAL_DIALOG_IDS.SETTINGS)
            ? { ...this.openRequests.get(GLOBAL_DIALOG_IDS.SETTINGS) }
            : null,
    };
    const settingsRequest = {
      ...(this.openRequests.get(GLOBAL_DIALOG_IDS.SETTINGS) ?? {}),
      usernamePrompt: true,
      tab: 'account',
      tabId: 'account',
      focusInput: true,
    };
    return this.openCanonicalDialog(
      GLOBAL_DIALOG_IDS.SETTINGS,
      settingsRequest,
    );
  }

  takePendingPlayerSurfaceOpen() {
    const pending = this.pendingPlayerSurfaceOpen;
    if (!pending) {
      return null;
    }
    this.pendingPlayerSurfaceOpen = null;
    if (pending.previousSettingsRequest) {
      this.openRequests.set(
        GLOBAL_DIALOG_IDS.SETTINGS,
        pending.previousSettingsRequest,
      );
    } else {
      this.openRequests.delete(GLOBAL_DIALOG_IDS.SETTINGS);
    }
    return pending;
  }

  clearPendingPlayerSurfaceOpen() {
    this.takePendingPlayerSurfaceOpen();
    return true;
  }

  async submitFeedback({ kind, body } = {}) {
    const normalizedKind = normalizeFeedbackKind(kind);
    const prefix =
      normalizedKind === 'bug'
        ? 'bug report:'
        : normalizedKind === 'feature'
          ? 'feature request:'
          : '';
    const text = String(body ?? '').trim();
    if (!text) {
      return { ok: false, reason: 'empty_feedback' };
    }
    return (
      (await this.feedbackFacade?.submitFeedback?.(
        prefix ? `${prefix}\n${text}` : text,
      )) ?? { ok: false, reason: 'offline' }
    );
  }

  async toggleAccountConnection(dialogId) {
    if (!this.authFacade || this.authBusy) {
      return false;
    }
    const snapshot = this.authFacade.getSnapshot?.() ?? {};
    const authenticated = Boolean(
      snapshot.oidc?.authenticated ||
        (snapshot.hasToken && snapshot.oidc?.remembered),
    );
    this.authBusy = true;
    this.authStatusOverride = authenticated
      ? 'disconnecting'
      : 'connecting';
    this.refreshDialog(dialogId);
    try {
      if (authenticated) {
        await this.authFacade.signOut?.();
        this.reload();
        return { ok: true, reloadRequired: true };
      }
      const result = await this.authFacade.signInWithGoogle?.({
        pendingGameplaySave:
          this.gameplayFacade?.createPersistenceSave?.(),
      });
      if (result?.ok && result.reloadRequired) {
        this.reload();
      } else if (result?.ok === false) {
        this.authStatusOverride = getAuthResultStatusText(result);
      } else {
        this.authStatusOverride = '';
      }
      return result ?? { ok: false, reason: 'offline' };
    } catch (error) {
      this.authStatusOverride = `login error: ${getErrorText(error)}`;
      return { ok: false, reason: 'exception' };
    } finally {
      this.authBusy = false;
      this.refreshDialog(dialogId);
    }
  }

  setPreference(key, enabled) {
    if (key === 'haptics') {
      return this.hapticsFacade?.setEnabled?.(enabled) ?? false;
    }
    if (key === 'music') {
      return (
        this.soundSettingsFacade?.setMusicEnabled?.(enabled) ??
        false
      );
    }
    if (key === 'sfx') {
      return (
        this.soundSettingsFacade?.setSfxEnabled?.(enabled) ??
        false
      );
    }
    return false;
  }

  selectVisualOption(category, optionKey) {
    const methods = {
      theme: 'setTheme',
      font: 'setFont',
      color: 'setColorMode',
      icons: 'setIconMode',
      character: 'setCharacter',
      progressBar: 'setProgressBar',
    };
    const method = methods[category];
    return method
      ? this.playerFacade?.[method]?.(optionKey) ?? false
      : false;
  }

  updateOpenRequest(dialogId, patch) {
    this.openRequests.set(dialogId, {
      ...(this.openRequests.get(dialogId) ?? {}),
      ...patch,
    });
  }

  requireRuntime() {
    const runtime = this.renderFacade.getUiRuntime?.();
    if (!runtime?.initialized) {
      throw new Error(
        'PixiGlobalDialogPresenter requires RenderFacade.initialize() before opening dialogs.',
      );
    }
    return runtime;
  }
}

function createSettingsCategories() {
  const categories = getPlayerVisualSettingCategories();
  categories.splice(
    2,
    0,
    {
      key: 'color',
      label: 'resource colors',
      options: getPlayerColorModeOptions(),
    },
    {
      key: 'icons',
      label: 'resource icons',
      options: getPlayerIconModeOptions(),
    },
  );
  return categories;
}

function createFallbackPlayerLevel(currentLevel = 1) {
  const level = positiveInteger(currentLevel) ?? 1;
  return {
    currentLevel: level,
    maxLevel: level,
    levels: [
      {
        level,
        current: true,
        unlocked: true,
        effects: [],
        totals: null,
      },
    ],
  };
}

function createLevelRows(playerLevel) {
  const levels = Array.isArray(playerLevel.levels)
    ? playerLevel.levels
    : [];
  return levels.map((level) => {
    const previous = levels.find(
      (candidate) => candidate.level === level.level - 1,
    );
    return {
      ...level,
      addedRows: formatAddedRows(
        level.effects,
        previous?.totals,
        level.level,
      ),
      totalRows: formatTotalRows(level.totals),
    };
  });
}

function formatAddedRows(effects = [], previousTotals, selectedLevel) {
  return (Array.isArray(effects) ? effects : [])
    .map((effect) =>
      formatAddedEffect(effect, previousTotals, selectedLevel),
    )
    .filter(Boolean);
}

function formatAddedEffect(effect, previousTotals, selectedLevel) {
  if (
    !effect ||
    effect === 'current level' ||
    effect === 'no new limit' ||
    effect === 'no new unlock'
  ) {
    return null;
  }
  const limitRows = [
    [/^max garden tiles (\d+)$/, 'maxGardenTiles', 'garden plots', ''],
    [/^max cauldrons (\d+)$/, 'maxCauldrons', 'cauldrons', ''],
    [
      /^max (?:npc|trader) market stands (\d+)$/,
      'maxNpcMarketStands',
      'trader stands',
      '',
    ],
    [
      /^max player market stands (\d+)$/,
      'maxPlayerMarketStands',
      'player stands',
      '',
    ],
    [
      /^max mana cap ([\d.]+)$/,
      'maxManaCap',
      'mana capacity',
      ' mana',
    ],
    [
      /^mana regen ([\d.]+)\/sec$/,
      'manaPerSecond',
      'mana regeneration',
      '/sec mana',
    ],
  ];
  for (const [pattern, key, label, suffix] of limitRows) {
    const match = String(effect).match(pattern);
    if (!match) {
      continue;
    }
    const pageId = LIMIT_UNLOCK_PAGE_BY_KEY[key];
    if (
      pageId &&
      PAGE_UNLOCK_REQUIREMENTS[pageId]?.requiredLevel ===
        selectedLevel
    ) {
      return null;
    }
    const added =
      Number(match[1]) - Number(previousTotals?.[key] ?? 0);
    return added > 0
      ? {
          label,
          value: `+${formatNumber(added)}${suffix}`,
        }
      : null;
  }
  const unlockMatch = String(effect).match(/^unlocks (.+)$/);
  if (unlockMatch) {
    return { label: 'unlocks', value: unlockMatch[1] };
  }
  const researchMatch = String(effect).match(
    /^allows researching "(.+)"$/,
  );
  if (researchMatch) {
    return { label: 'research', value: researchMatch[1] };
  }
  const crystalMatch = String(effect).match(
    /^crystal reward ([\d.]+)$/,
  );
  if (crystalMatch) {
    return {
      label: 'bonus',
      value: `+${formatNumber(Number(crystalMatch[1]))} crystal`,
    };
  }
  return { label: String(effect), value: '' };
}

function formatTotalRows(totals) {
  if (!totals) {
    return [];
  }
  return [
    ['garden plots', totals.maxGardenTiles, ''],
    ['cauldrons', totals.maxCauldrons, ''],
    ['trader stands', totals.maxNpcMarketStands, ''],
    ['player stands', totals.maxPlayerMarketStands, ''],
    ['mana capacity', totals.maxManaCap, ' mana'],
    ['mana regeneration', totals.manaPerSecond, '/sec mana'],
  ]
    .filter(([, value]) => Number.isFinite(value))
    .map(([label, value, suffix]) => ({
      label,
      value: `${formatNumber(value)}${suffix}`,
    }));
}

function normalizePlayerRequest(player = {}) {
  return {
    ...player,
    identity: normalizeId(player.identity ?? player.playerIdentity),
    username: String(player.username ?? player.name ?? '').trim(),
    character: String(player.character ?? 'elara'),
    allianceId: normalizeId(player.allianceId),
    allianceName: String(player.allianceName ?? ''),
    allianceTag: String(player.allianceTag ?? player.tag ?? '')
      .trim()
      .toUpperCase(),
    allianceTagColor: String(
      player.allianceTagColor ?? player.tagColor ?? '',
    ),
    playerLevel: positiveInteger(player.playerLevel ?? player.level) ?? 1,
    prestigeCount: Math.max(
      0,
      Math.floor(Number(player.prestigeCount ?? player.prestige) || 0),
    ),
    totalProducedCoin: Number(
      player.totalProducedCoin ?? player.totalProducedGold ?? 0,
    ),
  };
}

function findPlayer(players = [], request = {}) {
  const identity = normalizeId(request.identity);
  const username = normalizeName(request.username);
  return (
    (identity
      ? players.find(
          (player) => normalizeId(player.identity) === identity,
        )
      : null) ??
    (username
      ? players.find(
          (player) =>
            normalizeName(player.username) === username,
        )
      : null) ??
    null
  );
}

function normalizeAllianceRequest(alliance = {}) {
  if (typeof alliance === 'string') {
    return {
      allianceId: '',
      name: '',
      tag: alliance.trim().toUpperCase(),
    };
  }
  return {
    ...alliance,
    allianceId: normalizeId(alliance.allianceId ?? alliance.id),
    name: String(alliance.name ?? alliance.allianceName ?? '').trim(),
    tag: String(alliance.tag ?? alliance.allianceTag ?? '')
      .trim()
      .toUpperCase(),
    tagColor: String(
      alliance.tagColor ?? alliance.allianceTagColor ?? '',
    ),
  };
}

function findAlliance(alliances = [], request = {}) {
  const allianceId = normalizeId(request.allianceId);
  const tag = String(request.tag ?? '').trim().toUpperCase();
  const name = normalizeName(request.name);
  return (
    (allianceId
      ? alliances.find(
          (alliance) =>
            normalizeId(alliance.allianceId) === allianceId,
        )
      : null) ??
    (tag
      ? alliances.find(
          (alliance) =>
            String(alliance.tag ?? '').trim().toUpperCase() === tag,
        )
      : null) ??
    (name
      ? alliances.find(
          (alliance) => normalizeName(alliance.name) === name,
        )
      : null) ??
    null
  );
}

function getAuthStatusText(snapshot = {}) {
  const oidc = snapshot.oidc ?? {};
  if (oidc.cancelled) {
    return 'login cancelled';
  }
  if (oidc.error) {
    return getLoginErrorStatusText(oidc.error);
  }
  if (oidc.authenticated || (snapshot.hasToken && oidc.remembered)) {
    return oidc.displayName || oidc.email || 'connected';
  }
  return oidc.enabled === false ? 'login unavailable' : 'not connected';
}

function getAuthResultStatusText(result = {}) {
  if (String(result.reason ?? '').includes('cancelled')) {
    return 'login cancelled';
  }
  return getLoginErrorStatusText(
    result.message ?? result.reason ?? 'unknown error',
  );
}

function getLoginErrorStatusText(reason) {
  const unavailable = new Set([
    'browser_not_supported',
    'invalid_client',
    'missing_client_id',
    'opt_out_or_no_session',
    'secure_http_required',
    'suppressed_by_user',
    'unregistered_origin',
    'unknown_reason',
    'web_unavailable',
  ]);
  const text = String(reason ?? '').trim();
  return unavailable.has(text)
    ? 'login unavailable'
    : `login error: ${getErrorText(text)}`;
}

function normalizeGlobalDialogId(dialogId) {
  const value = String(dialogId ?? '').trim().toLowerCase();
  const aliases = {
    settings: GLOBAL_DIALOG_IDS.SETTINGS,
    'global.settings': GLOBAL_DIALOG_IDS.SETTINGS,
    feedback: GLOBAL_DIALOG_IDS.FEEDBACK,
    bug: GLOBAL_DIALOG_IDS.FEEDBACK,
    feature: GLOBAL_DIALOG_IDS.FEEDBACK,
    'global.feedback': GLOBAL_DIALOG_IDS.FEEDBACK,
    level: GLOBAL_DIALOG_IDS.LEVEL,
    'global.level': GLOBAL_DIALOG_IDS.LEVEL,
    inbox: GLOBAL_DIALOG_IDS.INBOX,
    mail: GLOBAL_DIALOG_IDS.INBOX,
    'global.inbox': GLOBAL_DIALOG_IDS.INBOX,
    player: GLOBAL_DIALOG_IDS.PLAYER,
    'global.player': GLOBAL_DIALOG_IDS.PLAYER,
    alliance: GLOBAL_DIALOG_IDS.ALLIANCE,
    'global.alliance': GLOBAL_DIALOG_IDS.ALLIANCE,
    announcement: GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
    'global.announcement': GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
    confirmation: GLOBAL_DIALOG_IDS.CONFIRMATION,
    'global.confirmation': GLOBAL_DIALOG_IDS.CONFIRMATION,
  };
  return aliases[value] ?? null;
}

function isPlayerSurfaceDialogId(dialogId) {
  return (
    dialogId === GLOBAL_DIALOG_IDS.PLAYER ||
    dialogId === GLOBAL_DIALOG_IDS.ALLIANCE
  );
}

function getGlobalDialogAliasOptions(dialogId) {
  const value = String(dialogId ?? '').trim().toLowerCase();
  if (value === 'bug') {
    return { tab: 'report', kind: 'bug' };
  }
  if (value === 'feature') {
    return { tab: 'report', kind: 'feature' };
  }
  if (value === 'feedback') {
    return { tab: 'report', kind: 'feedback' };
  }
  return {};
}

function normalizeSettingsTab(tabId) {
  const value = String(tabId ?? 'account').trim().toLowerCase();
  if (value === 'theme' || value === 'appearance') {
    return 'configurations';
  }
  return SETTINGS_TABS.has(value) ? value : 'account';
}

function normalizeFeedbackKind(kind) {
  const value = String(kind ?? 'feedback').trim().toLowerCase();
  return FEEDBACK_KINDS.has(value) ? value : 'feedback';
}

function normalizeId(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return typeof value.toHexString === 'function'
    ? value.toHexString()
    : String(value);
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}

function positiveInteger(value) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? String(Number(number.toFixed(4)))
    : '0';
}

function getErrorText(error) {
  return String(error ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}
