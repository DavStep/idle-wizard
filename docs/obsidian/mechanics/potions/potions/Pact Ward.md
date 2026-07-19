---
title: "Pact Ward"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 18
entity_id: pactWard
item_type_id: 2018
recipe_access: "research"
base_sell_coin: 270.4
value_scope: effective-maincloud-items
mana_cost: 64
brew_seconds: 145
brew_time: "2m 25s"
ingredients:
  - "[[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]]"
  - "[[mechanics/garden/herbs/Briar Herb|Briar]]"
  - "[[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]]"
unlock_research_id: "unlockRecipe:pactWard"
required_player_level: 41
default_research_cost_coin: 88000
default_research_duration_seconds: 4800
default_research_duration: "1h 20m"
previous_recipe_research: "[[mechanics/potions/potions/Deep Dream Vision|Deep Dream Vision]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Pact Ward

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:pactWard` at player level 41. Its effective item base sell value is **270.4 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] | 1 |
| 2 | [[mechanics/garden/herbs/Briar Herb|Briar]] | 2 |
| 3 | [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] | 1 |

Brewing costs **64 mana** and takes **2m 25s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 41 |
| Base research cost | 88,000 coin |
| Base research time | 1h 20m |
| Previous recipe research | [[mechanics/potions/potions/Deep Dream Vision|Deep Dream Vision]] |

## Connections

- [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] ×1
- [[mechanics/garden/herbs/Briar Herb|Briar]] ×2
- [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

