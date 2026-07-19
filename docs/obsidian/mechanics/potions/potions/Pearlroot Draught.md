---
title: "Pearlroot Draught"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 39
entity_id: pearlrootDraught
item_type_id: 2039
recipe_access: "research"
base_sell_coin: 740
value_scope: effective-maincloud-items
mana_cost: 120
brew_seconds: 270
brew_time: "4m 30s"
ingredients:
  - "[[mechanics/garden/herbs/Pearlroot Herb|Pearlroot]]"
  - "[[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]]"
  - "[[mechanics/garden/herbs/Belladonna Herb|Belladonna]]"
  - "[[mechanics/garden/herbs/Sunroot Herb|Sunroot]]"
unlock_research_id: "unlockRecipe:pearlrootDraught"
required_player_level: 74
default_research_cost_coin: 1700000
default_research_duration_seconds: 14400
default_research_duration: "4h"
previous_recipe_research: "[[mechanics/potions/potions/Snowdrop Breath|Snowdrop Breath]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Pearlroot Draught

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:pearlrootDraught` at player level 74. Its effective item base sell value is **740 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Pearlroot Herb|Pearlroot]] | 1 |
| 2 | [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]] | 1 |
| 3 | [[mechanics/garden/herbs/Belladonna Herb|Belladonna]] | 1 |
| 4 | [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] | 1 |

Brewing costs **120 mana** and takes **4m 30s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 74 |
| Base research cost | 1,700,000 coin |
| Base research time | 4h |
| Previous recipe research | [[mechanics/potions/potions/Snowdrop Breath|Snowdrop Breath]] |

## Connections

- [[mechanics/garden/herbs/Pearlroot Herb|Pearlroot]] ×1
- [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]] ×1
- [[mechanics/garden/herbs/Belladonna Herb|Belladonna]] ×1
- [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

