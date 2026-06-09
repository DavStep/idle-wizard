# Backend World Chat

Watches SpacetimeDB `world_chat` rows and sends short player messages through the `send_world_chat_message` reducer.

The backend owns the shared chat history. UI code can subscribe to compact chat snapshots and request sends through this facade, but it does not touch generated SpacetimeDB APIs directly.
