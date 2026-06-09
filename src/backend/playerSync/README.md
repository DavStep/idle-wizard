# Player Backend Sync

Loads player profile fields from SpacetimeDB after connection, then pushes local edits back through reducers.

For now this syncs only `username`. The server row wins on reconnect so local defaults cannot overwrite saved user data. It does not sync resources or gameplay state.
