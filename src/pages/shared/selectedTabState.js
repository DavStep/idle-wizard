export function setSelectedTabState(button, selected, { tabIndex = false } = {}) {
  if (!button) {
    return;
  }

  const isSelected = selected === true;
  button.classList.toggle('is-selected', isSelected);
  button.setAttribute('aria-selected', isSelected ? 'true' : 'false');

  if (tabIndex) {
    button.tabIndex = isSelected ? 0 : -1;
  }
}
