# Retained Pixi transient UI

`createPixiTransientEffectsLayer()` builds one retained transient root and four
bounded pools: reward text, item drops, coin particles, and coin amount pops.
It installs one layer-level ticker callback only while an effect is active.
After each pool reaches its high-water mark, repeated events reuse existing
Pixi display objects.

Reward presentation model:

```js
{
  id: 'reward-42',
  message: 'sage seed found',
  // Optional inline Pixi runs. Missing runs use message as one text run.
  runs: [
    { kind: 'text', text: 'sage ' },
    { kind: 'icon', frameName: 'seed:sage', size: 14 },
    { kind: 'text', text: ' found' },
  ],
  flyoutKey: 'seed:sage',
  delayMs: 0,
  visualOnly: false,
  keepMessageVisible: false,
  itemDrops: [
    {
      id: 'sage-1',
      kind: 'seed',
      frameName: 'seed:sage',
      // A source-space point/rect or a semantic/tutorial target ID.
      anchorId: 'workshop:summon',
    },
  ],
  coinTravel: {
    amount: 20,
    fromId: 'shop.slot.1.price',
    toId: 'top.coin',
    showParticles: true,
    title: 'collected 20 coin',
  },
}
```

Event payloads remain gameplay-owned. `PixiRewardEventConsumer` enforces one
subscription and accepts an injected `presentRewardEvent(event)` mapper.
Mount it directly with `gameplayFacade`; it accepts the production
`subscribeRewardEvents(listener)` API (and a generic `subscribe(listener)`
source in tests).
`createRewardFlyoutPresentation(event)` preserves the legacy default copy,
ports the existing seed/herb/potion/resource inline-icon parsing into Pixi run
data, and maps summon, harvest, and brew reward events to bounded item-drop
models with semantic origins. Shop sales use a lightweight amount pop from the
retained stall, shop purchases drop the bought item from the matching ledger or
market row, and collected/task coins travel from their retained action target
to `top.coin`. Coin arrival reuses the existing top-coin display object for the
main 340ms receive pulse and restores its position, scale, and pivot on finish,
clear, or deactivation. Reduced motion keeps the matching text flyout without
creating item, coin, or target-pulse motion.

`createPooledPixiNotificationBadges()` reconciles `{ key, parent, bounds,
active, tone, tutorialId }` records. Dots are the existing 6px red/orange
surface-ringed visuals. `setVisibilityPolicy()` replaces DOM ancestry lookup
with explicit tutorial IDs.
