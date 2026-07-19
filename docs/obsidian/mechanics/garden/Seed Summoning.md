---
title: "Seed Summoning"
tags:
  - mechanics
  - system/garden
  - component
status: active
world: mechanics
note_type: component
system: garden
implementation: shipped
base_mana_per_seed: 10
verified_on: 2026-07-19
related:
  - "[[mechanics/garden/Seed Catalog.base|Seed Catalog]]"
  - "[[mechanics/garden/Seed Unlock Research|Seed Unlock Research]]"
---

# Seed Summoning

Seed summoning spends **10 mana per base seed roll** and rolls only seeds whose unlock research is complete.

- Every seed currently has base drop weight **1**.
- Player preferences multiply the weight at roll time: none 0, low 1, medium 2, high 3.
- At least one researched seed must remain active.
- Summon multiplier research scales both mana cost and seed count from x2 through x5.
- Ordinary seed unlocks reset on Prestige; sage is restored as the baseline unlock.

## Browse

![[mechanics/garden/Seed Catalog.base#Seeds]]

## Source of truth

- `src/gameplay/seedSummoning/`
- `src/gameplay/items/managers/ItemDefinitionManager.js`
- `src/gameplay/research/managers/ResearchDefinitionManager.js`

