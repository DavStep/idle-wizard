import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../../player/playerThemes.js';

export class TopPanelSettingsManager {
  constructor({ playerFacade } = {}) {
    this.playerFacade = playerFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.visible = false;
    this.previousFocus = null;
    this.handleUsernameClick = () => this.show();
    this.handleCloseClick = () => this.hide();
    this.handleOverlayClick = (event) => {
      if (event.target === this.refs?.settings) {
        this.hide();
      }
    };
    this.handleSubmit = (event) => {
      event.preventDefault();
      this.saveUsername();
    };
    this.handleInputKeydown = (event) => {
      if (!this.visible || event.key !== 'Enter' || event.isComposing) {
        return;
      }

      event.preventDefault();
      this.saveUsername();
    };
    this.handleSavePressStart = (event) => {
      if (!this.visible) {
        return;
      }

      event.preventDefault();
      this.saveUsername();
    };
    this.handleSavePointerDown = (event) => this.handleSavePressStart(event);
    this.handleSaveTouchStart = (event) => this.handleSavePressStart(event);
    this.handleThemeClick = (event) => {
      this.playerFacade?.setTheme?.(event.currentTarget.dataset.theme);
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
    };
  }

  mount(refs) {
    this.refs = refs;
    this.refs.usernameButton.addEventListener('click', this.handleUsernameClick);
    this.refs.settingsCloseButton.addEventListener('click', this.handleCloseClick);
    this.refs.settings.addEventListener('click', this.handleOverlayClick);
    this.refs.usernameForm.addEventListener('submit', this.handleSubmit);
    this.refs.usernameInput.addEventListener('keydown', this.handleInputKeydown);
    this.refs.usernameSaveButton.addEventListener('pointerdown', this.handleSavePointerDown);
    this.refs.usernameSaveButton.addEventListener('touchstart', this.handleSaveTouchStart, {
      passive: false,
    });

    for (const button of this.refs.themeButtons) {
      button.addEventListener('click', this.handleThemeClick);
    }

    document.addEventListener('keydown', this.handleKeydown);

    if (this.playerFacade) {
      this.unsubscribe = this.playerFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.playerFacade.getSnapshot());
    } else {
      this.render({ username: 'wizard', theme: DEFAULT_PLAYER_THEME });
    }

    this.applyVisibility();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.refs) {
      this.refs.usernameButton.removeEventListener('click', this.handleUsernameClick);
      this.refs.settingsCloseButton.removeEventListener('click', this.handleCloseClick);
      this.refs.settings.removeEventListener('click', this.handleOverlayClick);
      this.refs.usernameForm.removeEventListener('submit', this.handleSubmit);
      this.refs.usernameInput.removeEventListener('keydown', this.handleInputKeydown);
      this.refs.usernameSaveButton.removeEventListener(
        'pointerdown',
        this.handleSavePointerDown,
      );
      this.refs.usernameSaveButton.removeEventListener(
        'touchstart',
        this.handleSaveTouchStart,
      );

      for (const button of this.refs.themeButtons) {
        button.removeEventListener('click', this.handleThemeClick);
      }
    }

    document.removeEventListener('keydown', this.handleKeydown);
    this.refs = null;
    this.visible = false;
    this.previousFocus = null;
  }

  show() {
    if (!this.refs) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.refs.usernameInput.value = this.refs.usernameButton.textContent;
    this.applyVisibility();
    this.focusWithoutScroll(this.refs.settingsDialog);
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.focusWithoutScroll(this.previousFocus);
    }

    this.previousFocus = null;
  }

  saveUsername() {
    const username = this.refs.usernameInput.value;
    this.playerFacade?.setUsername(username);
    this.hide();
  }

  render(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    if (this.refs.usernameButton.textContent !== snapshot.username) {
      this.refs.usernameButton.textContent = snapshot.username;
    }

    this.applyThemeSelection(snapshot.theme);
  }

  applyThemeSelection(theme) {
    const selectedTheme = normalizePlayerTheme(theme);

    for (const button of this.refs.themeButtons) {
      const selected = button.dataset.theme === selectedTheme;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    }
  }

  applyVisibility() {
    if (!this.refs) {
      return;
    }

    this.refs.settings.hidden = !this.visible;
    this.refs.settings.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  focusWithoutScroll(element) {
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }
}
