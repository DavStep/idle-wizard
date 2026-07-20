---
title: "Research and Unlocks"
tags:
  - mechanics
  - progression/research
  - unlock
status: active
world: mechanics
note_type: system-map
---

# Research and Unlocks

Research is the catalog of studies shown in the Research room.

## Currency families

| Family | Currency | Examples |
| --- | --- | --- |
| Regular content unlocks | coin | seed and recipe unlocks |
| Automation | ruby | auto summon, plant, harvest, brew, bottle |
| Advanced studies | emerald | capacity, speed, research efficiency, fast sell |
| Plot and cauldron levels | crystal | x2–x5 input/output levels |

## Detailed paths

- [[mechanics/garden/Seed Unlock Research|Seed Unlock Research]]
- [[mechanics/potions/Recipe Unlock Research|Recipe Unlock Research]]
- [[mechanics/garden/Plot Research|Plot Research]]
- [[mechanics/market/Fast Sell|Fast Sell Research]]
- [[mechanics/garden/Garden Runtime Config|Garden and Research Runtime Status]]

Timed research can run concurrently without a slot limit. Seed and recipe chains are ordered. Only permanent capacity studies survive Prestige; run-scoped research resets.

## Source of truth

- `src/gameplay/research/`
- `spacetimedb/src/index.ts`
