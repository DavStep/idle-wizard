# Gameplay Persistence

Creates and restores player progress saves across reloads. Saves use stable item keys and research ids, not entity ids, so content changes can migrate safely.

Normal app wiring stores the authoritative save through SpacetimeDB `player_gameplay_save`. Browser storage is not an alternate gameplay save, but the backend save sender keeps its latest unacknowledged write in a player-identity-scoped local journal so an OS-level app close can replay it after restart. The journal is cleared after the server accepts the write and is discarded if another session advanced the server save.
