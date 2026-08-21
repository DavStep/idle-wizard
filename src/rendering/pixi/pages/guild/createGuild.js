/**
 * Creates the renderer-neutral Guild view model from the current
 * GameplayFacade/GuildFacade snapshot.
 *
 * The Guild facade remains authoritative for unlocks, affordability,
 * generation, simulation, hiring, firing, posting, rewards, and persistence.
 * This adapter only copies display fields and routes callbacks to existing
 * facade method names.
 *
 * @param {{
 *   gameplaySnapshot?: object,
 *   selectedBranchId?: 'hall' | 'adventurers',
 *   selectedAdventurerTabId?: 'board' | 'roster' | 'log',
 *   selectedTabId?: 'hall' | 'board' | 'adventurers' | 'log' | 'roster',
 *   actions?: object,
 *   gameplayActions?: object,
 *   dialogs?: object,
 *   tabNotifications?: object | null,
 *   navigationPlacement?: 'page' | 'hud',
 *   subscribe?: ((listener: (snapshot: object) => void) => (() => void) | void) | null,
 * }} [options]
 * @returns {object}
 */
export function createGuild(options = {}) {
  const gameplaySnapshot = options.gameplaySnapshot ?? {};
  const guild = gameplaySnapshot.guild ?? gameplaySnapshot;
  const actions = options.actions ?? {};
  const gameplayActions =
    options.gameplayActions ?? actions.gameplay ?? actions;
  const uiActions = actions.ui ?? actions;
  const selection = normalizeGuildSelection({
    selectedAdventurerTabId:
      options.selectedAdventurerTabId ?? guild.selectedAdventurerTabId,
    selectedBranchId:
      options.selectedBranchId ?? guild.selectedBranchId,
    selectedTabId:
      options.selectedTabId ?? guild.selectedTabId,
  });
  const model = {
    guild: {
      ...guild,
      unlocked: guild.unlocked === true,
      created: guild.created === true,
      profile: guild.profile ? { ...guild.profile } : {},
      secretary: createSecretary(guild.secretary),
      board: mapRequests(guild.board),
      normalBoard: mapRequests(guild.normalBoard),
      eventBoard: mapRequests(guild.eventBoard),
      availableRequests: mapRequests(guild.availableRequests),
      adventurers: mapPeople(guild.adventurers),
      applicants: mapPeople(guild.applicants),
      logs: safeArray(guild.logs).map((log, index) => ({
        ...(typeof log === 'object' ? log : {}),
        id:
          (typeof log === 'object' ? log.id : null) ??
          index,
        text:
          typeof log === 'object'
            ? log.text ?? ''
            : String(log),
      })),
    },
    ...selection,
    dialogs: { ...(options.dialogs ?? {}) },
    actions: createGuildActionMap({
      gameplayActions,
      uiActions,
    }),
    tabNotifications:
      options.tabNotifications ??
      guild.tabNotifications ??
      null,
    navigationPlacement:
      options.navigationPlacement === 'hud' ? 'hud' : 'page',
  };

  if (typeof options.subscribe === 'function') {
    model.subscribe = (listener) =>
      options.subscribe((update) => {
        const nextSnapshot =
          update?.gameplaySnapshot ?? update;
        listener(
          createGuild({
            ...options,
            gameplaySnapshot: nextSnapshot,
            subscribe: null,
          }),
        );
      });
  }

  return model;
}

export const createGuildPixiViewModel = createGuild;

