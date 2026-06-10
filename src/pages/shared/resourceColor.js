const RESOURCE_COLORS = new Set(['mana', 'gold', 'crystal']);

export function setResourceColor(element, resource) {
  if (!element) {
    return;
  }

  if (RESOURCE_COLORS.has(resource)) {
    element.dataset.resourceColor = resource;
    return;
  }

  delete element.dataset.resourceColor;
}

export function setResourceColorFromText(element, text) {
  const normalizedText = String(text ?? '').toLowerCase();

  if (/\bmana\b/.test(normalizedText)) {
    setResourceColor(element, 'mana');
    return;
  }

  if (/\bcrystal\b/.test(normalizedText)) {
    setResourceColor(element, 'crystal');
    return;
  }

  if (/\bgold\b|(^|[^\w])(\d+|\?)g($|[^\w])/.test(normalizedText)) {
    setResourceColor(element, 'gold');
    return;
  }

  setResourceColor(element, null);
}
