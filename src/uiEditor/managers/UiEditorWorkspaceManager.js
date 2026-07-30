export const UI_EDITOR_WORKSPACE_STORAGE_KEY =
  'idle-wizard.ui-editor.workspace';

const WORKSPACE_VERSION = 1;

export class UiEditorWorkspaceManager {
  constructor({
    createWorkspaceState,
    restoreWorkspaceState,
    storage,
    toolbar,
  }) {
    this.createWorkspaceState = createWorkspaceState;
    this.restoreWorkspaceState = restoreWorkspaceState;
    this.storage = storage;
    this.toolbar = toolbar;
    this.refs = null;

    this.handleClick = () => this.save();
    this.handleKeyDown = (event) => this.onKeyDown(event);
  }

  mount() {
    if (this.refs) {
      return this.refs;
    }

    const title = document.createElement('strong');
    const actions = document.createElement('div');
    const status = document.createElement('span');
    const saveButton = document.createElement('button');

    title.className = 'ui-editor-toolbar__title';
    title.textContent = 'UI Editor';

    actions.className = 'ui-editor-toolbar__actions';

    status.className = 'ui-editor-toolbar__status';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('role', 'status');

    saveButton.className = 'ui-editor-toolbar__save';
    saveButton.type = 'button';
    saveButton.setAttribute('aria-keyshortcuts', 'Control+S Meta+S');
    saveButton.title = 'Save workspace (Ctrl or Command + S)';
    saveButton.textContent = 'Save workspace';
    saveButton.addEventListener('click', this.handleClick);

    actions.append(status, saveButton);
    this.toolbar.replaceChildren(title, actions);
    window.addEventListener('keydown', this.handleKeyDown);

    this.refs = {
      actions,
      saveButton,
      status,
      title,
    };

    this.restore();
    return this.refs;
  }

  unmount() {
    if (!this.refs) {
      return;
    }

    this.refs.saveButton.removeEventListener('click', this.handleClick);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.toolbar.replaceChildren();
    this.refs = null;
  }

  save() {
    if (!this.storage) {
      this.setStatus('Saving is unavailable', 'error');
      return false;
    }

    try {
      this.storage.setItem(
        UI_EDITOR_WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          version: WORKSPACE_VERSION,
          workspace: this.createWorkspaceState(),
        }),
      );
      this.setStatus('Workspace saved', 'success');
      return true;
    } catch {
      this.setStatus('Could not save workspace', 'error');
      return false;
    }
  }

  restore() {
    if (!this.storage) {
      return false;
    }

    try {
      const serialized = this.storage.getItem(
        UI_EDITOR_WORKSPACE_STORAGE_KEY,
      );

      if (!serialized) {
        return false;
      }

      const saved = JSON.parse(serialized);

      if (
        saved?.version !== WORKSPACE_VERSION
        || !saved.workspace
        || typeof saved.workspace !== 'object'
      ) {
        return false;
      }

      if (this.restoreWorkspaceState(saved.workspace) === false) {
        return false;
      }

      this.setStatus('Workspace restored', 'success');
      return true;
    } catch {
      this.setStatus('Could not restore workspace', 'error');
      return false;
    }
  }

  onKeyDown(event) {
    if (
      event.key.toLowerCase() !== 's'
      || (!event.metaKey && !event.ctrlKey)
      || event.altKey
    ) {
      return;
    }

    event.preventDefault();
    this.save();
  }

  setStatus(message, tone) {
    if (!this.refs) {
      return;
    }

    this.refs.status.textContent = message;
    this.refs.status.dataset.tone = tone;
  }
}
