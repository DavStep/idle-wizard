# Dev Cheats

Dev cheats expose console helpers only when `VITE_ENABLE_CHEATS=true`.

The in-app developer console is available in the same builds. Press backtick
(`` ` ``) to open its top drawer, or run `cheats.openUi('devConsole')`. The
drawer provides command suggestions, history, output, and quick actions while
using the same approved command bridge documented below.

```js
cheats.help()
cheats.fillMana()
cheats.addCoin(1000)
cheats.addCrystal(10)
cheats.addItem('sageSeed', 5)
cheats.setProfile({ username: 'QA Long Name' })
cheats.setInventoryPreset('full')
cheats.setNotifications({ garden: 'red', market: true })
cheats.clearNotifications()
cheats.setLevel(10)
cheats.showPage('garden')
cheats.unlockFeature('garden')
cheats.unlockAllFeatures()
cheats.completeResearch('unlockSeed:sageSeed')
cheats.unlockAllResearch()
cheats.unlockPlots(8)
cheats.setPlot(1, { seed: 'sage', phase: 'growing', progress: 0.5 })
cheats.setPlot(2, { seed: 'mint', phase: 'ready' })
cheats.unlockCauldrons(3)
cheats.setCauldron(1, { potion: 'manaTonic', phase: 'brewed' })
cheats.unlockTraderStands(3)
cheats.unlockPlayerStands(3)
cheats.setMarketState('full')
cheats.setWorldEventState('complete')
cheats.setGuildState('claimable')
cheats.setBackendState('offline')
cheats.openDialog('worldEvent', { tab: 'leaderboard' })
cheats.listUiSurfaces()
cheats.openUi('guildQuestPosting')
cheats.openUi('traderStallLoader')
cheats.openUi('featureUnlockAnnouncement')
cheats.openUi('devConsole')
cheats.setTimers('allReady')
cheats.setStressText()
cheats.setDummyLeaderboard()
cheats.clearDummyLeaderboard()
cheats.listTutorialStages()
cheats.getTutorialGraph()
cheats.loadTutorialStep('t27')
cheats.setTutorialStage('intro-garden')
cheats.listDataTemplates()
cheats.loadDataTemplate('ftwizard')
cheats.resetData('RESET')
```

Production mode sets `VITE_ENABLE_CHEATS=false`, so `src/main.js` does not load this feature.

`resetData` clears current gameplay progress and player-market listings for the current
server identity. It keeps auth, profile, global config, global discoveries, and chat.

`loadDataTemplate` reads generated local QA templates from `public/qa-data/` and
persists the selected save through the normal current-identity save path.

Useful view setup commands:

- `setLevel(level)` moves task/player level and refreshes level-gated caps.
- `unlockFeature(feature)` accepts page ids like `garden`, `research`, `brewing`,
  `prestige`, `guild`, plus utility gates like `leaderboard`, `worldChat`, and
  research ids.
- `unlockAllFeatures()` sets max level, completes configured research, and opens
  garden plots, cauldrons, trader stands, and player stands.
- `setPlot(plot, options)` supports phases `empty`, `growing`, `ready`, and
  `harvesting`; use `progress`, `remainingMs`, or `remainingSeconds` for timers.
- `setCauldron(cauldron, options)` supports phases `empty`, `staged`, `brewing`,
  `brewed`, `bottling`, and `ready`.
- `setProfile(options)` sets local profile UI fields such as username,
  theme, font, and progress bar. Color and icon modes normalize to fixed
  `resources`/`icons`.
- `setInventoryPreset(preset)` supports `empty`, `basic`, `full`, and
  `overflow`; pass an item map like `{ sageSeed: 4 }` for exact inventory.
- `setNotifications(config)` forces bottom-tab badges for UI testing. Use
  `clearNotifications()` to restore live computed badges.
- `setMarketState(preset)` supports empty/full/ready/half/long-running market
  views and publishes dummy player-market backend rows when available.
- `setWorldEventState(preset)` supports locked, active, partial, qualify,
  complete, and ended/archive states.
- `setGuildState(preset)` supports locked, charter, joined, applicants, full,
  claimable, and urgent guild hall states.
- `setBackendState(state)` supports connected, offline, reconnecting,
  account-in-use, and save-failed online gate views.
- `openDialog(dialog, options)` opens mounted UI surfaces such as leaderboard,
  worldEvent, market, guild request/adventurer, settings, and level popups.
- `listUiSurfaces()` lists named page/dialog surfaces available to UI QA.
- `openUi(surface, options)` opens a named page/dialog surface. It delegates to
  `showPage`/`openDialog` for simple surfaces and includes setup recipes for
  composed flows such as `guildQuestPosting`, the incoming quest stack with the
  `Post` action.
- Dialog visual work should use `openUi(surface)` or `/?devUi=surface` for
  iteration and screenshots. Add a surface recipe first when the target dialog
  is not yet directly openable.
- Browser QA can also navigate to `/?devUi=guildQuestPosting`. The request waits
  until app-level gates such as fresh-start, intro, and offline overlays are
  hidden, then runs `openUi(surface)`.
- `/?devUi=traderStallLoader` opens the trader stall item loader directly for
  hold-selection and dialog screenshot QA.
- `/?devUi=featureUnlockAnnouncement` opens a non-persistent eight-feature unlock
  preview; tapping its backdrop closes it and runs the icon handoff without
  changing gameplay state.
- `setTimers(preset)` supports allReady, half, almostDone, and longRunning for
  garden, brewing, and market timers.
- `setStressText()` loads long names, overflowing inventory, full market/event
  data, claimable guild state, dummy leaderboards, and all badges.
- `setDummyLeaderboard()` publishes local dummy normal and world-event leaderboard
  snapshots until `clearDummyLeaderboard()` restores server data.
- `listTutorialStages()` returns every tutorial/cutscene step with a stable
  code such as `t01`, the canonical step id, and the matching
  `cheats.loadTutorialStep("...")` command.
- `getTutorialGraph()` returns the same steps plus sequential edges and Mermaid
  graph text for docs or quick inspection.
- `loadTutorialStep(step)` accepts a step id, `tNN` code, or 1-based number,
  then resets local gameplay into a minimal matching state, sets tutorial
  progress so that step is next, moves to the needed page, and reports the
  active step it landed on. `setTutorialStage(step)` is the same loader unless
  called with `{ loadState: false }`, which only changes tutorial progress.
