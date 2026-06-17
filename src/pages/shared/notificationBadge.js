export const NOTIFICATION_TONE_RED = 'red';
export const NOTIFICATION_TONE_ORANGE = 'orange';

let notificationVisibilityPolicy = null;
const suppressedNotificationBadges = new Map();

export function isNotificationActive(notification) {
  return (
    notification === true ||
    notification === NOTIFICATION_TONE_RED ||
    notification === NOTIFICATION_TONE_ORANGE ||
    notification?.active === true
  );
}

export function normalizeNotificationTone(tone) {
  return tone === NOTIFICATION_TONE_ORANGE
    ? NOTIFICATION_TONE_ORANGE
    : NOTIFICATION_TONE_RED;
}

export function getNotificationTone(notification, fallback = NOTIFICATION_TONE_RED) {
  if (
    notification === NOTIFICATION_TONE_RED ||
    notification === NOTIFICATION_TONE_ORANGE
  ) {
    return notification;
  }

  return normalizeNotificationTone(notification?.tone ?? fallback);
}

export function setNotificationBadge(element, active, tone) {
  if (!element) {
    return;
  }

  if (isNotificationActive(active)) {
    const nextTone = getNotificationTone(active, tone);

    if (shouldSuppressNotificationBadge(element)) {
      suppressedNotificationBadges.set(element, { tone: nextTone });
      clearNotificationBadge(element);
      return;
    }

    suppressedNotificationBadges.delete(element);
    applyNotificationBadge(element, nextTone);
    return;
  }

  suppressedNotificationBadges.delete(element);
  clearNotificationBadge(element);
}

export function setNotificationVisibilityPolicy(policy = null, { root } = {}) {
  notificationVisibilityPolicy = normalizeNotificationVisibilityPolicy(policy);
  syncSuppressedNotificationBadges(root);
}

export function getNotificationVisibilityPolicy() {
  return notificationVisibilityPolicy;
}

function normalizeNotificationVisibilityPolicy(policy) {
  if (policy?.active !== true) {
    return null;
  }

  return {
    allowedTutorialIds: new Set(
      (policy.allowedTutorialIds ?? []).filter(
        (tutorialId) => typeof tutorialId === 'string' && tutorialId.length > 0,
      ),
    ),
  };
}

function syncSuppressedNotificationBadges(root) {
  for (const [element, badge] of [...suppressedNotificationBadges]) {
    if (!element.isConnected) {
      suppressedNotificationBadges.delete(element);
      continue;
    }

    if (!shouldSuppressNotificationBadge(element)) {
      applyNotificationBadge(element, badge.tone);
      suppressedNotificationBadges.delete(element);
    }
  }

  if (!notificationVisibilityPolicy || !root) {
    return;
  }

  for (const element of getNotificationElements(root)) {
    if (!shouldSuppressNotificationBadge(element)) {
      continue;
    }

    suppressedNotificationBadges.set(element, {
      tone: getNotificationTone(element.dataset.notificationTone),
    });
    clearNotificationBadge(element);
  }
}

function getNotificationElements(root) {
  const elements = [];

  if (root.matches?.('[data-notification="true"]')) {
    elements.push(root);
  }

  if (root.querySelectorAll) {
    elements.push(...root.querySelectorAll('[data-notification="true"]'));
  }

  return elements;
}

function shouldSuppressNotificationBadge(element) {
  if (!notificationVisibilityPolicy || isTutorialElement(element)) {
    return false;
  }

  const allowedTutorialIds = notificationVisibilityPolicy.allowedTutorialIds;

  if (allowedTutorialIds.size === 0) {
    return true;
  }

  for (const tutorialId of allowedTutorialIds) {
    if (isElementRelatedToTutorialId(element, tutorialId)) {
      return false;
    }
  }

  return true;
}

function isTutorialElement(element) {
  return Boolean(element.closest?.('.tutorial-layer'));
}

function isElementRelatedToTutorialId(element, tutorialId) {
  if (element.dataset?.tutorialId === tutorialId) {
    return true;
  }

  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (parent.dataset?.tutorialId === tutorialId) {
      return true;
    }
  }

  return [...(element.querySelectorAll?.('[data-tutorial-id]') ?? [])].some(
    (child) => child.dataset.tutorialId === tutorialId,
  );
}

function applyNotificationBadge(element, tone) {
  if (element.dataset.notification !== 'true') {
    element.dataset.notification = 'true';
  }

  const nextTone = normalizeNotificationTone(tone);

  if (element.dataset.notificationTone !== nextTone) {
    element.dataset.notificationTone = nextTone;
  }
}

function clearNotificationBadge(element) {
  if (element.dataset.notification !== undefined) {
    delete element.dataset.notification;
  }

  if (element.dataset.notificationTone !== undefined) {
    delete element.dataset.notificationTone;
  }
}
