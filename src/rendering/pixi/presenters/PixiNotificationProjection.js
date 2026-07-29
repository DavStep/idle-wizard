const PAGE_IDS = Object.freeze([
  'workshop',
  'brewing',
  'garden',
  'research',
  'shop',
  'guild',
  'prestige',
]);

const CHILD_TARGETS = Object.freeze({
  workshop: {
    seeds: ['workshop:summonSeed'],
    tasks: ['workshop:tasks', 'task:*'],
    personalTasks: ['workshop:personalTasks*'],
    alliance: ['workshop:alliance*'],
  },
  brewing: {
    cauldron: ['brewing:action', 'brewing:cauldron:*'],
    herbs: ['brewing:inventory:herbs', 'brewing:herb:*'],
    action: ['brewing:action', 'brewing:remove:*'],
  },
  garden: {
    plots: ['garden:plot:*', 'garden:seed:*'],
  },
  research: {
    research: ['research:*'],
  },
  shop: {
    npcStand: ['shop:stand:*'],
    npcListing: ['shop:stand:*', 'shop:sell:*'],
    playerStand: ['shop:player:stand:*'],
    playerListing: ['shop:player:listing:*'],
    playerProceeds: ['shop:player:proceeds*'],
    playerMarket: ['shop:player:market*'],
    crystals: ['shop:crystal*'],
  },
  guild: {
    charter: ['guild:charter*'],
    guild: ['guild:*'],
  },
});

/**
 * Projects notification state for bottom chrome. Room-level action badges stay
 * visible during tutorial filtering so selecting a room cannot hide its badge.
 */
export function projectChromeNotificationPages(pages = {}) {
  const result = {};

  for (const pageId of new Set([...PAGE_IDS, ...Object.keys(pages ?? {})])) {
    const page = pages?.[pageId];
    result[pageId] = isActive(page) ? page : false;
  }

  return result;
}

/**
 * Filters a page's aggregate notification snapshot without mutating it.
 */
export function projectPageNotificationState(
  pageId,
  pageNotification = {},
  policy = null,
) {
  const allowed = getAllowedTutorialIds(policy);
  if (allowed === null) {
    return pageNotification;
  }

  const children = {};
  const targetsByChild = CHILD_TARGETS[pageId] ?? {};
  for (const [childId, notification] of Object.entries(
    pageNotification?.children ?? {},
  )) {
    children[childId] =
      isActive(notification) &&
      allowsPattern(targetsByChild[childId] ?? [], allowed)
        ? notification
        : false;
  }
  return createNotificationPage(children);
}

/**
 * Suppresses notification-only fields while leaving gameplay flags, actions,
 * and source snapshots intact. Explicit and inferred tutorial IDs model the
 * same self/ancestor relationship used by the legacy DOM badge helper.
 */
export function projectPageViewModelNotifications(
  pageId,
  viewModel,
  policy = null,
  { pageNotification = null } = {},
) {
  if (!viewModel || typeof viewModel !== 'object') {
    return viewModel;
  }

  const allowed = getAllowedTutorialIds(policy);
  if (allowed === null) {
    return pageId === 'workshop' && pageNotification
      ? decorateWorkshop(viewModel, pageNotification, null)
      : viewModel;
  }

  let result = projectValue(viewModel, {
    allowed,
    inheritedIds: [],
    pageId,
    path: [],
  });
  if (pageId === 'workshop') {
    result = decorateWorkshop(result, pageNotification, allowed);
  }
  if (pageId === 'guild') {
    result = projectGuildTabs(result, allowed);
    result = projectGuildPeople(result, allowed);
  }
  return result;
}

export function normalizeTutorialNotificationPolicy(policy = null) {
  const allowed = getAllowedTutorialIds(policy);
  return allowed === null
    ? null
    : {
        active: true,
        allowedTutorialIds: [...allowed],
      };
}

function decorateWorkshop(viewModel, pageNotification, allowed) {
  const workshop = viewModel.workshop ?? viewModel;
  const children = pageNotification?.children ?? {};
  const allows = (tutorialId) =>
    allowed === null || allowed.has(tutorialId);
  let next = workshop;

  if (workshop.summon) {
    next = {
      ...next,
      summon: {
        ...workshop.summon,
        notification:
          isActive(children.seeds) &&
          allows('workshop:summonSeed'),
      },
    };
  }

  if (workshop.tasks) {
    next = {
      ...next,
      tasks: {
        ...workshop.tasks,
        rows: (workshop.tasks.rows ?? []).map((row) => ({
          ...row,
          notification:
            isActive(children.tasks) &&
            (
              allows('workshop:tasks') ||
              getTutorialIds(
                'workshop',
                row,
                ['workshop', 'tasks', 'rows'],
              ).some((id) => allowed?.has(id))
            ),
        })),
      },
    };
  }

  return viewModel.workshop
    ? { ...viewModel, workshop: next }
    : next;
}

function projectGuildTabs(viewModel, allowed) {
  if (!isPlainObject(viewModel.tabNotifications)) {
    return viewModel;
  }

  const tabNotifications = {};
  for (const [tabId, notification] of Object.entries(
    viewModel.tabNotifications,
  )) {
    tabNotifications[tabId] =
      isActive(notification) && allowed.has(`guild:tab:${tabId}`)
        ? notification
        : false;
  }
  return { ...viewModel, tabNotifications };
}

