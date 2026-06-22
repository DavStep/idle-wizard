# Dev Cheats

Dev cheats expose console helpers only when `VITE_ENABLE_CHEATS=true`.

```js
cheats.help()
cheats.fillMana()
cheats.addCoin(1000)
cheats.addCrystal(10)
cheats.addItem('sageSeed', 5)
cheats.completeResearch('unlockSeed:sageSeed')
cheats.resetData('RESET')
```

Production mode sets `VITE_ENABLE_CHEATS=false`, so `src/main.js` does not load this feature.

`resetData` clears current gameplay progress and player-market listings for the current
server identity. It keeps auth, profile, global config, global discoveries, and chat.
