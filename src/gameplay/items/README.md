# Items

`ItemsFacade` owns item definitions and ECS inventory stacks for seeds, herbs, potions, and ingredients. Item quantities persist by stable item key.

Default item sell values form a compounding production chain. Seed value doubles at every catalog tier, each herb is worth five times its matching seed, and each valid potion is worth `2.5x` the combined sell value of its ordered herb inputs. Wasted potion remains worth `1`. The versioned runtime item config and NPC market catalog use the same values; the NPC market converts these targets into neutral base prices before applying live demand, so displayed quotes can move around the default values.

Ingredients use stable type IDs in the `3001` through `3060` range and the ordered rarity set `common`, `uncommon`, `rare`, `epic`, `legendary`, `mythical`. Removed type IDs stay reserved so later inventory keys never shift; `3019` is reserved. The client catalog in `ingredientCatalog.js` and the SpacetimeDB default item config must stay aligned. Ingredient source PNGs are 128×128 and enter the shared game atlas as `ingredient:<itemKey>` frames.

Ingredients are inventory-only catalog entries for now. They have no price, drop source, recipe role, research gate, or progression behavior until those rules are explicitly designed.
