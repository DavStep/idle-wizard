# Gameplay Persistence

Keeps local player progress across reloads. Saves use stable item keys and research ids, not entity ids, so content changes can migrate safely.

This is local-first only. SpacetimeDB can later mirror the same save blob behind backend facades.
