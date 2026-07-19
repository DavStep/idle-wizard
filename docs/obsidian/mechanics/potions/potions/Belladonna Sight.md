---
title: "Belladonna Sight"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 36
entity_id: belladonnaSight
item_type_id: 2036
recipe_access: "research"
base_sell_coin: 568
value_scope: effective-maincloud-items
mana_cost: 96
brew_seconds: 215
brew_time: "3m 35s"
ingredients:
  - "[[mechanics/garden/herbs/Belladonna Herb|Belladonna]]"
  - "[[mechanics/garden/herbs/Star Anise Herb|Star Anise]]"
  - "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
unlock_research_id: "unlockRecipe:belladonnaSight"
required_player_level: 65
default_research_cost_coin: 765000
default_research_duration_seconds: 10800
default_research_duration: "3h"
previous_recipe_research: "[[mechanics/potions/potions/Nightshade Veil|Nightshade Veil]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Belladonna Sight

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:belladonnaSight` at player level 65. Its effective item base sell value is **568 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Belladonna Herb|Belladonna]] | 1 |
| 2 | [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] | 1 |
| 3 | [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] | 2 |

Brewing costs **96 mana** and takes **3m 35s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 65 |
| Base research cost | 765,000 coin |
| Base research time | 3h |
| Previous recipe research | [[mechanics/potions/potions/Nightshade Veil|Nightshade Veil]] |

## Connections

- [[mechanics/garden/herbs/Belladonna Herb|Belladonna]] ×1
- [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] ×1
- [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

