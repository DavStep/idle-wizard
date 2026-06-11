export function setNotificationBadge(element, active) {
  if (!element) {
    return;
  }

  if (active) {
    element.dataset.notification = 'true';
    return;
  }

  delete element.dataset.notification;
}
