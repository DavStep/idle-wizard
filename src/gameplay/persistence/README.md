# Gameplay Persistence

Creates and restores player progress saves across reloads. Saves use stable item keys and research ids, not entity ids, so content changes can migrate safely.

Normal app wiring stores the save through SpacetimeDB `player_gameplay_save`. Browser storage is not the production save path; tests can still inject memory storage for focused persistence checks.
