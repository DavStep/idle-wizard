---
title: "Elixir Of Life"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 14
entity_id: elixirOfLife
item_type_id: 2014
recipe_access: "research"
base_sell_coin: 250.4
value_scope: effective-maincloud-items
mana_cost: 44
brew_seconds: 100
brew_time: "1m 40s"
ingredients:
  - "[[mechanics/garden/herbs/Mandrake Herb|Mandrake]]"
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
unlock_research_id: "unlockRecipe:elixirOfLife"
required_player_level: 32
default_research_cost_coin: 40000
default_research_duration_seconds: 3000
default_research_duration: "50m"
previous_recipe_research: "[[mechanics/potions/potions/Sleep Draught|Sleep Draught]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Elixir Of Life

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:elixirOfLife` at player level 32. Its effective item base sell value is **250.4 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Mandrake Herb|Mandrake]] | 3 |
| 2 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 2 |

Brewing costs **44 mana** and takes **1m 40s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 32 |
| Base research cost | 40,000 coin |
| Base research time | 50m |
| Previous recipe research | [[mechanics/potions/potions/Sleep Draught|Sleep Draught]] |

## Connections

- [[mechanics/garden/herbs/Mandrake Herb|Mandrake]] ×3
- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

