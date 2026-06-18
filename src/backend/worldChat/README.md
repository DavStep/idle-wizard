# Backend World Chat

Watches SpacetimeDB `world_chat` rows, sends short player messages through the `send_world_chat_message` reducer, and asks the backend to post gray system announcements when research completes, a player levels up, or a player completes a prestige.

The backend owns the shared chat history. Each row stores the sender name and player level at send time, while compact chat snapshots join the sender character for avatar display. Player names reserve `system`/`admin`, names must be unique except the default `wizard`, and message sends have per-identity plus global rate limits. UI code can subscribe to compact chat snapshots and request sends through this facade, but it does not touch generated SpacetimeDB APIs directly.
