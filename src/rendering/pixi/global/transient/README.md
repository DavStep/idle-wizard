# Retained Pixi transient UI

`createPixiTransientEffectsLayer()` builds one retained transient root and five
bounded pools: reward text, item drops, coin particles, coin amount pops, and
spend-burst particles.
It installs one layer-level ticker callback only while an effect is active.
After each pool reaches its high-water mark, repeated events reuse existing
Pixi display objects.
Item drops keep a per-reward visual cap of twelve, while the retained pool can
hold seventy concurrent drops so x5 hold-to-repeat summoning never recycles a
still-visible seed animation.

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
      anchorId: 'workshop.summonArea',
    },
  ],
  coinTravel: {
    amount: 20,
    fromId: 'shop.slot.1.price',
    toId: 'top.coin',
    showParticles: true,
    title: 'collected 20 coin',
  },
  spendBursts: [
    {
      resource: 'coin',
      anchorId: 'research.unlockSeed:mintSeed',
    },
  ],
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
models with semantic origins. Shop sales send a capped three-to-four-coin trail
and outlined amount pop from the retained stall price to `top.coin`, falling
back to the stall root if the price target is unavailable; shop purchases drop
the bought item from the matching ledger or market row. Coin arrival reuses the
existing top-coin display object for the main 340ms receive pulse and restores
its position, scale, and pivot on finish, clear, or deactivation. Successful
foreground purchases use the spent currency icon and Root Run's seven-particle
ballistic burst at the semantic purchase origin. Planting, brewing, summoning,
and task turn-ins do not use this effect. Reduced motion keeps matching text
flyouts without creating item, coin, spend-burst, or target-pulse motion.
Summoned seeds originate at the ritual circle's center through
`workshop.summonArea`; the separate `workshop.summon` target remains attached
to the actionable button.

`createPooledPixiNotificationBadges()` reconciles `{ key, parent, bounds,
active, tone, tutorialId }` records. Dots are the existing 6px red/orange
surface-ringed visuals. `setVisibilityPolicy()` replaces DOM ancestry lookup
with explicit tutorial IDs.