function createGuildActionMap({ gameplayActions, uiActions }) {
  const result = {};
  assignAction(result, 'selectAdventurerTab', uiActions, [
    'selectAdventurerTab',
    'selectTab',
  ]);
  assignAction(result, 'selectTab', uiActions, [
    'selectTab',
    'selectAdventurerTab',
  ]);
  assignAction(result, 'showCurrencyShortage', uiActions, [
    'showCurrencyShortage',
  ]);
  assignAction(result, 'createGuild', gameplayActions, [
    'createGuild',
  ]);
  assignAction(result, 'updateGuildProfile', gameplayActions, [
    'updateGuildProfile',
  ]);
  assignAction(result, 'upgradeSecretary', gameplayActions, [
    'upgradeGuildSecretary',
    'upgradeSecretary',
  ]);
  assignAction(result, 'postRequest', gameplayActions, [
    'postGuildRequest',
    'postRequest',
  ]);
  assignAction(result, 'removeRequest', gameplayActions, [
    'removeGuildRequest',
    'removeRequest',
  ]);
  assignAction(result, 'hireApplicant', gameplayActions, [
    'hireGuildApplicant',
    'hireApplicant',
  ]);
  assignAction(result, 'fireAdventurer', gameplayActions, [
    'fireGuildAdventurer',
    'fireAdventurer',
  ]);
  assignAction(result, 'onActivate', uiActions, ['onActivate']);
  assignAction(result, 'onDeactivate', uiActions, [
    'onDeactivate',
  ]);
  return result;
}

function assignAction(output, key, target, methodNames) {
  const methodName = methodNames.find(
    (candidate) => typeof target?.[candidate] === 'function',
  );
  if (!methodName) {
    return;
  }
  output[key] = (...arguments_) =>
    target[methodName](...arguments_);
}

function createSecretary(secretary = {}) {
  return {
    ...(secretary ?? {}),
    next: secretary?.next
      ? { ...secretary.next }
      : null,
  };
}

function mapRequests(requests) {
  return safeArray(requests).map((request, index) => ({
    ...request,
    id: request?.id ?? index,
    title: request?.title ?? 'request',
    lore: request?.lore ?? '',
    difficulty: request?.difficulty ?? 'medium',
    statLabel:
      request?.statLabel ??
      safeArray(request?.stats).join(' / '),
    rewardText: request?.rewardText ?? '',
    expiresLabel: request?.expiresLabel ?? '',
    eventLabel:
      request?.eventLabel ??
      request?.event?.headline ??
      '',
  }));
}

function mapPeople(people) {
  return safeArray(people).map((person, index) => {
    const displayName =
      person?.displayName ??
      [person?.name, person?.epithet]
        .filter(Boolean)
        .join(' ');
    return {
      ...person,
      id: person?.id ?? index,
      displayName: displayName || 'nameless',
      level: Math.max(1, Math.floor(Number(person?.level) || 1)),
      status: person?.status ?? 'idle',
      statusLabel:
        person?.statusLabel ??
        person?.currentQuest?.title ??
        person?.status ??
        'idle',
      personalityLabel: person?.personalityLabel ?? '',
      stats:
        person?.stats && typeof person.stats === 'object'
          ? { ...person.stats }
          : {},
      history: safeArray(person?.history).map(
        (entry, entryIndex) => ({
          ...(typeof entry === 'object' ? entry : {}),
          id:
            (typeof entry === 'object' ? entry.id : null) ??
            entryIndex,
          text:
            typeof entry === 'object'
              ? entry.text ?? ''
              : String(entry),
        }),
      ),
    };
  });
}

function normalizeGuildSelection({
  selectedAdventurerTabId,
  selectedBranchId,
  selectedTabId,
} = {}) {
  const legacyTabId = String(selectedTabId ?? '');
  const branchId =
    selectedBranchId === 'adventurers' ||
    ['board', 'roster', 'adventurers', 'log'].includes(legacyTabId)
      ? 'adventurers'
      : 'hall';
  const candidate =
    selectedAdventurerTabId ??
    (legacyTabId === 'adventurers' ? 'roster' : legacyTabId);
  const adventurerTabId = ['board', 'roster', 'log'].includes(candidate)
    ? candidate
    : 'board';
  return {
    selectedAdventurerTabId: adventurerTabId,
    selectedBranchId: branchId,
    selectedTabId: branchId === 'hall' ? 'hall' : adventurerTabId,
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
