---
title: "Star-Luck Philtre"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 15
entity_id: starLuckPhiltre
item_type_id: 2015
recipe_access: "research"
base_sell_coin: 255.2
value_scope: effective-maincloud-items
mana_cost: 50
brew_seconds: 110
brew_time: "1m 50s"
ingredients:
  - "[[mechanics/garden/herbs/Star Anise Herb|Star Anise]]"
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
  - "[[mechanics/garden/herbs/Mint Herb|Mint]]"
unlock_research_id: "unlockRecipe:starLuckPhiltre"
required_player_level: 35
default_research_cost_coin: 52000
default_research_duration_seconds: 3600
default_research_duration: "1h"
previous_recipe_research: "[[mechanics/potions/potions/Elixir Of Life|Elixir Of Life]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Star-Luck Philtre

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:starLuckPhiltre` at player level 35. Its effective item base sell value is **255.2 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] | 1 |
| 2 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 2 |
| 3 | [[mechanics/garden/herbs/Mint Herb|Mint]] | 2 |

Brewing costs **50 mana** and takes **1m 50s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 35 |
| Base research cost | 52,000 coin |
| Base research time | 1h |
| Previous recipe research | [[mechanics/potions/potions/Elixir Of Life|Elixir Of Life]] |

## Connections

- [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] ×1
- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×2
- [[mechanics/garden/herbs/Mint Herb|Mint]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

