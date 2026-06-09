export class GardenPageNavigationManager {
  constructor({ onShowBrewing, onShowWorkshop } = {}) {
    this.onShowBrewing = onShowBrewing;
    this.onShowWorkshop = onShowWorkshop;
    this.root = null;
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');

    const brewingButton = this.createButton({
      className: 'room-page__nav--left',
      text: 'brewing',
      ariaLabel: 'go left to brewing',
      onClick: () => this.onShowBrewing?.(),
    });
    const workshopButton = this.createButton({
      className: 'room-page__nav--right',
      text: 'workshop',
      ariaLabel: 'go right to workshop',
      onClick: () => this.onShowWorkshop?.(),
    });

    this.root.append(brewingButton, workshopButton);
    parent.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
  }

  createButton({ className, text, ariaLabel, onClick }) {
    const button = document.createElement('button');
    button.className = `style-button room-page__nav ${className}`;
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', ariaLabel);
    button.addEventListener('click', onClick);
    return button;
  }
}
