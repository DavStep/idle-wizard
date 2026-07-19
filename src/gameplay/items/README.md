# Items

`ItemsFacade` owns item definitions and ECS inventory stacks for seeds, herbs, potions, and ingredients. Item quantities persist by stable item key.

Ingredients use stable type IDs in the `3001` through `3060` range and the ordered rarity set `common`, `uncommon`, `rare`, `epic`, `legendary`, `mythical`. Removed type IDs stay reserved so later inventory keys never shift; `3019` is reserved. The client catalog in `ingredientCatalog.js` and the SpacetimeDB default item config must stay aligned. Ingredient source PNGs are 128×128 and enter the shared game atlas as `ingredient:<itemKey>` frames.

Ingredients are inventory-only catalog entries for now. They have no price, drop source, recipe role, research gate, or progression behavior until those rules are explicitly designed.
