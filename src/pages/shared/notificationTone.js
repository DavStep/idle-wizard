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

export function getNotificationTone(
  notification,
  fallback = NOTIFICATION_TONE_RED,
) {
  if (
    notification === NOTIFICATION_TONE_RED ||
    notification === NOTIFICATION_TONE_ORANGE
  ) {
    return notification;
  }

  return normalizeNotificationTone(notification?.tone ?? fallback);
}
