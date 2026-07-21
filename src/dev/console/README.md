# Developer Console

The developer console is a development-only top drawer mounted outside the game
stage. It is available only when `VITE_ENABLE_CHEATS=true`.

- Press backtick (`` ` ``) to toggle it and Escape to close it.
- Run approved helpers with calls such as `cheats.addCoin(1000)`.
- Tab accepts the highlighted suggestion, Enter runs, and Up/Down recalls history.
- Quick actions call the same explicit cheat command bridge as the browser console.
- Open it directly with `cheats.openUi('devConsole')`,
  `devConsole.open()`, or `/?devUi=devConsole`.

The input is parsed as commands and JSON-compatible arguments. String arguments
may use single or double quotes. It does not evaluate arbitrary JavaScript or
expose the internal app object.
