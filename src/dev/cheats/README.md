# Dev Cheats

Dev cheats expose console helpers only when `VITE_ENABLE_CHEATS=true`.

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
cheats.setTimers('allReady')
cheats.setStressText()
cheats.setDummyLeaderboard()
cheats.clearDummyLeaderboard()
cheats.listTutorialStages()
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
  theme, font, color mode, icon mode, progress bar, and plot view.
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
- `setTimers(preset)` supports allReady, half, almostDone, and longRunning for
  garden, brewing, and market timers.
- `setStressText()` loads long names, overflowing inventory, full market/event
  data, claimable guild state, dummy leaderboards, and all badges.
- `setDummyLeaderboard()` publishes local dummy normal and world-event leaderboard
  snapshots until `clearDummyLeaderboard()` restores server data.