function projectGuildPeople(viewModel, allowed) {
  const wrapped = isPlainObject(viewModel.guild);
  const guild = wrapped ? viewModel.guild : viewModel;
  let projectedGuild = guild;

  for (const collectionKey of ['adventurers', 'applicants']) {
    if (!Array.isArray(guild?.[collectionKey])) {
      continue;
    }
    const people = guild[collectionKey].map((person, index) => {
      if (!isPlainObject(person)) {
        return person;
      }
      const visible = getTutorialIds(
        'guild',
        person,
        ['guild', collectionKey, index],
      ).some((id) => allowed.has(id));
      return person.notificationVisible === visible
        ? person
        : { ...person, notificationVisible: visible };
    });
    projectedGuild =
      projectedGuild === guild ? { ...guild } : projectedGuild;
    projectedGuild[collectionKey] = people;
  }

  if (projectedGuild === guild) {
    return viewModel;
  }
  return wrapped
    ? { ...viewModel, guild: projectedGuild }
    : projectedGuild;
}

function projectValue(value, context) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item, index) => {
      const projected = projectValue(item, {
        ...context,
        path: [...context.path, index],
      });
      changed ||= projected !== item;
      return projected;
    });
    return changed ? next : value;
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const inheritedIds = [
    ...context.inheritedIds,
    ...getTutorialIds(context.pageId, value, context.path),
  ];
  const notificationAllowed = inheritedIds.some((id) =>
    context.allowed.has(id),
  );
  let result = value;

  for (const [key, child] of Object.entries(value)) {
    const projected = isNotificationField(key)
      ? notificationAllowed
        ? child
        : false
      : projectValue(child, {
          ...context,
          inheritedIds,
          path: [...context.path, key],
        });
    if (projected !== child) {
      result = result === value ? { ...value } : result;
      result[key] = projected;
    }
  }

  if (
    context.pageId === 'research' &&
    context.path.includes('researches') &&
    value.canResearch === true
  ) {
    result = result === value ? { ...value } : result;
    result.notification = notificationAllowed;
  }
  return result;
}

function getTutorialIds(pageId, value, path) {
  const ids = [
    value.tutorialId,
    ...(Array.isArray(value.relatedTutorialIds)
      ? value.relatedTutorialIds
      : []),
  ].filter(isNonEmptyString);
  const location = path.join('.');

  if (pageId === 'workshop' && location.endsWith('workshop.summon')) {
    ids.push('workshop:summonSeed');
  }
  if (pageId === 'workshop' && location.endsWith('workshop.tasks')) {
    ids.push('workshop:tasks');
  }
  if (pageId === 'garden' && location.includes('.plots.')) {
    const number = value.tileNumber ?? value.id;
    if (number !== undefined && number !== null) {
      ids.push(`garden:plot:${number}`, `garden:plot:${number}:label`);
    }
  }
  if (pageId === 'brewing' && location.includes('.herbs.')) {
    const key = value.key ?? value.itemTypeId;
    if (key) {
      ids.push(`brewing:herb:${key}`);
    }
  }
  if (
    pageId === 'brewing' &&
    location.includes('.cauldrons.') &&
    (value.action || value.actions || value.canBrew || value.canBottle)
  ) {
    ids.push('brewing:action');
  }
  if (pageId === 'research' && path.includes('researches')) {
    const id = value.id ?? value.key;
    if (id) {
      ids.push(`research:${id}`);
    }
  }
  if (pageId === 'shop' && location.includes('.stalls.')) {
    const number = value.slotNumber ?? value.id;
    if (number !== undefined && number !== null) {
      ids.push(`shop:stand:${number}`);
    }
  }
  return [...new Set(ids)];
}

function getAllowedTutorialIds(policy) {
  if (policy?.active !== true) {
    return null;
  }
  const values = policy.allowedTutorialIds;
  const ids =
    values === null || values === undefined
      ? []
      : typeof values === 'string'
        ? [values]
        : typeof values[Symbol.iterator] === 'function'
          ? [...values]
          : [];
  return new Set(ids.filter(isNonEmptyString));
}

function allowsPattern(patterns, allowed) {
  return patterns.some((pattern) => {
    const prefix = pattern.endsWith('*')
      ? pattern.slice(0, -1)
      : null;
    return [...allowed].some((id) =>
      prefix === null ? id === pattern : id.startsWith(prefix),
    );
  });
}

function createNotificationPage(children) {
  const notifications = Object.values(children).filter(isActive);
  return {
    active: notifications.length > 0,
    ...(notifications.length > 0
      ? {
          tone: notifications.some((value) => tone(value) === 'red')
            ? 'red'
            : 'orange',
        }
      : {}),
    children,
  };
}

function isNotificationField(key) {
  return (
    key === 'notification' ||
    (key.endsWith('Notification') && key !== 'pageNotification')
  );
}

function isActive(value) {
  return (
    value === true ||
    value === 'red' ||
    value === 'orange' ||
    value?.active === true
  );
}

function tone(value) {
  return value === 'orange' || value?.tone === 'orange'
    ? 'orange'
    : 'red';
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}
