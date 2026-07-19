const INVOCATION_PATTERN = /^(?:await\s+)?cheats\.([a-zA-Z][\w]*)\s*\(([\s\S]*)\)\s*;?$/;
const OBJECT_KEY_PATTERN = /([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g;
const MAX_SUGGESTIONS = 7;

export class DevConsoleCommandManager {
  constructor({ commandManager } = {}) {
    this.commandManager = commandManager;
    this.commands = this.readCommands();
  }

  readCommands() {
    const help = this.commandManager?.run?.('help');
    const commands = Array.isArray(help?.commands) ? help.commands : [];

    return ['cheats.help()', ...commands]
      .filter((command, index, all) => all.indexOf(command) === index)
      .map((template) => ({
        template,
        name: this.readCommandName(template),
      }));
  }

  getSuggestions(query = '', limit = MAX_SUGGESTIONS) {
    const needle = this.normalizeSearchText(query);
    const ranked = this.commands
      .map((command, index) => ({
        ...command,
        index,
        score: this.scoreSuggestion(command, needle),
      }))
      .filter((command) => command.score >= 0)
      .sort((left, right) => left.score - right.score || left.index - right.index);

    return ranked.slice(0, limit).map(({ template, name }) => ({ template, name }));
  }

  async execute(input) {
    if (!this.commandManager?.run) {
      return { ok: false, reason: 'command_bridge_missing' };
    }

    const parsed = this.parseInput(input);
    return this.commandManager.run(parsed.command, ...parsed.args);
  }

  parseInput(input) {
    const commandText = String(input ?? '').trim();

    if (!commandText) {
      throw new Error('enter a command first');
    }

    const invocation = commandText.match(INVOCATION_PATTERN);

    if (invocation) {
      return {
        command: invocation[1],
        args: this.parseInvocationArguments(invocation[2]),
      };
    }

    if (/^(?:await\s+)?cheats\./.test(commandText)) {
      throw new Error('use cheats.method(...) syntax');
    }

    return { command: commandText, args: [] };
  }

  parseInvocationArguments(argumentsText) {
    const trimmedArguments = argumentsText.trim();

    if (!trimmedArguments) {
      return [];
    }

    const jsonArguments = trimmedArguments.replace(
      OBJECT_KEY_PATTERN,
      '$1"$2"$3',
    );

    try {
      return JSON.parse(`[${jsonArguments}]`);
    } catch {
      throw new Error(
        'arguments must use numbers, booleans, arrays, or JSON-style quoted strings',
      );
    }
  }

  readCommandName(template) {
    return template.match(/cheats\.([a-zA-Z][\w]*)/)?.[1] ?? template;
  }

  normalizeSearchText(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/^await\s+/, '')
      .replace(/^cheats\./, '');
  }

  scoreSuggestion(command, needle) {
    if (!needle) {
      return command.name === 'help' ? 0 : command.index + 1;
    }

    const name = command.name.toLowerCase();
    const template = command.template.toLowerCase();

    if (name === needle) {
      return 0;
    }

    if (name.startsWith(needle)) {
      return 10 + name.length - needle.length;
    }

    const nameIndex = name.indexOf(needle);

    if (nameIndex >= 0) {
      return 30 + nameIndex;
    }

    const templateIndex = template.indexOf(needle);
    return templateIndex >= 0 ? 60 + templateIndex : -1;
  }
}
