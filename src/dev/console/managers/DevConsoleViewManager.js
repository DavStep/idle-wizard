const QUICK_ACTIONS = Object.freeze([
  { label: 'fill mana', command: 'cheats.fillMana()' },
  { label: '+1,000 coin', command: 'cheats.addCoin(1000)' },
  { label: 'open workshop', command: 'cheats.showPage("workshop")' },
  { label: 'snapshot', command: 'cheats.snapshot()' },
]);
const CLOSE_DELAY_MS = 180;
const MAX_OUTPUT_LENGTH = 5_000;

export class DevConsoleViewManager {
  constructor({ commandManager, target = globalThis } = {}) {
    this.commandManager = commandManager;
    this.target = target;
    this.document = target?.document ?? globalThis.document;
    this.root = null;
    this.drawer = null;
    this.input = null;
    this.output = null;
    this.status = null;
    this.runButton = null;
    this.suggestionList = null;
    this.suggestions = [];
    this.activeSuggestionIndex = 0;
    this.history = [];
    this.historyIndex = 0;
    this.closeTimer = null;
    this.previousFocus = null;
    this.running = false;
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this.handleRootKeydown = this.handleRootKeydown.bind(this);
    this.handleRootClick = this.handleRootClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInput = this.handleInput.bind(this);
  }

  mount() {
    if (this.root || !this.document?.createElement || !this.document.body) {
      return false;
    }

    this.root = this.createRoot();
    this.document.body.append(this.root);
    this.drawer = this.root.querySelector('.dev-console__drawer');
    this.input = this.root.querySelector('.dev-console__input');
    this.output = this.root.querySelector('.dev-console__output');
    this.status = this.root.querySelector('.dev-console__status-text');
    this.runButton = this.root.querySelector('[data-dev-console-run]');
    this.suggestionList = this.root.querySelector('.dev-console__suggestions');
    this.root.addEventListener('keydown', this.handleRootKeydown);
    this.root.addEventListener('click', this.handleRootClick);
    this.root
      .querySelector('.dev-console__form')
      ?.addEventListener('submit', this.handleSubmit);
    this.input?.addEventListener('input', this.handleInput);
    this.document.addEventListener('keydown', this.handleDocumentKeydown, true);
    this.renderSuggestions();
    this.resetOutput();
    return true;
  }

  unmount() {
    this.clearCloseTimer();
    this.document?.removeEventListener?.('keydown', this.handleDocumentKeydown, true);
    this.root?.removeEventListener('keydown', this.handleRootKeydown);
    this.root?.removeEventListener('click', this.handleRootClick);
    this.root
      ?.querySelector('.dev-console__form')
      ?.removeEventListener('submit', this.handleSubmit);
    this.input?.removeEventListener('input', this.handleInput);
    this.root?.remove();
    this.root = null;
    this.drawer = null;
    this.input = null;
    this.output = null;
    this.status = null;
    this.runButton = null;
    this.suggestionList = null;
  }

  createRoot() {
    const root = this.document.createElement('div');
    root.className = 'dev-console';
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="dev-console__backdrop" data-dev-console-close></div>
      <section class="dev-console__drawer" role="dialog" aria-modal="true" aria-labelledby="dev-console-title">
        <div class="dev-console__shell">
          <header class="dev-console__header">
            <div class="dev-console__heading">
              <span class="dev-console__status-mark" aria-hidden="true"></span>
              <div>
                <h1 id="dev-console-title">developer console</h1>
                <span class="dev-console__status-text">bridge ready</span>
              </div>
            </div>
            <div class="dev-console__header-actions">
              <span class="dev-console__key-hint"><kbd>\`</kbd> toggle · <kbd>esc</kbd> close</span>
              <button class="dev-console__button dev-console__close" type="button" data-dev-console-close>close</button>
            </div>
          </header>

          <div class="dev-console__quick-row" aria-label="quick actions">
            <span class="dev-console__section-label">quick actions</span>
            <div class="dev-console__quick-actions">
              ${QUICK_ACTIONS.map(
                ({ label, command }) =>
                  `<button class="dev-console__button" type="button" data-dev-console-command="${this.escapeAttribute(command)}">${label}</button>`,
              ).join('')}
            </div>
          </div>

          <div class="dev-console__output" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0"></div>

          <form class="dev-console__form">
            <div class="dev-console__composer-heading">
              <label for="dev-console-command">command</label>
              <span>Tab completes · Enter runs · Shift+Enter adds a line · ↑↓ history</span>
            </div>
            <textarea
              id="dev-console-command"
              class="dev-console__input"
              rows="2"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              aria-autocomplete="list"
              aria-controls="dev-console-suggestions"
              placeholder="cheats.addCoin(1000)"
            ></textarea>
            <div id="dev-console-suggestions" class="dev-console__suggestions" role="listbox" aria-label="command suggestions"></div>
            <div class="dev-console__form-actions">
              <button class="dev-console__button" type="button" data-dev-console-clear>clear output</button>
              <button class="dev-console__button dev-console__run" type="submit" data-dev-console-run>run command</button>
            </div>
          </form>
        </div>
      </section>
    `;
    return root;
  }

