export const AMOUNT_SELECTION_DELTAS = [-100, -10, -1, 1, 10, 100];

export function createAmountSelectionRow({
  ariaLabel = 'amount',
  className = '',
  inputClassName = '',
  stepClassName = '',
  onInput,
  onStep,
} = {}) {
  const field = document.createElement('div');
  field.className = `amount-selection-row ${className}`.trim();
  field.setAttribute('aria-label', ariaLabel);

  const input = document.createElement('input');
  input.className = `style-input amount-selection-row__input ${inputClassName}`.trim();
  input.type = 'number';
  input.inputMode = 'numeric';
  input.min = '1';
  input.step = '1';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', ariaLabel);
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => onInput?.());

  const stepButtons = new Map();
  for (const delta of AMOUNT_SELECTION_DELTAS) {
    const button = document.createElement('button');
    button.className = `style-button amount-selection-row__step ${stepClassName}`.trim();
    button.type = 'button';
    button.textContent = delta > 0 ? `+${delta}` : String(delta);
    button.setAttribute(
      'aria-label',
      delta > 0
        ? `increase amount by ${delta}`
        : `decrease amount by ${Math.abs(delta)}`,
    );
    button.addEventListener('click', () => onStep?.(delta));
    stepButtons.set(delta, button);
  }

  field.append(
    stepButtons.get(-100),
    stepButtons.get(-10),
    stepButtons.get(-1),
    input,
    stepButtons.get(1),
    stepButtons.get(10),
    stepButtons.get(100),
  );

  return { field, input, stepButtons };
}
