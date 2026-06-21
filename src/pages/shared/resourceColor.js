const RESOURCE_COLORS = new Set([
  'mana',
  'gold',
  'crystal',
  'emerald',
  'ruby',
  'seed',
  'herb',
  'potion',
]);

export function setResourceColor(element, resource) {
  if (!element) {
    return;
  }

  if (RESOURCE_COLORS.has(resource)) {
    if (element.dataset.resourceColor === resource) {
      return;
    }

    element.dataset.resourceColor = resource;
    return;
  }

  if (element.dataset.resourceColor !== undefined) {
    delete element.dataset.resourceColor;
  }
}

export function setResourceColorFromText(element, text) {
  const normalizedText = String(text ?? '').toLowerCase();

  if (/\bmana\b/.test(normalizedText)) {
    setResourceColor(element, 'mana');
    return;
  }

  if (/\bcrystals?\b/.test(normalizedText)) {
    setResourceColor(element, 'crystal');
    return;
  }

  if (/\bemeralds?\b/.test(normalizedText)) {
    setResourceColor(element, 'emerald');
    return;
  }

  if (/\bruby\b|\brubies\b/.test(normalizedText)) {
    setResourceColor(element, 'ruby');
    return;
  }

  if (/\bseeds?\b/.test(normalizedText)) {
    setResourceColor(element, 'seed');
    return;
  }

  if (/\bherbs?\b/.test(normalizedText)) {
    setResourceColor(element, 'herb');
    return;
  }

  if (/\bgold\b|(^|[^\w])(\d+|\?)g($|[^\w])/.test(normalizedText)) {
    setResourceColor(element, 'gold');
    return;
  }

  setResourceColor(element, null);
}
