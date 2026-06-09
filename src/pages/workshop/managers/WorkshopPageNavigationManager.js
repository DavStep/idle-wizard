export class WorkshopPageNavigationManager {
  constructor({ onShowGarden, onShowResearch } = {}) {
    this.onShowGarden = onShowGarden;
    this.onShowResearch = onShowResearch;
    this.root = null;
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');

    const gardenButton = this.createButton({
      className: 'room-page__nav--left',
      text: 'garden',
      ariaLabel: 'go left to garden',
      onClick: () => this.onShowGarden?.(),
    });
    const researchButton = this.createButton({
      className: 'room-page__nav--right',
      text: 'research',
      ariaLabel: 'go right to research',
      onClick: () => this.onShowResearch?.(),
    });

    this.root.append(gardenButton, researchButton);
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
