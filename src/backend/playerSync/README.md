# Player Backend Sync

Loads player profile fields from SpacetimeDB after connection, then pushes local edits back through reducers.

This syncs `username`, visual theme, font, resource color mode, username prompt state, and the highest reported task player level. The server row wins on reconnect so local defaults cannot overwrite saved user data. Broad gameplay state is handled by `backend/gameplaySave`.
