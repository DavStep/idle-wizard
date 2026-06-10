# Backend Potion Discoveries

Watches shared unknown potion recipe discoveries and records the first player who finds each recipe.

The backend owns the global discovery table. Gameplay can ask whether an unknown recipe is known, and can request discovery when a player brews an unknown recipe, but it does not touch generated SpacetimeDB APIs directly.
