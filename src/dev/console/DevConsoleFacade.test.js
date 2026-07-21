// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DevConsoleFacade } from './DevConsoleFacade.js';

function createCommandManager() {
  return {
    run: vi.fn((command, ...args) => {
      if (command === 'help') {
        return {
          ok: true,
          commands: [
            'cheats.fillMana()',
            'cheats.addCoin(amount)',
            'cheats.showPage("garden")',
            'cheats.setProfile({ username: "Long UI Name" })',
          ],
        };
      }

      return { ok: true, command, args };
    }),
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('DevConsoleFacade', () => {
  it('toggles from backtick, suggests commands, and restores focus on close', () => {
    const previousFocus = document.createElement('button');
    document.body.append(previousFocus);
    previousFocus.focus();
    const facade = new DevConsoleFacade({ commandManager: createCommandManager(), target: window });

    facade.mount();
    document.dispatchEvent(
      new window.KeyboardEvent('keydown', { code: 'Backquote', key: '`', bubbles: true }),
    );

    const root = document.querySelector('.dev-console');
    const input = root.querySelector('.dev-console__input');
    expect(root.classList.contains('is-open')).toBe(true);
    expect(document.activeElement).toBe(input);

    input.value = 'addc';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(root.querySelector('.dev-console__suggestion')?.textContent).toBe(
      'cheats.addCoin(amount)',
    );

    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(input.value).toBe('cheats.addCoin(amount)');

    document.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(document.activeElement).toBe(previousFocus);

    facade.unmount();
    expect(window.devConsole).toBeUndefined();
  });

  it('runs safe method calls and quick actions through the approved bridge', async () => {
    const commandManager = createCommandManager();
    const facade = new DevConsoleFacade({ commandManager, target: window });
    facade.mount();
    facade.open();

    const input = document.querySelector('.dev-console__input');
    input.value = 'cheats.setProfile({ username: "Davit" })';
    input.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(commandManager.run).toHaveBeenCalledWith('setProfile', {
        username: 'Davit',
      });
    });

    document.querySelector('[data-dev-console-command="cheats.fillMana()"]')?.click();
    await vi.waitFor(() => {
      expect(commandManager.run).toHaveBeenCalledWith('fillMana');
    });

    expect(document.querySelector('.dev-console__output')?.textContent).toContain(
      '"ok": true',
    );
    facade.unmount();
  });

  it('accepts documented single-quoted QA template commands', async () => {
    const commandManager = createCommandManager();
    const facade = new DevConsoleFacade({ commandManager, target: window });
    facade.mount();
    facade.open();

    const input = document.querySelector('.dev-console__input');
    input.value = "cheats.loadDataTemplate('Aloofbaker2')";
    input.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    await vi.waitFor(() => {
      expect(commandManager.run).toHaveBeenCalledWith(
        'loadDataTemplate',
        'Aloofbaker2',
      );
    });
    facade.unmount();
  });

  it('does not open when backtick is typed into another editable field', () => {
    const field = document.createElement('textarea');
    document.body.append(field);
    const facade = new DevConsoleFacade({ commandManager: createCommandManager(), target: window });
    facade.mount();
    field.focus();

    field.dispatchEvent(
      new window.KeyboardEvent('keydown', { code: 'Backquote', key: '`', bubbles: true }),
    );

    expect(document.querySelector('.dev-console')?.classList.contains('is-open')).toBe(false);
    facade.unmount();
  });
});
