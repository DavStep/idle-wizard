---
title: "Seed Unlock Research"
tags:
  - mechanics
  - progression/research
  - system/garden
  - hub
status: active
world: mechanics
note_type: research-system
system: garden
implementation: shipped
currency: coin
chain: ordered
verified_on: 2026-07-19
---

# Seed Unlock Research

Each study adds one seed to the summon pool. The 24 studies form one strict chain in catalog order.

- Sage is the baseline study and is restored automatically on fresh and Prestige-reset saves.
- The same study controls whether the matching herb is treated as researched.
- Coin research-cost reduction may lower the amount actually paid.
- Costs and durations below are the current effective client defaults; see [[mechanics/garden/Garden Runtime Config|Runtime Config Status]].

![[mechanics/garden/Garden Research.base#Seed Unlocks]]

## Source of truth

- `src/gameplay/research/managers/ResearchDefinitionManager.js`
- `src/gameplay/research/managers/ResearchBalanceManager.js`
- `src/gameplay/research/research-balance.json`

