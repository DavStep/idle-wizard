# Balance Lab

Balance Lab is a dev-only simulation harness for progression and economy tuning.
It runs `GameplayFacade` through `EcsFacade` with fake storage and fake NPC market
data, then records level timing, bottlenecks, monotony windows, and prestige
pressure.

Run:

```bash
npm run balance:lab -- --policy normal --days 3
```

Useful options:

```bash
npm run balance:lab -- --policy active --hours 12 --sample-every 300
npm run balance:lab -- --policy idle --days 7 --prestige
npm run balance:lab -- --no-write
```

Reports default to `tmp/balance-lab/<run-id>/`:

- `summary.md`: human report.
- `samples.csv`: level, currency, bottleneck, action mix over time.
- `events.json`: successful player actions and unlock events.
- `report.json`: complete structured output.

The harness does not write gameplay saves or call SpacetimeDB. The fake market
uses item base prices and stable demand so market actions work at every level.