  open() {
    if (!this.root) {
      return false;
    }

    this.clearCloseTimer();
    this.previousFocus = this.document.activeElement;
    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');
    void this.drawer?.offsetHeight;
    this.root.classList.add('is-open');
    this.input?.focus();
    this.renderSuggestions();
    return true;
  }

  close() {
    if (!this.root || this.root.hidden) {
      return false;
    }

    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    this.clearCloseTimer();
    const setTimer = this.target?.setTimeout ?? globalThis.setTimeout;
    this.closeTimer = setTimer?.(() => {
      if (this.root) {
        this.root.hidden = true;
      }
      this.closeTimer = null;
    }, CLOSE_DELAY_MS);
    this.previousFocus?.focus?.();
    this.previousFocus = null;
    return true;
  }

  isOpen() {
    return Boolean(this.root && !this.root.hidden && this.root.classList.contains('is-open'));
  }

  async executeCommand(command = this.input?.value) {
    const commandText = String(command ?? '').trim();

    if (!commandText || this.running) {
      return { ok: false, reason: this.running ? 'command_running' : 'empty_command' };
    }

    if (!this.isOpen()) {
      this.open();
    }

    this.running = true;
    this.setStatus('running command');
    this.runButton?.setAttribute('disabled', '');
    this.addOutput('command', `› ${commandText}`);
    this.addHistory(commandText);

    if (this.input) {
      this.input.value = '';
    }
    this.renderSuggestions();

    try {
      const result = await this.commandManager.execute(commandText);
      this.addOutput(result?.ok === false ? 'error' : 'result', this.formatResult(result));
      this.setStatus(result?.ok === false ? 'command returned an error' : 'bridge ready');
      return result;
    } catch (error) {
      const result = {
        ok: false,
        reason: 'invalid_command',
        message: String(error?.message ?? error),
      };
      this.addOutput('error', this.formatResult(result));
      this.setStatus('command could not run');
      return result;
    } finally {
      this.running = false;
      this.runButton?.removeAttribute('disabled');
      this.input?.focus();
    }
  }

