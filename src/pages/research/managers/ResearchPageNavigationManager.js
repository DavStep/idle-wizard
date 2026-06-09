export class ResearchPageNavigationManager {
  constructor({ onShowWorkshop, onShowShop } = {}) {
    this.onShowWorkshop = onShowWorkshop;
    this.onShowShop = onShowShop;
    this.root = null;
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');

    const workshopButton = this.createButton({
      className: 'room-page__nav--left',
      text: 'workshop',
      ariaLabel: 'go left to workshop',
      onClick: () => this.onShowWorkshop?.(),
    });
    const shopButton = this.createButton({
      className: 'room-page__nav--right',
      text: 'shop',
      ariaLabel: 'go right to shop',
      onClick: () => this.onShowShop?.(),
    });

    this.root.append(workshopButton, shopButton);
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
