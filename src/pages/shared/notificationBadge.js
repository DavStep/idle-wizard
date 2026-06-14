export const NOTIFICATION_TONE_RED = 'red';
export const NOTIFICATION_TONE_ORANGE = 'orange';

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

    if (element.dataset.notification !== 'true') {
      element.dataset.notification = 'true';
    }

    if (element.dataset.notificationTone !== nextTone) {
      element.dataset.notificationTone = nextTone;
    }

    return;
  }

  if (element.dataset.notification !== undefined) {
    delete element.dataset.notification;
  }

  if (element.dataset.notificationTone !== undefined) {
    delete element.dataset.notificationTone;
  }
}
