---
title: "Healing Potion"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 9
entity_id: healingPotion
item_type_id: 2009
recipe_access: "research"
base_sell_coin: 90.4
value_scope: effective-maincloud-items
mana_cost: 26
brew_seconds: 65
brew_time: "1m 5s"
ingredients:
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
  - "[[mechanics/garden/herbs/Mandrake Herb|Mandrake]]"
unlock_research_id: "unlockRecipe:healingPotion"
required_player_level: 18
default_research_cost_coin: 9500
default_research_duration_seconds: 1560
default_research_duration: "26m"
previous_recipe_research: "[[mechanics/potions/potions/Venom Draught|Venom Draught]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Healing Potion

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:healingPotion` at player level 18. Its effective item base sell value is **90.4 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 2 |
| 2 | [[mechanics/garden/herbs/Mandrake Herb|Mandrake]] | 1 |

Brewing costs **26 mana** and takes **1m 5s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 18 |
| Base research cost | 9,500 coin |
| Base research time | 26m |
| Previous recipe research | [[mechanics/potions/potions/Venom Draught|Venom Draught]] |

## Connections

- [[mechanics/garden/herbs/Sage Herb|Sage]] ×2
- [[mechanics/garden/herbs/Mandrake Herb|Mandrake]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

