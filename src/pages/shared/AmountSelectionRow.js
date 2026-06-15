export const AMOUNT_SELECTION_DELTAS = [-100, -10, -1, 1, 10, 100];

export function createAmountSelectionRow({
  ariaLabel = 'amount',
  className = '',
  inputClassName = '',
  stepClassName = '',
  valueClassName = '',
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
  input.addEventListener('blur', () => hideInput());
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    hideInput({ focusValue: event.key === 'Escape' });
  });

  const valueButton = document.createElement('button');
  valueButton.className = `style-button amount-selection-row__value ${valueClassName}`.trim();
  valueButton.type = 'button';
  valueButton.textContent = '1';
  valueButton.setAttribute('aria-label', `edit ${ariaLabel}`);
  valueButton.addEventListener('click', () => showInput());

  const showInput = () => {
    valueButton.hidden = true;
    input.hidden = false;
    input.focus({ preventScroll: true });
    input.select();
  };

  const hideInput = ({ focusValue = false } = {}) => {
    valueButton.textContent = input.value || '0';
    input.hidden = true;
    valueButton.hidden = false;

    if (focusValue) {
      valueButton.focus({ preventScroll: true });
    }
  };

  const setValue = (value) => {
    const text = String(value);
    input.value = text;
    valueButton.textContent = text;
  };

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
    valueButton,
    input,
    stepButtons.get(1),
    stepButtons.get(10),
    stepButtons.get(100),
  );
  input.hidden = true;

  return { field, input, valueButton, stepButtons, showInput, hideInput, setValue };
}
