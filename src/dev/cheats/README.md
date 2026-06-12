# Dev Cheats

Dev cheats expose console helpers only when `VITE_ENABLE_CHEATS=true`.

```js
cheats.help()
cheats.fillMana()
cheats.addGold(1000)
cheats.addCrystal(10)
cheats.addItem('sageSeed', 5)
cheats.completeResearch('unlockSeed:sageSeed')
```

Production mode sets `VITE_ENABLE_CHEATS=false`, so `src/main.js` does not load this feature.
