# Backend Potion Discoveries

Watches shared unknown potion recipe discoveries and records the first player who finds each recipe.

The backend owns the global discovery table and the identity of the first player
who found each recipe. Gameplay can ask whether an unknown recipe is known and
whether the connected player discovered it, and can request discovery when a
player brews an unknown recipe, but it does not touch generated SpacetimeDB APIs
directly. Discovery makes the recipe researchable for everyone; only the
discoverer receives the permanent automatic unlock. Other players' completed
discovery studies are part of the server research catalog so save normalization
preserves them across reconnects.
