---
title: Balance Watchlist
tags:
  - balance
  - risk
status: active
world: balance
---

# Balance Watchlist

## Live Config Risk

Backend task config normalization can reset stored legacy task rows to embedded
defaults. Changing default task JSON can immediately rebalance existing players
after backend publish.

## Market Risk

Level 1-3 NPC demand is intentionally local fake gameplay data. Do not tune
backend NPC market behavior against those early levels.

Market demand, stock, price pressure, player listings, and requests must always
be scoped by market licence. Sharing even one of those pools lets late-game
players rebalance an early player's economy.

## Prestige Risk

Ruby current is derived from completed milestones at run start; spent ruby is
not a permanent bank to refill casually.

## Save Risk

Save normalization can cap or drop unlisted branches. New persisted balance
shape needs migration/load/save support before release.