  handleDocumentKeydown(event) {
    const isBackquote = event.code === 'Backquote' || event.key === '`';

    if (isBackquote && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (!this.isOpen() && this.isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      this.isOpen() ? this.close() : this.open();
      return;
    }

    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }

  handleRootKeydown(event) {
    event.stopPropagation();

    if (event.target !== this.input) {
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void this.executeCommand();
      return;
    }

    if (event.key === 'Tab' && this.suggestions.length > 0) {
      event.preventDefault();
      this.acceptSuggestion(this.activeSuggestionIndex);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (this.suggestions.length > 0 && this.input?.value.trim()) {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        this.activeSuggestionIndex =
          (this.activeSuggestionIndex + direction + this.suggestions.length) %
          this.suggestions.length;
        this.renderSuggestionItems();
        return;
      }

      if (this.history.length > 0) {
        event.preventDefault();
        this.recallHistory(event.key === 'ArrowUp' ? -1 : 1);
      }
    }
  }

  handleRootClick(event) {
    const closeControl = event.target.closest?.('[data-dev-console-close]');

    if (closeControl) {
      this.close();
      return;
    }

    if (event.target.closest?.('[data-dev-console-clear]')) {
      this.resetOutput();
      return;
    }

    const quickAction = event.target.closest?.('[data-dev-console-command]');

    if (quickAction) {
      void this.executeCommand(quickAction.dataset.devConsoleCommand);
      return;
    }

    const suggestion = event.target.closest?.('[data-dev-console-suggestion]');

    if (suggestion) {
      this.acceptSuggestion(Number(suggestion.dataset.devConsoleSuggestion));
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    void this.executeCommand();
  }

  handleInput() {
    this.activeSuggestionIndex = 0;
    this.renderSuggestions();
  }

  renderSuggestions() {
    this.suggestions = this.commandManager?.getSuggestions?.(this.input?.value ?? '') ?? [];
    this.activeSuggestionIndex = Math.min(
      this.activeSuggestionIndex,
      Math.max(0, this.suggestions.length - 1),
    );
    this.renderSuggestionItems();
  }

  renderSuggestionItems() {
    if (!this.suggestionList) {
      return;
    }

    this.suggestionList.replaceChildren(
      ...this.suggestions.map((suggestion, index) => {
        const button = this.document.createElement('button');
        button.type = 'button';
        button.className = 'dev-console__suggestion';
        button.dataset.devConsoleSuggestion = String(index);
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(index === this.activeSuggestionIndex));
        button.textContent = suggestion.template;
        return button;
      }),
    );
  }

  acceptSuggestion(index) {
    const suggestion = this.suggestions[index];

    if (!suggestion || !this.input) {
      return;
    }

    this.input.value = suggestion.template;
    this.input.focus();
    this.input.setSelectionRange?.(this.input.value.length, this.input.value.length);
    this.activeSuggestionIndex = 0;
    this.renderSuggestions();
  }

  addHistory(command) {
    if (this.history.at(-1) !== command) {
      this.history.push(command);
    }

    if (this.history.length > 50) {
      this.history.shift();
    }

    this.historyIndex = this.history.length;
  }

  recallHistory(direction) {
    this.historyIndex = Math.min(
      this.history.length,
      Math.max(0, this.historyIndex + direction),
    );
    this.input.value = this.history[this.historyIndex] ?? '';
    this.input.setSelectionRange?.(this.input.value.length, this.input.value.length);
    this.renderSuggestions();
  }

  resetOutput() {
    if (!this.output) {
      return;
    }

    this.output.replaceChildren();
    this.addOutput(
      'system',
      'ready. run an approved cheats method or choose a quick action.',
    );
  }

  addOutput(tone, text) {
    if (!this.output) {
      return;
    }

    const row = this.document.createElement('pre');
    row.className = 'dev-console__output-row';
    row.dataset.tone = tone;
    row.textContent = text;
    this.output.append(row);
    this.output.scrollTop = this.output.scrollHeight;
  }

  formatResult(result) {
    const seen = new WeakSet();
    let output;

    try {
      output = JSON.stringify(
        result,
        (_key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[circular]';
            }
            seen.add(value);
          }
          return value;
        },
        2,
      );
    } catch {
      output = String(result);
    }

    const safeOutput = output ?? String(result);
    return safeOutput.length > MAX_OUTPUT_LENGTH
      ? `${safeOutput.slice(0, MAX_OUTPUT_LENGTH)}\n… output truncated`
      : safeOutput;
  }

  setStatus(text) {
    if (this.status) {
      this.status.textContent = text;
    }
  }

  clearCloseTimer() {
    if (this.closeTimer === null) {
      return;
    }

    const clearTimer = this.target?.clearTimeout ?? globalThis.clearTimeout;
    clearTimer?.(this.closeTimer);
    this.closeTimer = null;
  }

  isEditableTarget(target) {
    return Boolean(
      target?.matches?.(
        'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]',
      ),
    );
  }

  escapeAttribute(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}
