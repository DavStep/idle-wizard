---
title: "Sunroot Stamina"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 11
entity_id: sunrootStamina
item_type_id: 2011
recipe_access: "research"
base_sell_coin: 155.2
value_scope: effective-maincloud-items
mana_cost: 34
brew_seconds: 75
brew_time: "1m 15s"
ingredients:
  - "[[mechanics/garden/herbs/Sunroot Herb|Sunroot]]"
  - "[[mechanics/garden/herbs/Nettle Herb|Nettle]]"
unlock_research_id: "unlockRecipe:sunrootStamina"
required_player_level: 20
default_research_cost_coin: 13000
default_research_duration_seconds: 1800
default_research_duration: "30m"
previous_recipe_research: "[[mechanics/potions/potions/Healing Potion|Healing Potion]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Sunroot Stamina

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:sunrootStamina` at player level 20. Its effective item base sell value is **155.2 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] | 2 |
| 2 | [[mechanics/garden/herbs/Nettle Herb|Nettle]] | 2 |

Brewing costs **34 mana** and takes **1m 15s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 20 |
| Base research cost | 13,000 coin |
| Base research time | 30m |
| Previous recipe research | [[mechanics/potions/potions/Healing Potion|Healing Potion]] |

## Connections

- [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] ×2
- [[mechanics/garden/herbs/Nettle Herb|Nettle]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

