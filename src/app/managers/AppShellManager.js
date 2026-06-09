export class AppShellManager {
  constructor({ root }) {
    if (!root) {
      throw new Error('AppShellManager requires a root element.');
    }

    this.root = root;
    this.shell = null;
  }

  mount() {
    if (this.shell) {
      return this.shell;
    }

    this.shell = document.createElement('main');
    this.shell.className = 'app-shell';
    this.root.append(this.shell);

    return this.shell;
  }

  unmount() {
    this.shell?.remove();
    this.shell = null;
  }
}
