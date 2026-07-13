---
title: Room Map
tags:
  - gdd
  - room
status: active
world: gdd
---

# Room Map

The default room order is:

```text
Brewing -> Garden -> Workshop -> Research -> Market
```

Workshop is the first and central room. Prestige is gated and appears only when
unlock state makes it visible.

## Brewing

Brewing renders cauldrons, herb and potion access, recipe selection, brew
actions, and bottling. It displays the potion loop but does not own recipe,
cost, timer, inventory, or progression rules.

## Garden

Garden renders a compact pannable plot world, seed choices, plot buying,
planting, replacing, and harvesting actions. The gameplay system owns growth,
harvest, cancellation, and item changes.

## Workshop

Workshop shows level requirements, mana-sphere actions, bag access,
discoveries, leaderboard, alliance controls, and page name. It is the first
visible room and the place where repeated actions become level progress.

## Research

Research shows studies from gameplay snapshots. Research rules own costs,
timers, unlock effects, summon filtering, and potion permissions.

## Market

Market contains trader market, player market, and crystals tabs. Trader market
has fast sell, automatic trader demand stands, and shared trader stock. Its
appearance and economy follow the player's permanent Prestige market licence:
Small Town Market, Crossroads Market, City Bazaar, Grand Exchange, then Arcane
Exchange. Each licence has separate NPC demand, stock, prices, and player-trade
rows, so late-game players cannot distort early-market balance.

## Related

- [[Design Pillars]]
- [[Player Journey]]
- [[Interface Style]]
